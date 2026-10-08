// ===========================================================================
// STT (speech-to-text) provider interface (spec §21).
// ===========================================================================

export interface AudioInput {
  format: string; // e.g. 'wav', 'webm', 'mp3'
  data: Uint8Array;
  sampleRate?: number;
  language?: string;
}

export interface Transcript {
  text: string;
  language?: string;
  confidence?: number;
  durationMs?: number;
}

export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface STTProvider {
  readonly name: string;
  transcribe(audio: AudioInput): Promise<Transcript>;
  transcribeStream?(audio: AsyncIterable<AudioInput>): AsyncIterable<TranscriptChunk>;
}
