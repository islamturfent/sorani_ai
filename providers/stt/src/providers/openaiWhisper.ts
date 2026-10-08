import type { AudioInput, Transcript, STTProvider } from '../types';
import { ProviderError, ProviderUnavailableError } from '@sorani/shared';

/** OpenAI Whisper hosted STT provider. */
export class OpenAIWhisperProvider implements STTProvider {
  readonly name = 'openai-whisper';
  constructor(
    private readonly opts: { apiKey: string; model: string },
  ) {}

  async transcribe(audio: AudioInput): Promise<Transcript> {
    if (!this.opts.apiKey) throw new ProviderUnavailableError('openai-whisper', 'missing api key');
    if (typeof FormData === 'undefined') {
      throw new ProviderError('openai-whisper', 'FormData not available in this runtime');
    }
    const blob = new Blob([audio.data as BlobPart], { type: audio.format.startsWith('audio/') ? audio.format : `audio/${audio.format}` });
    const form = new FormData();
    form.append('file', blob, `audio.${audio.format}`);
    form.append('model', this.opts.model);
    form.append('language', audio.language || 'ckb');

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.opts.apiKey}` },
        body: form,
      });
    } catch (err) {
      throw new ProviderUnavailableError('openai-whisper', err instanceof Error ? err.message : String(err));
    }
    if (!res.ok) throw new ProviderError(`openai-whisper returned ${res.status}`);
    const data = await res.json();
    return { text: data.text ?? '', confidence: 0.9 };
  }
}
