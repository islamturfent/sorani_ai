import type { AudioOutput, TTSOptions, TTSProvider } from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * Kurdish TTS (kurdishtts.com) adapter — native Sorani / Kurmanji / Badini
 * speech engine (spec §22). This is the right provider for a real female
 * Sorani (کوردی) voice.
 *
 * Endpoint: POST https://www.kurdishtts.com/api/tts-proxy
 * Auth:     x-api-key header (TTS key from kurdishtts.com/settings/api)
 * Free tier: 20,000 chars/month through the API (no credit card).
 */
export function kurdishTTSProvider(opts: {
  apiKey: string;
  speakerId?: string;
  modelVersion?: string;
}): TTSProvider {
  const speakerId = opts.speakerId || 'sorani_986'; // Female 1 (Sorani)
  const modelVersion = opts.modelVersion || 'v4';

  return {
    name: 'kurdishtts',
    async synthesize(text: string, _options?: TTSOptions): Promise<AudioOutput> {
      if (!opts.apiKey) throw new ProviderUnavailableError('kurdishtts', 'missing KURDISH_TTS_API_KEY');
      // Allow per-request voice override (e.g. selected from the dashboard).
      const activeSpeaker = _options?.voiceId || speakerId;
      const body = { speaker_id: activeSpeaker, model_version: modelVersion, text, format: 'mp3' };
      let res: Response;
      try {
        res = await fetch('https://www.kurdishtts.com/api/tts-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': opts.apiKey },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderUnavailableError('kurdishtts', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new ProviderError(`kurdishtts returned ${res.status}: ${bodyText.slice(0, 200)}`);
      }
      const ct = res.headers.get('content-type') || '';
      const buf = new Uint8Array(await res.arrayBuffer());
      const format = /mp3|mpeg/i.test(ct) ? 'audio/mpeg' : /ogg/i.test(ct) ? 'audio/ogg' : 'audio/wav';
      return { format, data: buf, voiceId: activeSpeaker };
    },
  };
}
