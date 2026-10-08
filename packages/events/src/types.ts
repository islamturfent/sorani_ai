import type { RequestContext } from '@sorani/shared';

/** Canonical domain event names. */
export const DomainEventType = {
  // restaurants
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',

  // reservations
  RESERVATION_REQUESTED: 'reservation.requested',
  RESERVATION_AVAILABILITY_CHECKED: 'reservation.availability_checked',
  RESERVATION_CONFIRMATION_REQUESTED: 'reservation.confirmation_requested',
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  RESERVATION_MODIFIED: 'reservation.modified',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_FAILED: 'reservation.failed',

  // calls
  CALL_STARTED: 'call.started',
  CALL_ENDED: 'call.ended',
  CALL_TRANSFERRED: 'call.transferred',

  // providers
  PROVIDER_FAILED: 'provider.failed',
  PROVIDER_RECOVERED: 'provider.recovered',

  // telephony
  TELEPHONY_CALL_RECEIVED: 'telephony.call_received',

  // analytics / misc
  AGENT_MESSAGE: 'agent.message',
} as const;
export type DomainEventType = (typeof DomainEventType)[keyof typeof DomainEventType];

export interface DomainEvent<T = unknown> {
  /** Canonical event name. */
  type: DomainEventType;
  /** Unique event id (idempotent delivery). */
  eventId: string;
  occurredAt: string;
  /** Correlation context. */
  context: Partial<RequestContext>;
  payload: T;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;
