// ── ReZ Agent OS - Event Triggers ──────────────────────────────────────────────
// Proactive notification system for engagement and retention

import { CustomerContext } from '../types';
import { logger } from '../logger';

export interface TriggerEvent {
  type: EventType;
  userId: string;
  customerContext?: CustomerContext;
  data: Record<string, unknown>;
  scheduledAt?: Date;
}

export type EventType =
  | 'booking_reminder'
  | 'checkout_reminder'
  | 'coin_expiry'
  | 'loyalty_tier_upgrade'
  | 'engagement_nudge'
  | 'order_ready'
  | 'payment_due'
  | 'checkin_reminder'
  | 'review_request'
  | 'birthday_offer';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  channels?: ('push' | 'email' | 'sms')[];
}

export interface TriggerConfig {
  bookingReminderHours?: number;
  coinExpiryDays?: number;
  engagementNudgeHours?: number;
  reviewRequestHours?: number;
}

export type NotificationHandler = (payload: NotificationPayload) => Promise<boolean | void>;

// ── Event Templates ────────────────────────────────────────────────────────────

const EVENT_TEMPLATES: Record<EventType, (data: Record<string, unknown>) => NotificationPayload | null> = {
  booking_reminder: (data) => ({
    userId: data.userId as string,
    title: 'Booking Reminder',
    body: `Your stay at ${data.hotelName} is coming up! Check-in: ${data.checkIn}`,
    data: { bookingId: data.bookingId, type: 'booking_reminder' },
    priority: 'normal',
  }),

  checkout_reminder: (data) => ({
    userId: data.userId as string,
    title: 'Check-out Tomorrow',
    body: `Don't forget to check out from ${data.hotelName} tomorrow!`,
    data: { bookingId: data.bookingId, type: 'checkout_reminder' },
    priority: 'normal',
  }),

  coin_expiry: (data) => ({
    userId: data.userId as string,
    title: 'Coins Expiring Soon!',
    body: `You have ${data.expiringCoins} ReZ coins expiring in ${data.daysLeft} days. Use them now!`,
    data: { coins: data.expiringCoins, type: 'coin_expiry' },
    priority: 'high',
  }),

  loyalty_tier_upgrade: (data) => ({
    userId: data.userId as string,
    title: '🎉 Tier Upgraded!',
    body: `Congratulations! You've been upgraded to ${data.newTier}. Enjoy your new benefits!`,
    data: { tier: data.newTier, type: 'loyalty_tier_upgrade' },
    priority: 'high',
  }),

  engagement_nudge: (data) => ({
    userId: data.userId as string,
    title: 'We miss you!',
    body: `It's been a while since your last order. Here's 10% off your next order!`,
    data: { offerId: data.offerId, type: 'engagement_nudge' },
    priority: 'low',
  }),

  order_ready: (data) => ({
    userId: data.userId as string,
    title: 'Order Ready!',
    body: `Your order #${data.orderNumber} is ready for pickup.`,
    data: { orderId: data.orderId, type: 'order_ready' },
    priority: 'high',
  }),

  payment_due: (data) => ({
    userId: data.userId as string,
    title: 'Payment Reminder',
    body: `Your payment of ₹${data.amount} is due on ${data.dueDate}.`,
    data: { paymentId: data.paymentId, type: 'payment_due' },
    priority: 'high',
  }),

  checkin_reminder: (data) => ({
    userId: data.userId as string,
    title: 'Ready to Check In?',
    body: `Your booking at ${data.hotelName} is available for check-in now!`,
    data: { bookingId: data.bookingId, type: 'checkin_reminder' },
    priority: 'normal',
  }),

  review_request: (data) => ({
    userId: data.userId as string,
    title: 'How was your experience?',
    body: `Rate your recent order from ${data.storeName} and earn bonus coins!`,
    data: { orderId: data.orderId, storeId: data.storeId, type: 'review_request' },
    priority: 'low',
  }),

  birthday_offer: (data) => ({
    userId: data.userId as string,
    title: '🎂 Happy Birthday!',
    body: `Happy Birthday! Enjoy special offers and ${data.bonusCoins} bonus coins on your birthday!`,
    data: { offerId: data.offerId, bonusCoins: data.bonusCoins, type: 'birthday_offer' },
    priority: 'high',
  }),
};

// ── Trigger Manager ────────────────────────────────────────────────────────────

export class EventTriggerManager {
  private config: TriggerConfig;
  private handlers: Map<string, NotificationHandler> = new Map();
  private queue: TriggerEvent[] = [];
  private processing = false;

  constructor(config: TriggerConfig = {}) {
    this.config = {
      bookingReminderHours: 24,
      coinExpiryDays: 7,
      engagementNudgeHours: 72,
      reviewRequestHours: 24,
      ...config,
    };
  }

  // ── Handler Registration ──────────────────────────────────────────────────────

  registerChannel(channel: string, handler: NotificationHandler): void {
    this.handlers.set(channel, handler);
    logger.info('[EventTrigger] Registered channel', { channel });
  }

  // ── Event Queueing ──────────────────────────────────────────────────────────

  scheduleEvent(event: TriggerEvent): void {
    this.queue.push(event);
    logger.debug('[EventTrigger] Event queued', { type: event.type, userId: event.userId });
  }

  async trigger(event: TriggerEvent): Promise<void> {
    try {
      const template = EVENT_TEMPLATES[event.type];
      if (!template) {
        logger.warn('[EventTrigger] Unknown event type', { type: event.type });
        return;
      }

      const payload = template(event.data);
      if (!payload) {
        logger.debug('[EventTrigger] Event suppressed by template', { type: event.type });
        return;
      }

      // Send to all registered channels
      const channels = payload.channels || ['push'];
      for (const channel of channels) {
        const handler = this.handlers.get(channel);
        if (handler) {
          try {
            await handler(payload);
            logger.info('[EventTrigger] Notification sent', {
              channel,
              userId: payload.userId,
              type: event.type,
            });
          } catch (error) {
            logger.error('[EventTrigger] Failed to send notification', {
              channel,
              error: (error as Error).message,
            });
          }
        }
      }
    } catch (error) {
      logger.error('[EventTrigger] Event processing failed', {
        type: event.type,
        error: (error as Error).message,
      });
    }
  }

  // ── Queue Processing ────────────────────────────────────────────────────────

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();
      const dueEvents = this.queue.filter(
        (e) => !e.scheduledAt || e.scheduledAt <= now
      );

      for (const event of dueEvents) {
        await this.trigger(event);
        this.queue = this.queue.filter((e) => e !== event);
      }
    } finally {
      this.processing = false;
    }
  }

  // ── Common Trigger Helpers ───────────────────────────────────────────────────

  scheduleBookingReminder(
    userId: string,
    customerContext: CustomerContext,
    booking: {
      bookingId: string;
      hotelName: string;
      checkIn: string;
    }
  ): void {
    const checkInDate = new Date(booking.checkIn);
    const reminderTime = new Date(checkInDate.getTime() - this.config.bookingReminderHours! * 60 * 60 * 1000);

    if (reminderTime > new Date()) {
      this.scheduleEvent({
        type: 'booking_reminder',
        userId,
        customerContext,
        data: {
          userId,
          ...booking,
        },
        scheduledAt: reminderTime,
      });
    }
  }

  scheduleCoinExpiry(userId: string, expiringCoins: number, expiryDate: Date): void {
    const reminderTime = new Date(expiryDate.getTime() - this.config.coinExpiryDays! * 24 * 60 * 60 * 1000);

    if (reminderTime > new Date()) {
      this.scheduleEvent({
        type: 'coin_expiry',
        userId,
        data: {
          userId,
          expiringCoins,
          expiryDate: expiryDate.toISOString(),
          daysLeft: this.config.coinExpiryDays,
        },
        scheduledAt: reminderTime,
      });
    }
  }

  scheduleEngagementNudge(userId: string, offerId: string, lastOrderDate: Date): void {
    const nudgeTime = new Date(lastOrderDate.getTime() + this.config.engagementNudgeHours! * 60 * 60 * 1000);

    if (nudgeTime > new Date()) {
      this.scheduleEvent({
        type: 'engagement_nudge',
        userId,
        data: {
          userId,
          offerId,
          lastOrderDate: lastOrderDate.toISOString(),
        },
        scheduledAt: nudgeTime,
      });
    }
  }

  // ── Immediate Triggers ──────────────────────────────────────────────────────

  triggerOrderReady(userId: string, orderId: string, orderNumber: string): void {
    this.scheduleEvent({
      type: 'order_ready',
      userId,
      data: { userId, orderId, orderNumber },
    });
  }

  triggerLoyaltyUpgrade(userId: string, newTier: string): void {
    this.scheduleEvent({
      type: 'loyalty_tier_upgrade',
      userId,
      data: { userId, newTier },
    });
  }

  triggerBirthdayOffer(userId: string, bonusCoins: number, offerId: string): void {
    this.scheduleEvent({
      type: 'birthday_offer',
      userId,
      data: { userId, bonusCoins, offerId },
    });
  }

  triggerReviewRequest(
    userId: string,
    orderId: string,
    storeId: string,
    storeName: string
  ): void {
    this.scheduleEvent({
      type: 'review_request',
      userId,
      data: { userId, orderId, storeId, storeName },
      scheduledAt: new Date(Date.now() + this.config.reviewRequestHours! * 60 * 60 * 1000),
    });
  }
}

// ── Singleton Instance ─────────────────────────────────────────────────────────

let triggerManager: EventTriggerManager | null = null;

export function getEventTriggerManager(): EventTriggerManager {
  if (!triggerManager) {
    triggerManager = new EventTriggerManager();
  }
  return triggerManager;
}

export function initializeEventTriggers(config?: TriggerConfig): EventTriggerManager {
  triggerManager = new EventTriggerManager(config);
  return triggerManager;
}

export default EventTriggerManager;
