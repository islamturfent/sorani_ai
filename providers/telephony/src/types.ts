// ===========================================================================
// Telephony provider interface (spec §23) — SIP, Twilio, or a custom gateway.
// ===========================================================================

export interface OutboundCallRequest {
  to: string;
  from?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CallSession {
  callId: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  from?: string;
  to?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface AudioChunk {
  data: Uint8Array;
  format: string;
}

export interface TelephonyProvider {
  readonly name: string;
  makeCall(request: OutboundCallRequest): Promise<CallSession>;
  hangup(callId: string): Promise<void>;
  transfer(callId: string, destination: string): Promise<void>;
  sendAudio(callId: string, audio: AudioChunk): Promise<void>;
  receiveAudio(callId: string): AsyncIterable<AudioChunk>;
}
