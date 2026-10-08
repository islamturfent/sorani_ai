import { z } from './validate';

export const availabilityRequestSchema = z.object({
  restaurantId: z.string().min(1),
  locationId: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  guests: z.number().int().positive(),
  preferences: z.record(z.unknown()).optional(),
});

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1),
  locationId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  guests: z.number().int().positive(),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  }),
  specialRequests: z.string().optional(),
  idempotencyKey: z.string().optional(),
  source: z.enum(['voice', 'web', 'api', 'simulation']).default('api'),
});

export const modifyReservationSchema = z.object({
  reservationId: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional(),
  guests: z.number().int().positive().optional(),
  locationId: z.string().optional(),
  specialRequests: z.string().optional(),
});

export const cancelReservationSchema = z.object({
  reservationId: z.string().min(1),
  reason: z.string().optional(),
});

export const validateCreateReservation = createReservationSchema;
export const validateModifyReservation = modifyReservationSchema;
export const validateCancelReservation = cancelReservationSchema;

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type AvailabilityInput = z.infer<typeof availabilityRequestSchema>;
