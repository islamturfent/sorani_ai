import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { getConfig } from '@sorani/shared';
import { buildContainer, AppContainer } from './container';
import { applyContext, requireAuth } from './middleware/context';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { restaurantRoutes } from './routes/restaurants';
import { reservationRoutes } from './routes/reservations';
import { callRoutes } from './routes/calls';
import { providerRoutes, analyticsRoutes } from './routes/providers';
import { simulationRoutes } from './routes/simulation';
import { voiceRoutes } from './routes/voice';
import { customersRoutes, usersRoutes, tenantsRoutes } from './routes/management';
import { webhookRoutes } from './routes/webhooks';

export function createApp(container: AppContainer): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const defaultTenantId = container.config.defaultTenantId;
  const auth = container.auth;

  app.use(applyContext(defaultTenantId));
  app.use(requireAuth(auth));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'sorani-api', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes(container));
  app.use('/api/restaurants', restaurantRoutes(container));
  app.use('/api/reservations', reservationRoutes(container));
  app.use('/api/calls', callRoutes(container));
  app.use('/api/customers', customersRoutes(container));
  app.use('/api/users', usersRoutes());
  app.use('/api/tenants', tenantsRoutes());
  app.use('/api/providers', providerRoutes(container));
  app.use('/api/analytics', analyticsRoutes(container));
  app.use('/api/simulation', simulationRoutes(container));
  app.use('/api/voice', voiceRoutes(container));
  app.use('/api/webhooks', webhookRoutes(container));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export function start(): void {
  const config = getConfig();
  const container = buildContainer(config);
  const app = createApp(container);
  app.listen(config.port, () => {
    console.log(`SORANI AI API listening on http://localhost:${config.port}`);
    console.log(`Providers → LLM:${config.provider.llm} STT:${config.provider.stt} TTS:${config.provider.tts} TELEPHONY:${config.provider.telephony}`);
  });
}

if (require.main === module) {
  start();
}
