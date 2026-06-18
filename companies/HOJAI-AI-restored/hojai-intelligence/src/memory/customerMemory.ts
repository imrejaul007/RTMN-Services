/**
 * HOJAI Intelligence - Customer Memory
 * Redis-based persistent customer profiles and preferences
 */

import { v4 as uuidv4 } from 'uuid';
import { CustomerProfile } from '../types';

// In-memory fallback
const inMemoryProfiles: Map<string, CustomerProfile> = new Map();

export class CustomerMemory {
  private redis: any = null;
  private useRedis = false;
  private profileTTL = 2592000; // 30 days

  constructor(redisClient?: any) {
    if (redisClient) {
      this.redis = redisClient;
      this.useRedis = true;
    }
  }

  /**
   * Get or create customer profile
   */
  async getOrCreateProfile(customerId: string): Promise<CustomerProfile> {
    const existing = await this.getProfile(customerId);
    if (existing) return existing;

    // Create new profile with defaults
    const profile: CustomerProfile = {
      customerId,
      lifetimeValue: 0,
      tier: 'standard',
      preferences: {},
      interactionHistory: [],
      sentimentTrend: [],
      lastUpdated: Date.now(),
    };

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Get customer profile
   */
  async getProfile(customerId: string): Promise<CustomerProfile | null> {
    const key = `customer:profile:${customerId}`;

    if (this.useRedis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Redis get profile error:', error);
        return inMemoryProfiles.get(customerId) || null;
      }
    }

    return inMemoryProfiles.get(customerId) || null;
  }

  /**
   * Update customer profile
   */
  async updateProfile(
    customerId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(customerId);

    const updatedProfile: CustomerProfile = {
      ...profile,
      ...updates,
      customerId, // Ensure ID cannot be changed
      lastUpdated: Date.now(),
    };

    await this.saveProfile(updatedProfile);
    return updatedProfile;
  }

  /**
   * Add interaction to history
   */
  async addInteraction(
    customerId: string,
    type: string,
    summary: string
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(customerId);

    profile.interactionHistory.push({
      timestamp: Date.now(),
      type,
      summary,
    });

    // Keep only last 50 interactions
    if (profile.interactionHistory.length > 50) {
      profile.interactionHistory = profile.interactionHistory.slice(-50);
    }

    profile.lastUpdated = Date.now();
    await this.saveProfile(profile);
  }

  /**
   * Update sentiment trend
   */
  async updateSentimentTrend(customerId: string, score: number): Promise<void> {
    const profile = await this.getOrCreateProfile(customerId);

    profile.sentimentTrend.push(score);

    // Keep last 10 scores
    if (profile.sentimentTrend.length > 10) {
      profile.sentimentTrend = profile.sentimentTrend.slice(-10);
    }

    profile.lastUpdated = Date.now();
    await this.saveProfile(profile);
  }

  /**
   * Update customer tier based on LTV
   */
  async updateTier(customerId: string): Promise<string> {
    const profile = await this.getOrCreateProfile(customerId);

    let newTier: CustomerProfile['tier'] = 'standard';

    if (profile.lifetimeValue >= 10000) {
      newTier = 'vip';
    } else if (profile.lifetimeValue >= 1000) {
      newTier = 'premium';
    }

    if (profile.tier !== newTier) {
      profile.tier = newTier;
      profile.lastUpdated = Date.now();
      await this.saveProfile(profile);
    }

    return newTier;
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    customerId: string,
    preferences: Record<string, unknown>
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(customerId);

    profile.preferences = {
      ...profile.preferences,
      ...preferences,
    };

    profile.lastUpdated = Date.now();
    await this.saveProfile(profile);
  }

  /**
   * Get customer insights
   */
  async getInsights(customerId: string): Promise<{
    avgSentiment: number;
    totalInteractions: number;
    currentTier: string;
    sentimentTrend: 'improving' | 'declining' | 'stable';
    atRisk: boolean;
  } | null> {
    const profile = await this.getProfile(customerId);
    if (!profile) return null;

    const avgSentiment = profile.sentimentTrend.length > 0
      ? profile.sentimentTrend.reduce((a, b) => a + b, 0) / profile.sentimentTrend.length
      : 0;

    const sentimentTrend = this.calculateTrend(profile.sentimentTrend);

    // Determine if customer is at risk
    const atRisk = profile.sentimentTrend.length >= 3 &&
      profile.sentimentTrend.slice(-3).every(s => s < -0.2);

    return {
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      totalInteractions: profile.interactionHistory.length,
      currentTier: profile.tier,
      sentimentTrend,
      atRisk,
    };
  }

  /**
   * Search customers by criteria
   */
  async searchCustomers(criteria: {
    tier?: CustomerProfile['tier'];
    minLifetimeValue?: number;
    atRisk?: boolean;
  }): Promise<string[]> {
    const customerIds: string[] = [];

    if (this.useRedis) {
      try {
        const keys = await this.redis.keys('customer:profile:*');
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const profile: CustomerProfile = JSON.parse(data);
            if (this.matchesCriteria(profile, criteria)) {
              customerIds.push(profile.customerId);
            }
          }
        }
      } catch (error) {
        console.error('Redis search error:', error);
      }
    } else {
      inMemoryProfiles.forEach((profile, id) => {
        if (this.matchesCriteria(profile, criteria)) {
          customerIds.push(id);
        }
      });
    }

    return customerIds;
  }

  /**
   * Get VIP customers
   */
  async getVIPCustomers(): Promise<CustomerProfile[]> {
    const ids = await this.searchCustomers({ tier: 'vip' });
    const profiles: CustomerProfile[] = [];

    for (const id of ids) {
      const profile = await this.getProfile(id);
      if (profile) profiles.push(profile);
    }

    return profiles;
  }

  /**
   * Get at-risk customers
   */
  async getAtRiskCustomers(): Promise<CustomerProfile[]> {
    const allIds = await this.searchCustomers({});
    const atRisk: CustomerProfile[] = [];

    for (const id of allIds) {
      const insights = await this.getInsights(id);
      if (insights?.atRisk) {
        const profile = await this.getProfile(id);
        if (profile) atRisk.push(profile);
      }
    }

    return atRisk;
  }

  /**
   * Calculate sentiment trend direction
   */
  private calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    const recent = scores.slice(-3);
    const older = scores.slice(0, Math.max(0, scores.length - 3));

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Check if profile matches search criteria
   */
  private matchesCriteria(
    profile: CustomerProfile,
    criteria: { tier?: CustomerProfile['tier']; minLifetimeValue?: number; atRisk?: boolean }
  ): boolean {
    if (criteria.tier && profile.tier !== criteria.tier) return false;
    if (criteria.minLifetimeValue && profile.lifetimeValue < criteria.minLifetimeValue) return false;
    if (criteria.atRisk) {
      const recentScores = profile.sentimentTrend.slice(-3);
      if (!recentScores.every(s => s < -0.2)) return false;
    }
    return true;
  }

  /**
   * Save profile to storage
   */
  private async saveProfile(profile: CustomerProfile): Promise<void> {
    const key = `customer:profile:${profile.customerId}`;

    if (this.useRedis) {
      try {
        await this.redis.setex(key, this.profileTTL, JSON.stringify(profile));
      } catch (error) {
        console.error('Redis save profile error:', error);
        inMemoryProfiles.set(profile.customerId, profile);
      }
    } else {
      inMemoryProfiles.set(profile.customerId, profile);
    }
  }

  /**
   * Delete customer profile
   */
  async deleteProfile(customerId: string): Promise<void> {
    const key = `customer:profile:${customerId}`;

    if (this.useRedis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    inMemoryProfiles.delete(customerId);
  }
}

export const customerMemory = new CustomerMemory();