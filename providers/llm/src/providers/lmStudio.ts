import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  LLMProvider,
  ToolCall,
  ChatMessage,
} from '../types';
import { getGlobalLogger, ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * OpenAI-compatible HTTP client used by both LM Studio and OpenAI providers.
 * LM Studio exposes the OpenAI-compatible `/v1/chat/completions` endpoint.
 */
export class OpenAICompatibleClient {
  constructor(
    readonly opts: {
      baseUrl: string;
      apiKey?: string;
      defaultModel: string;
      name: string;
    },
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.opts.apiKey) h.Authorization = `Bearer ${this.opts.apiKey}`;
    return h;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.opts.defaultModel;
    const body = {
      model,
      messages: request.messages.map((m) => this.toWire(m)),
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxTokens,
      tools: request.tools?.length
        ? request.tools.map((t) => ({ type: 'function' as const, function: t.function }))
        : undefined,
    };

    let res: Response;
    try {
      res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderUnavailableError(
        this.opts.name,
        err instanceof Error ? err.message : String(err),
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      getGlobalLogger().error('llm.http_error', { provider: this.opts.name, status: res.status, body: text });
      throw new ProviderError(`${this.opts.name} returned ${res.status}`);
    }

    const data = await res.json();
    return this.fromWire(data);
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = request.model || this.opts.defaultModel;
    const body = {
      model,
      messages: request.messages.map((m) => this.toWire(m)),
      temperature: request.temperature ?? 0.4,
      stream: true,
      tools: request.tools?.length
        ? request.tools.map((t) => ({ type: 'function' as const, function: t.function }))
        : undefined,
    };
    let res: Response;
    try {
      res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderUnavailableError(this.opts.name, err instanceof Error ? err.message : String(err));
    }
    if (!res.ok || !res.body) {
      throw new ProviderError(`${this.opts.name} stream failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let id = 'chunk';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const choice = json.choices?.[0];
          id = json.id ?? id;
          yield {
            id,
            model: json.model || model,
            delta: choice?.delta?.content ?? '',
            toolCalls: choice?.delta?.tool_calls?.map((tc: any) => ({
              id: tc.id || id,
              name: tc.function?.name || '',
              arguments: safeJsonParse(tc.function?.arguments),
            })),
            finishReason: choice?.finish_reason,
          };
        } catch {
          /* ignore malformed keep-alive lines */
        }
      }
    }
  }

  private toWire(m: ChatMessage): Record<string, unknown> {
    return { role: m.role, content: m.content, name: m.name };
  }

  private fromWire(data: any): ChatResponse {
    const choice = data.choices?.[0];
    const toolCalls: ToolCall[] | undefined = choice?.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
      arguments: safeJsonParse(tc.function?.arguments),
    }));
    const message: ChatMessage = {
      role: choice?.message?.role ?? 'assistant',
      content: choice?.message?.content ?? '',
    };
    return {
      id: data.id,
      model: data.model,
      choices: [
        {
          message,
          finishReason: choice?.finish_reason ?? 'stop',
          toolCalls,
        },
      ],
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }
}

function safeJsonParse(s?: string): Record<string, unknown> {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}

/** LM Studio (OpenAI-compatible) provider. */
export class LMStudioProvider implements LLMProvider {
  readonly name = 'lm-studio';
  private readonly client: OpenAICompatibleClient;

  constructor(opts: { baseUrl: string; model: string }) {
    this.client = new OpenAICompatibleClient({
      baseUrl: opts.baseUrl.replace(/\/$/, ''),
      defaultModel: opts.model,
      name: 'lm-studio',
    });
  }

  chat(request: ChatRequest): Promise<ChatResponse> {
    return this.client.chat(request);
  }
  stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    return this.client.stream(request);
  }
  async getModelInfo(): Promise<ModelInfo> {
    return {
      name: this.client.opts.defaultModel,
      provider: 'lm-studio',
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 32768,
    };
  }
}
