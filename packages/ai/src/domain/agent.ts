import type { TenantContext } from '@sorani/shared';
import type { ChatMessage } from '@sorani/provider-llm';

export type AgentRole = 'system' | 'user' | 'assistant';

export interface AgentMessage {
  role: AgentRole;
  content: string;
}

/** A tool call produced by the model. */
export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentToolResult {
  toolCallId: string;
  name: string;
  ok: boolean;
  /** JSON-serializable payload to feed back to the model. */
  result: unknown;
  error?: string;
}

export interface AgentTurn {
  userUtterance: string;
  assistantReplies: string[];
  toolCalls: AgentToolCall[];
  toolResults: AgentToolResult[];
}

/** Mutable state carried across turns in a single agent session. */
export interface AgentSessionState {
  sessionId: string;
  tenantId: string;
  restaurantId?: string;
  locationId?: string;
  date?: string;
  time?: string;
  guests?: number;
  customerName?: string;
  customerPhone?: string;
  specialRequests?: string;
  pendingConfirmation?: boolean;
  confirmed?: boolean;
}

export interface AgentRequest {
  session: AgentSessionState;
  /** The raw user turn (transcribed speech or typed text). */
  input: string;
  language: 'ckb' | 'en';
  /** Optional conversation history from previous turns (excludes system). */
  history?: ChatMessage[];
  /** Force the reply language, e.g. always Sorani on the public page. */
  preferredLanguage?: 'ckb' | 'en';
}

export interface AgentResponse {
  /** Natural-language reply in the selected language. */
  text: string;
  /** Tool invocations that happened during this turn. */
  toolCalls: AgentToolCall[];
  session: AgentSessionState;
  /** true when the agent wants to end / hand off the call. */
  endCall?: boolean;
  transferToHuman?: boolean;
  /** Updated conversation history to persist for the next turn. */
  history?: ChatMessage[];
}

export function newAgentSession(tenantId: string): AgentSessionState {
  return {
    sessionId: `sess_${Math.random().toString(36).slice(2)}`,
    tenantId,
  };
}
