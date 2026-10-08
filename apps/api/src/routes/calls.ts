import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

interface CtxReq extends Req {
  tenantContext?: { tenantId: string };
  requestId?: string;
}

export function callRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/calls
  r.get(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const records = await c.callService.list(ctx.tenantId);
      res.json({ ok: true, data: records });
    }),
  );

  // POST /api/calls — start an outbound AI voice call (simulation supported)
  r.post(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const { restaurantId, date, time, guests, customerName, customerPhone } = req.body || {};
      const result = await c.telephony.placeRestaurantCall(
        restaurantId,
        undefined,
        { date, time, guests, customerName, customerPhone },
        ctx,
      );
      res.status(201).json({ ok: true, data: result });
    }),
  );

  // POST /api/calls/:id/transfer
  r.post(
    '/:id/transfer',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const { destination } = req.body || {};
      await c.telephony.transfer(req.params.id, destination || 'human-operator', ctx);
      res.json({ ok: true, data: { transferred: true } });
    }),
  );

  return r;
}
