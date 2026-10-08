import { Router } from 'express';
import type { Request as Req, Response as Res } from 'express';
import { newAgentSession, AgentSessionState } from '@sorani/ai';
import type { AppContainer } from '../container';
import { asyncHandler } from '../middleware/errorHandler';

interface CtxReq extends Req {
  tenantContext?: { tenantId: string };
  requestId?: string;
}

// In-memory agent sessions for the simulation. Production uses AgentSession rows.
const sessions = new Map<string, AgentSessionState>();
// In-memory conversation history per session so multi-turn dialogs keep context.
const histories = new Map<string, unknown[]>();

export function simulationRoutes(c: AppContainer): Router {
  const r = Router();

  // POST /api/simulation/turn  { input, language, sessionId? }
  r.post(
    '/turn',
    asyncHandler(async (req: CtxReq, res: Res) => {
      const ctx = req.tenantContext!;
      const { input, language = 'ckb', sessionId, forceLanguage } = req.body || {};

      const session = sessionId && sessions.has(sessionId)
        ? sessions.get(sessionId)!
        : newAgentSession(ctx.tenantId);
      sessions.set(session.sessionId, session);

      const history = sessionId && histories.has(sessionId) ? histories.get(sessionId) : undefined;
      const response = await c.agent.run(
        {
          session,
          input: String(input || ''),
          language: language === 'en' ? 'en' : 'ckb',
          history: history as never,
          preferredLanguage: forceLanguage === 'ckb' ? 'ckb' : forceLanguage === 'en' ? 'en' : undefined,
        },
        ctx,
      );
      sessions.set(session.sessionId, response.session);
      if (response.history) histories.set(session.sessionId, response.history as unknown[]);

      res.json({
        ok: true,
        data: {
          sessionId: session.sessionId,
          reply: response.text,
          toolCalls: response.toolCalls,
          endCall: response.endCall,
        },
        requestId: req.requestId,
      });
    }),
  );

  // POST /api/simulation/reset
  r.post('/reset', (req: CtxReq, res: Res) => {
    const { sessionId } = req.body || {};
    if (sessionId) sessions.delete(sessionId);
    res.json({ ok: true, data: { reset: true } });
  });

  return r;
}
