import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nano = customAlphabet(alphabet, 16);

/** Short, url-safe, unique id. */
export function generateId(prefix = ''): string {
  const id = nano();
  return prefix ? `${prefix}_${id}` : id;
}

/** Scope a multi-tenant id so two tenants can never collide. */
export function tenantScoped(tenantId: string, kind: string): string {
  return `${tenantId}:${kind}`;
}

/** ISO timestamp helper (mirrors Date.prototype.toISOString for readability). */
export function nowIso(): string {
  return new Date().toISOString();
}
