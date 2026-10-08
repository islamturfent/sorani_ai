import type { TenantContext } from '@sorani/shared';
import type { AgentSessionState } from '../domain/agent';

/** A callable agent tool. Tool names follow spec §12. */
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute(args: Record<string, unknown>, ctx: TenantContext, session: AgentSessionState): Promise<unknown>;
}

export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  definitions() {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  all(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}

export function buildToolRegistry(tools: AgentTool[]): AgentToolRegistry {
  const registry = new AgentToolRegistry();
  for (const t of tools) registry.register(t);
  return registry;
}
