import type { AudioInput, Transcript, STTProvider } from '../types';
import { ProviderUnavailableError, ProviderError } from '@sorani/shared';

/**
 * Local Sorani Whisper STT adapter.
 * Sends 16kHz mono WAV base64 to a local Python microservice (Sorani fine-tuned
 * Whisper small model running entirely on this machine — no internet needed).
 * Configure with STT_PROVIDER=local-whisper and STT_WHISPER_URL.
 */
export function localWhisperSTTProvider(opts: { url: string }): STTProvider {
  const url = opts.url || 'http://localhost:5100';

  return {
    name: 'local-whisper',
    async transcribe(audio: AudioInput): Promise<Transcript> {
      // Build base64 from the raw audio bytes.
      let b64: string;
      try {
        const bytes = audio.data;
        // Convert Uint8Array chunks into a binary base64 string (browser-safe pattern).
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
        }
        b64 = typeof Buffer !== 'undefined'
          ? Buffer.from(bytes).toString('base64')
          : btoa(bin);
      } catch (err) {
        throw new ProviderError('local-whisper', `base64 encode failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      let res: Response;
      try {
        res = await fetch(`${url}/stt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: b64 }),
        });
      } catch (err) {
        throw new ProviderUnavailableError('local-whisper', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new ProviderError(`local-whisper returned ${res.status}: ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data || typeof data.text !== 'string') {
        throw new ProviderError('local-whisper', `unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
      }
      return { text: data.text, language: 'ckb', confidence: data.confidence ?? undefined };
    },
  };
}
