/**
 * SUTAR Economy OS - Leaderboard Service
 * Layer 10: Top earners tracking and rankings
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
export type LeaderboardCategory = 'earnings' | 'karma' | 'transactions' | 'contracts';

export interface LeaderboardEntry {
  rank: number;
  entityId: string;
  entityType: 'user' | 'business' | 'agent';
  displayName: string;
  value: number;
  previousRank?: number;
  trend: 'up' | 'down' | 'stable' | 'new';
  metadata?: Record<string, unknown>;
}

export interface Leaderboard {
  leaderboardId: string;
  period: LeaderboardPeriod;
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  generatedAt: Date;
  validUntil: Date;
}

export interface Achievement {
  achievementId: string;
  entityId: string;
  type: 'milestone' | 'streak' | 'rank' | 'special';
  name: string;
  description: string;
  icon: string;
  points: number;
  earnedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// In-Memory Storage
// ============================================

interface LeaderboardStore {
  [key: string]: Leaderboard;
}

interface AchievementStore {
  [achievementId: string]: Achievement;
}

interface RankHistoryStore {
  [key: string]: Array<{ date: Date; rank: number }>;
}

const leaderboardStore: LeaderboardStore = {};
const achievementStore: AchievementStore = {};
const rankHistoryStore: RankHistoryStore = {};

// ============================================
// Leaderboard Service Class
// ============================================

export class LeaderboardService {
  /**
   * Generate cache key
   */
  private getCacheKey(period: LeaderboardPeriod, category: LeaderboardCategory): string {
    return `${period}:${category}`;
  }

  /**
   * Generate leaderboard
   */
  async generateLeaderboard(
    period: LeaderboardPeriod,
    category: LeaderboardCategory,
    entries: Array<{
      entityId: string;
      entityType: 'user' | 'business' | 'agent';
      displayName: string;
      value: number;
      metadata?: Record<string, unknown>;
    }>,
    options: {
      limit?: number;
      cacheMinutes?: number;
    } = {}
  ): Promise<Leaderboard> {
    const { limit = 100, cacheMinutes = 5 } = options;

    // Sort entries by value
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const topEntries = sorted.slice(0, limit);

    // Generate leaderboard entries with rank and trend
    const leaderboardEntries: LeaderboardEntry[] = topEntries.map((entry, index) => {
      const rank = index + 1;
      const historyKey = `${entry.entityId}:${period}:${category}`;
      const history = rankHistoryStore[historyKey] || [];
      const previousRank = history[history.length - 1]?.rank;

      let trend: LeaderboardEntry['trend'] = 'new';
      if (previousRank !== undefined) {
        if (rank < previousRank) trend = 'up';
        else if (rank > previousRank) trend = 'down';
        else trend = 'stable';
      }

      // Update rank history
      if (!rankHistoryStore[historyKey]) {
        rankHistoryStore[historyKey] = [];
      }
      rankHistoryStore[historyKey].push({ date: new Date(), rank });

      // Keep only last 30 days of history
      if (rankHistoryStore[historyKey].length > 30) {
        rankHistoryStore[historyKey] = rankHistoryStore[historyKey].slice(-30);
      }

      return {
        rank,
        entityId: entry.entityId,
        entityType: entry.entityType,
        displayName: entry.displayName,
        value: entry.value,
        previousRank,
        trend,
        metadata: entry.metadata
      };
    });

    const now = new Date();
    const validUntil = new Date(now.getTime() + cacheMinutes * 60 * 1000);

    const leaderboard: Leaderboard = {
      leaderboardId: uuidv4(),
      period,
      category,
      entries: leaderboardEntries,
      generatedAt: now,
      validUntil
    };

    // Cache the leaderboard
    const cacheKey = this.getCacheKey(period, category);
    leaderboardStore[cacheKey] = leaderboard;

    return leaderboard;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    period: LeaderboardPeriod,
    category: LeaderboardCategory,
    options: {
      limit?: number;
      offset?: number;
      useCache?: boolean;
    } = {}
  ): Promise<Leaderboard | null> {
    const { limit = 100, offset = 0, useCache = true } = options;

    const cacheKey = this.getCacheKey(period, category);
    const cached = leaderboardStore[cacheKey];

    if (useCache && cached && new Date() < cached.validUntil) {
      // Return cached with pagination
      return {
        ...cached,
        entries: cached.entries.slice(offset, offset + limit)
      };
    }

    return null;
  }

  /**
   * Get entity rank
   */
  async getEntityRank(
    entityId: string,
    period: LeaderboardPeriod,
    category: LeaderboardCategory
  ): Promise<{ rank: number; value: number; totalEntries: number } | null> {
    const cacheKey = this.getCacheKey(period, category);
    const leaderboard = leaderboardStore[cacheKey];

    if (!leaderboard) {
      return null;
    }

    const entry = leaderboard.entries.find(e => e.entityId === entityId);
    if (!entry) {
      return null;
    }

    return {
      rank: entry.rank,
      value: entry.value,
      totalEntries: leaderboard.entries.length
    };
  }

  /**
   * Get rank history for entity
   */
  async getRankHistory(
    entityId: string,
    period: LeaderboardPeriod,
    category: LeaderboardCategory,
    days: number = 30
  ): Promise<Array<{ date: Date; rank: number; value?: number }>> {
    const historyKey = `${entityId}:${period}:${category}`;
    const history = rankHistoryStore[historyKey] || [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return history
      .filter(h => h.date >= cutoff)
      .map(h => ({ date: h.date, rank: h.rank }));
  }

  /**
   * Get top earners leaderboard
   */
  async getTopEarners(
    period: LeaderboardPeriod = 'monthly',
    limit: number = 10,
    currency: string = 'USD'
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard(period, 'earnings', { limit, useCache: true });
    if (leaderboard) {
      return leaderboard.entries.slice(0, limit);
    }

    const entries: Array<{
      entityId: string;
      entityType: 'user' | 'business' | 'agent';
      displayName: string;
      value: number;
    }> = [];

    const generated = await this.generateLeaderboard(period, 'earnings', entries, { limit });
    return generated.entries;
  }

  /**
   * Get top karma holders
   */
  async getTopKarmaHolders(
    period: LeaderboardPeriod = 'all_time',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard(period, 'karma', { limit, useCache: true });
    if (leaderboard) {
      return leaderboard.entries.slice(0, limit);
    }

    const entries: Array<{
      entityId: string;
      entityType: 'user' | 'business' | 'agent';
      displayName: string;
      value: number;
    }> = [];

    const generated = await this.generateLeaderboard(period, 'karma', entries, { limit });
    return generated.entries;
  }

  /**
   * Award achievement
   */
  async awardAchievement(request: {
    entityId: string;
    type: Achievement['type'];
    name: string;
    description: string;
    icon: string;
    points?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Achievement> {
    const {
      entityId,
      type,
      name,
      description,
      icon,
      points = 0,
      metadata
    } = request;

    const achievement: Achievement = {
      achievementId: uuidv4(),
      entityId,
      type,
      name,
      description,
      icon,
      points,
      earnedAt: new Date(),
      metadata
    };

    achievementStore[achievement.achievementId] = achievement;

    return achievement;
  }

  /**
   * Get achievements for entity
   */
  async getAchievements(
    entityId: string,
    options: {
      type?: Achievement['type'];
      limit?: number;
      sortBy?: 'earnedAt' | 'points';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<Achievement[]> {
    const { type, limit = 50, sortBy = 'earnedAt', sortOrder = 'desc' } = options;

    let achievements = Object.values(achievementStore)
      .filter(a => a.entityId === entityId)
      .filter(a => !type || a.type === type);

    achievements.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'earnedAt':
          comparison = a.earnedAt.getTime() - b.earnedAt.getTime();
          break;
        case 'points':
          comparison = a.points - b.points;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return achievements.slice(0, limit);
  }

  /**
   * Get total achievement points for entity
   */
  async getTotalAchievementPoints(entityId: string): Promise<number> {
    const achievements = await this.getAchievements(entityId);
    return achievements.reduce((sum, a) => sum + a.points, 0);
  }

  /**
   * Get achievement statistics
   */
  async getAchievementStatistics(entityId: string): Promise<{
    totalAchievements: number;
    totalPoints: number;
    byType: Record<Achievement['type'], { count: number; points: number }>;
    recentAchievements: Achievement[];
  }> {
    const achievements = await this.getAchievements(entityId);

    const stats = {
      totalAchievements: achievements.length,
      totalPoints: achievements.reduce((sum, a) => sum + a.points, 0),
      byType: {
        milestone: { count: 0, points: 0 },
        streak: { count: 0, points: 0 },
        rank: { count: 0, points: 0 },
        special: { count: 0, points: 0 }
      } as Record<Achievement['type'], { count: number; points: number }>,
      recentAchievements: achievements.slice(0, 5)
    };

    for (const achievement of achievements) {
      stats.byType[achievement.type].count++;
      stats.byType[achievement.type].points += achievement.points;
    }

    return stats;
  }

  /**
   * Check and award milestone achievements
   */
  async checkMilestoneAchievements(entityId: string, metric: string, value: number): Promise<Achievement[]> {
    const awarded: Achievement[] = [];

    const milestones = [
      { threshold: 1000, name: 'Rising Star', description: 'Reached 1,000 in metric', icon: 'star' },
      { threshold: 5000, name: 'High Performer', description: 'Reached 5,000 in metric', icon: 'trophy' },
      { threshold: 10000, name: 'Top Achiever', description: 'Reached 10,000 in metric', icon: 'crown' },
      { threshold: 50000, name: 'Legend', description: 'Reached 50,000 in metric', icon: 'diamond' }
    ];

    for (const milestone of milestones) {
      if (value >= milestone.threshold) {
        const existing = Object.values(achievementStore).find(
          a => a.entityId === entityId && a.name === milestone.name
        );

        if (!existing) {
          const achievement = await this.awardAchievement({
            entityId,
            type: 'milestone',
            name: milestone.name,
            description: milestone.description,
            icon: milestone.icon,
            points: milestone.threshold / 100,
            metadata: { metric, threshold: milestone.threshold, value }
          });
          awarded.push(achievement);
        }
      }
    }

    return awarded;
  }

  /**
   * Get leaderboard summary
   */
  async getLeaderboardSummary(
    period: LeaderboardPeriod,
    category: LeaderboardCategory
  ): Promise<{
    period: LeaderboardPeriod;
    category: LeaderboardCategory;
    totalEntries: number;
    topEntry: LeaderboardEntry | null;
    averageValue: number;
    generatedAt: Date;
    validUntil: Date;
  }> {
    const leaderboard = await this.getLeaderboard(period, category, { useCache: false });

    if (!leaderboard || leaderboard.entries.length === 0) {
      return {
        period,
        category,
        totalEntries: 0,
        topEntry: null,
        averageValue: 0,
        generatedAt: new Date(),
        validUntil: new Date()
      };
    }

    const values = leaderboard.entries.map(e => e.value);
    const averageValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      period,
      category,
      totalEntries: leaderboard.entries.length,
      topEntry: leaderboard.entries[0],
      averageValue: Math.round(averageValue * 100) / 100,
      generatedAt: leaderboard.generatedAt,
      validUntil: leaderboard.validUntil
    };
  }

  /**
   * Compare entities on leaderboard
   */
  async compareEntities(
    entityIds: string[],
    period: LeaderboardPeriod,
    category: LeaderboardCategory
  ): Promise<Array<{
    entityId: string;
    rank: number;
    value: number;
    difference?: number;
  }>> {
    const results = [];

    let previousValue: number | undefined;

    for (const entityId of entityIds) {
      const rankData = await this.getEntityRank(entityId, period, category);

      results.push({
        entityId,
        rank: rankData?.rank || 0,
        value: rankData?.value || 0,
        difference: previousValue !== undefined ? rankData?.value! - previousValue : undefined
      });

      if (rankData) {
        previousValue = rankData.value;
      }
    }

    return results;
  }

  /**
   * Get trending entries (moved up significantly)
   */
  async getTrendingEntries(
    period: LeaderboardPeriod,
    category: LeaderboardCategory,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = this.getCacheKey(period, category);
    const leaderboard = leaderboardStore[cacheKey];

    if (!leaderboard) {
      return [];
    }

    return leaderboard.entries
      .filter(e => e.trend === 'up')
      .sort((a, b) => (a.previousRank || 999) - (b.previousRank || 999))
      .slice(0, limit);
  }

  /**
   * Clear leaderboard cache
   */
  async clearCache(period?: LeaderboardPeriod, category?: LeaderboardCategory): Promise<void> {
    if (period && category) {
      const key = this.getCacheKey(period, category);
      delete leaderboardStore[key];
    } else {
      Object.keys(leaderboardStore).forEach(key => delete leaderboardStore[key]);
    }
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
