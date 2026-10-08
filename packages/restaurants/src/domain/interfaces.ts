import type { TenantContext } from '@sorani/shared';
import type { Restaurant, RestaurantLocation } from './models';

export interface RestaurantSearchQuery {
  city?: string;
  area?: string;
  cuisine?: string;
  restaurantName?: string;
  date?: string;
  time?: string;
  guests?: number;
  priceRange?: string;
  features?: string[];
  ratingMin?: number;
}

export interface RestaurantSearchResult {
  restaurant: Restaurant;
  location: RestaurantLocation;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Repository over restaurant data. The AI never touches the DB directly; it
 * always goes through RestaurantSearchService.
 */
export interface RestaurantRepository {
  findMany(filter: { tenantId: string; ids?: string[] }): Promise<Restaurant[]>;
  findById(tenantId: string, id: string): Promise<Restaurant | null>;
  save(restaurant: Restaurant): Promise<void>;
}

export interface RestaurantSearchService {
  search(query: RestaurantSearchQuery, ctx: TenantContext): Promise<RestaurantSearchResult[]>;
  getRestaurant(restaurantId: string, ctx: TenantContext): Promise<Restaurant | null>;
  getLocations(restaurantId: string, ctx: TenantContext): Promise<RestaurantLocation[]>;
}

/** Context used by the ranking engine to order search results. */
export interface RankingContext {
  /** distance from a provided reference point, if known */
  distanceKm?: number;
  requestedFeatures?: string[];
  preferredCuisine?: string;
  userPreference?: 'rating' | 'price' | 'distance' | 'availability';
  availability?: Record<string, boolean>;
}

/**
 * Separate ranking engine so ranking logic never gets embedded in the LLM
 * prompt. It may return the list re-ordered and annotated.
 */
export interface RestaurantRankingService {
  rank(
    restaurants: RestaurantSearchResult[],
    context: RankingContext,
  ): Promise<RestaurantSearchResult[]>;
}
