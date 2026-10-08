/** Voice Activity Detection abstraction — detect speech segments in a stream. */
export interface VadProvider {
  readonly name: string;
  start(): Promise<VadSession>;
}

export interface VadSession {
  /** Feed a PCM/audio chunk; yields segments where speech begins/ends. */
  process(chunk: Uint8Array): VadEvent;
  stop(): void;
}

export type VadEvent = { type: 'speech_start' | 'speech_end'; timestamp: number };

/** Heuristic VAD: treats non-silence above a simple energy threshold as speech. */
export class EnergyVAD implements VadProvider {
  readonly name = 'energy';
  private readonly threshold: number;

  constructor(threshold = 200) {
    this.threshold = threshold;
  }

  async start(): Promise<VadSession> {
    return {
      process: (chunk: Uint8Array) => this.process(chunk),
      stop: () => undefined,
    };
  }

  private process(chunk: Uint8Array): VadEvent {
    // Compute a trivial RMS-ish energy over the integer samples.
    let sum = 0;
    for (let i = 0; i < chunk.length; i += 2) {
      sum += Math.abs(chunk[i] - 128);
    }
    const energy = sum / Math.max(1, chunk.length / 2);
    return energy > this.threshold ? { type: 'speech_start', timestamp: Date.now() } : { type: 'speech_end', timestamp: Date.now() };
  }
}
