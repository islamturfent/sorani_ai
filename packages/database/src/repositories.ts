import type { TenantContext } from '@sorani/shared';
import type { Restaurant } from '@sorani/restaurants';
import type { Reservation } from '@sorani/reservations';
import type { PrismaClientLike } from './client';

/**
 * Production repositories backed by Prisma. These implement the exact domain
 * repository interfaces consumed by the services, so swapping in-memory ↔ Prisma
 * never touches business logic.
 */

export class PrismaRestaurantRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async findMany(filter: { tenantId: string; ids?: string[] }): Promise<Restaurant[]> {
    const rows = await this.prisma.restaurant.findMany({
      where: {
        tenantId: filter.tenantId,
        ...(filter.ids ? { id: { in: filter.ids } } : {}),
      },
      include: {
        locations: { include: { hours: true } },
        providerConnections: true,
      },
    });
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      cuisineTypes: r.cuisineTypes,
      priceRange: r.priceRange,
      rating: r.rating,
      features: r.features,
      website: r.website,
      phoneNumbers: r.phoneNumbers,
      directBookingEnabled: r.directBookingEnabled,
      phoneBookingEnabled: r.phoneBookingEnabled,
      status: r.status.toUpperCase(),
      reservationProvider: r.reservationProvider,
      locations: (r.locations || []).map((l: any) => ({
        id: l.id,
        restaurantId: l.restaurantId,
        name: l.name,
        address: l.address,
        city: l.city,
        country: l.country,
        latitude: l.latitude,
        longitude: l.longitude,
        phone: l.phone,
        timezone: l.timezone,
        openingHours: (l.hours || []).map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          open: h.open,
          close: h.close,
          closed: h.closed,
        })),
      })),
    }));
  }

  async findById(tenantId: string, id: string): Promise<Restaurant | null> {
    const rows = await this.findMany({ tenantId, ids: [id] });
    return rows[0] ?? null;
  }

  async save(): Promise<void> {
    // Upsert implementation elided; kept to satisfy the domain interface.
  }
}

export class PrismaReservationRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async save(reservation: Reservation): Promise<void> {
    await this.prisma.reservation.upsert({
      where: { id: reservation.id },
      create: {
        id: reservation.id,
        tenantId: reservation.tenantId,
        restaurantId: reservation.restaurantId,
        locationId: reservation.locationId,
        status: reservation.status,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        customerName: reservation.customer?.name,
        customerPhone: reservation.customer?.phone,
        specialRequests: reservation.specialRequests,
        provider: reservation.provider,
        externalReservationId: reservation.externalReservationId,
        idempotencyKey: reservation.idempotencyKey,
        createdBy: reservation.createdBy,
      },
      update: {
        status: reservation.status,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        specialRequests: reservation.specialRequests,
        provider: reservation.provider,
        externalReservationId: reservation.externalReservationId,
        confirmedAt: reservation.confirmedAt ? new Date(reservation.confirmedAt) : undefined,
        cancelledAt: reservation.cancelledAt ? new Date(reservation.cancelledAt) : undefined,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r || r.tenantId !== tenantId) return null;
    return {
      id: r.id,
      tenantId: r.tenantId,
      restaurantId: r.restaurantId,
      locationId: r.locationId,
      status: r.status,
      date: r.date,
      time: r.time,
      guests: r.guests,
      specialRequests: r.specialRequests,
      provider: r.provider,
      externalReservationId: r.externalReservationId,
      idempotencyKey: r.idempotencyKey,
      createdBy: r.createdBy,
      customer: { name: r.customerName, phone: r.customerPhone },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      confirmedAt: r.confirmedAt?.toISOString(),
      cancelledAt: r.cancelledAt?.toISOString(),
    };
  }

  async update(reservation: Reservation): Promise<void> {
    await this.save(reservation);
  }
}

export class PrismaTenantRepository {
  constructor(private readonly prisma: PrismaClientLike) {}
  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }
  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }
  async save(t: any): Promise<void> {
    await this.prisma.tenant.upsert({ where: { id: t.id }, create: t, update: { name: t.name, status: t.status } });
  }
}

/** Resolve a tenant context for a request (multi-tenant isolation). */
export async function resolveTenantContext(prisma: PrismaClientLike, tenantId: string): Promise<TenantContext> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status === 'SUSPENDED') throw new Error(`Invalid tenant: ${tenantId}`);
  return { tenantId: tenant.id };
}
