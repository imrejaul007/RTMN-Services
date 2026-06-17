/**
 * Targeting Service
 */
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const FREQUENCY_PREFIX = 'freq:';
const SEGMENT_PREFIX = 'seg:';

export interface TargetingSegment {
  segmentId: string;
  name: string;
  score: number;
}

export interface FrequencyCap {
  maxImpressions: number;
  windowHours: number;
}

class TargetingEngine {
  /**
   * Evaluate targeting segments for a user
   */
  async evaluate(userId: string): Promise<TargetingSegment[]> {
    const redis = getRedis();

    // In production, this would:
    // 1. Fetch user data from various sources
    // 2. Apply targeting rules
    // 3. Score and rank segments

    // Simulate segments
    const segments: TargetingSegment[] = [
      { segmentId: 'seg_high_income', name: 'High Income', score: 0.9 },
      { segmentId: 'seg_frequent_diner', name: 'Frequent Diner', score: 0.85 },
      { segmentId: 'seg_travel_enthusiast', name: 'Travel Enthusiast', score: 0.75 },
    ];

    return segments;
  }

  /**
   * Assign a variant for A/B testing
   */
  assignVariant(userId: string, campaignId: string): string {
    // Simple hash-based assignment
    const hash = userId.length + campaignId.length;
    return hash % 2 === 0 ? 'control' : 'variant';
  }

  /**
   * Check frequency cap
   */
  async checkFrequencyCap(
    userId: string,
    campaignId: string,
    channel: string
  ): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return true; // Fail open

    const key = `${FREQUENCY_PREFIX}${userId}:${campaignId}:${channel}`;

    try {
      const count = await redis.get(key);
      if (!count) return true;

      // Get campaign's frequency cap
      const capKey = `${FREQUENCY_PREFIX}cap:${campaignId}:${channel}`;
      const cap = await redis.get(capKey);

      if (!cap) return true;

      return parseInt(count) < parseInt(cap);
    } catch (error) {
      logger.warn('[Targeting] Frequency check error', { error });
      return true; // Fail open
    }
  }

  /**
   * Set frequency cap
   */
  async setFrequencyCap(
    campaignId: string,
    channel: string,
    cap: FrequencyCap
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const key = `${FREQUENCY_PREFIX}cap:${campaignId}:${channel}`;
    await redis.set(key, cap.maxImpressions.toString());
    await redis.expire(key, cap.windowHours * 60 * 60);
  }

  /**
   * Record an impression for frequency tracking
   */
  async recordImpression(
    userId: string,
    campaignId: string,
    channel: string
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const key = `${FREQUENCY_PREFIX}${userId}:${campaignId}:${channel}`;

    try {
      await redis.incr(key);
      await redis.expire(key, 24 * 60 * 60); // 24 hours
    } catch (error) {
      logger.warn('[Targeting] Record impression error', { error });
    }
  }
}

export const targetingEngine = new TargetingEngine();
