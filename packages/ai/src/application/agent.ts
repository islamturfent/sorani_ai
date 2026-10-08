import { TenantContext, getGlobalLogger } from '@sorani/shared';
import type { LLMProvider, ChatMessage } from '@sorani/provider-llm';
import type { AgentRequest, AgentResponse, AgentSessionState } from '../domain/agent';
import type { AgentToolRegistry } from './tools';
import { buildRojinSystemPrompt } from './systemPrompt';

export interface AIAgentOptions {
  llm: LLMProvider;
  tools: AgentToolRegistry;
  maxToolRounds?: number;
  today?: string;
}

/**
 * Restaurant-independent AI Agent Core. It depends only on the LLM interface
 * and the tool registry — never on a specific restaurant, provider or vendor.
 */
export class AIAgent {
  private readonly llm: LLMProvider;
  private readonly tools: AgentToolRegistry;
  private readonly maxToolRounds: number;
  private readonly today?: string;

  constructor(opts: AIAgentOptions) {
    this.llm = opts.llm;
    this.tools = opts.tools;
    this.maxToolRounds = opts.maxToolRounds ?? 6;
    this.today = opts.today;
  }

  async run(request: AgentRequest, ctx: TenantContext): Promise<AgentResponse> {
    const messages: ChatMessage[] = [
      { role: 'system', content: buildRojinSystemPrompt({ language: request.language, today: this.today }) },
      ...(request.history ?? []),
      { role: 'user', content: request.input },
    ];

    const toolCalls = [];

    for (let round = 0; round < this.maxToolRounds; round++) {
      const response = await this.llm.chat({
        messages,
        tools: this.tools.definitions(),
        tenantId: ctx.tenantId,
        preferredLanguage: request.preferredLanguage,
        temperature: 0.3,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;
      messages.push(assistantMessage as ChatMessage);

      const calls = choice.toolCalls ?? [];
      if (calls.length === 0) {
        // No more tools → final answer.
        return {
          text: assistantMessage.content || '',
          toolCalls,
          session: request.session,
          history: messages.filter((m) => m.role !== 'system'),
        };
      }

      for (const call of calls) {
        toolCalls.push({ id: call.id, name: call.name, arguments: call.arguments });
        const tool = this.tools.get(call.name);
        if (!tool) {
          messages.push({
            role: 'assistant',
            name: call.name,
            toolCallId: call.id,
            content: JSON.stringify({ ok: false, result: { error: `Unknown tool ${call.name}` } }),
          });
          continue;
        }
        try {
          const result = await tool.execute(call.arguments, ctx, request.session);
          messages.push({
            role: 'assistant',
            name: call.name,
            toolCallId: call.id,
            content: JSON.stringify({ ok: true, result }),
          });
        } catch (err) {
          getGlobalLogger().warn('agent.tool_failed', { tool: call.name, error: String(err) });
          messages.push({
            role: 'assistant',
            name: call.name,
            toolCallId: call.id,
            content: JSON.stringify({ ok: false, result: null, error: String(err) }),
          });
        }
      }
    }

    // Reached max rounds; fall back to the last assistant text.
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && !m.name);
    return {
      text: last?.content || 'لە بەرز بوونێکدا کێشەیەک ڕوویدا، تکایە هەوڵبدەرەوە.',
      toolCalls,
      session: request.session,
      history: messages.filter((m) => m.role !== 'system'),
    };
  }

  private toChatHistory(request: AgentRequest): ChatMessage[] {
    // In this v1, only the current turn is sent; session state is injected via
    // the create_reservation tool. A richer history store can be plugged in.
    return [];
  }
}
