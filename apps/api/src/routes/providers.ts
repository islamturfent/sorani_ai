import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import type { AppContainer } from '../container';

export function providerRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/providers — list all registered providers by capability (spec §39)
  r.get('/', (_req: Req, res: Res) => {
    res.json({
      ok: true,
      data: {
        active: { llm: c.config.provider.llm, stt: c.config.provider.stt, tts: c.config.provider.tts, telephony: c.config.provider.telephony },
        llm: c.llmRegistry.all().map((p) => ({ name: p.name })),
        stt: c.sttRegistry.all().map((p) => ({ name: p.name })),
        tts: c.ttsRegistry.all().map((p) => ({ name: p.name })),
        telephony: c.telephonyRegistry.all().map((p) => ({ name: p.name })),
        reservations: c.reservationRegistry.all().map((p) => ({ name: p.getProviderName(), enabled: true })),
      },
    });
  });

  return r;
}

export function analyticsRoutes(c: AppContainer): Router {
  const r = Router();

  // GET /api/analytics/dashboard
  r.get('/dashboard', (_req: Req, res: Res) => {
    res.json({
      ok: true,
      data: {
        counters: c.analytics.getCounters({ tenantId: c.config.defaultTenantId }),
        reservations: c.analytics.getReservationSnapshot(),
      },
    });
  });

  return r;
}
