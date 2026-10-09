import {
  Config,
  createConfig,
  getConfig,
  setConfig,
  generateId,
  nowIso,
  getGlobalLogger,
  CallDirection,
  CallStatus,
  CallType,
} from '@sorani/shared';
import { InMemoryEventBus, EventBus } from '@sorani/events';
import { InMemoryRestaurantRepository, RestaurantSearchEngine, WeightedRankingEngine } from '@sorani/restaurants';
import {
  ReservationProviderRegistry,
  ReservationOrchestrator,
  MemoryIdempotencyStore,
  Reservation,
  ReservationRepository,
} from '@sorani/reservations';
import { AgentToolRegistry, createRojinTools, AIAgent, AgentServices } from '@sorani/ai';
import { VoiceSession } from '@sorani/voice';
import { TelephonyOrchestrator, createSimulatedCallConverser } from '@sorani/telephony';
import { InMemoryCustomerRepository, CustomerService } from '@sorani/customers';
import { InMemoryCallRepository, CallService } from '@sorani/calls';
import { InMemoryTenantRepository, TenantService, demoTenant } from '@sorani/tenants';
import { AuthService, demoUsers } from '@sorani/users';
import { NotificationService } from '@sorani/notifications';
import { AnalyticsService } from '@sorani/analytics';
import { LLMProviderRegistry, LMStudioProvider, FallbackLLMProvider } from '@sorani/provider-llm';
import { SimulationAgentLLM } from '@sorani/ai';
import { STTProviderRegistry, MockSTTProvider, OpenAIWhisperProvider, kurdishSTTProvider, localWhisperSTTProvider } from '@sorani/provider-stt';
import { TTSProviderRegistry, MockTTSProvider, elevenLabsTTSProvider, azureTTSProvider, kurdishTTSProvider, localPiperTTSProvider, ROJIN_VOICE } from '@sorani/provider-tts';
import { TelephonyProviderRegistry, MockTelephonyProvider, TwilioProvider } from '@sorani/provider-telephony';
import { buildDefaultReservationProviders } from '@sorani/provider-reservations';

/** In-memory reservation repository (production: PrismaReservationRepository). */
class InMemoryReservationRepo implements ReservationRepository {
  private readonly map = new Map<string, Reservation>();

  async save(reservation: Reservation): Promise<void> {
    this.map.set(reservation.id, reservation);
  }
  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    const r = this.map.get(id);
    return r && r.tenantId === tenantId ? r : null;
  }
  async update(reservation: Reservation): Promise<void> {
    await this.save(reservation);
  }
  async all(): Promise<Reservation[]> {
    return Array.from(this.map.values());
  }
}

export interface AppContainer {
  config: Config;
  eventBus: EventBus;
  tenantService: TenantService;
  search: RestaurantSearchEngine;
  ranking: WeightedRankingEngine;
  orchestrator: ReservationOrchestrator;
  reservationRepo: InMemoryReservationRepo;
  restaurantRepo: InMemoryRestaurantRepository;
  agent: AIAgent;
  agentServices: AgentServices;
  telephony: TelephonyOrchestrator;
  auth: AuthService;
  callService: CallService;
  customerService: CustomerService;
  notificationService: NotificationService;
  analytics: AnalyticsService;
  llmRegistry: LLMProviderRegistry;
  sttRegistry: STTProviderRegistry;
  ttsRegistry: TTSProviderRegistry;
  telephonyRegistry: TelephonyProviderRegistry;
  reservationRegistry: ReservationProviderRegistry;
}

export function buildContainer(cfg?: Config): AppContainer {
  const config = cfg ?? createConfig();
  setConfig(config);

  const ctx = { tenantId: config.defaultTenantId };

  // --- events
  const eventBus = new InMemoryEventBus();

  // --- restaurants
  const restaurantRepo = new InMemoryRestaurantRepository();
  const search = new RestaurantSearchEngine(restaurantRepo);
  const ranking = new WeightedRankingEngine();

  // --- tenants / auth / customers / calls / notifications / analytics
  const tenantService = new TenantService(new InMemoryTenantRepository([demoTenant()]));
  const auth = new AuthService(config.jwtSecret);
  const customerRepo = new InMemoryCustomerRepository();
  const customerService = new CustomerService(customerRepo);
  const callRepo = new InMemoryCallRepository();
  const callService = new CallService(callRepo);
  const notificationService = new NotificationService();
  const analytics = new AnalyticsService();
  const users = demoUsers();

  // seed demo customers & calls (synchronous in-memory stores)
  const seedCustomers = [
    { name: 'Ahmad Rasul', phone: '+9647501234001', email: 'ahmad@example.com' },
    { name: 'Sara Hama', phone: '+9647501234002', email: 'sara@example.com' },
    { name: 'Dler Omar', phone: '+9647501234003', email: 'dler@example.com' },
  ];
  for (const c of seedCustomers) {
    void customerRepo.save({ id: generateId('cus'), tenantId: ctx.tenantId, ...c, createdAt: nowIso() });
  }
  const seedCalls = [
    { callId: 'call-demo-1', type: CallType.CUSTOMER, restaurantId: 'rest-hewar' },
    { callId: 'call-demo-2', type: CallType.RESTAURANT_PHONE_BOOKING, restaurantId: 'rest-italian-house' },
  ];
  for (const c of seedCalls) {
    void callRepo.save({
      id: generateId('rec'), tenantId: ctx.tenantId, callId: c.callId, direction: CallDirection.INBOUND, type: c.type,
      status: CallStatus.COMPLETED, restaurantId: c.restaurantId, startedAt: nowIso(), endedAt: nowIso(),
    });
  }

  // --- LLM providers
  // Default 'mock' uses the conversational simulation brain. When LM Studio is
  // selected, use it as the primary LLM with automatic fallback to simulation
  // if no model is currently loaded in LM Studio.
  const simulationLLM = new SimulationAgentLLM();
  const llmRegistry = new LLMProviderRegistry();
  llmRegistry.register(simulationLLM);
  if (config.provider.lmStudioBaseUrl) {
    llmRegistry.register(new LMStudioProvider({ baseUrl: config.provider.lmStudioBaseUrl, model: config.provider.lmStudioModel }));
  }
  let llm = llmRegistry.get(config.provider.llm);
  if (config.provider.llm === 'lm-studio') {
    llm = new FallbackLLMProvider(llm, simulationLLM);
  }

  // --- STT / TTS providers
  const sttRegistry = new STTProviderRegistry();
  sttRegistry.register(new MockSTTProvider());
  if (config.provider.openaiApiKey) {
    sttRegistry.register(new OpenAIWhisperProvider({ apiKey: config.provider.openaiApiKey, model: config.provider.openaiSttModel }));
  }
  sttRegistry.register(kurdishSTTProvider({ apiKey: config.provider.kurdishSttApiKey, dialect: 'sorani' }));
  sttRegistry.register(localWhisperSTTProvider({ url: config.provider.sttWhisperUrl }));
  const stt = sttRegistry.get(config.provider.stt);

  const ttsRegistry = new TTSProviderRegistry();
  ttsRegistry.register(new MockTTSProvider());
  ttsRegistry.register(elevenLabsTTSProvider({
    apiKey: config.provider.elevenlabsApiKey,
    voiceId: config.provider.elevenlabsVoiceId,
  }));
  ttsRegistry.register(azureTTSProvider({
    key: config.provider.azureSpeechKey,
    region: config.provider.azureSpeechRegion,
    voice: config.provider.azureTtsVoice,
  }));
  ttsRegistry.register(kurdishTTSProvider({
    apiKey: config.provider.kurdishTtsApiKey,
    speakerId: config.provider.kurdishTtsSpeakerId,
    modelVersion: config.provider.kurdishTtsModelVersion,
  }));
  ttsRegistry.register(localPiperTTSProvider({ url: config.provider.ttsPiperUrl }));
  const tts = ttsRegistry.get(config.provider.tts);

  // --- telephony providers
  const telephonyRegistry = new TelephonyProviderRegistry();
  telephonyRegistry.register(new MockTelephonyProvider());
  if (config.provider.telephony === 'twilio') {
    telephonyRegistry.register(new TwilioProvider({
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    }));
  }
  const telephonyProvider = telephonyRegistry.get(config.provider.telephony);

  // --- reservation providers + orchestrator
  const reservationRegistry = new ReservationProviderRegistry();
  const reservationRepo = new InMemoryReservationRepo();
  buildDefaultReservationProviders({
    registry: reservationRegistry,
    search,
    mock: { failureRate: config.mock.reservationFailureRate, latencyMs: config.mock.latencyMs },
  });

  const orchestrator = new ReservationOrchestrator({
    registry: reservationRegistry,
    search,
    repositories: { reservations: reservationRepo, idempotency: new MemoryIdempotencyStore() },
    eventBus,
  });

  // --- telephony orchestrator
  const telephony = new TelephonyOrchestrator(
    telephonyProvider,
    search,
    createSimulatedCallConverser(),
    eventBus,
  );

  // --- AI agent
  const agentServices: AgentServices = {
    search,
    ranking,
    reservations: {
      checkAvailability: (req) => orchestrator.checkAvailability(req, ctx),
      createReservation: (req) =>
        orchestrator.createReservation({ ...req }, ctx).then((r) => ({ id: r.id, status: r.status })),
      cancelReservation: (req) => orchestrator.cancelReservation(req, ctx),
      getReservation: (reservationId) => orchestrator.getReservation(reservationId, ctx),
    },
    telephony: {
      callRestaurant: (args) => telephony.placeRestaurantCall(args.restaurantId, args.locationId, args, ctx),
      transferToHuman: (sessionId) => {
        void sessionId;
        return Promise.resolve();
      },
      endCall: (sessionId) => {
        void sessionId;
        return Promise.resolve();
      },
    },
  };

  const tools = new AgentToolRegistry();
  for (const tool of createRojinTools(agentServices)) tools.register(tool);

  const agent = new AIAgent({ llm, tools });

  // wire event → analytics
  eventBus.subscribe('*', (e) => analytics.ingest(e.type));

  getGlobalLogger().info('container.built', { llm: config.provider.llm, stt: config.provider.stt, tts: config.provider.tts, telephony: config.provider.telephony });

  return {
    config,
    eventBus,
    tenantService,
    search,
    ranking,
    orchestrator,
    reservationRepo,
    restaurantRepo,
    agent,
    agentServices,
    telephony,
    auth,
    callService,
    customerService,
    notificationService,
    analytics,
    llmRegistry,
    sttRegistry,
    ttsRegistry,
    telephonyRegistry,
    reservationRegistry,
  };
}
