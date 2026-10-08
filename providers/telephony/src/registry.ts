import { NotFoundError } from '@sorani/shared';
import type { TelephonyProvider } from './types';

export class TelephonyProviderRegistry {
  private readonly providers = new Map<string, TelephonyProvider>();
  register(provider: TelephonyProvider): void {
    this.providers.set(provider.name, provider);
  }
  get(name: string): TelephonyProvider {
    const p = this.providers.get(name);
    if (!p) throw new NotFoundError(`Telephony provider "${name}" not registered`);
    return p;
  }
  all(): TelephonyProvider[] {
    return Array.from(this.providers.values());
  }
}
