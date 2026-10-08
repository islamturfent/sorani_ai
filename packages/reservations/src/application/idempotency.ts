import { DuplicateReservationError, generateId, nowIso } from '@sorani/shared';
import type { Reservation } from '../domain/models';

/**
 * Idempotency guard. Prevents duplicate reservations when a request is retried
 * (e.g. after a failed provider triggers a fallback attempt). In production this
 * is backed by Redis/Postgres with a unique constraint on the idempotency key.
 */
export interface IdempotencyStore {
  /** Returns the previously stored result if the key exists, else undefined. */
  get(key: string): Promise<Reservation | undefined>;
  /** Atomically store the reservation for the key. Throws DuplicateReservationError on collision. */
  set(key: string, reservation: Reservation): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, Reservation>();

  async get(key: string): Promise<Reservation | undefined> {
    return this.map.get(key);
  }

  async set(key: string, reservation: Reservation): Promise<void> {
    if (this.map.has(key)) {
      throw new DuplicateReservationError(`Duplicate reservation for idempotency key: ${key}`);
    }
    this.map.set(key, reservation);
  }
}

/** Builds a stable idempotency key from request dimensions. */
export function buildIdempotencyKey(p: {
  tenantId: string;
  restaurantId: string;
  customerId?: string;
  date: string;
  time: string;
  guests: number;
}): string {
  const customer = p.customerId || 'anonymous';
  return `reservation:${p.tenantId}:${p.restaurantId}:${customer}:${p.date}:${p.time}:${p.guests}`;
}

export function newReservation(partial: Partial<Reservation> & Pick<Reservation, 'tenantId' | 'restaurantId' | 'date' | 'time' | 'guests'>): Reservation {
  const ts = nowIso();
  return {
    id: generateId('res'),
    status: 'PENDING',
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}
