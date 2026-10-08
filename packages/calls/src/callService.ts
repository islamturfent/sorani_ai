import { CallDirection, CallStatus, CallType, TenantContext, generateId, nowIso } from '@sorani/shared';

export interface CallRecord {
  id: string;
  tenantId: string;
  callId: string;
  direction: CallDirection;
  type: CallType;
  status: CallStatus;
  restaurantId?: string;
  agentSessionId?: string;
  to?: string;
  from?: string;
  transcript?: CallTranscriptSegment[];
  startedAt?: string;
  endedAt?: string;
}

export interface CallTranscriptSegment {
  speaker: 'agent' | 'customer' | 'restaurant' | 'human';
  text: string;
  at: string;
}

export interface CallRepository {
  findByTenant(tenantId: string): Promise<CallRecord[]>;
  findById(tenantId: string, id: string): Promise<CallRecord | null>;
  save(call: CallRecord): Promise<void>;
}

export class InMemoryCallRepository implements CallRepository {
  private readonly map = new Map<string, CallRecord>();
  async findByTenant(tenantId: string): Promise<CallRecord[]> {
    return Array.from(this.map.values()).filter((c) => c.tenantId === tenantId);
  }
  async findById(tenantId: string, id: string): Promise<CallRecord | null> {
    const c = this.map.get(id);
    return c && c.tenantId === tenantId ? c : null;
  }
  async save(call: CallRecord): Promise<void> {
    this.map.set(call.id, call);
  }
}

export class CallService {
  constructor(private readonly repo: CallRepository) {}

  async list(tenantId: string): Promise<CallRecord[]> {
    return this.repo.findByTenant(tenantId);
  }

  async recordCall(ctx: TenantContext, input: {
    callId: string;
    direction: CallDirection;
    type: CallType;
    restaurantId?: string;
    to?: string;
    from?: string;
    agentSessionId?: string;
  }): Promise<CallRecord> {
    const call: CallRecord = {
      id: generateId('rec'),
      tenantId: ctx.tenantId,
      callId: input.callId,
      direction: input.direction,
      type: input.type,
      status: CallStatus.IN_PROGRESS,
      restaurantId: input.restaurantId,
      agentSessionId: input.agentSessionId,
      to: input.to,
      from: input.from,
      startedAt: nowIso(),
    };
    await this.repo.save(call);
    return call;
  }

  async endCall(ctx: TenantContext, id: string): Promise<CallRecord | null> {
    const call = await this.repo.findById(ctx.tenantId, id);
    if (!call) return null;
    call.status = CallStatus.COMPLETED;
    call.endedAt = nowIso();
    await this.repo.save(call);
    return call;
  }

  async addTranscript(ctx: TenantContext, id: string, segment: CallTranscriptSegment): Promise<CallRecord | null> {
    const call = await this.repo.findById(ctx.tenantId, id);
    if (!call) return null;
    call.transcript = [...(call.transcript || []), segment];
    await this.repo.save(call);
    return call;
  }
}
