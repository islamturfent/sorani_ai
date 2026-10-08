import { generateId } from '@sorani/shared';
import type { Restaurant } from '@sorani/restaurants';
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
 * Mock reservation provider for development/tests. Simulates availability by
 * a simple pseudo-random rule and simulates failures at a configurable rate so
 * fallback logic can be exercised without any external service.
 */
export class MockReservationProvider implements ReservationProvider {
  readonly name = 'mock';

  constructor(
    private readonly opts: { failureRate: number; latencyMs?: number } = { failureRate: 0.1 },
  ) {}

  getProviderName(): string {
    return this.name;
  }

  supports(_restaurant: Restaurant): boolean {
    return true;
  }

  private async wait(): Promise<void> {
    if (this.opts.latencyMs) await new Promise((r) => setTimeout(r, this.opts.latencyMs));
  }

  private maybeFail(restaurantId: string): void {
    // deterministic-ish pseudo random based on restaurant id + time bucket
    const seed = (restaurantId.charCodeAt(0) + restaurantId.length) % 100;
    if (seed < this.opts.failureRate * 100) {
      throw new Error(`MockReservationProvider simulated failure for restaurant ${restaurantId}`);
    }
  }

  async searchAvailability(params: AvailabilityRequest): Promise<AvailabilityResponse> {
    await this.wait();
    // Simulate: available if total seats heuristic > 1, i.e. nearly always.
    const available = (params.guests ?? 4) <= 8;
    return {
      restaurantId: params.restaurantId,
      locationId: params.locationId,
      date: params.date,
      time: params.time,
      guests: params.guests,
      available,
      provider: this.name,
      slots: available
        ? [{ id: generateId('slot'), restaurantId: params.restaurantId, locationId: params.locationId!, date: params.date, time: params.time, guests: params.guests, available: true, provider: this.name }]
        : [],
    };
  }

  async createReservation(params: CreateReservationRequest): Promise<ReservationResponse> {
    await this.wait();
    this.maybeFail(params.restaurantId);
    return {
      reservationId: generateId('res'),
      status: 'CONFIRMED',
      restaurantId: params.restaurantId,
      locationId: params.locationId,
      date: params.date,
      time: params.time,
      guests: params.guests,
      customer: params.customer,
      provider: this.name,
      externalReservationId: generateId('ext'),
      confirmedAt: new Date().toISOString(),
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
}
