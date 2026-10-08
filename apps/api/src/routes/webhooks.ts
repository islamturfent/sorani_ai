import { createHmac, timingSafeEqual } from 'crypto';
import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import type { AppContainer } from '../container';
import { DomainEventType } from '@sorani/events';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Webhook endpoints (spec §44). Signatures are verified with an HMAC of the raw
 * body using WEBHOOK_SIGNING_SECRET. Providers POST events here.
 */
export function webhookRoutes(c: AppContainer): Router {
  const r = Router();

  r.use('/reservation', (req: Req, res: Res, next: () => void) => {
    if (!verifySignature(c, req)) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Bad signature' } });
    }
    next();
  });

  r.post('/reservation/:provider', asyncHandler(async (req: Req, res: Res) => {
    const { provider } = req.params;
    const event = req.body;
    await c.eventBus.publish({
      type: DomainEventType.RESERVATION_CREATED,
      context: { provider },
      payload: { webhook: true, provider, event },
    });
    res.json({ ok: true, received: true });
  }));

  r.post('/telephony/:provider', asyncHandler(async (req: Req, res: Res) => {
    const { provider } = req.params;
    const event = req.body;
    await c.eventBus.publish({
      type: DomainEventType.CALL_ENDED,
      context: { provider },
      payload: { webhook: true, provider, event },
    });
    res.json({ ok: true, received: true });
  }));

  return r;
}

function verifySignature(c: AppContainer, req: Req): boolean {
  const header = req.headers['x-webhook-signature'] as string;
  if (!header) return false;
  const body = JSON.stringify(req.body ?? '');
  const expected = createHmac('sha256', c.config.webhookSigningSecret).update(body).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
