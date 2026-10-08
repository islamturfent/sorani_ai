import type { OutboundCallRequest, CallSession, AudioChunk, TelephonyProvider } from '../types';
import { ProviderUnavailableError } from '@sorani/shared';

/** Twilio telephony adapter using the Twilio REST API. */
export class TwilioProvider implements TelephonyProvider {
  readonly name = 'twilio';
  constructor(
    private readonly opts: { accountSid: string; authToken: string; fromNumber: string },
  ) {}

  async makeCall(request: OutboundCallRequest): Promise<CallSession> {
    if (!this.opts.accountSid || !this.opts.authToken) {
      throw new ProviderUnavailableError('twilio', 'missing credentials');
    }
    const auth = Buffer.from(`${this.opts.accountSid}:${this.opts.authToken}`).toString('base64');
    const body = new URLSearchParams({
      To: request.to,
      From: request.from || this.opts.fromNumber,
      Url: request.webhookUrl || 'https://example.com/webhooks/telephony/twilio',
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.opts.accountSid}/Calls.json`,
      { method: 'POST', headers: { Authorization: `Basic ${auth}` }, body },
    );
    if (!res.ok) throw new ProviderUnavailableError('twilio', `twilio returned ${res.status}`);
    const data = await res.json();
    return { callId: data.sid, status: 'queued', to: request.to, from: request.from };
  }

  async hangup(callId: string): Promise<void> {
    void callId;
  }
  async transfer(callId: string, destination: string): Promise<void> {
    void callId;
    void destination;
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
