import { TenantContext, generateId, nowIso } from '@sorani/shared';

export type NotificationChannel = 'sms' | 'email' | 'push';

export interface Notification {
  id: string;
  tenantId: string;
  channel: NotificationChannel;
  recipient: string;
  title: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
}

/** Provider-neutral notify contract — swap SMS/email/push vendors freely. */
export interface NotificationSender {
  readonly name: string;
  send(input: { recipient: string; title: string; body: string; channel: NotificationChannel }): Promise<boolean>;
}

export class ConsoleNotificationSender implements NotificationSender {
  readonly name = 'console';
  async send(input: { recipient: string; title: string; body: string; channel: NotificationChannel }): Promise<boolean> {
    console.log(`[notification:${input.channel}] to=${input.recipient} ${input.title}: ${input.body}`);
    return true;
  }
}

export class NotificationService {
  constructor(
    private readonly sender: NotificationSender = new ConsoleNotificationSender(),
  ) {}

  async notify(ctx: TenantContext, input: {
    channel: NotificationChannel;
    recipient: string;
    title: string;
    body: string;
  }): Promise<Notification> {
    const notification: Notification = {
      id: generateId('ntf'),
      tenantId: ctx.tenantId,
      channel: input.channel,
      recipient: input.recipient,
      title: input.title,
      body: input.body,
      status: 'queued',
      createdAt: nowIso(),
    };
    const ok = await this.sender.send(input);
    notification.status = ok ? 'sent' : 'failed';
    return notification;
  }
}
