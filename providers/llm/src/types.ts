// ===========================================================================
// LLM Provider interface (spec §20). The AI agent core only ever depends on
// this interface — never on a concrete provider.
// ===========================================================================

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

/** Declarative tool definition passed to the model. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Optional request correlation for observability. */
  requestId?: string;
  tenantId?: string;
  /** Force the reply language regardless of the user's input script. */
  preferredLanguage?: 'ckb' | 'en';
}

export interface ChatChoice {
  message: ChatMessage;
  finishReason: string;
  toolCalls?: ToolCall[];
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface ChatChunk {
  id: string;
  model: string;
  delta: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  supportsTools: boolean;
  supportsStreaming: boolean;
  contextWindow?: number;
}

/**
 * Provider-agnostic LLM contract. Implementations: LM Studio (OpenAI-compatible),
 * OpenAI, Anthropic, Mock.
 */
export interface LLMProvider {
  readonly name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
  getModelInfo(): Promise<ModelInfo>;
}
