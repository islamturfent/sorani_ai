import { NotFoundError } from '@sorani/shared';
import type { Restaurant } from '@sorani/restaurants';
import type { ReservationProvider } from '../domain/interfaces';

/**
 * Central registration point for reservation providers. Adding a provider is a
 * simple `register()` call — no core code changes required.
 */
export class ReservationProviderRegistry {
  private readonly providers = new Map<string, ReservationProvider>();

  register(provider: ReservationProvider): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  getProvider(name: string): ReservationProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new NotFoundError(`Reservation provider "${name}" is not registered`);
    return provider;
  }

  /** Returns the first enabled provider that supports this restaurant. */
  findProviderForRestaurant(restaurant: Restaurant): ReservationProvider {
    const preferred = restaurant.reservationProvider;
    if (preferred && this.providers.has(preferred)) {
      const p = this.providers.get(preferred)!;
      if (p.supports(restaurant)) return p;
    }
    for (const provider of this.providers.values()) {
      if (provider.supports(restaurant)) return provider;
    }
    throw new NotFoundError(`No reservation provider supports restaurant "${restaurant.name}"`);
  }

  /** Ordered fallback list for a restaurant (primary first). */
  listForRestaurant(restaurant: Restaurant): ReservationProvider[] {
    const ordered: ReservationProvider[] = [];
    const preferred = restaurant.reservationProvider;
    if (preferred && this.providers.has(preferred)) {
      ordered.push(this.providers.get(preferred)!);
    }
    for (const provider of this.providers.values()) {
      if (provider !== ordered[0] && provider.supports(restaurant)) ordered.push(provider);
    }
    return ordered;
  }

  all(): ReservationProvider[] {
    return Array.from(this.providers.values());
  }
}
