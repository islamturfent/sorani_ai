import 'dotenv/config';
import { createConfig } from '@sorani/shared';
import { newAgentSession, AIAgent, AgentToolRegistry, createRojinTools } from '@sorani/ai';
import type { LLMProvider, ChatRequest, ChatResponse, ChatChunk, ModelInfo } from '@sorani/provider-llm';
import { buildContainer } from './container';

/**
 * A scripted tool-calling LLM that drives the agent through the real tool
 * orchestration (search_restaurants → search_availability → create_reservation)
 * without any external model. Proves the full pipeline works end-to-end.
 */
class ScriptedToolLLM implements LLMProvider {
  readonly name = 'scripted';

  executed(name: string, messages: ChatRequest['messages']): number {
    return messages.filter((m) => m.name === name).length;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const msgs = request.messages;
    const searchCount = this.executed('search_restaurants', msgs);
    const availCount = this.executed('search_availability', msgs);
    const createCount = this.executed('create_reservation', msgs);

    const tool = (
      id: string,
      name: string,
      args: Record<string, unknown>,
    ): ChatResponse => ({
      id: 'scripted',
      model: 'scripted',
      choices: [
        { message: { role: 'assistant', content: '' }, finishReason: 'tool_calls', toolCalls: [{ id, name, arguments: args }] },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    if (searchCount === 0) {
      return tool('t1', 'search_restaurants', { city: 'Erbil', cuisine: 'Italian' });
    }
    if (availCount === 0) {
      return tool('t2', 'search_availability', { restaurantId: 'rest-italian-house', date: '2026-10-08', time: '19:30', guests: 4 });
    }
    if (createCount === 0) {
      return tool('t3', 'create_reservation', {
        restaurantId: 'rest-italian-house',
        date: '2026-10-08',
        time: '19:30',
        guests: 4,
        customerName: 'Ahmad',
        customerPhone: '+9647500000000',
      });
    }
    return {
      id: 'scripted',
      model: 'scripted',
      choices: [{ message: { role: 'assistant', content: 'حجزەکە بە سەرکەوتوویی تۆمار کرا بۆ Italian House.' }, finishReason: 'stop' }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async *stream(): AsyncIterable<ChatChunk> {
    yield { id: 'x', model: 'scripted', delta: '', finishReason: 'stop' };
  }
  async getModelInfo(): Promise<ModelInfo> {
    return { name: 'scripted', provider: 'scripted', supportsTools: true, supportsStreaming: true };
  }
}

async function main() {
  const config = createConfig();
  const c = buildContainer(config);
  const ctx = { tenantId: config.defaultTenantId };

  // Build an agent driven by the scripted tool-calling LLM.
  const tools = new AgentToolRegistry();
  for (const tool of createRojinTools(c.agentServices)) tools.register(tool);
  const agent = new AIAgent({ llm: new ScriptedToolLLM(), tools });

  const session = newAgentSession(ctx.tenantId);
  const script = [
    { input: 'دەمەوێت لە ئێربیل ڕێستورانێکی ئیتاڵی بۆ چوار کەس سبەی شەو حجز بکەم.', language: 'ckb' as const },
    { input: 'بەڵێ، حجزەکە تۆمار بکە.', language: 'ckb' as const },
  ];

  console.log('=== SORANI AI SIMULATION (Rojin) — full tool orchestration ===\n');

  for (const turn of script) {
    console.log(`👤 CUSTOMER: ${turn.input}\n`);
    const response = await agent.run({ session, input: turn.input, language: turn.language }, ctx);
    console.log(`🎙 ROJIN: ${response.text}`);
    if (response.toolCalls.length === 0) {
      console.log('   (no tools this turn)');
    }
    for (const tool of response.toolCalls) {
      console.log(`   ⛏ tool: ${tool.name} ${JSON.stringify(tool.arguments)}`);
    }
    Object.assign(session, response.session);
    console.log('---');
  }

  console.log('\nAll reservations stored:');
  for (const r of await c.reservationRepo.all()) {
    console.log(`  • ${r.id} | ${r.restaurantId} | ${r.date} ${r.time} | guests=${r.guests} | status=${r.status}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
