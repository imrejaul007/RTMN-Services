/**
 * Click Fraud Service
 *
 * Detects and blocks fraudulent clicks
 */

import { logger } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';

const FRAUD_KEY_PREFIX = 'fraud:';
const CLICK_THRESHOLD = 10; // Max clicks per user per hour
const IP_THRESHOLD = 50; // Max clicks per IP per hour

export interface FraudCheckResult {
  isFraud: boolean;
  reason?: string;
  score: number;
}

export async function detectFraudulentClick(
  adId: string,
  userId: string,
  ip: string,
  userAgent: string
): Promise<FraudCheckResult> {
  const redis = getRedis();

  try {
    // Check user click rate
    const userKey = `${FRAUD_KEY_PREFIX}user:${userId}:${adId}`;
    const userClicks = await redis.incr(userKey);
    await redis.expire(userKey, 3600); // 1 hour

    if (userClicks > CLICK_THRESHOLD) {
      logger.warn('[Fraud] User click threshold exceeded', { userId, adId, clicks: userClicks });
      return { isFraud: true, reason: 'User click threshold exceeded', score: 0.9 };
    }

    // Check IP click rate
    const ipKey = `${FRAUD_KEY_PREFIX}ip:${ip}:${adId}`;
    const ipClicks = await redis.incr(ipKey);
    await redis.expire(ipKey, 3600);

    if (ipClicks > IP_THRESHOLD) {
      logger.warn('[Fraud] IP click threshold exceeded', { ip, adId, clicks: ipClicks });
      return { isFraud: true, reason: 'IP click threshold exceeded', score: 0.95 };
    }

    // Check for suspicious user agent
    if (isSuspiciousUserAgent(userAgent)) {
      return { isFraud: true, reason: 'Suspicious user agent', score: 0.7 };
    }

    return { isFraud: false, score: 0 };
  } catch (error) {
    logger.error('[Fraud] Detection error', { error });
    // Fail open - don't block legitimate clicks
    return { isFraud: false, score: 0 };
  }
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspicious = ['bot', 'crawler', 'spider', 'headless', 'phantom', 'selenium'];
  const ua = userAgent.toLowerCase();
  return suspicious.some(term => ua.includes(term));
}

export async function getFraudStats(): Promise<{ blocked: number; total: number }> {
  const redis = getRedis();

  try {
    const keys = await redis.keys(`${FRAUD_KEY_PREFIX}*`);
    return { blocked: keys.length, total: 0 };
  } catch (error) {
    return { blocked: 0, total: 0 };
  }
}
