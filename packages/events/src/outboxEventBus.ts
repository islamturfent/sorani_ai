import { generateId } from '@sorani/shared';
import type { DomainEvent, EventHandler } from './types';
import type { EventBus } from './inMemoryEventBus';

/**
 * Transactional outbox pattern.
 *
 * Instead of publishing an event inside a DB transaction (which may be lost if
 * the transaction rolls back after a side-effect), handlers append events to an
 * outbox table in the same transaction. `OutboxPublisher` later relays those
 * rows onto the real `EventBus`.
 *
 * This keeps the door open for guaranteed delivery on Redis/RabbitMQ/Kafka.
 */
export interface OutboxWriter {
  append<T>(event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>): Promise<void>;
}

export interface OutboxRecord {
  payload: string;
  published: boolean;
}

export interface OutboxStore {
  write(events: Omit<DomainEvent, 'eventId' | 'occurredAt'>[]): Promise<void>;
  claim(batchSize: number): Promise<DomainEvent[]>;
  markPublished(eventIds: string[]): Promise<void>;
}

export class OutboxPublisher {
  constructor(
    private readonly store: OutboxStore,
    private readonly bus: EventBus,
  ) {}

  /** Relay claimed outbox rows onto the bus. Call on a loop/scheduler. */
  async flush(batchSize = 50): Promise<number> {
    const events = await this.store.claim(batchSize);
    for (const event of events) {
      await this.bus.publish({
        type: event.type,
        context: event.context,
        payload: event.payload,
      });
    }
    await this.store.markPublished(events.map((e) => e.eventId));
    return events.length;
  }
}

/** Convenience adapter wrapping an EventBus for the outbox schema. */
export class OutboxEventBus implements EventBus, OutboxWriter {
  constructor(
    private readonly delegate: EventBus,
    private readonly store: OutboxStore,
  ) {}

  async publish<T>(event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>): Promise<void> {
    await this.store.write([event as Omit<DomainEvent, 'eventId' | 'occurredAt'>]);
  }

  async append<T>(event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>): Promise<void> {
    await this.store.write([event as Omit<DomainEvent, 'eventId' | 'occurredAt'>]);
  }

  subscribe(type: Parameters<EventBus['subscribe']>[0], handler: EventHandler): () => void {
    return this.delegate.subscribe(type, handler);
  }
}

export function toDomainEvent<T>(
  event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>,
): DomainEvent<T> {
  return {
    ...event,
    eventId: generateId('evt'),
    occurredAt: new Date().toISOString(),
  };
}
