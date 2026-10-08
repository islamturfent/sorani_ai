import type { RestaurantRankingService, RankingContext, RestaurantSearchResult } from '../domain/interfaces';

/**
 * Restaurant Ranking Engine.
 *
 * Ranking logic is implemented here — never embedded in the LLM prompt. The
 * default engine applies a transparent weighted scoring so the AI can present
 * balanced options without bias.
 */
export class WeightedRankingEngine implements RestaurantRankingService {
  async rank(
    results: RestaurantSearchResult[],
    context: RankingContext,
  ): Promise<RestaurantSearchResult[]> {
    const availability = context.availability ?? {};

    const scored = results.map((r) => {
      let s = r.matchScore;

      // availability first
      if (availability[r.restaurant.id] === true) s += 30;
      else if (availability[r.restaurant.id] === false) s -= 25;

      // user preference weighting
      switch (context.userPreference) {
        case 'rating':
          s += (r.restaurant.rating ?? 0) * 8;
          break;
        case 'price':
          s += this.priceScore(r.restaurant.priceRange);
          break;
        case 'distance':
          s -= context.distanceKm ?? 0;
          break;
        default:
          s += (r.restaurant.rating ?? 0) * 4;
      }

      if (context.preferredCuisine && r.restaurant.cuisineTypes.some((c) => c.toLowerCase() === context.preferredCuisine!.toLowerCase())) {
        s += 10;
      }
      return { r, s };
    });

    return scored.sort((a, b) => b.s - a.s).map((x) => x.r);
  }

  private priceScore(price?: string): number {
    switch (price) {
      case '$':
        return 8;
      case '$$':
        return 4;
      case '$$$':
        return 0;
      case '$$$$':
        return -4;
      default:
        return 0;
    }
  }
}
