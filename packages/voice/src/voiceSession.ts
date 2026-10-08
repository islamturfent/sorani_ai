import { TenantContext, getGlobalLogger } from '@sorani/shared';
import type { AIAgent } from '@sorani/ai';
import type { STTProvider } from '@sorani/provider-stt';
import type { TTSProvider, TTSOptions } from '@sorani/provider-tts';

export interface VoiceSessionCallbacks {
  onTranscript(text: string): void;
  onReply(text: string): void;
  onAudio(audio: Uint8Array, format: string): void;
  onEnd?: () => void;
}

export interface VoiceSessionOptions {
  stt: STTProvider;
  tts: TTSProvider;
  agent: AIAgent;
  ttsOptions?: TTSOptions;
  language?: 'ckb' | 'en';
}

/**
 * Orchestrates a voice turn: STT (speech → text) → AI agent → TTS (text →
 * speech). Used by the browser Simulation Mode (§49) and by the telephony
 * bridge for real calls. Provider-agnostic end to end.
 */
export class VoiceSession {
  constructor(private readonly opts: VoiceSessionOptions) {}

  /** Full turn: transcribe audio, run agent, synthesize reply audio. */
  async processTurn(transcriptText: string, ctx: TenantContext, callbacks: VoiceSessionCallbacks): Promise<void> {
    callbacks.onTranscript(transcriptText);
    const response = await this.opts.agent.run(
      { session: { sessionId: `sess_${Date.now()}`, tenantId: ctx.tenantId }, input: transcriptText, language: this.opts.language ?? 'ckb' },
      ctx,
    );
    callbacks.onReply(response.text);

    // Synthesize each assistant sentence as audio for playback.
    const ttsResult = await this.opts.tts.synthesize(response.text, {
      voiceId: this.opts.ttsOptions?.voiceId,
      language: this.opts.language ?? 'ckb',
      gender: 'female',
      ...this.opts.ttsOptions,
    });
    callbacks.onAudio(ttsResult.data, ttsResult.format);

    if (response.endCall || response.transferToHuman) {
      callbacks.onEnd?.();
    }
  }

  /** Convenience: transcribe an audio buffer and run the turn. */
  async processAudio(audio: Uint8Array, ctx: TenantContext, callbacks: VoiceSessionCallbacks): Promise<void> {
    const transcript = await this.opts.stt.transcribe({ format: 'wav', data: audio });
    await this.processTurn(transcript.text, ctx, callbacks);
  }
}
