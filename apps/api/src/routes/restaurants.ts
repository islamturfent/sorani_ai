import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import {
  CuisineType,
  PriceRange,
  RestaurantProviderType,
  RestaurantStatus,
  generateId,
} from '@sorani/shared';
import type { Restaurant } from '@sorani/restaurants';
import { validateOrThrow, validateSearchQuery } from '@sorani/validation';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

function defaultHours() {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, open: '11:00', close: '23:00', closed: false }));
}

interface CtxReq extends Req {
  tenantContext?: { tenantId: string };
  requestId?: string;
}

export function restaurantRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/restaurants — list all (tenant-scoped)
  r.get(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const all = await c.search.search({}, ctx);
      const unique = new Map<string, { id: string; name: string; description?: string; cuisineTypes: unknown; city?: string; priceRange?: string; rating?: number; provider?: string }>();
      for (const item of all) {
        if (!unique.has(item.restaurant.id)) {
          unique.set(item.restaurant.id, {
            id: item.restaurant.id,
            name: item.restaurant.name,
            description: item.restaurant.description,
            cuisineTypes: item.restaurant.cuisineTypes,
            city: item.location.city,
            priceRange: item.restaurant.priceRange,
            rating: item.restaurant.rating,
            provider: item.restaurant.reservationProvider,
          });
        }
      }
      res.json({ ok: true, data: Array.from(unique.values()), requestId: req.requestId });
    }),
  );

  // POST /api/restaurants — create a restaurant
  r.post(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const { name, city, cuisine, phone, priceRange, description } = req.body || {};
      if (!name) {
        return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
      }
      const id = generateId('rest');
      const location: Restaurant['locations'][number] = {
        id: generateId('loc'),
        restaurantId: id,
        name: `${name} - ${city || 'Main'}`,
        address: city || '',
        city: city || 'Erbil',
        country: 'Iraq',
        timezone: 'Asia/Baghdad',
        phone: phone || '',
        openingHours: defaultHours(),
      };
      const restaurant: Restaurant = {
        id,
        name,
        description,
        cuisineTypes: cuisine ? [cuisine.toUpperCase() as CuisineType] : [CuisineType.OTHER],
        locations: [location],
        phoneNumbers: phone ? [phone] : [],
        priceRange: priceRange as PriceRange | undefined,
        rating: 0,
        features: [],
        directBookingEnabled: true,
        phoneBookingEnabled: true,
        status: RestaurantStatus.ACTIVE,
        reservationProvider: RestaurantProviderType.MOCK,
      };
      await c.restaurantRepo.save(restaurant);
      res.status(201).json({ ok: true, data: restaurant, requestId: req.requestId });
    }),
  );

  // POST /api/restaurants/search
  r.post(
    '/search',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const query = validateOrThrow(validateSearchQuery, req.body);
      const ctx = req.tenantContext!;
      const results = await c.search.search(query, ctx);
      const ranked = await c.ranking.rank(
        results.map((x) => x),
        { preferredCuisine: query.cuisine },
      );
      res.json({
        ok: true,
        data: ranked.map((x) => ({
          restaurantId: x.restaurant.id,
          name: x.restaurant.name,
          city: x.location.city,
          location: x.location.name,
          cuisine: x.restaurant.cuisineTypes,
          priceRange: x.restaurant.priceRange,
          rating: x.restaurant.rating,
          features: x.restaurant.features,
        })),
        requestId: req.requestId,
      });
    }),
  );

  // GET /api/restaurants/branches — all branches across restaurants
  r.get(
    '/branches',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const all = await c.search.search({}, ctx);
      const branches: Record<string, unknown>[] = [];
      const seen = new Set<string>();
      for (const item of all) {
        const r = item.restaurant;
        for (const loc of r.locations) {
          if (seen.has(loc.id)) continue;
          seen.add(loc.id);
          branches.push({
            restaurantId: r.id,
            restaurantName: r.name,
            id: loc.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            country: loc.country,
            phone: loc.phone,
            timezone: loc.timezone,
            openingHours: loc.openingHours,
          });
        }
      }
      res.json({ ok: true, data: branches, requestId: req.requestId });
    }),
  );

  // GET /api/restaurants/:id
  r.get(
    '/:id',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const restaurant = await c.search.getRestaurant(req.params.id, ctx);
      if (!restaurant) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Restaurant not found' } });
      res.json({ ok: true, data: restaurant });
    }),
  );

  // GET /api/restaurants/:id/locations
  r.get(
    '/:id/locations',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const locations = await c.search.getLocations(req.params.id, ctx);
      res.json({ ok: true, data: locations });
    }),
  );

  // POST /api/restaurants/:id/availability
  r.post(
    '/:id/availability',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const { date, time, guests, locationId } = req.body || {};
      const result = await c.orchestrator.checkAvailability(
        { restaurantId: req.params.id, date, time, guests, locationId },
        ctx,
      );
      res.json({ ok: true, data: result });
    }),
  );

  return r;
}
