import { NotFoundError } from '@sorani/shared';
import type { STTProvider } from './types';

export class STTProviderRegistry {
  private readonly providers = new Map<string, STTProvider>();
  register(provider: STTProvider): void {
    this.providers.set(provider.name, provider);
  }
  get(name: string): STTProvider {
    const p = this.providers.get(name);
    if (!p) throw new NotFoundError(`STT provider "${name}" not registered`);
    return p;
  }
  all(): STTProvider[] {
    return Array.from(this.providers.values());
  }
}
