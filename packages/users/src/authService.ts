import { createHmac } from 'crypto';
import { UnauthorizedError, UserRole, generateId } from '@sorani/shared';
import type { AppUser } from './rbac';

export interface SessionPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Minimal stateless token service (HMAC-signed). Swap for a full JWT lib in prod. */
export class AuthService {
  constructor(private readonly secret: string, private readonly expiresInSec = 86400) {}

  sign(user: AppUser): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      iat: now,
      exp: now + this.expiresInSec,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.signature(body);
    return `${body}.${sig}`;
  }

  verify(token: string): SessionPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig || this.signature(body) !== sig) throw new UnauthorizedError('Invalid token');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedError('Token expired');
    return payload;
  }

  private signature(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}

export function demoUsers(): AppUser[] {
  return [
    { id: generateId('u'), tenantId: 'platform', email: 'admin@sorani.ai', name: 'Super Admin', role: UserRole.SUPER_ADMIN },
    { id: generateId('u'), tenantId: 'platform', email: 'erbil@sorani.ai', name: 'Erbil Manager', role: UserRole.RESTAURANT_MANAGER, restaurantIds: ['rest-hewar'] },
    { id: generateId('u'), tenantId: 'platform', email: 'agent@sorani.ai', name: 'Call Center Agent', role: UserRole.CALL_CENTER_AGENT },
  ];
}
