import type { AudioOutput, TTSOptions, TTSProvider } from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * Local Piper TTS adapter — fully offline, MIT-licensed, runs on CPU.
 * Sends text to a local Python Piper microservice (deploy/stt/tts_server.py).
 * Configure with TTS_PROVIDER=local-piper and TTS_PIPER_URL.
 */
export function localPiperTTSProvider(opts: { url: string }): TTSProvider {
  const url = opts.url || 'http://localhost:5101';

  return {
    name: 'local-piper',
    async synthesize(text: string, _options?: TTSOptions): Promise<AudioOutput> {
      let res: Response;
      try {
        res = await fetch(`${url}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: 'ckb' }),
        });
      } catch (err) {
        throw new ProviderUnavailableError('local-piper', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new ProviderError(`local-piper returned ${res.status}: ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data?.audioBase64) {
        throw new ProviderError('local-piper', `unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
      }
      const buf = Buffer.from(data.audioBase64, 'base64');
      return { format: data.format || 'audio/wav', data: new Uint8Array(buf), voiceId: 'local-piper' };
    },
  };
}
