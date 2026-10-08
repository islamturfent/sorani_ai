import { TenantContext } from '@sorani/shared';
import type {
  Restaurant,
  RestaurantLocation,
  RestaurantRankingService,
  RestaurantSearchService,
  RankingContext,
} from '@sorani/restaurants';
import type {
  AvailabilityResponse,
  CancelReservationResponse,
  CreateReservationRequest,
  ReservationResponse,
} from '@sorani/reservations';
import type { AgentTool } from './tools';
import type { AgentSessionState } from '../domain/agent';

/** Booking gateway the agent uses for reservation lifecycle (provider-agnostic). */
export interface AgentReservationGateway {
  checkAvailability(req: {
    restaurantId: string;
    locationId?: string;
    date: string;
    time: string;
    guests: number;
  }): Promise<AvailabilityResponse>;
  createReservation(req: CreateReservationRequest): Promise<{ id: string; status: string }>;
  cancelReservation(req: { reservationId: string; reason?: string }): Promise<CancelReservationResponse>;
  getReservation(reservationId: string): Promise<ReservationResponse>;
}

/** Telephony hand-offs the agent can trigger. */
export interface AgentTelephonyGateway {
  callRestaurant(args: {
    restaurantId: string;
    locationId?: string;
    date: string;
    time: string;
    guests: number;
    customerName?: string;
    customerPhone?: string;
  }): Promise<{ ok: boolean; message: string }>;
  transferToHuman(sessionId: string): Promise<void>;
  endCall(sessionId: string): Promise<void>;
}

export interface AgentServices {
  search: RestaurantSearchService;
  ranking: RestaurantRankingService;
  reservations: AgentReservationGateway;
  telephony: AgentTelephonyGateway;
}

const str = (x: unknown) => (typeof x === 'string' ? x : undefined);
const num = (x: unknown) => (typeof x === 'number' ? x : undefined);

function summarize(r: Restaurant, loc: RestaurantLocation, availability?: boolean): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    city: loc.city,
    location: loc.name,
    cuisine: r.cuisineTypes,
    priceRange: r.priceRange,
    rating: r.rating,
    features: r.features,
    available: availability ?? false,
  };
}

/** Builds the full set of Rojin agent tools wired to the injected services. */
export function createRojinTools(services: AgentServices): AgentTool[] {
  const tools: AgentTool[] = [];

  tools.push({
    name: 'search_restaurants',
    description:
      'Search restaurants across cities by cuisine, name, area or other criteria. Use when the customer has NOT chosen a specific restaurant.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        area: { type: 'string' },
        cuisine: { type: 'string' },
        restaurantName: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        guests: { type: 'number' },
        priceRange: { type: 'string' },
        ratingMin: { type: 'number' },
        features: { type: 'array', items: { type: 'string' } },
      },
    },
    async execute(args, ctx) {
      const results = await services.search.search(
        {
          city: str(args.city),
          area: str(args.area),
          cuisine: str(args.cuisine),
          restaurantName: str(args.restaurantName),
          date: str(args.date),
          time: str(args.time),
          guests: num(args.guests),
          priceRange: str(args.priceRange),
          ratingMin: num(args.ratingMin),
          features: Array.isArray(args.features) ? args.features.map(String) : undefined,
        },
        ctx,
      );
      const ranked = await services.ranking.rank(results, { preferredCuisine: str(args.cuisine) });
      return ranked.map((r) => summarize(r.restaurant, r.location));
    },
  });

  tools.push({
    name: 'get_restaurant',
    description: 'Get a single restaurant by id.',
    parameters: { type: 'object', properties: { restaurantId: { type: 'string' } }, required: ['restaurantId'] },
    async execute(args, ctx) {
      const restaurant = await services.search.getRestaurant(str(args.restaurantId) || '', ctx);
      return restaurant ? { id: restaurant.id, name: restaurant.name, description: restaurant.description } : null;
    },
  });

  tools.push({
    name: 'search_availability',
    description: 'Check real availability at a specific restaurant for a date/time/party size.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string' },
        locationId: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        guests: { type: 'number' },
      },
      required: ['restaurantId', 'date', 'time', 'guests'],
    },
    async execute(args, ctx) {
      const response = await services.reservations.checkAvailability({
        restaurantId: str(args.restaurantId) || '',
        locationId: str(args.locationId),
        date: str(args.date) || '',
        time: str(args.time) || '',
        guests: num(args.guests) || 1,
      });
      return response;
    },
  });

  tools.push({
    name: 'compare_restaurants',
    description: 'Compare several restaurants side by side for the customer to choose.',
    parameters: { type: 'object', properties: { restaurantIds: { type: 'array', items: { type: 'string' } } } },
    async execute(args, ctx) {
      const ids = Array.isArray(args.restaurantIds) ? args.restaurantIds.map(String) : [];
      const comparisons = [];
      for (const id of ids) {
        const r = await services.search.getRestaurant(id, ctx);
        if (!r) continue;
        for (const loc of r.locations.slice(0, 1)) {
          comparisons.push(summarize(r, loc));
        }
      }
      return comparisons;
    },
  });

  tools.push({
    name: 'get_restaurant_details',
    description: 'Get full restaurant details: branches, opening hours, features, phone numbers.',
    parameters: { type: 'object', properties: { restaurantId: { type: 'string' } }, required: ['restaurantId'] },
    async execute(args, ctx) {
      const r = await services.search.getRestaurant(str(args.restaurantId) || '', ctx);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        cuisineTypes: r.cuisineTypes,
        priceRange: r.priceRange,
        rating: r.rating,
        features: r.features,
        phoneNumbers: r.phoneNumbers,
        website: r.website,
        locations: r.locations.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          city: l.city,
          timezone: l.timezone,
          phone: l.phone,
          openingHours: l.openingHours,
        })),
      };
    },
  });

  tools.push({
    name: 'create_reservation',
    description: 'Create a reservation. ONLY call after the customer explicitly confirms the summary (restaurant, branch, date, time, guests).',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string' },
        locationId: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        guests: { type: 'number' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        specialRequests: { type: 'string' },
      },
      required: ['restaurantId', 'date', 'time', 'guests'],
    },
    async execute(args, ctx, session) {
      const result = await services.reservations.createReservation({
        restaurantId: str(args.restaurantId) || '',
        locationId: str(args.locationId) || session.locationId || '',
        date: str(args.date) || '',
        time: str(args.time) || '',
        guests: num(args.guests) || 0,
        customer: {
          name: str(args.customerName) || session.customerName,
          phone: str(args.customerPhone) || session.customerPhone,
        },
        specialRequests: str(args.specialRequests) || session.specialRequests,
        source: 'voice',
      });
      // update session state for later turns
      session.confirmed = result.status === 'CONFIRMED';
      return result;
    },
  });

  tools.push({
    name: 'modify_reservation',
    description: 'Modify an existing reservation (date/time/guests).',
    parameters: { type: 'object', properties: { reservationId: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, guests: { type: 'number' } } },
    async execute() {
      // Requires agent reservation gateway support; here we delegate via get/cancel path.
      return { supported: false, message: 'Use cancel_reservation then create_reservation for now.' };
    },
  });

  tools.push({
    name: 'cancel_reservation',
    description: 'Cancel an existing reservation by id.',
    parameters: { type: 'object', properties: { reservationId: { type: 'string' }, reason: { type: 'string' } }, required: ['reservationId'] },
    async execute(args, ctx) {
      return services.reservations.cancelReservation({ reservationId: str(args.reservationId) || '', reason: str(args.reason) });
    },
  });

  tools.push({
    name: 'get_reservation',
    description: 'Retrieve reservation status/details by id.',
    parameters: { type: 'object', properties: { reservationId: { type: 'string' } }, required: ['reservationId'] },
    async execute(args, ctx) {
      return services.reservations.getReservation(str(args.reservationId) || '');
    },
  });

  tools.push({
    name: 'call_restaurant',
    description:
      'Place a phone call to the restaurant to book directly when online reservation is unavailable. Pass the booking details.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string' },
        locationId: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        guests: { type: 'number' },
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
      },
      required: ['restaurantId', 'date', 'time', 'guests'],
    },
    async execute(args, _ctx, session) {
      session.restaurantId = str(args.restaurantId);
      return services.telephony.callRestaurant({
        restaurantId: str(args.restaurantId) || '',
        locationId: str(args.locationId),
        date: str(args.date) || '',
        time: str(args.time) || '',
        guests: num(args.guests) || 0,
        customerName: str(args.customerName) || session.customerName,
        customerPhone: str(args.customerPhone) || session.customerPhone,
      });
    },
  });

  tools.push({
    name: 'transfer_to_human',
    description: 'Transfer the current call to a human operator. Use when the customer asks for a human.',
    parameters: { type: 'object', properties: {} },
    async execute(_args, _ctx, session) {
      await services.telephony.transferToHuman(session.sessionId);
      return { transferred: true };
    },
  });

  tools.push({
    name: 'end_call',
    description: 'End the conversation politely after the task is done.',
    parameters: { type: 'object', properties: {} },
    async execute(_args, _ctx, session) {
      await services.telephony.endCall(session.sessionId);
      return { ended: true };
    },
  });

  return tools;
}
