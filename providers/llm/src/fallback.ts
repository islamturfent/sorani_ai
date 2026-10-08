import { getGlobalLogger } from '@sorani/shared';
import type { LLMProvider, ChatRequest, ChatResponse, ChatChunk, ModelInfo } from './types';

/**
 * FallbackLLMProvider — tries the primary LLM provider and, if it fails
 * (e.g. LM Studio has no model loaded, network error, or a 400), transparently
 * falls back to `fallback` (e.g. the SimulationAgentLLM). This keeps the
 * platform working even when a local model is not available.
 */
export class FallbackLLMProvider implements LLMProvider {
  readonly name: string;

  constructor(
    private readonly primary: LLMProvider,
    private readonly fallback: LLMProvider,
  ) {
    this.name = `${primary.name}+fallback`;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      return await this.primary.chat(request);
    } catch (err) {
      getGlobalLogger().warn('llm.fallback', {
        primary: this.primary.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return this.fallback.chat(request);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    try {
      yield* this.primary.stream(request);
    } catch (err) {
      getGlobalLogger().warn('llm.fallback.stream', {
        primary: this.primary.name,
        error: err instanceof Error ? err.message : String(err),
      });
      yield* this.fallback.stream(request);
    }
  }

  async getModelInfo(): Promise<ModelInfo> {
    try {
      return await this.primary.getModelInfo();
    } catch {
      return this.fallback.getModelInfo();
    }
  }
}
