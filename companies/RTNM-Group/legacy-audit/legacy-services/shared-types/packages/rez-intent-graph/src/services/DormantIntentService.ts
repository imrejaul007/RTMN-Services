/**
 * Dormant Intent Service - MongoDB
 * Detects dormant intents, manages revival scheduling, and sends nudges
 */

import mongoose from 'mongoose';
import {
  Intent,
  DormantIntent,
  CrossAppIntentProfile,
  Nudge,
} from '../models/index.js';
import type { IDormantIntent } from '../models/DormantIntent.js';
import type { IIntent } from '../models/Intent.js';
import { nudgeTimingService } from './NudgeTimingService.js';

const DORMANCY_THRESHOLD_DAYS = 7;
const MIN_CONFIDENCE = 0.3;

export interface RevivalCandidate {
  dormantIntent: IDormantIntent;
  intent: IIntent;
  revivalScore: number;
  suggestedNudge: string;
  idealTiming: Date;
}

// Category-based ideal revival times (in days)
const CATEGORY_REVIVAL_TIMES: Record<string, number> = {
  TRAVEL: 14,
  HOTEL: 14,
  DINING: 7,
  RESTAURANT: 7,
  RETAIL: 10,
  GENERAL: 7,
};

/**
 * Dormant Intent Service - MongoDB Implementation
 */
export class DormantIntentService {
  /**
   * Mark an intent as dormant and create DormantIntent record
   */
  async markDormant(intentId: string): Promise<IDormantIntent | null> {
    const intent = await Intent.findById(intentId);

    if (!intent || intent.status === 'DORMANT') return null;

    const daysDormant = Math.floor(
      (Date.now() - intent.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate dormancy score (inverse of confidence)
    const dormancyScore = 1 - intent.confidence;

    // Calculate ideal revival time
    const idealRevivalDays = CATEGORY_REVIVAL_TIMES[intent.category] || 7;
    const idealRevivalAt = new Date();
    idealRevivalAt.setDate(idealRevivalAt.getDate() + idealRevivalDays);

    // Calculate initial revival score
    const revivalScore = this.calculateInitialRevivalScore(intent, daysDormant);

    // Create or update dormant intent record
    const dormantIntent = await DormantIntent.findOneAndUpdate(
      { userId: intent.userId, appType: intent.appType, intentKey: intent.intentKey },
      {
        $set: {
          intentId: intent._id as mongoose.Types.ObjectId,
          userId: intent.userId,
          appType: intent.appType,
          category: intent.category,
          intentKey: intent.intentKey,
          intentQuery: intent.intentQuery,
          metadata: intent.metadata,
          dormancyScore,
          revivalScore,
          daysDormant,
          idealRevivalAt,
          status: 'active',
          revivedAt: undefined,
        },
      },
      { upsert: true, new: true }
    );

    // Update intent status
    await Intent.updateOne(
      { _id: intentId },
      { $set: { status: 'DORMANT' } }
    );

    // Update cross-app profile
    await this.updateCrossAppDormancy(intent.userId, intent.appType);

    return dormantIntent;
  }

  /**
   * Process all intents and detect newly dormant ones
   */
  async detectAndMarkDormant(daysThreshold = DORMANCY_THRESHOLD_DAYS): Promise<{
    processed: number;
    markedDormant: number;
  }> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Find intents that are still active but haven't been seen recently
    const intents = await Intent.find({
      status: 'ACTIVE',
      lastSeenAt: { $lt: thresholdDate },
    }).limit(1000);

    let markedDormant = 0;

    // Process in batches of 50 with Promise.allSettled for concurrency
    const BATCH_SIZE = 50;
    for (let i = 0; i < intents.length; i += BATCH_SIZE) {
      const batch = intents.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((intent) => {
          if (intent.confidence < MIN_CONFIDENCE) {
            return this.markDormant(intent._id.toString());
          }
          return Promise.resolve(null);
        })
      );
      markedDormant += results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    }

    return { processed: intents.length, markedDormant };
  }

  /**
   * Calculate initial revival score when marking dormant
   */
  private calculateInitialRevivalScore(intent: IIntent, daysDormant: number): number {
    // Base score from original confidence
    const confidenceScore = intent.confidence * 0.4;

    // Signal richness bonus (more signals = higher chance of conversion)
    const signalRichness = Math.min(0.3, intent.signals.length * 0.05);

    // Recency of last signal
    const recencyBonus = daysDormant < 14 ? 0.2 : daysDormant < 30 ? 0.1 : 0;

    return Math.min(0.9, confidenceScore + signalRichness + recencyBonus);
  }

  /**
   * Calculate and update revival scores for all active dormant intents
   * Fixed: replaced N+1 loop with aggregation pipeline + bulk update
   */
  async updateRevivalScores(): Promise<number> {
    // Single aggregation: join DormantIntent with Intent data, calculate new scores
    const updates = await DormantIntent.aggregate([
      { $match: { status: 'active' } },
      { $limit: 500 },
      {
        $lookup: {
          from: 'intents',
          localField: 'intentId',
          foreignField: '_id',
          as: 'intentData',
        },
      },
      {
        $unwind: { path: '$intentData', preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          newDaysDormant: {
            $add: [
              '$daysDormant',
              {
                $floor: {
                  $divide: [
                    { $subtract: [Date.now(), { $ifNull: ['$updatedAt', new Date()] }] },
                    86400000, // ms per day
                  ],
                },
              },
            ],
          },
        },
      },
      {
        $addFields: {
          newScore: {
            $cond: {
              if: { $eq: [{ $type: '$intentData' }, 'missing'] },
              then: 0,
              else: {
                $min: [
                  0.9,
                  {
                    $add: [
                      {
                        $multiply: [
                          '$revivalScore',
                          { $multiply: [{ $exp: { $multiply: [-1, { $divide: ['$newDaysDormant', 60] }] } }, 0.8] },
                        ],
                      },
                      { $min: [0.2, { $multiply: [{ $size: { $ifNull: ['$intentData.signals', []] } }, 0.02] }] },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          newDaysDormant: 1,
          newScore: 1,
        },
      },
    ]);

    if (updates.length === 0) return 0;

    // Bulk update all scores in one operation
    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            revivalScore: u.newScore,
            daysDormant: u.newDaysDormant,
          },
        },
      },
    }));

    const result = await DormantIntent.bulkWrite(bulkOps, { ordered: false });
    return result.modifiedCount;
  }

  /**
   * Get dormant intents for a specific user
   */
  async getUserDormantIntents(userId: string, page = 1, limit = 20): Promise<IDormantIntent[]> {
    return DormantIntent.find({ userId, status: 'active' })
      .sort({ revivalScore: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  /**
   * Get dormant intents by merchant and category
   */
  async getDormantIntentsByMerchant(
    merchantId: string,
    category: string
  ): Promise<Array<{ userId: string; intentKey: string; category: string; revivalScore: number }>> {
    // Use aggregation with $lookup instead of N+1 queries
    const filter: any = { status: 'active' };
    if (merchantId) filter.merchantId = merchantId;
    if (category) filter.category = category;

    const results = await DormantIntent.aggregate([
      { $match: filter },
      { $limit: 100 },
      {
        $lookup: {
          from: 'intents',
          localField: 'intentId',
          foreignField: '_id',
          as: 'intentData',
        },
      },
      { $unwind: { path: '$intentData', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          userId: '$intentData.userId',
          intentKey: '$intentData.intentKey',
          category: '$intentData.category',
          revivalScore: 1,
        },
      },
    ]);

    return results.map(r => ({
      userId: r.userId,
      intentKey: r.intentKey,
      category: r.category,
      revivalScore: r.revivalScore,
    }));
  }

  /**
   * Trigger revival for a specific dormant intent
   */
  async triggerRevival(
    dormantIntentId: string,
    triggerType: 'price_drop' | 'return_user' | 'seasonality' | 'offer_match' | 'manual'
  ): Promise<RevivalCandidate | null> {
    const dormant = await DormantIntent.findById(dormantIntentId);

    if (!dormant || dormant.status !== 'active') return null;

    const intent = await Intent.findById(dormant.intentId);
    if (!intent) return null;

    // Apply trigger bonus
    let bonus = 0;
    switch (triggerType) {
      case 'price_drop':
        bonus = 0.2;
        break;
      case 'return_user':
        bonus = 0.15;
        break;
      case 'seasonality':
        bonus = 0.1;
        break;
      case 'offer_match':
        bonus = 0.25;
        break;
      case 'manual':
        bonus = 0.05;
        break;
    }

    const newScore = Math.min(1.0, dormant.revivalScore + bonus);

    await DormantIntent.updateOne(
      { _id: dormantIntentId },
      { $set: { revivalScore: newScore } }
    );

    return {
      dormantIntent: dormant,
      intent,
      revivalScore: newScore,
      suggestedNudge: this.generateNudgeMessage(intent.intentKey, intent.category, triggerType),
      idealTiming: dormant.idealRevivalAt || new Date(),
    };
  }

  /**
   * Generate nudge message based on intent and trigger
   */
  generateNudgeMessage(
    intentKey: string,
    category: string,
    triggerType: string
  ): string {
    const messages: Record<string, Record<string, string>> = {
      TRAVEL: {
        price_drop: `Prices dropped for your ${intentKey} search! Book now and save.`,
        return_user: `Welcome back! Your ${intentKey} search is still available.`,
        seasonality: `Perfect time for ${intentKey}! Available now.`,
        offer_match: `Special offer matching your ${intentKey} interest!`,
        manual: `Thought you'd like to know: ${intentKey} is trending!`,
      },
      DINING: {
        price_drop: `Your favorite ${intentKey} is on sale!`,
        return_user: `${intentKey} at ${intentKey.split('_')[1]}? Still available!`,
        seasonality: `Great time to try ${intentKey}!`,
        offer_match: `Deal alert: ${intentKey} matches your taste!`,
        manual: `New in your area: ${intentKey}`,
      },
      RETAIL: {
        price_drop: `${intentKey} is now cheaper! Limited time.`,
        return_user: `You viewed ${intentKey}. Still in stock!`,
        seasonality: `Seasonal offer on ${intentKey}!`,
        offer_match: `Perfect match: ${intentKey} is on sale!`,
        manual: `${intentKey} is trending in your area!`,
      },
    };

    const categoryMessages = messages[category] || messages['RETAIL'];
    return categoryMessages[triggerType] || `Check out ${intentKey}!`;
  }

  /**
   * Record nudge sent and update count
   */
  async recordNudgeSent(dormantIntentId: string): Promise<void> {
    await DormantIntent.updateOne(
      { _id: dormantIntentId },
      {
        $set: { lastNudgeSent: new Date() },
        $inc: { nudgeCount: 1 },
      }
    );
  }

  /**
   * Create nudge record
   */
  async createNudge(
    dormantIntentId: string,
    userId: string,
    channel: 'push' | 'email' | 'sms' | 'in_app',
    message: string
  ): Promise<void> {
    // Learn user's optimal timing profile and get next optimal send window
    const userProfile = await nudgeTimingService.learnUserTimingProfile(userId);
    const validChannel = channel === 'in_app' ? 'push' : channel;
    const optimalSendTime = nudgeTimingService.getNextOptimalSendTime(userProfile, validChannel);

    const nudge = await Nudge.create({
      dormantIntentId: new mongoose.Types.ObjectId(dormantIntentId),
      userId,
      channel,
      message,
      status: 'pending',
      scheduledFor: optimalSendTime,
      createdAt: new Date(),
    });

    // Log the timing decision
    console.info(`[DormantIntent] Nudge scheduled for ${optimalSendTime.toISOString()} (optimal: ${userProfile.pushOptimalHour}h for push, ${userProfile.emailOptimalHour}h for email, ${userProfile.smsOptimalHour}h for sms)`);
  }

  /**
   * Mark a dormant intent as revived (user converted)
   */
  async markRevived(dormantIntentId: string): Promise<void> {
    const dormant = await DormantIntent.findById(dormantIntentId);

    if (!dormant) return;

    await DormantIntent.updateOne(
      { _id: dormantIntentId },
      {
        $set: {
          status: 'revived',
          revivedAt: new Date(),
        },
      }
    );

    await Intent.updateOne(
      { _id: dormant.intentId },
      { $set: { status: 'FULFILLED' } }
    );

    // Update cross-app profile
    await CrossAppIntentProfile.updateOne(
      { userId: dormant.userId },
      { $inc: { totalConversions: 1 } }
    );
  }

  /**
   * Pause nudges for a dormant intent (user opted out)
   */
  async pauseNudges(dormantIntentId: string): Promise<void> {
    await DormantIntent.updateOne(
      { _id: dormantIntentId },
      { $set: { status: 'paused' } }
    );
  }

  /**
   * Update cross-app profile dormancy counts
   */
  private async updateCrossAppDormancy(userId: string, appType: string): Promise<void> {
    let field: string | null = null;

    if (appType === 'hotel_ota' || appType === 'hotel_guest') {
      field = 'dormantTravelCount';
    } else if (appType === 'restaurant' || appType === 'rez_now') {
      field = 'dormantDiningCount';
    } else if (appType === 'retail') {
      field = 'dormantRetailCount';
    }

    if (field) {
      await CrossAppIntentProfile.findOneAndUpdate(
        { userId },
        { $inc: { [field]: 1 } },
        { upsert: true }
      );
    }
  }

  /**
   * Get scheduled revival candidates (due for nudge)
   */
  /**
   * Get scheduled revival candidates — fixed N+1: uses aggregation $lookup
   */
  async getScheduledRevivals(): Promise<RevivalCandidate[]> {
    const now = new Date();

    // Single aggregation with $lookup to get intent data
    const results = await DormantIntent.aggregate([
      {
        $match: {
          status: 'active',
          $or: [
            { idealRevivalAt: { $lte: now } },
            { idealRevivalAt: { $exists: false } },
          ],
        },
      },
      { $sort: { revivalScore: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'intents',
          localField: 'intentId',
          foreignField: '_id',
          as: 'intentData',
        },
      },
      {
        $unwind: { path: '$intentData', preserveNullAndEmptyArrays: false },
      },
      {
        $project: {
          dormantIntent: '$$ROOT',
          intent: '$intentData',
          revivalScore: 1,
          idealTiming: { $ifNull: ['$idealRevivalAt', now] },
        },
      },
    ]);

    // Convert aggregation results back to RevivalCandidate format
    return results.map((r) => ({
      dormantIntent: r.dormantIntent as unknown as IDormantIntent,
      intent: r.intent as unknown as IIntent,
      revivalScore: r.revivalScore,
      suggestedNudge: this.generateNudgeMessage(r.dormantIntent.intentKey, r.dormantIntent.category, 'scheduled'),
      idealTiming: r.idealTiming,
    }));
  }
}

export const dormantIntentService = new DormantIntentService();
