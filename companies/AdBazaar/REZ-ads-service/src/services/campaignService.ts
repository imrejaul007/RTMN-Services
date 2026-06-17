/**
 * Campaign Service
 *
 * Handles campaign operations
 */

import { logger } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';

const CAMPAIGN_CACHE_TTL = 300; // 5 minutes
const CAMPAIGN_CACHE_PREFIX = 'campaign:';

export interface Campaign {
  campaignId: string;
  name: string;
  status: string;
  budget: { total: number; spent: number; remaining: number };
  targeting: Record<string, unknown>;
}

export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  const redis = getRedis();
  const cacheKey = `${CAMPAIGN_CACHE_PREFIX}${campaignId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn('[CampaignCache] Redis get error', { error: err });
  }

  // In production, fetch from MongoDB
  // For now, return mock data
  return {
    campaignId,
    name: 'Sample Campaign',
    status: 'active',
    budget: { total: 50000, spent: 12500, remaining: 37500 },
    targeting: {},
  };
}

export async function invalidateCampaignCache(campaignId: string): Promise<void> {
  const redis = getRedis();
  const cacheKey = `${CAMPAIGN_CACHE_PREFIX}${campaignId}`;

  try {
    await redis.del(cacheKey);
    logger.info('[CampaignCache] Invalidated', { campaignId });
  } catch (err) {
    logger.warn('[CampaignCache] Redis del error', { error: err });
  }
}

export async function updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
  await invalidateCampaignCache(campaignId);

  return {
    campaignId,
    ...updates,
  } as Campaign;
}
