import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import { demoUsers } from '@sorani/users';
import { demoTenant } from '@sorani/tenants';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

interface CtxReq extends Req {
  tenantContext?: { tenantId: string };
  requestId?: string;
}

/** GET /api/customers + POST /api/customers */
export function customersRoutes(c: AppContainer): Router {
  const r = Router();

  r.get(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const customers = await c.customerService.list(req.tenantContext!);
      res.json({ ok: true, data: customers });
    }),
  );

  r.post(
    '/',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const { name, phone, email } = req.body || {};
      const customer = await c.customerService.findOrCreate(ctx, { name, phone, email });
      res.status(201).json({ ok: true, data: customer });
    }),
  );

  return r;
}

/** GET /api/users */
export function usersRoutes(): Router {
  const r = Router();
  r.get('/', (_req, res) => res.json({ ok: true, data: demoUsers() }));
  return r;
}

/** GET /api/tenants */
export function tenantsRoutes(): Router {
  const r = Router();
  r.get('/', (_req, res) => res.json({ ok: true, data: [demoTenant()] }));
  return r;
}
