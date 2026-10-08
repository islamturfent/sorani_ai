import { UserRole, ForbiddenError } from '@sorani/shared';

export interface AppUser {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  role: UserRole;
  /** restaurantIds this user manages (for RESTAURANT_MANAGER). */
  restaurantIds?: string[];
}

/** Resource-level permissions per role (RBAC, spec §17). */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.TENANT_ADMIN]: [
    'tenant.manage', 'restaurant.manage', 'reservation.manage', 'customer.manage', 'call.manage', 'provider.manage',
  ],
  [UserRole.RESTAURANT_MANAGER]: ['restaurant.manage', 'reservation.view', 'reservation.create', 'call.view'],
  [UserRole.CALL_CENTER_AGENT]: ['reservation.create', 'reservation.modify', 'call.create', 'customer.view'],
  [UserRole.VIEWER]: ['dashboard.view', 'restaurant.view', 'reservation.view', 'analytics.view'],
};

export class PermissionGuard {
  constructor(private readonly user?: AppUser) {}

  private get permissions(): string[] {
    if (!this.user) return [];
    return ROLE_PERMISSIONS[this.user.role] ?? [];
  }

  can(permission: string): boolean {
    const perms = this.permissions;
    return perms.includes('*') || perms.includes(permission);
  }

  /** Throws unless the user may perform the permission. */
  assert(permission: string): void {
    if (!this.can(permission)) throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  /** Tenant isolation check. */
  assertTenant(tenantId: string): void {
    if (this.user && this.user.role !== UserRole.SUPER_ADMIN && this.user.tenantId !== tenantId) {
      throw new ForbiddenError('Tenant isolation violation');
    }
  }
}
