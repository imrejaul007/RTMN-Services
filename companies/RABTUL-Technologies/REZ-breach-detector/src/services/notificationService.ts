// Notification Service
import { logger } from '../utils/logger';
import { Breach, BreachSeverity } from '../types';
import { eventBus } from '../utils/eventBus';

export interface NotificationChannel {
  name: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
  severities: BreachSeverity[];
}

export class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();
  private notificationLog: Array<{ channel: string; breachId: string; sentAt: Date; status: 'sent' | 'failed' }> = [];

  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
    logger.info(`[NotificationService] Registered channel: ${channel.name} (${channel.type})`);
  }

  async notify(breach: Breach): Promise<{ sent: number; failed: number }> {
    let sent = 0; let failed = 0;

    for (const channel of this.channels.values()) {
      if (!channel.enabled) continue;
      if (!channel.severities.includes(breach.severity)) continue;
      try {
        await this.send(channel, breach);
        this.notificationLog.push({ channel: channel.name, breachId: breach.id, sentAt: new Date(), status: 'sent' });
        sent++;
      } catch (error: any) {
        this.notificationLog.push({ channel: channel.name, breachId: breach.id, sentAt: new Date(), status: 'failed' });
        failed++;
        logger.error(`[NotificationService] Failed to send via ${channel.name}: ${error.message}`);
      }
    }

    return { sent, failed };
  }

  private async send(channel: NotificationChannel, breach: Breach): Promise<void> {
    // In real impl, would make HTTP calls or use SDK
    const message = `[${breach.severity.toUpperCase()}] ${breach.description}`;
    eventBus.publish(`notification.${channel.type}`, { channel: channel.name, message, breach });
    logger.info(`[NotificationService] Sent via ${channel.name}: ${message}`);
  }

  getLog(): typeof this.notificationLog { return this.notificationLog; }
  getChannels(): NotificationChannel[] { return Array.from(this.channels.values()); }
}

export const notificationService = new NotificationService();
export default notificationService;
