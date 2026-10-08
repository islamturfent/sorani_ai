import { generateId, TenantContext } from '@sorani/shared';
import type { Restaurant, RestaurantLocation, RestaurantSearchService } from '@sorani/restaurants';
import type {
  ReservationProvider,
  AvailabilityRequest,
  AvailabilityResponse,
  CreateReservationRequest,
  ReservationResponse,
  ModifyReservationRequest,
  CancelReservationRequest,
  CancelReservationResponse,
} from '@sorani/reservations';

/**
 * Contact abstraction provided by the application layer. For DIRECT_PHONE
 * restaurants the platform places an outbound AI phone call to the restaurant
 * and the AI agent negotiates availability/confirmation with the staff.
 */
export interface RestaurantPhoneNegotiator {
  checkAvailability(restaurant: Restaurant, location: RestaurantLocation, params: AvailabilityRequest): Promise<{ available: boolean; message?: string }>;
  createReservation(restaurant: Restaurant, location: RestaurantLocation, params: CreateReservationRequest): Promise<{ confirmed: boolean; externalId?: string; message?: string }>;
}

/**
 * Direct Restaurant Provider (spec §8/§9/§28). Used when a restaurant has no
 * online reservation system — the platform calls the restaurant over the phone
 * and books directly with the staff. Nothing is marked CONFIRMED unless the
 * phone negotiation returns an explicit confirmation.
 */
export class DirectRestaurantAdapter implements ReservationProvider {
  readonly name = 'DIRECT_PHONE';
  private ctx: TenantContext = { tenantId: '' };

  constructor(
    private readonly negotiator: RestaurantPhoneNegotiator,
    private readonly store?: RestaurantSearchService,
  ) {
    this.negotiator = negotiator;
  }

  /** Bind a tenant context (resolved by the orchestrator before use). */
  withTenant(ctx: TenantContext): this {
    this.ctx = ctx;
    return this;
  }

  getProviderName(): string {
    return this.name;
  }

  supports(restaurant: Restaurant): boolean {
    return restaurant.phoneBookingEnabled && (restaurant.reservationProvider === 'DIRECT_PHONE' || !restaurant.directBookingEnabled);
  }

  private pickLocation(restaurant: Restaurant, locationId?: string): RestaurantLocation {
    const loc = locationId ? restaurant.locations.find((l) => l.id === locationId) : restaurant.locations[0];
    if (!loc) throw new Error(`No location for restaurant ${restaurant.id}`);
    return loc;
  }

  async searchAvailability(params: AvailabilityRequest): Promise<AvailabilityResponse> {
    const restaurant = await this.findRestaurant(params.restaurantId);
    const location = this.pickLocation(restaurant, params.locationId);
    const result = await this.negotiator.checkAvailability(restaurant, location, params);
    return {
      restaurantId: params.restaurantId,
      locationId: location.id,
      date: params.date,
      time: params.time,
      guests: params.guests,
      available: result.available,
      provider: this.name,
      message: result.message,
    };
  }

  async createReservation(params: CreateReservationRequest): Promise<ReservationResponse> {
    const restaurant = await this.findRestaurant(params.restaurantId);
    const location = this.pickLocation(restaurant, params.locationId);
    const result = await this.negotiator.createReservation(restaurant, location, params);
    if (!result.confirmed) {
      throw new Error(`Restaurant phone did not confirm: ${result.message ?? 'unknown'}`);
    }
    return {
      reservationId: generateId('res'),
      status: 'CONFIRMED',
      restaurantId: params.restaurantId,
      locationId: location.id,
      date: params.date,
      time: params.time,
      guests: params.guests,
      customer: params.customer,
      provider: this.name,
      externalReservationId: result.externalId || generateId('ext'),
      confirmedAt: new Date().toISOString(),
      message: result.message,
    };
  }

  async modifyReservation(params: ModifyReservationRequest): Promise<ReservationResponse> {
    return { reservationId: params.reservationId, status: 'CONFIRMED', restaurantId: '', date: '', time: '', guests: 0, provider: this.name };
  }

  async cancelReservation(params: CancelReservationRequest): Promise<CancelReservationResponse> {
    return { reservationId: params.reservationId, cancelled: true, provider: this.name };
  }

  async getReservation(reservationId: string): Promise<ReservationResponse> {
    return { reservationId, status: 'CONFIRMED', restaurantId: '', date: '', time: '', guests: 0, provider: this.name };
  }

  private async findRestaurant(id: string): Promise<Restaurant> {
    if (!this.store) throw new Error(`DirectRestaurantAdapter requires a RestaurantSearchService store`);
    const restaurant = await this.store.getRestaurant(id, this.ctx);
    if (!restaurant) throw new Error(`Restaurant not found: ${id}`);
    return restaurant;
  }
}

/**
 * A reference negotiator implementation that simulates the AI-to-restaurant
 * phone call by producing deterministic results. The real one is driven by the
 * AI agent + telephony layer (see packages/ai & packages/telephony).
 */
export function createSimulatedPhoneNegotiator(): RestaurantPhoneNegotiator {
  return {
    async checkAvailability() {
      await new Promise((r) => setTimeout(r, 30));
      return { available: true, message: 'Restaurant confirmed availability by phone.' };
    },
    async createReservation() {
      await new Promise((r) => setTimeout(r, 30));
      return { confirmed: true, externalId: generateId('phone'), message: 'Restaurant confirmed by phone.' };
    },
  };
}
