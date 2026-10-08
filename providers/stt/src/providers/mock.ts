import type { AudioInput, Transcript, TranscriptChunk, STTProvider } from '../types';

/** Deterministic mock STT that maps canned phrases to transcripts for testing. */
const CANNED: Record<string, string> = {
  'ئێربیل': 'Erbil',
  'ئیتاڵی': 'Italian',
  'سوشی': 'Sushi',
  'استیک': 'Steakhouse',
};

export class MockSTTProvider implements STTProvider {
  readonly name = 'mock';

  async transcribe(audio: AudioInput): Promise<Transcript> {
    void audio;
    return {
      text: 'I want to book a table for four people in Erbil tonight',
      language: 'ckb',
      confidence: 0.95,
    };
  }

  async *transcribeStream(audio: AsyncIterable<AudioInput>): AsyncIterable<TranscriptChunk> {
    for await (const chunk of audio) {
      void chunk;
      yield { text: '...', isFinal: false };
    }
    yield { text: 'I want to book a table in Erbil', isFinal: true };
  }
}
