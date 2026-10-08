import type { Request, RequestHandler } from 'express';
import { RequestContext, TenantContext, generateId } from '@sorani/shared';
import { AuthService } from '@sorani/users';

/** Attach requestId and a default tenant context to every request. */
export function applyContext(defaultTenantId: string): RequestHandler {
  return (req: Request & { requestId?: string; tenantContext?: TenantContext }, _res, next) => {
    req.requestId = generateId('req');
    req.tenantContext = {
      tenantId: (req.headers['x-tenant-id'] as string) || defaultTenantId,
    };
    next();
  };
}

/** Optional bearer-token auth. When absent a default context is used (dev). */
export function requireAuth(auth: AuthService): RequestHandler {
  return (req: Request & { user?: unknown }, _res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        req.user = auth.verify(header.slice(7));
      } catch {
        // fall through with anonymous context in dev
      }
    }
    next();
  };
}
