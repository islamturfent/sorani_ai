import type { AudioOutput, TTSOptions, TTSProvider } from '../types';

/** Deterministic mock TTS returning a placeholder audio blob (silence header). */
export class MockTTSProvider implements TTSProvider {
  readonly name = 'mock';

  async synthesize(text: string, options?: TTSOptions): Promise<AudioOutput> {
    void options;
    // 44-byte RIFF/WAV header for a small silent clip; enough for pipeline tests.
    const data = new Uint8Array(44);
    const view = new DataView(data.buffer);
    const sampleText = text.slice(0, 64);
    for (let i = 0; i < sampleText.length; i++) data[i + 8] = sampleText.charCodeAt(i);
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36, false);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    return { format: 'audio/wav', data, voiceId: options?.voiceId };
  }
}
