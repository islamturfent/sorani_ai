import {
  DuplicateReservationError,
  ProviderFailedError,
  ProviderUnavailableError,
  ReservationConflictError,
  TenantContext,
  getGlobalLogger,
  nowIso,
} from '@sorani/shared';
import {
  DomainEventType,
  EventBus,
  InMemoryEventBus,
} from '@sorani/events';
import type { Restaurant, RestaurantSearchService } from '@sorani/restaurants';
import type {
  AvailabilityRequest,
  AvailabilityResponse,
  CancelReservationRequest,
  CancelReservationResponse,
  CreateReservationRequest,
  ModifyReservationRequest,
  ReservationResponse,
} from '../domain/interfaces';
import type { Reservation } from '../domain/models';
import { ReservationProviderRegistry } from './registry';
import { IdempotencyStore, MemoryIdempotencyStore, buildIdempotencyKey, newReservation } from './idempotency';

/** Persistence boundary for reservations. Implemented by Prisma/pg in prod. */
export interface ReservationRepository {
  save(reservation: Reservation): Promise<void>;
  findById(tenantId: string, id: string): Promise<Reservation | null>;
  update(reservation: Reservation): Promise<void>;
}

export interface ReservationOrchestratorOptions {
  registry: ReservationProviderRegistry;
  search: RestaurantSearchService;
  repositories: {
    reservations: ReservationRepository;
    idempotency?: IdempotencyStore;
  };
  eventBus?: EventBus;
}

/**
 * Central orchestration for reservations. Responsibilities (per spec §25):
 * find restaurant, pick provider, check availability, try fallbacks, create
 * reservation, confirm, persist, publish events — with idempotency guarantees.
 */
export class ReservationOrchestrator {
  private readonly registry: ReservationProviderRegistry;
  private readonly search: RestaurantSearchService;
  private readonly repo: ReservationRepository;
  private readonly idempotency: IdempotencyStore;
  private readonly bus: EventBus;

  constructor(opts: ReservationOrchestratorOptions) {
    this.registry = opts.registry;
    this.search = opts.search;
    this.repo = opts.repositories.reservations;
    this.idempotency = opts.repositories.idempotency ?? new MemoryIdempotencyStore();
    this.bus = opts.eventBus ?? new InMemoryEventBus();
  }

  async checkAvailability(
    request: AvailabilityRequest,
    ctx: TenantContext,
  ): Promise<AvailabilityResponse> {
    const restaurant = await this.requireRestaurant(request.restaurantId, ctx);
    const providers = this.registry.listForRestaurant(restaurant);

    let lastError: Error | undefined;
    for (const provider of providers) {
      try {
        const response = await provider.searchAvailability(request);
        if (response.available) return response;
        lastError = undefined;
      } catch (err) {
        lastError = err as Error;
        this.emitProviderFailure(provider.getProviderName(), err, ctx);
      }
    }
    if (lastError) throw lastError;

    return {
      restaurantId: request.restaurantId,
      locationId: request.locationId,
      date: request.date,
      time: request.time,
      guests: request.guests,
      available: false,
      message: 'No availability found through any provider',
    };
  }

  async createReservation(
    request: CreateReservationRequest,
    ctx: TenantContext,
  ): Promise<Reservation> {
    const restaurant = await this.requireRestaurant(request.restaurantId, ctx);
    const idempotencyKey = request.idempotencyKey || buildIdempotencyKey({
      tenantId: ctx.tenantId,
      restaurantId: request.restaurantId,
      customerId: request.customer.id,
      date: request.date,
      time: request.time,
      guests: request.guests,
    });

    // Idempotency: return existing result if a duplicate request arrives.
    const existing = await this.idempotency.get(idempotencyKey);
    if (existing) {
      getGlobalLogger().warn('reservation.duplicate_attempt', { idempotencyKey });
      return existing;
    }

    const reservation = newReservation({
      tenantId: ctx.tenantId,
      restaurantId: request.restaurantId,
      locationId: request.locationId,
      date: request.date,
      time: request.time,
      guests: request.guests,
      customer: request.customer,
      specialRequests: request.specialRequests,
      idempotencyKey,
      createdBy: request.source ?? 'api',
      status: 'CREATING',
    });

    await this.publish(ctx, DomainEventType.RESERVATION_REQUESTED, { request });
    await this.persist(reservation);

    const providers = this.registry.listForRestaurant(restaurant);
    let lastError: Error | undefined;

    for (const provider of providers) {
      try {
        const response = await provider.createReservation({
          ...request,
          idempotencyKey,
        });
        if (!this.isConfirmed(response)) {
          throw new ReservationConflictError(
            `Provider ${provider.getProviderName()} did not confirm reservation`,
          );
        }
        reservation.status = 'CONFIRMED';
        reservation.provider = response.provider ?? provider.getProviderName();
        reservation.externalReservationId = response.externalReservationId;
        reservation.providerTransactionId = response.reservationId;
        reservation.confirmedAt = nowIso();
        reservation.updatedAt = nowIso();
        await this.persist(reservation);
        await this.idempotency.set(idempotencyKey, reservation);
        await this.publish(ctx, DomainEventType.RESERVATION_CREATED, { reservation });
        await this.publish(ctx, DomainEventType.RESERVATION_CONFIRMED, { reservation });
        return reservation;
      } catch (err) {
        lastError = err as Error;
        this.emitProviderFailure(provider.getProviderName(), err, ctx);
      }
    }

    reservation.status = 'FAILED';
    reservation.updatedAt = nowIso();
    await this.persist(reservation);
    await this.publish(ctx, DomainEventType.RESERVATION_FAILED, { reservation, error: lastError?.message });

    throw lastError ?? new ProviderUnavailableError('all-providers', 'No provider could create the reservation');
  }

  async modifyReservation(
    request: ModifyReservationRequest,
    ctx: TenantContext,
  ): Promise<Reservation> {
    const existing = await this.requireReservation(request.reservationId, ctx);
    const restaurant = await this.requireRestaurant(existing.restaurantId, ctx);
    const provider = this.registry.findProviderForRestaurant(restaurant);

    existing.status = 'MODIFICATION_PENDING';
    existing.updatedAt = nowIso();
    await this.persist(existing);

    try {
      const response = await provider.modifyReservation(request);
      existing.status = response.status === 'CONFIRMED' ? 'CONFIRMED' : 'MODIFICATION_PENDING';
      if (request.date) existing.date = request.date;
      if (request.time) existing.time = request.time;
      if (request.guests) existing.guests = request.guests;
      if (request.locationId) existing.locationId = request.locationId;
      if (request.specialRequests !== undefined) existing.specialRequests = request.specialRequests;
      existing.updatedAt = nowIso();
      await this.persist(existing);
      await this.publish(ctx, DomainEventType.RESERVATION_MODIFIED, { reservation: existing });
      return existing;
    } catch (err) {
      existing.status = 'FAILED';
      existing.updatedAt = nowIso();
      await this.persist(existing);
      this.emitProviderFailure(provider.getProviderName(), err, ctx);
      throw err;
    }
  }

  async cancelReservation(
    request: CancelReservationRequest,
    ctx: TenantContext,
  ): Promise<CancelReservationResponse> {
    const existing = await this.requireReservation(request.reservationId, ctx);
    const restaurant = await this.requireRestaurant(existing.restaurantId, ctx);
    const provider = this.registry.findProviderForRestaurant(restaurant);

    const response = await provider.cancelReservation(request);
    existing.status = 'CANCELLED';
    existing.cancelledAt = nowIso();
    existing.updatedAt = nowIso();
    await this.persist(existing);
    await this.publish(ctx, DomainEventType.RESERVATION_CANCELLED, { reservation: existing });
    return response;
  }

  async getReservation(reservationId: string, ctx: TenantContext): Promise<ReservationResponse> {
    const reservation = await this.requireReservation(reservationId, ctx);
    const restaurant = await this.requireRestaurant(reservation.restaurantId, ctx);
    const provider = this.registry.findProviderForRestaurant(restaurant);
    const external = await provider.getReservation(reservation.id);
    return {
      ...external,
      restaurantId: reservation.restaurantId,
      status: reservation.status,
    };
  }

  // -------------------------------------------------------------------------
  // private helpers
  // -------------------------------------------------------------------------
  private async requireRestaurant(restaurantId: string, ctx: TenantContext): Promise<Restaurant> {
    const restaurant = await this.search.getRestaurant(restaurantId, ctx);
    if (!restaurant) throw new DuplicateReservationError(`Restaurant not found: ${restaurantId}`);
    return restaurant;
  }

  private async requireReservation(id: string, ctx: TenantContext): Promise<Reservation> {
    const reservation = await this.repo.findById(ctx.tenantId, id);
    if (!reservation) throw new Error(`Reservation not found: ${id}`);
    return reservation;
  }

  private isConfirmed(response: ReservationResponse): boolean {
    return response.status === 'CONFIRMED';
  }

  private async persist(reservation: Reservation): Promise<void> {
    await this.repo.save(reservation);
  }

  private emitProviderFailure(provider: string, err: unknown, ctx: TenantContext): void {
    getGlobalLogger().warn('reservation.provider_failed', {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
    void this.publish(ctx, DomainEventType.PROVIDER_FAILED, { provider, error: String(err) });
  }

  private async publish(
    ctx: TenantContext,
    type: string,
    payload: unknown,
  ): Promise<void> {
    await this.bus.publish({
      type: type as never,
      context: { tenantId: ctx.tenantId },
      payload,
    });
  }
}
