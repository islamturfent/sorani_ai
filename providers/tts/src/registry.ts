import { NotFoundError } from '@sorani/shared';
import type { TTSProvider } from './types';

export class TTSProviderRegistry {
  private readonly providers = new Map<string, TTSProvider>();
  register(provider: TTSProvider): void {
    this.providers.set(provider.name, provider);
  }
  get(name: string): TTSProvider {
    const p = this.providers.get(name);
    if (!p) throw new NotFoundError(`TTS provider "${name}" not registered`);
    return p;
  }
  all(): TTSProvider[] {
    return Array.from(this.providers.values());
  }
}
