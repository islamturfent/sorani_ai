import type { TTSOptions } from './types';

/**
 * Canonical female Sorani (Rojin) voice configuration — used to configure any
 * TTS provider consistently, so switching vendors never changes the persona.
 */
export interface RojinVoiceConfig extends TTSOptions {
  voiceId: string;
  language: 'ckb';
  gender: 'female';
  speed: number;
  pitch: number;
  format: string;
  personality: 'natural' | 'friendly' | 'professional' | 'concise' | 'warm';
}

export const ROJIN_VOICE: RojinVoiceConfig = {
  voiceId: 'sorani-female-rojin',
  language: 'ckb',
  gender: 'female',
  speed: 1.0,
  pitch: 1.0,
  format: 'audio/wav',
  personality: 'warm',
};
