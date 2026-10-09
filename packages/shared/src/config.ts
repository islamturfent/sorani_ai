// ===========================================================================
// Typed configuration loader. Reads from process.env with typed coercion and
// defaults, so no module hard-depends on a provider or environment library.
// ===========================================================================

export interface Config {
  env: string;
  port: number;
  apiUrl: string;
  databaseUrl: string;
  redisUrl: string;
  defaultTenantId: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  encryptionKey: string;
  webhookSigningSecret: string;
  provider: {
    llm: string;
    stt: string;
    tts: string;
    telephony: string;
    reservationDefault: string;
    lmStudioBaseUrl: string;
    lmStudioModel: string;
    openaiApiKey: string;
    openaiModel: string;
    openaiSttModel: string;
    kurdishSttApiKey: string;
    sttWhisperUrl: string;
    anthropicApiKey: string;
    anthropicModel: string;
    ttsVoiceId: string;
    elevenlabsApiKey: string;
    elevenlabsVoiceId: string;
    azureSpeechKey: string;
    azureSpeechRegion: string;
    azureTtsVoice: string;
    kurdishTtsApiKey: string;
    kurdishTtsSpeakerId: string;
    kurdishTtsModelVersion: string;
    ttsPiperUrl: string;
  };
  mock: {
    latencyMs: number;
    reservationFailureRate: number;
  };
  simulation: {
    useMic: boolean;
  };
  timezone: string;
}

function env(key: string, fallback = ''): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function envInt(key: string, fallback: number): number {
  const value = parseInt(env(key, String(fallback)), 10);
  return Number.isFinite(value) ? value : fallback;
}

function envFloat(key: string, fallback: number): number {
  const value = parseFloat(env(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const value = env(key, String(fallback)).toLowerCase();
  return value === 'true' ? true : value === 'false' ? false : fallback;
}

export function createConfig(overrides: Partial<Config> = {}): Config {
  const cfg: Config = {
    env: env('NODE_ENV', 'development'),
    port: envInt('PORT', 4000),
    apiUrl: env('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api'),
    databaseUrl:
      env('DATABASE_URL', 'postgresql://sorani:sorani@localhost:5432/sorani?schema=public'),
    redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
    defaultTenantId: env('DEFAULT_TENANT_ID', 'platform'),
    jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
    jwtExpiresIn: env('JWT_EXPIRES_IN', '1d'),
    encryptionKey: env('ENCRYPTION_KEY', 'dev-encryption-key-not-for-production'),
    webhookSigningSecret: env('WEBHOOK_SIGNING_SECRET', 'dev-webhook-secret'),
    provider: {
      llm: env('LLM_PROVIDER', 'mock'),
      stt: env('STT_PROVIDER', 'mock'),
      tts: env('TTS_PROVIDER', 'mock'),
      telephony: env('TELEPHONY_PROVIDER', 'mock'),
      reservationDefault: env('RESERVATION_PROVIDER', 'mock'),
      lmStudioBaseUrl: env('LM_STUDIO_BASE_URL', 'http://localhost:1234/v1'),
      lmStudioModel: env('LM_STUDIO_MODEL', 'sorani-agent'),
      openaiApiKey: env('OPENAI_API_KEY', ''),
      openaiModel: env('OPENAI_MODEL', 'gpt-4o-mini'),
      openaiSttModel: env('OPENAI_STT_MODEL', 'whisper-1'),
      kurdishSttApiKey: env('KURDISH_STT_API_KEY', ''),
      sttWhisperUrl: env('STT_WHISPER_URL', 'http://localhost:5100'),
      anthropicApiKey: env('ANTHROPIC_API_KEY', ''),
      anthropicModel: env('ANTHROPIC_MODEL', 'claude-3-5-sonnet'),
      ttsVoiceId: env('TTS_VOICE_ID', 'sorani-female-rojin'),
      elevenlabsApiKey: env('ELEVENLABS_API_KEY', ''),
      elevenlabsVoiceId: env('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'),
      azureSpeechKey: env('AZURE_SPEECH_KEY', ''),
      azureSpeechRegion: env('AZURE_SPEECH_REGION', 'eastus'),
      azureTtsVoice: env('AZURE_TTS_VOICE', 'ar-SA-HudaNeural'),
      kurdishTtsApiKey: env('KURDISH_TTS_API_KEY', ''),
      kurdishTtsSpeakerId: env('KURDISH_TTS_SPEAKER_ID', 'sorani_986'),
      kurdishTtsModelVersion: env('KURDISH_TTS_MODEL', 'v4'),
      ttsPiperUrl: env('TTS_PIPER_URL', 'http://localhost:5101'),
    },
    mock: {
      latencyMs: envInt('MOCK_LATENCY_MS', 50),
      reservationFailureRate: envFloat('MOCK_RESERVATION_FAILURE_RATE', 0.1),
    },
    simulation: {
      useMic: envBool('SIMULATION_USE_MIC', true),
    },
    timezone: env('TZ', 'Asia/Erbil'),
  };
  return { ...cfg, ...overrides };
}

let cached: Config | null = null;

/** Singleton config. In tests, use createConfig() or resetConfig(). */
export function getConfig(): Config {
  if (!cached) cached = createConfig();
  return cached;
}

export function setConfig(config: Config): void {
  cached = config;
}

export function resetConfig(): void {
  cached = null;
}
