import { TenantContext, getGlobalLogger } from '@sorani/shared';
import type {
  RestaurantRepository,
  RestaurantSearchQuery,
  RestaurantSearchResult,
  RestaurantSearchService,
} from '../domain/interfaces';
import type { Restaurant, RestaurantLocation } from '../domain/models';

/**
 * Restaurant Search Engine.
 *
 * Turns a natural search query into ranked restaurant results. The AI agent
 * calls this engine; it never writes SQL against the restaurant tables.
 */
export class RestaurantSearchEngine implements RestaurantSearchService {
  constructor(private readonly repo: RestaurantRepository) {}

  private normalize(s?: string): string {
    return (s || '').toLowerCase().trim();
  }

  async search(
    query: RestaurantSearchQuery,
    ctx: TenantContext,
  ): Promise<RestaurantSearchResult[]> {
    const restaurants = await this.repo.findMany({ tenantId: ctx.tenantId });
    const results: RestaurantSearchResult[] = [];

    for (const restaurant of restaurants) {
      if (restaurant.status === 'INACTIVE' || restaurant.status === 'SUSPENDED') continue;

      const candidateLocations = this.matchLocations(restaurant, query.city, query.area);
      if (candidateLocations.length === 0) continue;

      const reasons: string[] = [];

      if (query.cuisine && this.matchesCuisine(restaurant, query.cuisine)) {
        reasons.push(`cuisine:${query.cuisine}`);
      } else if (query.cuisine) {
        continue;
      }

      if (query.restaurantName && !this.normalize(restaurant.name).includes(this.normalize(query.restaurantName))) {
        continue;
      }

      if (query.ratingMin !== undefined && (restaurant.rating ?? 0) < query.ratingMin) continue;

      if (query.priceRange && restaurant.priceRange !== query.priceRange) {
        // Treat "$$" style price hints loosely: only filter when an explicit match exists.
        if (this.normalize(restaurant.priceRange) !== this.normalize(query.priceRange)) continue;
      }

      if (query.features && query.features.length) {
        const hasAll = query.features.every((f) =>
          restaurant.features.some((rf) => this.normalize(rf) === this.normalize(f)),
        );
        if (!hasAll) continue;
        reasons.push('features');
      }

      const matchScore = this.score(restaurant, query, reasons);
      for (const location of candidateLocations) {
        results.push({ restaurant, location, matchScore, matchReasons: reasons });
      }
    }

    getGlobalLogger().debug('restaurant.search', {
      tenantId: ctx.tenantId,
      query,
      count: results.length,
    });
    return results;
  }

  private matchesCuisine(restaurant: Restaurant, cuisine: string): boolean {
    const c = this.normalize(cuisine);
    return restaurant.cuisineTypes.some((t) => {
      const label = this.normalize(t);
      return label === c || label.includes(c) || c.includes(label);
    });
  }

  private matchLocations(
    restaurant: Restaurant,
    city?: string,
    area?: string,
  ): RestaurantLocation[] {
    let locations = restaurant.locations;
    if (city) {
      const c = this.normalize(city);
      locations = locations.filter(
        (l) => this.normalize(l.city) === c || this.normalize(l.city).includes(c),
      );
    }
    if (area) {
      const a = this.normalize(area);
      locations = locations.filter(
        (l) => this.normalize(l.name).includes(a) || this.normalize(l.address).includes(a),
      );
    }
    return locations;
  }

  private score(
    restaurant: Restaurant,
    query: RestaurantSearchQuery,
    reasons: string[],
  ): number {
    let score = 0;
    if (query.cuisine) score += reasons.includes(`cuisine:${query.cuisine}`) ? 30 : 0;
    if (query.restaurantName) score += 20;
    score += (restaurant.rating ?? 0) * 6;
    if (restaurant.priceRange === '$') score += 3;
    if (reasons.includes('features')) score += 10;
    return score;
  }

  async getRestaurant(restaurantId: string, ctx: TenantContext): Promise<Restaurant | null> {
    return this.repo.findById(ctx.tenantId, restaurantId);
  }

  async getLocations(restaurantId: string, ctx: TenantContext): Promise<RestaurantLocation[]> {
    const restaurant = await this.repo.findById(ctx.tenantId, restaurantId);
    return restaurant?.locations ?? [];
  }
}
