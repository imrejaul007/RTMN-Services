/**
 * Engagement Sync Service
 * Synchronizes engagement data with Journey Twin, Customer Twin, and Industry Twin
 */

import axios from 'axios';
import { AxomProfile, axomProfileStore } from '../models/AxomProfile';
import { logger } from '../index';

interface SyncResult {
  service: string;
  success: boolean;
  syncedAt?: Date;
  error?: string;
}

interface EngagementData {
  profileId: string;
  engagementScore: number;
  engagementTrend: 'rising' | 'stable' | 'declining';
  metrics: {
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    eventsAttended: number;
    eventsHosted: number;
  };
  interests: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  syncSource: 'axom';
}

class EngagementSync {
  private journeyTwinUrl: string;
  private customerTwinUrl: string;
  private industryTwinUrl: string;
  private eventBusUrl: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTimes: Map<string, Date> = new Map();

  constructor() {
    this.journeyTwinUrl = process.env.JOURNEY_TWIN_URL || 'http://localhost:3012';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.industryTwinUrl = process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705';
    this.eventBusUrl = process.env.COMMUNITY_EVENT_BUS_URL || 'http://localhost:4510';
  }

  /**
   * Start periodic sync to twins
   */
  startPeriodicSync(intervalMs: number = 5 * 60 * 1000): void {
    if (this.syncInterval) {
      logger.warn('Periodic sync already running');
      return;
    }

    logger.info(`Starting engagement sync with interval: ${intervalMs}ms`);

    this.syncInterval = setInterval(async () => {
      await this.syncAllEngagements();
    }, intervalMs);

    // Initial sync
    this.syncAllEngagements();
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Stopped periodic engagement sync');
    }
  }

  /**
   * Sync all engagements to twins
   */
  async syncAllEngagements(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    const profiles = Array.from(axomProfileStore.values());
    logger.info(`Syncing ${profiles.length} profiles to twins`);

    for (const profile of profiles) {
      const result = await this.syncProfileEngagement(profile);
      results.set(profile.profileId, result);
    }

    return results;
  }

  /**
   * Sync single profile engagement
   */
  async syncProfileEngagement(profile: AxomProfile): Promise<SyncResult> {
    const engagementData = this.buildEngagementData(profile);
    const results: SyncResult[] = [];

    // Sync to Journey Twin
    const journeyResult = await this.syncToJourneyTwin(profile, engagementData);
    results.push(journeyResult);

    // Sync to Customer Twin
    const customerResult = await this.syncToCustomerTwin(profile, engagementData);
    results.push(customerResult);

    // Sync to Industry Twin (community)
    const industryResult = await this.syncToIndustryTwin(profile, engagementData);
    results.push(industryResult);

    // Publish engagement event
    await this.publishEngagementEvent(profile, engagementData);

    // Update sync status on profile
    const overallSuccess = results.every((r) => r.success);
    profile.journeyTwinSynced = journeyResult.success;
    profile.customerTwinSynced = customerResult.success;
    profile.industryTwinSynced = industryResult.success;
    profile.lastSyncedAt = new Date();
    axomProfileStore.set(profile.profileId, profile);

    this.lastSyncTimes.set(profile.profileId, new Date());

    return {
      service: 'engagement_sync',
      success: overallSuccess,
      syncedAt: new Date()
    };
  }

  /**
   * Build engagement data for sync
   */
  private buildEngagementData(profile: AxomProfile): EngagementData {
    const recentContent = this.getRecentContent(profile);
    const sentiment = this.calculateOverallSentiment(recentContent);
    const engagementTrend = this.calculateEngagementTrend(profile);

    return {
      profileId: profile.profileId,
      engagementScore: profile.stats.engagementRate,
      engagementTrend,
      metrics: {
        posts: profile.stats.postsCount,
        likes: this.sumMetric(recentContent, 'likes'),
        comments: this.sumMetric(recentContent, 'comments'),
        shares: this.sumMetric(recentContent, 'shares'),
        eventsAttended: profile.stats.eventsAttended,
        eventsHosted: profile.stats.eventsHosted
      },
      interests: profile.interests.map((i) => i.tag),
      sentiment,
      syncSource: 'axom'
    };
  }

  /**
   * Sync to Journey Twin
   */
  private async syncToJourneyTwin(
    profile: AxomProfile,
    engagement: EngagementData
  ): Promise<SyncResult> {
    try {
      await axios.post(`${this.journeyTwinUrl}/api/journeys/sync`, {
        customerId: profile.profileId,
        source: 'axom',
        journeyStage: this.determineJourneyStage(profile),
        engagement: {
          score: engagement.engagementScore,
          trend: engagement.engagementTrend,
          recentActivity: engagement.metrics.posts
        },
        interests: engagement.interests,
        location: profile.primaryLocation,
        updatedAt: new Date()
      });

      logger.debug(`Synced ${profile.profileId} to Journey Twin`);
      return { service: 'journey_twin', success: true, syncedAt: new Date() };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Journey Twin sync failed: ${errorMsg}`);
      return { service: 'journey_twin', success: false, error: errorMsg };
    }
  }

  /**
   * Sync to Customer Twin
   */
  private async syncToCustomerTwin(
    profile: AxomProfile,
    engagement: EngagementData
  ): Promise<SyncResult> {
    try {
      await axios.post(`${this.customerTwinUrl}/api/customers/sync`, {
        customerId: profile.profileId,
        name: profile.displayName,
        segment: profile.customerSegment,
        tier: profile.engagementTier,
        lifetimeValue: profile.lifetimeValue,
        location: profile.primaryLocation,
        interests: engagement.interests,
        stats: profile.stats,
        sentiment: engagement.sentiment,
        syncedFrom: 'axom',
        syncedAt: new Date()
      });

      logger.debug(`Synced ${profile.profileId} to Customer Twin`);
      return { service: 'customer_twin', success: true, syncedAt: new Date() };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Customer Twin sync failed: ${errorMsg}`);
      return { service: 'customer_twin', success: false, error: errorMsg };
    }
  }

  /**
   * Sync to Industry Twin (community)
   */
  private async syncToIndustryTwin(
    profile: AxomProfile,
    engagement: EngagementData
  ): Promise<SyncResult> {
    try {
      await axios.post(`${this.industryTwinUrl}/api/twins/community/sync`, {
        twinId: `community_${profile.profileId}`,
        twinType: 'community_member',
        data: {
          profileId: profile.profileId,
          displayName: profile.displayName,
          areaId: profile.primaryLocation.areaId,
          areaName: profile.primaryLocation.areaName,
          influenceScore: profile.stats.influenceScore,
          engagementRate: profile.stats.engagementRate,
          followers: profile.stats.followers,
          following: profile.stats.following,
          interests: engagement.interests,
          connectedBusinesses: profile.connectedBusinesses.length
        },
        lastUpdated: new Date()
      });

      logger.debug(`Synced ${profile.profileId} to Industry Twin`);
      return { service: 'industry_twin', success: true, syncedAt: new Date() };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Industry Twin sync failed: ${errorMsg}`);
      return { service: 'industry_twin', success: false, error: errorMsg };
    }
  }

  /**
   * Publish engagement event to event bus
   */
  private async publishEngagementEvent(profile: AxomProfile, engagement: EngagementData): Promise<void> {
    try {
      await axios.post(`${this.eventBusUrl}/events/publish`, {
        eventType: 'engagement.sync',
        source: 'axom',
        payload: {
          profileId: profile.profileId,
          engagement,
          location: profile.primaryLocation,
          timestamp: new Date()
        }
      });
    } catch (error) {
      // Non-critical, just log
      logger.debug(`Event publish skipped: ${error}`);
    }
  }

  /**
   * Get recent content (last 7 days)
   */
  private getRecentContent(profile: AxomProfile) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return profile.buzzContent.filter((c) => c.createdAt >= sevenDaysAgo);
  }

  /**
   * Calculate overall sentiment
   */
  private calculateOverallSentiment(content: { sentiment?: string }[]): 'positive' | 'neutral' | 'negative' {
    if (content.length === 0) return 'neutral';

    const sentiments = content.filter((c) => c.sentiment).map((c) => c.sentiment);
    const positive = sentiments.filter((s) => s === 'positive').length;
    const negative = sentiments.filter((s) => s === 'negative').length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate engagement trend
   */
  private calculateEngagementTrend(profile: AxomProfile): 'rising' | 'stable' | 'declining' {
    const recent = this.getRecentContent(profile);
    if (recent.length < 2) return 'stable';

    const halfIndex = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, halfIndex);
    const secondHalf = recent.slice(halfIndex);

    const firstAvg = this.avgEngagement(firstHalf);
    const secondAvg = this.avgEngagement(secondHalf);

    const change = secondAvg - firstAvg;
    if (change > 5) return 'rising';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private avgEngagement(content: { engagementMetrics: { likes: number; comments: number } }[]): number {
    if (content.length === 0) return 0;
    const total = content.reduce((sum, c) => sum + c.engagementMetrics.likes + c.engagementMetrics.comments * 2, 0);
    return total / content.length;
  }

  /**
   * Sum a specific metric
   */
  private sumMetric(
    content: { engagementMetrics: Record<string, number> }[],
    metric: string
  ): number {
    return content.reduce((sum, c) => sum + (c.engagementMetrics[metric] || 0), 0);
  }

  /**
   * Determine journey stage
   */
  private determineJourneyStage(profile: AxomProfile): string {
    const engagement = profile.stats.engagementRate;
    const posts = profile.stats.postsCount;
    const events = profile.stats.eventsAttended;

    if (engagement >= 80 && posts >= 50 && events >= 10) {
      return 'advocate';
    }
    if (engagement >= 50 && posts >= 20 && events >= 5) {
      return 'engaged';
    }
    if (engagement >= 20 && posts >= 5) {
      return 'active';
    }
    if (posts >= 1) {
      return 'new';
    }
    return 'visitor';
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { lastSync: Date | null; profilesPending: number } {
    const lastSync = Array.from(this.lastSyncTimes.values()).sort().pop() || null;
    const pending = Array.from(axomProfileStore.values()).filter(
      (p) => !p.lastSyncedAt || new Date().getTime() - p.lastSyncedAt.getTime() > 10 * 60 * 1000
    ).length;

    return { lastSync, profilesPending: pending };
  }
}

// Export singleton instance
export const engagementSync = new EngagementSync();
export default engagementSync;
