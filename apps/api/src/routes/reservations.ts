import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import {
  validateOrThrow,
  validateCreateReservation,
  validateModifyReservation,
  validateCancelReservation,
} from '@sorani/validation';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

interface CtxReq extends Req {
  tenantContext?: { tenantId: string };
  requestId?: string;
}

export function reservationRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/reservations — list (tenant-scoped)
  r.get(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const all = await c.reservationRepo.all();
      res.json({ ok: true, data: all.filter((x) => x.tenantId === ctx.tenantId), requestId: req.requestId });
    }),
  );

  // POST /api/reservations
  r.post(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const input = validateOrThrow(validateCreateReservation, req.body);
      const ctx = req.tenantContext!;
      const reservation = await c.orchestrator.createReservation(
        {
          restaurantId: input.restaurantId,
          locationId: input.locationId,
          date: input.date,
          time: input.time,
          guests: input.guests,
          customer: input.customer,
          specialRequests: input.specialRequests,
          idempotencyKey: input.idempotencyKey,
          source: input.source,
        },
        ctx,
      );
      // notify
      if (input.customer.phone) {
        await c.notificationService.notify(ctx, {
          channel: 'sms',
          recipient: input.customer.phone,
          title: 'Reservation',
          body: `Reservation ${reservation.status} for ${input.guests} at ${input.time}.`,
        });
      }
      res.status(201).json({ ok: true, data: reservation, requestId: req.requestId });
    }),
  );

  // GET /api/reservations/:id
  r.get(
    '/:id',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const reservation = await c.orchestrator.getReservation(req.params.id, ctx);
      res.json({ ok: true, data: reservation });
    }),
  );

  // PATCH /api/reservations/:id
  r.patch(
    '/:id',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const input = validateOrThrow(validateModifyReservation, { reservationId: req.params.id, ...req.body });
      const ctx = req.tenantContext!;
      const reservation = await c.orchestrator.modifyReservation(input, ctx);
      res.json({ ok: true, data: reservation });
    }),
  );

  // DELETE /api/reservations/:id
  r.delete(
    '/:id',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const input = validateOrThrow(validateCancelReservation, { reservationId: req.params.id, ...req.body });
      const ctx = req.tenantContext!;
      const result = await c.orchestrator.cancelReservation(input, ctx);
      res.json({ ok: true, data: result });
    }),
  );

  return r;
}
