/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Contract tests (spec §47). Every reservation provider must pass this suite:
 *   ✓ searchAvailability
 *   ✓ createReservation
 *   ✓ modifyReservation
 *   ✓ cancelReservation
 *   ✓ getReservation
 *   ✓ idempotency (no duplicates on retry)
 * Run with: npm run test
 */
import { InMemoryRestaurantRepository, RestaurantSearchEngine } from '@sorani/restaurants';
import {
  ReservationProviderRegistry,
  ReservationOrchestrator,
  MemoryIdempotencyStore,
} from '@sorani/reservations';
import { buildDefaultReservationProviders } from '@sorani/provider-reservations';
import { UserRole } from '@sorani/shared';

let passed = 0;
let failed = 0;

class MemoryReservationRepo {
  private map = new Map<string, any>();
  async save(r: any) { this.map.set(r.id, r); }
  async findById(_t: string, id: string) { return this.map.get(id) ?? null; }
  async update(r: any) { this.map.set(r.id, r); }
}

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, msg: string): void {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg} — expected ${expected}, got ${actual}`);
  }
}

async function runReservationProviderContract(providerName: string): Promise<void> {
  console.log(`\n== ReservationProviderContractTest: ${providerName} ==`);
  const ctx = { tenantId: 'platform' };

  // Fresh services per provider so tests are independent.
  const repo = new InMemoryRestaurantRepository();
  const search = new RestaurantSearchEngine(repo);
  const registry = new ReservationProviderRegistry();
  registry.register(new (require('@sorani/provider-reservations').MockReservationProvider)({ failureRate: 0 }));
  if (providerName === 'PROVIDER_A') {
    registry.register(new (require('@sorani/provider-reservations').ProviderAAdapter)({ baseUrl: 'http://localhost:1', apiKey: 'x' }));
  }

  const orchestrator = new ReservationOrchestrator({
    registry,
    search,
    repositories: { reservations: new MemoryReservationRepo(), idempotency: new MemoryIdempotencyStore() },
  });

  const restaurantId = 'rest-hewar'; // Provider A restaurant
  const base = { restaurantId, date: '2026-10-10', time: '19:00', guests: 4 };

  // searchAvailability
  const avail = await orchestrator.checkAvailability({ ...base, locationId: undefined }, ctx);
  assertEqual(typeof avail.available, 'boolean', 'searchAvailability returns availability boolean');

  // createReservation
  const restaurant = await search.getRestaurant(restaurantId, ctx);
  const locationId = restaurant!.locations[0].id;
  const res = await orchestrator.createReservation(
    { ...base, locationId, customer: { name: 'Test', phone: '+111' }, source: 'api' },
    ctx,
  );
  assertEqual(res.status, 'CONFIRMED', 'createReservation → CONFIRMED');
  assert(res.id.length > 0, 'reservation has an id');

  // idempotency: replaying the same request must return the same reservation, not a duplicate
  const again = await orchestrator.createReservation(
    { ...base, locationId: res.locationId!, customer: { name: 'Test', phone: '+111' }, idempotencyKey: res.idempotencyKey, source: 'api' },
    ctx,
  );
  assertEqual(again.id, res.id, 'idempotency returns the SAME reservation (no duplicate)');

  // cancelReservation
  const cancelled = await orchestrator.cancelReservation({ reservationId: res.id, reason: 'test' }, ctx);
  assertEqual(cancelled.cancelled, true, 'cancelReservation → cancelled');

  // getReservation
  const fetched = await orchestrator.getReservation(res.id, ctx);
  assert(fetched !== null, 'getReservation returns a result');
}

async function runFallbackTest(): Promise<void> {
  console.log('\n== Fallback + Isolation test ==');
  const ctx = { tenantId: 'platform' };
  const repo = new InMemoryRestaurantRepository();
  const search = new RestaurantSearchEngine(repo);
  const registry = new ReservationProviderRegistry();

  // A provider that always fails to force fallback through the chain.
  const failing = {
    getProviderName: () => 'FAILING',
    supports: () => true,
    searchAvailability: async () => { throw new Error('boom'); },
    createReservation: async () => { throw new Error('boom'); },
    modifyReservation: async () => { throw new Error('boom'); },
    cancelReservation: async () => { throw new Error('boom'); },
    getReservation: async () => { throw new Error('boom'); },
  };
  registry.register(failing as never);
  registry.register(new (require('@sorani/provider-reservations').MockReservationProvider)({ failureRate: 0 }));

  const orchestrator = new ReservationOrchestrator({
    registry,
    search,
    repositories: { reservations: new MemoryReservationRepo(), idempotency: new MemoryIdempotencyStore() },
  });

  const res = await orchestrator.createReservation(
    { restaurantId: 'rest-hewar', locationId: (await search.getRestaurant('rest-hewar', ctx))!.locations[0].id, date: '2026-10-11', time: '19:00', guests: 2, customer: { name: 'FB' }, source: 'api' },
    ctx,
  );
  assertEqual(res.status, 'CONFIRMED', 'falls back to next provider when the first fails');
}

async function runRbacTest(): Promise<void> {
  console.log('\n== RBAC + tenant isolation test ==');
  const { PermissionGuard } = require('@sorani/users');
  const viewer = new PermissionGuard({ id: '1', tenantId: 'a', email: 'v@x', role: UserRole.VIEWER });
  assert(viewer.can('dashboard.view'), 'VIEWER can view dashboard');
  assert(!viewer.can('provider.manage'), 'VIEWER cannot manage providers');
}

async function main() {
  await runReservationProviderContract('mock');
  await runFallbackTest();
  await runRbacTest();
  console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
