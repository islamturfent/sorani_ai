import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  LLMProvider,
} from '../types';
import { OpenAICompatibleClient } from './lmStudio';

/** OpenAI hosted provider (OpenAI-compatible wire format). */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private readonly client: OpenAICompatibleClient;

  constructor(opts: { apiKey: string; model: string }) {
    this.client = new OpenAICompatibleClient({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: opts.apiKey,
      defaultModel: opts.model,
      name: 'openai',
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
      provider: 'openai',
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 128000,
    };
  }
}
