import { Router } from 'express';
import type { Request as Req } from 'express';
import { demoUsers } from '@sorani/users';
import type { AppContainer } from '../container';

export function authRoutes(c: AppContainer): Router {
  const r = Router();
  const users = demoUsers();

  // POST /api/auth/login — demo login returns a signed token.
  r.post('/login', (req: Req, res) => {
    const { email } = req.body || {};
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unknown user' } });
    }
    const token = c.auth.sign({ id: user.id, tenantId: user.tenantId, email: user.email, role: user.role });
    res.json({ ok: true, data: { token, role: user.role, name: user.name } });
  });

  return r;
}
