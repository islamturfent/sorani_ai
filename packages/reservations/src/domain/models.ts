import { ReservationStatus } from '@sorani/shared';
import type { TenantContext } from '@sorani/shared';
import type { ReservationStatusValue } from './interfaces';

export interface CustomerInfo {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * A reservation as stored/platform-facing aggregate. Providers return a
 * ReservationResponse; the platform persists this aggregate.
 */
export interface Reservation {
  id: string;
  tenantId: string;
  restaurantId: string;
  locationId?: string;
  status: ReservationStatusValue;
  date: string;
  time: string;
  guests: number;
  customer?: CustomerInfo;
  specialRequests?: string;
  provider?: string;
  providerTransactionId?: string;
  externalReservationId?: string;
  idempotencyKey?: string;
  createdBy?: 'voice' | 'web' | 'api' | 'simulation';
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  events?: ReservationEvent[];
}

export interface ReservationEvent {
  id: string;
  reservationId: string;
  type: string;
  occurredAt: string;
  context?: Partial<TenantContext>;
  payload?: unknown;
}

export function reservationStateMachine(
  from: ReservationStatusValue,
  to: ReservationStatusValue,
): boolean {
  const allowed: Record<string, ReservationStatusValue[]> = {
    [ReservationStatus.PENDING]: ['AVAILABILITY_CHECK', 'FAILED', 'CANCELLED'],
    [ReservationStatus.AVAILABILITY_CHECK]: ['AWAITING_CUSTOMER_CONFIRMATION', 'CREATING', 'FAILED', 'CANCELLED'],
    [ReservationStatus.AWAITING_CUSTOMER_CONFIRMATION]: ['CREATING', 'CANCELLED', 'FAILED', 'CONFIRMED'],
    [ReservationStatus.CREATING]: ['CONFIRMED', 'FAILED', 'CANCELLED'],
    [ReservationStatus.CONFIRMED]: ['MODIFICATION_PENDING', 'CANCELLED'],
    [ReservationStatus.MODIFICATION_PENDING]: ['CONFIRMED', 'FAILED', 'CANCELLED'],
    [ReservationStatus.CANCELLED]: [],
    [ReservationStatus.FAILED]: [],
  };
  return allowed[from]?.includes(to) ?? false;
}
