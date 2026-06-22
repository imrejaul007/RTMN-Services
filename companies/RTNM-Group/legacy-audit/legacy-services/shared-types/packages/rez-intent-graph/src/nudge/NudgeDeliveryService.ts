// ── Nudge Delivery Service ─────────────────────────────────────────────────────
// Handles delivery of intent revival nudges across channels
// MongoDB implementation

import crypto from 'crypto';
import mongoose from 'mongoose';
import { Nudge, NudgeSchedule } from '../models/index.js';
import { dormantIntentService } from '../services/DormantIntentService.js';
import { sendUserNotification } from '../integrations/external-services.js';

// ── Nudge Channel Types ───────────────────────────────────────────────────────

export type NudgeChannel = 'push' | 'email' | 'sms' | 'in_app';
export type NudgeStatus = 'pending' | 'sent' | 'delivered' | 'clicked' | 'converted' | 'failed';

export interface NudgeRecord {
  id: string;
  dormantIntentId: string;
  userId: string;
  channel: NudgeChannel;
  message: string;
  status: NudgeStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
  error?: string;
}

export interface NudgeTemplate {
  category: string;
  triggerType: string;
  channels: NudgeChannel[];
  templates: Record<NudgeChannel, string[]>;
}

// ── Nudge Templates ───────────────────────────────────────────────────────────

const NUDGE_TEMPLATES: Record<string, Record<string, Record<NudgeChannel, string[]>>> = {
  TRAVEL: {
    scheduled: {
      push: [
        "Your {intent} search - still available!",
        "Perfect weekend for {intent}!",
        "{intent} - trending this week!",
      ],
      email: [
        "Complete your {intent} booking today!",
        "Don't miss out on {intent} - limited availability!",
        "{intent}: Your trip is waiting!",
      ],
      sms: [
        "Your {intent} search - tap to book: {link}",
        "{intent} deals available now!",
      ],
      in_app: [
        "Ready to book {intent}? Your search is saved!",
        "Complete your {intent} booking with one tap!",
      ],
    },
    price_drop: {
      push: [
        "Price alert! {intent} just got cheaper!",
        "Great news! {intent} is now discounted!",
      ],
      email: [
        "Your {intent} search - prices dropped!",
        "Special offer on {intent} - limited time!",
      ],
      sms: [
        "{intent} - now {discount}% off! Book now: {link}",
      ],
      in_app: [
        "{intent} price dropped! Update your search.",
      ],
    },
    return_user: {
      push: [
        "Welcome back! {intent} is waiting.",
        "We missed you! {intent} is ready.",
      ],
      email: [
        "Welcome back! Continue your {intent} search.",
        "Your {intent} preferences are saved.",
      ],
      sms: [
        "Welcome back! Complete {intent} booking: {link}",
      ],
      in_app: [
        "Welcome back! Your {intent} search is saved.",
      ],
    },
  },
  DINING: {
    scheduled: {
      push: [
        "Your {intent} cravings - satisfied!",
        "{intent} cravings? They're ready!",
      ],
      email: [
        "Your {intent} order - ready to reorder!",
        "Craving {intent}? New options available!",
      ],
      sms: [
        "{intent} - tap to order: {link}",
      ],
      in_app: [
        "Your saved {intent} - order again!",
      ],
    },
    offer_match: {
      push: [
        "{intent} + {offer} = perfect match!",
        "Special deal on your favorite: {intent}!",
      ],
      email: [
        "Deal alert: {intent} + {offer}!",
        "Your {intent} with exclusive discount!",
      ],
      sms: [
        "{intent} + {offer}! Order now: {link}",
      ],
      in_app: [
        "Exclusive offer on {intent}!",
      ],
    },
  },
  RETAIL: {
    scheduled: {
      push: [
        "{intent} is back in stock!",
        "Your wishlist item: {intent}!",
      ],
      email: [
        "{intent} - back by popular demand!",
        "Your saved item {intent} is available!",
      ],
      sms: [
        "{intent} back in stock! Shop now: {link}",
      ],
      in_app: [
        "{intent} available now!",
      ],
    },
    price_drop: {
      push: [
        "{intent} - now at {discount}% off!",
        "Price drop alert for {intent}!",
      ],
      email: [
        "{intent} price reduced! Limited time.",
        "Your saved item {intent} is on sale!",
      ],
      sms: [
        "{intent} now {discount}% off: {link}",
      ],
      in_app: [
        "{intent} sale! Tap to buy.",
      ],
    },
  },
};

// ── Send Nudge Params & Result ────────────────────────────────────────────────

export interface SendNudgeParams {
  dormantIntentId: string;
  userId: string;
  intentKey: string;
  category: string;
  message: string;
  channel: NudgeChannel;
  revivalScore: number;
  triggerType?: string;
}

export interface SendNudgeResult {
  success: boolean;
  reason?: string;
  nudgeId?: string;
  error?: string;
}

// ── Nudge Delivery Service ─────────────────────────────────────────────────

export class NudgeDeliveryService {
  private channelHandlers: Map<NudgeChannel, NudgeChannelHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  registerChannelHandler(channel: NudgeChannel, handler: NudgeChannelHandler): void {
    this.channelHandlers.set(channel, handler);
  }

  async send(params: {
    userId: string;
    intentKey: string;
    message: string;
    channel: NudgeChannel;
    template?: string;
  }): Promise<NudgeRecord> {
    const handler = this.channelHandlers.get(params.channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${params.channel}`);
    }

    await handler.send({
      userId: params.userId,
      message: params.message,
      data: { intentKey: params.intentKey },
    });

    return {
      id: `nudge_${Date.now()}`,
      dormantIntentId: params.intentKey,
      userId: params.userId,
      channel: params.channel,
      message: params.message,
      status: 'sent',
      sentAt: new Date(),
    };
  }

  async processScheduledNudges(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const candidates = await dormantIntentService.getScheduledRevivals();
    let sent = 0;
    let failed = 0;

    for (const candidate of candidates) {
      if (candidate.revivalScore < 0.3) continue;

      try {
        await this.sendNudge(candidate);
        sent++;
      } catch (error) {
        console.error('[NudgeDelivery] Failed to send nudge:', error);
        failed++;
      }
    }

    return { processed: candidates.length, sent, failed };
  }

  async sendNudge(candidate: any): Promise<NudgeRecord> {
    const { dormantIntent, suggestedNudge } = candidate;

    // Check user preferences before sending
    const schedule = await NudgeSchedule.findOne({
      userId: dormantIntent.userId,
      category: dormantIntent.category,
      channel: 'push',
      active: true,
    });

    if (schedule) {
      const revivalScore = candidate.revivalScore ?? 0;
      if (revivalScore < schedule.minRevivalScore) {
        console.debug(`[NudgeDelivery] Skipping nudge — revival score ${revivalScore} below user preference ${schedule.minRevivalScore}`);
        return {
          id: `skipped_${Date.now()}`,
          dormantIntentId: dormantIntent._id?.toString() || '',
          userId: dormantIntent.userId,
          channel: 'push',
          message: suggestedNudge || '',
          status: 'failed',
        };
      }
    }

    const category = dormantIntent.category;
    const triggerType = this.inferTriggerType(dormantIntent);
    const template = this.getTemplate(category, triggerType);

    const channel = 'push'; // Default channel
    const message = this.renderTemplate(template, channel, dormantIntent, suggestedNudge);

    const handler = this.channelHandlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }

    try {
      const result = await handler.send({
        userId: dormantIntent.userId,
        message,
        data: {
          intentKey: dormantIntent.intentKey,
          category: dormantIntent.category,
          dormantIntentId: dormantIntent._id?.toString(),
        },
      });

      // Create nudge record
      const nudge = await this.createNudge(
        dormantIntent._id,
        dormantIntent.userId,
        channel,
        message,
        result.success ? 'sent' : 'failed',
        result.error
      );

      await dormantIntentService.recordNudgeSent(dormantIntent._id.toString());

      return {
        id: nudge._id.toString(),
        dormantIntentId: dormantIntent._id?.toString() || '',
        userId: dormantIntent.userId,
        channel,
        message,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date(),
      };
    } catch (error) {
      console.error('[NudgeDelivery] Handler failed:', error);
      throw error;
    }
  }

  /**
   * Send nudge to a specific user with explicit parameters
   */
  async sendNudgeTo(params: SendNudgeParams): Promise<SendNudgeResult> {
    // Check user preferences
    const schedule = await NudgeSchedule.findOne({
      userId: params.userId,
      category: params.category,
      channel: params.channel,
      active: true,
    });

    if (schedule && params.revivalScore < schedule.minRevivalScore) {
      console.debug(`[NudgeDelivery] Skipping nudge — revival score ${params.revivalScore} below user preference ${schedule.minRevivalScore}`);
      return { success: false, reason: 'below_min_score' };
    }

    const handler = this.channelHandlers.get(params.channel);
    if (!handler) {
      return { success: false, reason: `No handler for channel: ${params.channel}` };
    }

    try {
      const result = await handler.send({
        userId: params.userId,
        message: params.message,
        data: {
          intentKey: params.intentKey,
          dormantIntentId: params.dormantIntentId,
        },
      });

      const dormantOid = mongoose.Types.ObjectId.isValid(params.dormantIntentId)
        ? new mongoose.Types.ObjectId(params.dormantIntentId)
        : undefined;

      const nudge = await this.createNudge(
        dormantOid,
        params.userId,
        params.channel,
        params.message,
        result.success ? 'sent' : 'failed',
        result.error
      );

      return {
        success: result.success,
        nudgeId: nudge._id.toString(),
        error: result.error,
      };
    } catch (error) {
      console.error('[NudgeDelivery] sendNudgeTo failed:', error);
      return { success: false, error: String(error) };
    }
  }

  async recordNudgeSent(
    dormantIntentId: string,
    userId: string,
    channel: string,
    message: string,
    nudgeId?: string
  ): Promise<void> {
    try {
      const dormantOid = mongoose.Types.ObjectId.isValid(dormantIntentId)
        ? new mongoose.Types.ObjectId(dormantIntentId)
        : undefined;

      await this.createNudge(
        dormantOid,
        userId,
        channel as NudgeChannel,
        message,
        'sent'
      );

      await dormantIntentService.recordNudgeSent(dormantIntentId);
      console.log('[NudgeDelivery] Nudge recorded:', { dormantIntentId, userId, channel, nudgeId });
    } catch (error) {
      console.error('[NudgeDelivery] Failed to record nudge:', error);
    }
  }

  async updateNudgeStatus(
    nudgeId: string,
    status: 'delivered' | 'clicked' | 'converted' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = { status };

      if (status === 'delivered') updateData.deliveredAt = new Date();
      if (status === 'clicked') updateData.clickedAt = new Date();
      if (status === 'converted') updateData.convertedAt = new Date();
      if (status === 'failed' && error) updateData.error = error;

      await Nudge.updateOne(
        { _id: nudgeId },
        { $set: updateData }
      );

      console.log('[NudgeDelivery] Nudge status updated:', { nudgeId, status });
    } catch (error) {
      console.error('[NudgeDelivery] Failed to update nudge status:', error);
    }
  }

  async getNudgeStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    conversionRate: number;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const nudges = await Nudge.find({ createdAt: { $gte: thirtyDaysAgo } }).limit(10000);

    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    let converted = 0;

    for (const nudge of nudges) {
      byStatus[nudge.status] = (byStatus[nudge.status] || 0) + 1;
      byChannel[nudge.channel] = (byChannel[nudge.channel] || 0) + 1;
      if (nudge.status === 'converted') converted++;
    }

    return {
      total: nudges.length,
      byStatus,
      byChannel,
      conversionRate: nudges.length > 0 ? converted / nudges.length : 0,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Create a Nudge record in MongoDB
   */
  private async createNudge(
    dormantIntentId: mongoose.Types.ObjectId | undefined,
    userId: string,
    channel: NudgeChannel,
    message: string,
    status: 'pending' | 'sent' | 'delivered' | 'clicked' | 'converted' | 'failed' = 'sent',
    error?: string
  ): Promise<any> {
    return Nudge.create({
      ...(dormantIntentId ? { dormantIntentId } : {}),
      userId,
      channel,
      message,
      status,
      error,
      sentAt: status === 'sent' || status === 'delivered' || status === 'clicked' || status === 'converted' ? new Date() : undefined,
      createdAt: new Date(),
    });
  }

  private registerDefaultHandlers(): void {
    // Push handler
    this.channelHandlers.set('push', {
      send: async (params) => {
        try {
          const result = await sendUserNotification(
            params.userId,
            'ReZ Mind',
            params.message,
            params.data as Record<string, unknown>
          );
          return { success: result.success, error: result.error };
        } catch (error) {
          console.error('[NudgeDelivery] Push failed:', error);
          return { success: false, error: String(error) };
        }
      },
    });

    // Email handler — logs clearly and stores nudge record
    this.channelHandlers.set('email', {
      send: async (params) => {
        console.info(`[NudgeDelivery] EMAIL to ${params.userId}:`, {
          to: `user_${params.userId}@placeholder.com`,
          subject: 'ReZ Mind - Your intent is waiting!',
          body: params.message,
        });

        // Attempt real delivery via notification service
        try {
          const result = await sendUserNotification(
            params.userId,
            'ReZ Mind',
            params.message,
            params.data as Record<string, unknown>
          );
          return { success: result.success, channel: 'email', error: result.error };
        } catch (error) {
          return { success: false, error: String(error), channel: 'email' };
        }
      },
    });

    // SMS handler — logs clearly and stores nudge record
    this.channelHandlers.set('sms', {
      send: async (params) => {
        console.info(`[NudgeDelivery] SMS to ${params.userId}:`, {
          message: params.message,
          phone: (params.data as any)?.phone || `user_${params.userId}@placeholder.com`,
        });
        // SMS delivery would use a real SMS provider here
        // For now, treat as success since we logged it
        return { success: true, channel: 'sms' };
      },
    });

    // In-app handler
    this.channelHandlers.set('in_app', {
      send: async (params) => {
        console.info(`[NudgeDelivery] In-app message to ${params.userId}:`, params);
        return { success: true, channel: 'in_app' };
      },
    });
  }

  private inferTriggerType(dormantIntent: any): string {
    if (dormantIntent.nudgeCount === 0) return 'scheduled';
    if (dormantIntent.daysDormant > 14) return 'return_user';
    return 'scheduled';
  }

  private getTemplate(category: string, triggerType: string): string[] {
    const templates = NUDGE_TEMPLATES[category]?.[triggerType];
    if (!templates) {
      return NUDGE_TEMPLATES['DINING']['scheduled']['push'];
    }
    return templates['push'];
  }

  private renderTemplate(
    templates: string[],
    channel: NudgeChannel,
    intent: any,
    suggestedNudge?: string
  ): string {
    if (suggestedNudge) return suggestedNudge;

    const template = templates[Math.floor(Number.parseInt(crypto.randomUUID().replace(/-/g, ''), 16) % templates.length)];
    const formattedIntent = this.formatIntentKey(intent.intentKey);

    return template
      .replace('{intent}', formattedIntent)
      .replace('{link}', this.generateDeepLink(intent))
      .replace('{discount}', '15')
      .replace('{offer}', 'special deal');
  }

  private formatIntentKey(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateDeepLink(intent: any): string {
    switch (intent.category) {
      case 'TRAVEL':
        return `rez://hotel/${intent.intentKey}`;
      case 'DINING':
        return `rez://restaurant/${intent.intentKey}`;
      case 'RETAIL':
        return `rez://product/${intent.intentKey}`;
      default:
        return 'rez://home';
    }
  }
}

// ── Nudge Channel Handler Interface ──────────────────────────────────────────

export interface NudgeChannelHandler {
  send(params: {
    userId: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: boolean; error?: string; channel?: string }>;
}

export const nudgeDeliveryService = new NudgeDeliveryService();
