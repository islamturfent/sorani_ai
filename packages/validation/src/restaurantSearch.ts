import { z } from './validate';

export const restaurantSearchQuerySchema = z.object({
  city: z.string().optional(),
  area: z.string().optional(),
  cuisine: z.string().optional(),
  restaurantName: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  guests: z.number().int().positive().optional(),
  priceRange: z.string().optional(),
  features: z.array(z.string()).optional(),
  ratingMin: z.number().min(0).max(5).optional(),
});

export const validateSearchQuery = restaurantSearchQuerySchema;

export type RestaurantSearchQueryInput = z.infer<typeof restaurantSearchQuerySchema>;
