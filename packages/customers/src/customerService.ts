import { NotFoundError, TenantContext, generateId, nowIso } from '@sorani/shared';

export interface Customer {
  id: string;
  tenantId: string;
  name?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: string;
  createdAt: string;
}

export interface CustomerRepository {
  findByTenant(tenantId: string): Promise<Customer[]>;
  findById(tenantId: string, id: string): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly map = new Map<string, Customer>();
  async findByTenant(tenantId: string): Promise<Customer[]> {
    return Array.from(this.map.values()).filter((c) => c.tenantId === tenantId);
  }
  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const c = this.map.get(id);
    return c && c.tenantId === tenantId ? c : null;
  }
  async save(customer: Customer): Promise<void> {
    this.map.set(customer.id, customer);
  }
}

export class CustomerService {
  constructor(private readonly repo: CustomerRepository) {}

  async list(ctx: TenantContext): Promise<Customer[]> {
    return this.repo.findByTenant(ctx.tenantId);
  }

  async findOrCreate(ctx: TenantContext, data: { name?: string; phone?: string; email?: string }): Promise<Customer> {
    if (data.phone) {
      const existing = (await this.repo.findByTenant(ctx.tenantId)).find(
        (c) => c.phone === data.phone,
      );
      if (existing) return existing;
    }
    const customer: Customer = {
      id: generateId('cus'),
      tenantId: ctx.tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      createdAt: nowIso(),
    };
    await this.repo.save(customer);
    return customer;
  }

  async get(ctx: TenantContext, id: string): Promise<Customer> {
    const customer = await this.repo.findById(ctx.tenantId, id);
    if (!customer) throw new NotFoundError(`Customer not found: ${id}`);
    return customer;
  }
}
