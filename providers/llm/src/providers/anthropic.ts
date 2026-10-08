import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  LLMProvider,
  ToolCall,
} from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * Anthropic provider using the Messages API. (Kept isolated behind the LLM
 * interface so the AI core never cares which vendor it talks to.)
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  constructor(
    private readonly opts: { apiKey: string; model: string },
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = {
      model: request.model || this.opts.model,
      max_tokens: request.maxTokens ?? 1024,
      system: request.messages.find((m) => m.role === 'system')?.content,
      messages: request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    };

    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.opts.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ProviderUnavailableError('anthropic', err instanceof Error ? err.message : String(err));
    }
    if (!res.ok) throw new ProviderError(`anthropic returned ${res.status}`);

    const data = await res.json();
    const toolCalls: ToolCall[] = (data.content || [])
      .filter((b: any) => b.type === 'tool_use')
      .map((b: any) => ({ id: b.id, name: b.name, arguments: b.input ?? {} }));
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    return {
      id: data.id,
      model: data.model,
      choices: [
        { message: { role: 'assistant', content: text }, finishReason: 'stop', toolCalls },
      ],
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    // Simplified: not required for MVP; chat() covers tool usage.
    const result = await this.chat(request);
    yield { id: 'a-' + result.id, model: result.model, delta: result.choices[0].message.content, finishReason: 'stop' };
  }

  async getModelInfo(): Promise<ModelInfo> {
    return { name: this.opts.model, provider: 'anthropic', supportsTools: true, supportsStreaming: true };
  }
}
