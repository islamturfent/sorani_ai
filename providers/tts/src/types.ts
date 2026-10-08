// ===========================================================================
// TTS (text-to-speech) provider interface (spec §22). Must support a female
// Sorani (Rojin) voice configuration.
// ===========================================================================

export interface AudioOutput {
  format: string; // mime/container e.g. 'audio/wav', 'audio/mp3'
  data: Uint8Array;
  durationMs?: number;
  voiceId?: string;
}

export interface AudioChunk {
  data: Uint8Array;
  format: string;
  isFinal?: boolean;
}

export interface TTSOptions {
  voiceId?: string;
  language?: string;
  gender?: 'female' | 'male';
  speed?: number;
  pitch?: number;
  format?: string;
  personality?: string;
}

export interface TTSProvider {
  readonly name: string;
  synthesize(text: string, options?: TTSOptions): Promise<AudioOutput>;
  synthesizeStream?(text: AsyncIterable<string>, options?: TTSOptions): AsyncIterable<AudioChunk>;
}
