import type { AudioOutput, TTSOptions, TTSProvider } from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/**
 * ElevenLabs TTS adapter (spec §22). ElevenLabs is multilingual and supports
 * voice cloning, so you can register a real female Sorani Kurdish voice.
 *
 * Steps to use:
 *  1. Create/upload a female Sorani speaker's voice sample in ElevenLabs
 *     ("Voice Lab" → "Instant Voice Cloning") to get a voice_id.
 *  2. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID, TTS_PROVIDER=elevenlabs.
 */
export function elevenLabsTTSProvider(opts: {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}): TTSProvider {
  const modelId = opts.modelId || 'eleven_multilingual_v2';
  const voiceId = opts.voiceId;

  return {
    name: 'elevenlabs',
    async synthesize(text: string, _options?: TTSOptions): Promise<AudioOutput> {
      if (!opts.apiKey) throw new ProviderUnavailableError('elevenlabs', 'missing ELEVENLABS_API_KEY');
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': opts.apiKey,
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
          }),
        });
      } catch (err) {
        throw new ProviderUnavailableError('elevenlabs', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ProviderError(`elevenlabs returned ${res.status}: ${body.slice(0, 200)}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      return { format: 'audio/mpeg', data: buf, voiceId };
    },
  };
}

/**
 * Azure Speech TTS adapter — good fallback for Sorani/Arabic female neural
 * voices (e.g. ar-SA-HudaNeural). Set AZURE_SPEECH_KEY/REGION/TTS_VOICE.
 */
export function azureTTSProvider(opts: { key: string; region: string; voice: string }): TTSProvider {
  return {
    name: 'azure',
    async synthesize(text: string, _options?: TTSOptions): Promise<AudioOutput> {
      if (!opts.key) throw new ProviderUnavailableError('azure', 'missing AZURE_SPEECH_KEY');
      const ssml = [
        `<speak version='1.0' xml:lang='${opts.voice.split('-')[0].toLowerCase()}'>`,
        `<voice name='${opts.voice}'>`,
        text.replace(/&/g, '&amp;').replace(/</g, '&lt;'),
        '</voice></speak>',
      ].join('');
      let res: Response;
      try {
        res = await fetch(
          `https://${opts.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': opts.key,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
              'User-Agent': 'sorani-ai',
            },
            body: ssml,
          },
        );
      } catch (err) {
        throw new ProviderUnavailableError('azure', err instanceof Error ? err.message : String(err));
      }
      if (!res.ok) throw new ProviderError(`azure tts returned ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      return { format: 'audio/mpeg', data: buf, voiceId: opts.voice };
    },
  };
}
