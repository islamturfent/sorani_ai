import type { OutboundCallRequest, CallSession, AudioChunk, TelephonyProvider } from '../types';

/** Generic SIP gateway adapter (e.g. Asterisk/FreeSWITCH via REST). */
export class SIPProvider implements TelephonyProvider {
  readonly name = 'sip';
  constructor(
    private readonly opts: { gatewayUrl: string; from?: string },
  ) {}

  async makeCall(request: OutboundCallRequest): Promise<CallSession> {
    const res = await fetch(`${this.opts.gatewayUrl}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: request.to, from: request.from || this.opts.from, metadata: request.metadata }),
    });
    if (!res.ok) throw new Error(`sip gateway returned ${res.status}`);
    return (await res.json()) as CallSession;
  }
  async hangup(callId: string): Promise<void> {
    await fetch(`${this.opts.gatewayUrl}/calls/${callId}`, { method: 'DELETE' });
  }
  async transfer(callId: string, destination: string): Promise<void> {
    await fetch(`${this.opts.gatewayUrl}/calls/${callId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination }),
    });
  }
  async sendAudio(callId: string, audio: AudioChunk): Promise<void> {
    void callId;
    void audio;
  }
  async *receiveAudio(callId: string): AsyncIterable<AudioChunk> {
    void callId;
    yield { data: new Uint8Array(0), format: 'audio/wav' };
  }
}
