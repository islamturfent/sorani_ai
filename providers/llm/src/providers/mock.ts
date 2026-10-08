import type { ChatRequest, ChatResponse, ChatChunk, ModelInfo, LLMProvider } from '../types';

/**
 * Deterministic mock LLM used for development/tests without any external API.
 * It echoes a canned assistant reply so the full pipeline can be exercised.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const last = request.messages[request.messages.length - 1];
    return {
      id: 'mock-chat',
      model: 'mock-llm',
      choices: [
        {
          message: {
            role: 'assistant',
            content: `[mock] Received: ${last.content.slice(0, 120)}${
              request.tools?.length ? ` (${request.tools.length} tools available)` : ''
            }`,
          },
          finishReason: 'stop',
        },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const text = `[mock streaming]: ${request.messages[request.messages.length - 1].content.slice(0, 60)}`;
    for (const chunk of text.match(/.{1,10}/gs) || []) {
      yield { id: 'mock-chunk', model: 'mock-llm', delta: chunk };
    }
    yield { id: 'mock-chunk', model: 'mock-llm', delta: '', finishReason: 'stop' };
  }

  async getModelInfo(): Promise<ModelInfo> {
    return { name: 'mock-llm', provider: 'mock', supportsTools: true, supportsStreaming: true };
  }
}
