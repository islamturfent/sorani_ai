import { generateId, getGlobalLogger } from '@sorani/shared';
import type { DomainEvent, DomainEventType, EventHandler } from './types';

/**
 * Internal event bus abstraction.
 *
 * The platform code only ever depends on `EventBus` (publish/subscribe). The
 * concrete transport (in-memory for now, Redis/RabbitMQ/Kafka later) is behind
 * this interface, so swapping transports never touches business logic.
 */
export interface EventBus {
  publish<T extends DomainEvent['payload']>(event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>): Promise<void>;
  subscribe(type: DomainEventType | '*', handler: EventHandler): () => void;
}

/**
 * In-memory event bus. Useful for local dev and tests. In production, wrap a
 * Redis pub/sub or outbox relay behind the same `EventBus` interface.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<DomainEventType | '*', Set<EventHandler<never>>>();

  async publish<T extends DomainEvent['payload']>(
    event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    const full: DomainEvent<T> = {
      ...event,
      eventId: generateId('evt'),
      occurredAt: new Date().toISOString(),
    };
    const logger = getGlobalLogger();
    logger.debug('event.publish', { type: full.type, eventId: full.eventId });

    const targets = new Set<EventHandler<never>>();
    this.handlers.get(full.type)?.forEach((h) => targets.add(h));
    this.handlers.get('*')?.forEach((h) => targets.add(h));

    for (const handler of targets) {
      try {
        await handler(full as DomainEvent<never>);
      } catch (err) {
        logger.error('event.handler_failed', {
          type: full.type,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  subscribe(type: DomainEventType | '*', handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as EventHandler<never>);
    return () => this.handlers.get(type)?.delete(handler as EventHandler<never>);
  }
}
