import { NotFoundError, TenantContext, generateId } from '@sorani/shared';

/** A tenant of the platform (a restaurant group / SaaS customer). */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  plan?: string;
  createdAt: string;
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<void>;
}

export class InMemoryTenantRepository implements TenantRepository {
  private readonly map = new Map<string, Tenant>();
  constructor(seed: Tenant[] = []) {
    for (const t of seed) this.map.set(t.id, t);
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.map.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<Tenant | null> {
    return Array.from(this.map.values()).find((t) => t.slug === slug) ?? null;
  }
  async save(tenant: Tenant): Promise<void> {
    this.map.set(tenant.id, tenant);
  }
}

export class TenantService {
  constructor(private readonly repo: TenantRepository) {}

  async resolveContext(tenantId: string): Promise<TenantContext> {
    const tenant = await this.repo.findById(tenantId);
    if (!tenant || tenant.status === 'SUSPENDED') throw new NotFoundError(`Tenant not found or suspended: ${tenantId}`);
    return { tenantId: tenant.id };
  }

  async create(name: string, slug: string, plan = 'starter'): Promise<Tenant> {
    const tenant: Tenant = { id: generateId('ten'), name, slug, status: 'ACTIVE', plan, createdAt: new Date().toISOString() };
    await this.repo.save(tenant as Tenant & { save?: never });
    return tenant;
  }
}

export function demoTenant(): Tenant {
  return { id: 'platform', name: 'Sorani Platform', slug: 'platform', status: 'ACTIVE', plan: 'enterprise', createdAt: new Date().toISOString() };
}
