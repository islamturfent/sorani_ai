import {
  CuisineType,
  PriceRange,
  RestaurantFeature,
  RestaurantProviderType,
  RestaurantStatus,
  TenantMismatchError,
  NotFoundError,
  generateId,
} from '@sorani/shared';
import type { Restaurant, RestaurantLocation, RestaurantProviderConnection } from '../domain/models';
import type { RestaurantRepository } from '../domain/interfaces';

/**
 * In-memory restaurant repository seeded with demo restaurants. This is an
 * example repository; production swaps it for the Prisma-backed repository
 * (see packages/database). The domain contract stays exactly the same.
 */
function hours(open: string, close: string, days = [1, 2, 3, 4, 5, 6], closedDays: number[] = []) {
  return Array.from({ length: 7 }, (_, i) => {
    const closed = closedDays.includes(i);
    return { dayOfWeek: i, open: closed ? '00:00' : open, close: closed ? '00:00' : close, closed };
  });
}

function defaultHours() {
  return hours('11:00', '23:00');
}

function loc(
  restaurantId: string,
  name: string,
  address: string,
  city: string,
  country: string,
  timezone: string,
  partial: Partial<RestaurantLocation> = {},
): RestaurantLocation {
  return { id: generateId('loc'), restaurantId, name, address, city, country, timezone, openingHours: defaultHours(), ...partial };
}

export function seedRestaurants(): Restaurant[] {
  const hewar: Restaurant = {
    id: 'rest-hewar',
    name: 'Hewar Restaurant',
    description: 'Authentic Kurdish cuisine with a modern twist in Erbil.',
    cuisineTypes: [CuisineType.KURDISH, CuisineType.MIDDLE_EASTERN],
    locations: [
      loc('rest-hewar', 'Erbil - 100 Meter Road', '100 Meter Road, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { latitude: 36.1911, longitude: 44.0092, phone: '+9647501000001' }),
      loc('rest-hewar', 'Erbil - Empire', 'Empire World, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { latitude: 36.1796, longitude: 44.0102, phone: '+9647501000002' }),
      loc('rest-hewar', 'Sulaymaniyah Branch', 'Salim Street, Sulaymaniyah', 'Sulaymaniyah', 'Iraq', 'Asia/Baghdad', { latitude: 35.557, longitude: 45.4357, phone: '+9647501000003' }),
    ],
    phoneNumbers: ['+9647501000001', '+9647501000002'],
    website: 'https://hewar.example',
    priceRange: PriceRange.MEDIUM,
    rating: 4.6,
    features: [RestaurantFeature.FAMILY_FRIENDLY, RestaurantFeature.WIFI, RestaurantFeature.PARKING],
    reservationProvider: RestaurantProviderType.PROVIDER_A,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const machu: Restaurant = {
    id: 'rest-machu',
    name: 'Machu Restaurant',
    description: 'Fusion fine-dining experience in Erbil.',
    cuisineTypes: [CuisineType.OTHER, CuisineType.SEAFOOD],
    locations: [
      loc('rest-machu', 'Erbil - Downtown', 'Downtown Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { phone: '+9647502000001' }),
    ],
    phoneNumbers: ['+9647502000001'],
    priceRange: PriceRange.HIGH,
    rating: 4.8,
    features: [RestaurantFeature.PRIVATE_ROOMS, RestaurantFeature.LIVE_MUSIC, RestaurantFeature.ROOFTOP],
    reservationProvider: RestaurantProviderType.PROVIDER_B,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const italian: Restaurant = {
    id: 'rest-italian-house',
    name: 'Italian House',
    description: 'Classic Italian pizza and pasta in the heart of Erbil.',
    cuisineTypes: [CuisineType.ITALIAN],
    locations: [
      loc('rest-italian-house', 'Erbil - Ankawa', 'Ankawa, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { phone: '+9647503000001' }),
    ],
    phoneNumbers: ['+9647503000001'],
    priceRange: PriceRange.MEDIUM,
    rating: 4.4,
    features: [RestaurantFeature.FAMILY_FRIENDLY, RestaurantFeature.WIFI],
    reservationProvider: RestaurantProviderType.DIRECT_PHONE,
    directBookingEnabled: false,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const abc: Restaurant = {
    id: 'rest-abc-steakhouse',
    name: 'ABC Steakhouse',
    description: 'Premium grilled steaks in Sulaymaniyah.',
    cuisineTypes: [CuisineType.STEAKHOUSE, CuisineType.AMERICAN],
    locations: [
      loc('rest-abc-steakhouse', 'Sulaymaniyah - Salim', 'Salim Street, Sulaymaniyah', 'Sulaymaniyah', 'Iraq', 'Asia/Baghdad', { phone: '+9647504000001' }),
    ],
    phoneNumbers: ['+9647504000001'],
    priceRange: PriceRange.HIGH,
    rating: 4.7,
    features: [RestaurantFeature.PRIVATE_ROOMS, RestaurantFeature.LIVE_MUSIC],
    reservationProvider: RestaurantProviderType.PROVIDER_A,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const erbilGarden: Restaurant = {
    id: 'rest-erbil-garden',
    name: 'Erbil Garden',
    description: 'Open-air garden restaurant with a wide Kurdish menu.',
    cuisineTypes: [CuisineType.KURDISH, CuisineType.MIDDLE_EASTERN],
    locations: [
      loc('rest-erbil-garden', 'Erbil - Garden City', 'Garden City, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { phone: '+9647505000001' }),
    ],
    phoneNumbers: ['+9647505000001'],
    priceRange: PriceRange.LOW,
    rating: 4.2,
    features: [RestaurantFeature.OUTDOOR_SEATING, RestaurantFeature.FAMILY_FRIENDLY, RestaurantFeature.PARKING],
    reservationProvider: RestaurantProviderType.MOCK,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const family: Restaurant = {
    id: 'rest-family',
    name: 'Family Restaurant',
    description: 'Budget-friendly family dining across Erbil.',
    cuisineTypes: [CuisineType.KURDISH, CuisineType.MIDDLE_EASTERN, CuisineType.TURKISH],
    locations: [
      loc('rest-family', 'Erbil - Azadi', 'Azadi Mall, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { phone: '+9647506000001' }),
    ],
    phoneNumbers: ['+9647506000001'],
    priceRange: PriceRange.LOW,
    rating: 4.0,
    features: [RestaurantFeature.FAMILY_FRIENDLY, RestaurantFeature.KIDS_PLAY_AREA, RestaurantFeature.WIFI],
    reservationProvider: RestaurantProviderType.PROVIDER_C,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  const sushi: Restaurant = {
    id: 'rest-sushi',
    name: 'Sushi Restaurant',
    description: 'Japanese sushi and ramen in Erbil.',
    cuisineTypes: [CuisineType.JAPANESE, CuisineType.SUSHI],
    locations: [
      loc('rest-sushi', 'Erbil - Empire', 'Empire World, Erbil', 'Erbil', 'Iraq', 'Asia/Baghdad', { phone: '+9647507000001' }),
    ],
    phoneNumbers: ['+9647507000001'],
    priceRange: PriceRange.HIGH,
    rating: 4.5,
    features: [RestaurantFeature.PRIVATE_ROOMS, RestaurantFeature.WIFI],
    reservationProvider: RestaurantProviderType.PROVIDER_A,
    directBookingEnabled: true,
    phoneBookingEnabled: true,
    status: RestaurantStatus.ACTIVE,
  };

  machu.cuisineTypes = [CuisineType.OTHER, CuisineType.SEAFOOD];
  return [hewar, machu, italian, abc, erbilGarden, family, sushi];
}

export class InMemoryRestaurantRepository implements RestaurantRepository {
  private readonly restaurants = new Map<string, Restaurant>();

  constructor(seed: Restaurant[] = seedRestaurants()) {
    for (const r of seed) this.restaurants.set(r.id, r);
  }

  async findMany(filter: { tenantId: string; ids?: string[] }): Promise<Restaurant[]> {
    void filter; // in-memory store is a single-tenant demo store
    const all = Array.from(this.restaurants.values());
    if (filter.ids) return all.filter((r) => filter.ids!.includes(r.id));
    return all;
  }

  async findById(tenantId: string, id: string): Promise<Restaurant | null> {
    void tenantId;
    return this.restaurants.get(id) ?? null;
  }

  async save(restaurant: Restaurant): Promise<void> {
    this.restaurants.set(restaurant.id, restaurant);
  }

  private assertTenant(tenantId: string): void {
    if (!tenantId) throw new TenantMismatchError();
  }
}
