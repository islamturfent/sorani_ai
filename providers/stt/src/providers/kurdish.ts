import type { AudioInput, Transcript, STTProvider } from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * Kurdish Speech-to-Text (kurdishtts.com) adapter — accurate Sorani speech
 * recognition (FLEURS Sorani 4.54 CER). Endpoint: POST /api/stt-proxy
 * (multipart form: file + dialect). Use the STT key space from Settings→API.
 */
export function kurdishSTTProvider(opts: { apiKey: string; dialect?: 'sorani' | 'kurmanji' }): STTProvider {
  const dialect = opts.dialect || 'sorani';

  return {
    name: 'kurdishtts',
    async transcribe(audio: AudioInput): Promise<Transcript> {
      if (!opts.apiKey) throw new ProviderUnavailableError('kurdishtts-stt', 'missing KURDISH_STT_API_KEY');
      if (typeof FormData === 'undefined') {
        throw new ProviderError('kurdishtts-stt', 'FormData not available in this runtime');
      }
      const mime = audio.format.includes('/') ? audio.format : `audio/${audio.format}`;
      const form = new FormData();
      form.append('file', new Blob([audio.data as BlobPart], { type: mime }), `audio.${audio.format.replace('audio/', '')}`);
      form.append('dialect', dialect);

      let res: Response;
      try {
        res = await fetch('https://www.kurdishtts.com/api/stt-proxy', {
          method: 'POST',
          headers: { 'x-api-key': opts.apiKey },
          body: form,
        });
      } catch (err) {
        throw new ProviderUnavailableError('kurdishtts-stt', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new ProviderError(`kurdishtts-stt returned ${res.status}: ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      return {
        text: data.text || '',
        language: (data.detected_dialect || dialect) as string,
        confidence: undefined,
      };
    },
  };
}
