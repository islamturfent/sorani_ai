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
 * Example adapter for an external reservation API ("Provider A"). Demonstrates
 * provider isolation: it only supports restaurants whose connection config
 * names PROVIDER_A, and talks to an external REST endpoint. Add Provider B/C
 * following the exact same interface.
 */
export class ProviderAAdapter implements ReservationProvider {
  readonly name = 'PROVIDER_A';

  constructor(private readonly opts: { baseUrl: string; apiKey: string }) {}

  getProviderName(): string {
    return this.name;
  }

  supports(restaurant: Restaurant): boolean {
    return restaurant.reservationProvider === 'PROVIDER_A' && restaurant.directBookingEnabled;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`ProviderA returned ${res.status}`);
    return (await res.json()) as T;
  }

  async searchAvailability(params: AvailabilityRequest): Promise<AvailabilityResponse> {
    void (await this.call('/availability', params));
    return {
      restaurantId: params.restaurantId,
      locationId: params.locationId,
      date: params.date,
      time: params.time,
      guests: params.guests,
      available: true,
      provider: this.name,
    };
  }

  async createReservation(params: CreateReservationRequest): Promise<ReservationResponse> {
    const res = await this.call<{ id: string }>('/reservations', params);
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
      externalReservationId: res.id,
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
