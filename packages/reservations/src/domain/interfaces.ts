import type { Restaurant } from '@sorani/restaurants';
import type { CustomerInfo } from './models';

/** String-literal status values (equal to the shared enum string values). */
export type ReservationStatusValue =
  | 'PENDING'
  | 'AVAILABILITY_CHECK'
  | 'AWAITING_CUSTOMER_CONFIRMATION'
  | 'CREATING'
  | 'CONFIRMED'
  | 'MODIFICATION_PENDING'
  | 'CANCELLED'
  | 'FAILED';

/** Time slot availability offered to a customer. */
export interface ReservationSlot {
  id: string;
  restaurantId: string;
  locationId: string;
  date: string;
  time: string;
  guests: number;
  available: boolean;
  provider?: string;
  capacity?: number;
}

export interface AvailabilityRequest {
  restaurantId: string;
  locationId?: string;
  date: string;
  time: string;
  guests: number;
  preferences?: Record<string, unknown>;
}

export interface AvailabilityResponse {
  restaurantId: string;
  locationId?: string;
  date: string;
  time: string;
  guests: number;
  available: boolean;
  slots?: ReservationSlot[];
  provider?: string;
  message?: string;
}

export interface CreateReservationRequest {
  restaurantId: string;
  locationId: string;
  date: string;
  time: string;
  guests: number;
  customer: CustomerInfo;
  specialRequests?: string;
  idempotencyKey?: string;
  source?: 'voice' | 'web' | 'api' | 'simulation';
}

export interface ModifyReservationRequest {
  reservationId: string;
  date?: string;
  time?: string;
  guests?: number;
  locationId?: string;
  specialRequests?: string;
}

export interface CancelReservationRequest {
  reservationId: string;
  reason?: string;
}

export interface CancelReservationResponse {
  reservationId: string;
  cancelled: boolean;
  provider?: string;
  message?: string;
}

export interface ReservationResponse {
  reservationId: string;
  status: ReservationStatusValue;
  restaurantId: string;
  locationId?: string;
  date: string;
  time: string;
  guests: number;
  customer?: CustomerInfo;
  provider?: string;
  externalReservationId?: string;
  confirmedAt?: string;
  message?: string;
}

/**
 * Provider-independent reservation interface. Every reservation back-end
 * (Provider A/B/C, Direct Restaurant phone, Mock) implements exactly this.
 */
export interface ReservationProvider {
  getProviderName(): string;
  supports(restaurant: Restaurant): boolean;
  searchAvailability(params: AvailabilityRequest): Promise<AvailabilityResponse>;
  createReservation(params: CreateReservationRequest): Promise<ReservationResponse>;
  modifyReservation(params: ModifyReservationRequest): Promise<ReservationResponse>;
  cancelReservation(params: CancelReservationRequest): Promise<CancelReservationResponse>;
  getReservation(reservationId: string): Promise<ReservationResponse>;
}
