import { NotFoundError } from '@sorani/shared';
import type { LLMProvider } from './types';

/** Central registry of LLM providers. */
export class LLMProviderRegistry {
  private readonly providers = new Map<string, LLMProvider>();

  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }
  get(name: string): LLMProvider {
    const p = this.providers.get(name);
    if (!p) throw new NotFoundError(`LLM provider "${name}" not registered`);
    return p;
  }
  all(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
}
