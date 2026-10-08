import { ReservationProviderRegistry } from '@sorani/reservations';
import type { RestaurantSearchService } from '@sorani/restaurants';
import { MockReservationProvider } from './mock';
import { ProviderAAdapter } from './providerA';
import { DirectRestaurantAdapter, createSimulatedPhoneNegotiator } from './direct';

export interface RegisterReservationProvidersOptions {
  registry: ReservationProviderRegistry;
  search?: RestaurantSearchService;
  mock?: { failureRate: number; latencyMs?: number };
  providerABaseUrl?: string;
  providerAApiKey?: string;
}

/**
 * Registers the default set of reservation providers as plugins. New providers
 * are added by calling `registry.register(...)` — the core never changes.
 */
export function buildDefaultReservationProviders(opts: RegisterReservationProvidersOptions): void {
  const { registry } = opts;

  registry.register(
    new MockReservationProvider({
      failureRate: opts.mock?.failureRate ?? 0.1,
      latencyMs: opts.mock?.latencyMs,
    }),
  );

  registry.register(
    new ProviderAAdapter({
      baseUrl: opts.providerABaseUrl || 'https://provider-a.example',
      apiKey: opts.providerAApiKey || 'dev-key',
    }),
  );

  if (opts.search) {
    const direct = new DirectRestaurantAdapter(createSimulatedPhoneNegotiator(), opts.search);
    registry.register(direct);
  }
}
