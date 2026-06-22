// ── Intent Scoring Service ────────────────────────────────────────────────────
// Calculates confidence scores, dormancy detection, and revival scoring
// MongoDB implementation

import crypto from 'crypto';

import { Intent, DormantIntent } from '../models/index.js';
import type { IIntent } from '../models/Intent.js';
import { sharedMemory } from '../agents/shared-memory.js';

const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[IntentScoringService] ${msg}`, meta || ''),
};

export interface ScoringContext {
  intentId: string;
  baseConfidence: number;
  signalCount: number;
  lastSignalAt: Date;
  avgVelocity: number;
  metadata: {
    appType: string;
    category: string;
    status: string;
    daysActive: number;
  };
}

export interface DormancyDetection {
  intentId: string;
  daysSinceLastActivity: number;
  currentConfidence: number;
  shouldMarkDormant: boolean;
}

export interface RevivalCandidate {
  dormantIntent: any;
  intent: any;
  revivalScore: number;
  suggestedNudge: string;
  idealTiming: Date;
}

const DORMANCY_THRESHOLD_DAYS = 7;
const CONFIDENCE_DORMANT_THRESHOLD = 0.3;

// ── Tuning Override Helpers ─────────────────────────────────────────────────────

interface TimingOverride {
  weekendBonus?: number;
  mealBonus?: number;
  preferredHour?: number;
}

/**
 * Read timing override set by the feedback loop agent.
 * Returns null if no override exists (uses defaults).
 */
async function getTimingOverride(category: string): Promise<TimingOverride | null> {
  try {
    const override = await sharedMemory.get<TimingOverride>(`timing:override:${category}`);
    return override || null;
  } catch {
    return null;
  }
}

/**
 * Read per-category dormancy threshold set by the feedback loop agent.
 * Returns null if no override exists (uses default).
 */
async function getDormancyThreshold(category: string): Promise<number | null> {
  try {
    const threshold = await sharedMemory.get<number>(`dormancy:threshold:${category}`);
    return threshold ?? null;
  } catch {
    return null;
  }
}

export class IntentScoringService {
  /**
   * Calculate detailed scoring context for an intent
   */
  async getScoringContext(intentId: string): Promise<ScoringContext | null> {
    const intent = await Intent.findById(intentId);

    if (!intent) return null;

    const signals = intent.signals || [];
    const signalCount = signals.length;
    const lastSignalAt = signals[0]?.capturedAt || intent.lastSeenAt;
    const avgVelocity = this.calculateAvgVelocity(signals);

    return {
      intentId,
      baseConfidence: intent.confidence,
      signalCount,
      lastSignalAt,
      avgVelocity,
      metadata: {
        appType: intent.appType,
        category: intent.category,
        status: intent.status,
        daysActive: Math.floor(
          (Date.now() - intent.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    };
  }

  /**
   * Detect intents that should be marked as dormant
   */
  async detectDormantIntents(daysThreshold = DORMANCY_THRESHOLD_DAYS): Promise<DormancyDetection[]> {
    const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

    const activeIntents = await Intent.find({
      status: 'ACTIVE',
      lastSeenAt: { $lt: thresholdDate },
    }).select('_id lastSeenAt confidence category').limit(1000);

    // Collect unique categories to batch-fetch overrides
    const categories = [...new Set(activeIntents.map((i: any) => i.category))];
    const thresholdOverrides = new Map<string, number>();
    for (const cat of categories) {
      const override = await getDormancyThreshold(cat);
      if (override !== null) thresholdOverrides.set(cat, override);
    }

    return activeIntents.map((intent: any) => {
      const categoryThreshold = thresholdOverrides.get(intent.category);
      const threshold = categoryThreshold ?? daysThreshold;
      const daysSince = (Date.now() - intent.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
      return {
        intentId: intent._id.toString(),
        daysSinceLastActivity: Math.floor(daysSince),
        currentConfidence: intent.confidence,
        shouldMarkDormant:
          intent.confidence < CONFIDENCE_DORMANT_THRESHOLD ||
          daysSince >= threshold,
      };
    });
  }

  /**
   * Calculate revival score for a dormant intent
   */
  async calculateRevivalScore(dormantIntentId: string): Promise<number> {
    const dormant = await DormantIntent.findById(dormantIntentId);

    if (!dormant) return 0;

    return this.computeRevivalScore(dormant);
  }

  /**
   * Compute revival score based on multiple factors
   */
  private async computeRevivalScore(dormant: any): Promise<number> {
    // Base score from intent strength
    const intentStrength = dormant.intent ? dormant.intent.confidence : 0.5;

    // Dormancy sweet spot bonus (7-14 days is optimal)
    const daysDormant = dormant.daysDormant;
    let dormancyBonus = 0;
    if (daysDormant >= 7 && daysDormant <= 14) {
      dormancyBonus = 0.15;
    } else if (daysDormant > 14 && daysDormant <= 30) {
      dormancyBonus = 0.1;
    } else if (daysDormant > 30) {
      dormancyBonus = 0.05;
    }

    // Timing factor (weekends for travel, meal times for dining) — with feedback loop overrides
    const timingBonus = await this.calculateTimingBonus(dormant.category);

    // Recency of nudge (if nudged recently, lower score)
    let nudgePenalty = 0;
    if (dormant.lastNudgeSent) {
      const daysSinceNudge =
        (Date.now() - dormant.lastNudgeSent.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceNudge < 3) nudgePenalty = 0.3;
      else if (daysSinceNudge < 7) nudgePenalty = 0.15;
    }

    // Previous nudge resistance
    const nudgeResistance = Math.min(dormant.nudgeCount * 0.1, 0.3);

    const rawScore =
      intentStrength * 0.4 +
      dormancyBonus +
      timingBonus * 0.15 +
      (1 - dormant.dormancyScore) * 0.15 -
      nudgePenalty -
      nudgeResistance;

    return Math.min(1.0, Math.max(0.0, rawScore));
  }

  /**
   * Calculate timing bonus based on category — merges feedback loop overrides
   */
  private async calculateTimingBonus(category: string): Promise<number> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Check for feedback loop tuning overrides
    const override = await getTimingOverride(category);
    if (override) {
      if (category === 'TRAVEL' && override.weekendBonus !== undefined) {
        return dayOfWeek === 0 || dayOfWeek === 6 ? override.weekendBonus : 0.05;
      }
      if (category === 'DINING' && override.mealBonus !== undefined) {
        if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
          return override.mealBonus;
        }
        return 0.05;
      }
      logger.debug(`[FeedbackLoop] Applied timing override for ${category}`, { override });
    }

    // Default timing bonuses
    if (category === 'TRAVEL') {
      return dayOfWeek === 0 || dayOfWeek === 6 ? 0.2 : 0.05;
    }

    if (category === 'DINING') {
      if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
        return 0.15;
      }
      return 0.05;
    }

    return 0.05;
  }

  /**
   * Calculate ideal revival timing
   */
  calculateIdealRevivalTime(category: string, daysDormant: number): Date {
    const baseDelay = 3;
    const now = new Date();

    switch (category) {
      case 'TRAVEL':
        const daysUntilWeekend = (7 - now.getDay() + 6) % 7 || 7;
        return new Date(now.getTime() + (baseDelay + daysUntilWeekend) * 24 * 60 * 60 * 1000);

      case 'DINING':
        const hour = now.getHours();
        let delayHours = hour < 11 ? 11 - hour : hour < 18 ? 18 - hour : 24 - hour + 11;
        return new Date(now.getTime() + delayHours * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + baseDelay * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate nudge message based on intent and trigger
   */
  generateNudgeMessage(
    intentKey: string,
    category: string,
    triggerType: string,
    _triggerData?: Record<string, unknown>
  ): string {
    const templates: Record<string, string[]> = {
      TRAVEL: [
        "You were looking at {intent}. Prices might be changing soon!",
        "Still thinking about {intent}? Perfect weather this weekend!",
        "Great deals on {intent} right now!",
      ],
      DINING: [
        "Your {intent} craving - restaurants near you have new options!",
        "Time for {intent}? Your favorite spots are open!",
        "{intent} is trending this week!",
      ],
      RETAIL: [
        "{intent} you've been eyeing - sale happening now!",
        "Good news! {intent} is available at a great price.",
        "Complete your {intent} order?",
      ],
    };

    const categoryTemplates = templates[category] || templates.RETAIL;
    const template = categoryTemplates[Math.floor(Number.parseInt(crypto.randomUUID().replace(/-/g, ''), 16) % categoryTemplates.length)];

    return template.replace('{intent}', this.formatIntentKey(intentKey));
  }

  private formatIntentKey(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get revival candidates sorted by score
   */
  async getRevivalCandidates(
    limit = 100,
    minScore = 0.3
  ): Promise<RevivalCandidate[]> {
    // Use aggregation with $lookup instead of N+1 queries
    const results = await DormantIntent.aggregate([
      { $match: { status: 'active', revivalScore: { $gte: minScore } } },
      { $sort: { revivalScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'intents',
          localField: 'intentId',
          foreignField: '_id',
          as: 'intentData',
        },
      },
      {
        $project: {
          dormantIntent: '$$ROOT',
          intent: { $arrayElemAt: ['$intentData', 0] },
          revivalScore: 1,
          intentKey: 1,
          category: 1,
          idealRevivalAt: 1,
        },
      },
    ]);

    return results.map(r => ({
      dormantIntent: r.dormantIntent,
      intent: r.intent,
      revivalScore: r.revivalScore,
      suggestedNudge: this.generateNudgeMessage(r.intentKey, r.category, 'scheduled'),
      idealTiming: r.idealRevivalAt || new Date(),
    }));
  }

  /**
   * Calculate average velocity between signals
   */
  private calculateAvgVelocity(signals: any[]): number {
    if (signals.length < 2) return 0;

    let totalMs = 0;
    for (let i = 0; i < signals.length - 1; i++) {
      totalMs +=
        new Date(signals[i + 1].capturedAt).getTime() -
        new Date(signals[i].capturedAt).getTime();
    }

    return totalMs / (signals.length - 1);
  }
}

export const intentScoringService = new IntentScoringService();
