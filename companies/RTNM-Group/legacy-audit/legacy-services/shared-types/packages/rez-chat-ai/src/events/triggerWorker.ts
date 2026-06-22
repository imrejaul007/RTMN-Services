// ── Event Trigger Worker ────────────────────────────────────────────────────────
// Background worker for processing scheduled events

import { initializeEventTriggers, EventTriggerManager, NotificationPayload } from './eventTriggers';
import { logger } from '../logger';

export interface TriggerWorkerConfig {
  pollIntervalMs?: number;
  batchSize?: number;
}

export class TriggerWorker {
  private manager: EventTriggerManager;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollIntervalMs: number;

  constructor(manager: EventTriggerManager, config: TriggerWorkerConfig = {}) {
    this.manager = manager;
    this.pollIntervalMs = config.pollIntervalMs || 60000; // Default 1 minute
  }

  // ── Push Notification Handler ────────────────────────────────────────────────

  async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Integration with Expo Push Notifications or similar
      // This would typically call a service like:
      // - Expo Push API
      // - Firebase Cloud Messaging
      // - OneSignal
      // - Your own push service

      logger.info('[TriggerWorker] Sending push notification', {
        userId: payload.userId,
        title: payload.title,
      });

      // Example integration with Expo:
      // await Expo.sendPushNotificationAsync({
      //   to: await getExpoPushToken(payload.userId),
      //   title: payload.title,
      //   body: payload.body,
      //   data: payload.data,
      // });

      return true;
    } catch (error) {
      logger.error('[TriggerWorker] Push notification failed', {
        userId: payload.userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // ── SMS Handler ─────────────────────────────────────────────────────────────

  async sendSMS(payload: NotificationPayload): Promise<boolean> {
    try {
      // Integration with SMS provider like MSG91, Twilio, etc.
      logger.info('[TriggerWorker] Sending SMS', {
        userId: payload.userId,
        title: payload.title,
      });

      // Example integration:
      // await msg91.send({
      //   to: await getUserPhone(payload.userId),
      //   message: `${payload.title}\n\n${payload.body}`,
      // });

      return true;
    } catch (error) {
      logger.error('[TriggerWorker] SMS failed', {
        userId: payload.userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // ── Email Handler ────────────────────────────────────────────────────────────

  async sendEmail(payload: NotificationPayload): Promise<boolean> {
    try {
      // Integration with email service like SendGrid, Mailgun, etc.
      logger.info('[TriggerWorker] Sending email', {
        userId: payload.userId,
        title: payload.title,
      });

      // Example integration:
      // await sendgrid.send({
      //   to: await getUserEmail(payload.userId),
      //   subject: payload.title,
      //   html: `<p>${payload.body}</p>`,
      // });

      return true;
    } catch (error) {
      logger.error('[TriggerWorker] Email failed', {
        userId: payload.userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // ── Start/Stop ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.isRunning) {
      logger.warn('[TriggerWorker] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[TriggerWorker] Starting', { pollIntervalMs: this.pollIntervalMs });

    // Register notification channels
    this.manager.registerChannel('push', this.sendPushNotification.bind(this));
    this.manager.registerChannel('sms', this.sendSMS.bind(this));
    this.manager.registerChannel('email', this.sendEmail.bind(this));

    // Start polling
    this.intervalId = setInterval(() => {
      this.processEvents();
    }, this.pollIntervalMs);

    // Process immediately on start
    this.processEvents();
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('[TriggerWorker] Stopped');
  }

  // ── Event Processing ────────────────────────────────────────────────────────

  private async processEvents(): Promise<void> {
    try {
      await this.manager.processQueue();
    } catch (error) {
      logger.error('[TriggerWorker] Event processing error', {
        error: (error as Error).message,
      });
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────────────────

let worker: TriggerWorker | null = null;

export function startTriggerWorker(config?: TriggerWorkerConfig): TriggerWorker {
  if (worker) {
    worker.stop();
  }

  const manager = initializeEventTriggers({
    bookingReminderHours: 24,
    coinExpiryDays: 7,
    engagementNudgeHours: 72,
    reviewRequestHours: 24,
  });

  worker = new TriggerWorker(manager, config);
  worker.start();

  logger.info('[TriggerWorker] Worker started');
  return worker;
}

export function stopTriggerWorker(): void {
  if (worker) {
    worker.stop();
    worker = null;
  }
}

export function getTriggerWorker(): TriggerWorker | null {
  return worker;
}

export default TriggerWorker;
