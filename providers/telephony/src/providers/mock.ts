import { generateId } from '@sorani/shared';
import type { OutboundCallRequest, CallSession, AudioChunk, TelephonyProvider } from '../types';

/** In-memory telephony used for simulation and tests. */
export class MockTelephonyProvider implements TelephonyProvider {
  readonly name = 'mock';
  private readonly sessions = new Map<string, CallSession>();
  private listeners = new Map<string, Set<(chunk: AudioChunk) => void>>();

  async makeCall(request: OutboundCallRequest): Promise<CallSession> {
    const session: CallSession = {
      callId: generateId('call'),
      status: 'in-progress',
      from: request.from,
      to: request.to,
      startedAt: new Date().toISOString(),
    };
    this.sessions.set(session.callId, session);
    return session;
  }

  async hangup(callId: string): Promise<void> {
    const s = this.sessions.get(callId);
    if (s) {
      s.status = 'completed';
      s.endedAt = new Date().toISOString();
    }
  }

  async transfer(callId: string, destination: string): Promise<void> {
    const s = this.sessions.get(callId);
    if (s) {
      s.status = 'completed';
      s.to = destination;
    }
  }

  async sendAudio(callId: string, audio: AudioChunk): Promise<void> {
    this.listeners.get(callId)?.forEach((fn) => fn(audio));
  }

  async *receiveAudio(callId: string): AsyncIterable<AudioChunk> {
    const queue = new Set<(c: AudioChunk) => void>();
    this.listeners.set(callId, queue);
    try {
      yield { data: new Uint8Array(0), format: 'audio/wav' };
    } finally {
      this.listeners.delete(callId);
    }
  }
}
