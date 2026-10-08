import { TenantContext, generateId, getGlobalLogger, nowIso } from '@sorani/shared';
import { DomainEventType, EventBus, InMemoryEventBus } from '@sorani/events';
import type { Restaurant, RestaurantLocation, RestaurantSearchService } from '@sorani/restaurants';
import type { TelephonyProvider } from '@sorani/provider-telephony';

export interface PhoneBooking {
  date: string;
  time: string;
  guests: number;
  customerName?: string;
  customerPhone?: string;
  specialRequests?: string;
}

export interface RestaurantPhoneResult {
  ok: boolean;
  confirmed?: boolean;
  message: string;
  externalId?: string;
  callId?: string;
}

/**
 * A conversation runner executed during an outbound call to the restaurant
 * staff. The default simulated implementation always confirms; a production
 * implementation drives the AI agent + STT/TTS over the live audio stream.
 */
export interface RestaurantCallConverser {
  run(callId: string, restaurant: Restaurant, location: RestaurantLocation, booking: PhoneBooking): Promise<RestaurantPhoneResult>;
}

/** Orchestrates the real/simulated telephony lifecycle (spec §23, §§35-36). */
export class TelephonyOrchestrator {
  private readonly bus: EventBus;

  constructor(
    private readonly provider: TelephonyProvider,
    private readonly search: RestaurantSearchService,
    private readonly converser: RestaurantCallConverser,
    events?: EventBus,
  ) {
    this.bus = events ?? new InMemoryEventBus();
  }

  async placeRestaurantCall(
    restaurantId: string,
    locationId: string | undefined,
    booking: PhoneBooking,
    ctx: TenantContext,
  ): Promise<RestaurantPhoneResult> {
    const restaurant = await this.search.getRestaurant(restaurantId, ctx);
    if (!restaurant) return { ok: false, message: 'Restaurant not found' };

    const location = locationId
      ? restaurant.locations.find((l) => l.id === locationId) ?? restaurant.locations[0]
      : restaurant.locations[0];
    const target = location?.phone || restaurant.phoneNumbers[0];

    try {
      const session = await this.provider.makeCall({ to: target, metadata: { restaurantId } });
      await this.bus.publish({
        type: DomainEventType.CALL_STARTED,
        context: { tenantId: ctx.tenantId, restaurantId, callId: session.callId },
        payload: { callId: session.callId, to: target },
      });

      getGlobalLogger().info('telephony.outbound_call', { callId: session.callId, to: target, restaurantId });

      const result = await this.converser.run(session.callId, restaurant, location, booking);
      await this.provider.hangup(session.callId);

      await this.bus.publish({
        type: DomainEventType.CALL_ENDED,
        context: { tenantId: ctx.tenantId, restaurantId, callId: session.callId },
        payload: { callId: session.callId, result },
      });

      return { ...result, callId: session.callId };
    } catch (err) {
      getGlobalLogger().error('telephony.call_failed', { restaurantId, error: String(err) });
      return { ok: false, message: `Call to restaurant failed: ${String(err)}` };
    }
  }

  async transfer(callId: string, destination: string, ctx: TenantContext): Promise<void> {
    await this.provider.transfer(callId, destination);
    await this.bus.publish({
      type: DomainEventType.CALL_TRANSFERRED,
      context: { tenantId: ctx.tenantId, callId },
      payload: { callId, destination },
    });
  }

  async hangup(callId: string): Promise<void> {
    await this.provider.hangup(callId);
  }
}

/** Default simulated restaurant call — used when no real telephony is wired. */
export function createSimulatedCallConverser(): RestaurantCallConverser {
  return {
    async run(): Promise<RestaurantPhoneResult> {
      await new Promise((r) => setTimeout(r, 40));
      return {
        ok: true,
        confirmed: true,
        message: 'Restaurant staff confirmed the reservation by phone.',
        externalId: generateId('phoneres'),
      };
    },
  };
}
