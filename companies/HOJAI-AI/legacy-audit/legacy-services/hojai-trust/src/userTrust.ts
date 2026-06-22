/**
 * User Trust Score Module
 *
 * Provides comprehensive trust scoring for users including
 * engagement, quality, reliability, safety, and growth metrics.
 *
 * @module hojai-trust/userTrust
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * User trust score dimensions
 */
export interface UserScoreDimensions {
  /** Engagement: Active and regular usage */
  engagement: number;
  /** Quality: Quality of inputs and interactions */
  quality: number;
  /** Reliability: Consistent and timely interactions */
  reliability: number;
  /** Safety: Appropriate and non-harmful behavior */
  safety: number;
  /** Growth: Improvement over time */
  growth: number;
}

/**
 * Complete user trust score
 */
export interface UserScore {
  userId: string;
  overall: number;
  level: 'critical' | 'low' | 'medium' | 'high' | 'excellent';
  dimensions: UserScoreDimensions;
  accountAge: number; // days
  totalInteractions: number;
  lastActive: Date;
  verified: boolean;
  verifiedAt?: Date;
  period: '7d' | '30d' | '90d' | 'all';
  lastUpdated: Date;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
}

/**
 * User activity event
 */
export interface UserActivity {
  id: string;
  userId: string;
  eventType: UserActivityType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * User activity types
 */
export enum UserActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  QUERY = 'query',
  FEEDBACK = 'feedback',
  RATING = 'rating',
  REPORT = 'report',
  VERIFICATION = 'verification',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  FLAG = 'flag',
  APPEAL = 'appeal',
}

/**
 * User verification status
 */
export interface UserVerification {
  userId: string;
  email: boolean;
  phone: boolean;
  identity: boolean;
  documents?: string[]; // uploaded document IDs
  verifiedAt?: Date;
  expiryDate?: Date;
}

/**
 * User trust configuration
 */
export interface UserTrustConfig {
  /** Minimum activity before scoring */
  minActivity?: number;
  /** Weights for each dimension */
  weights?: Partial<UserScoreDimensions>;
  /** Decay factor for inactive users */
  decayFactor?: number;
  /** Activity level thresholds */
  activityThresholds?: {
    low: number;    // activities per week
    medium: number;
    high: number;
  };
  /** Verification bonuses */
  verificationBonuses?: Partial<UserScoreDimensions>;
}

/**
 * Default score weights
 */
const DEFAULT_WEIGHTS: UserScoreDimensions = {
  engagement: 0.25,
  quality: 0.25,
  reliability: 0.20,
  safety: 0.15,
  growth: 0.15,
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<UserTrustConfig, 'weights'>> & {
  weights: UserScoreDimensions;
  activityThresholds: NonNullable<UserTrustConfig['activityThresholds']>;
  verificationBonuses: UserScoreDimensions;
} = {
  minActivity: 5,
  weights: DEFAULT_WEIGHTS,
  decayFactor: 0.95,
  activityThresholds: {
    low: 3,
    medium: 10,
    high: 30,
  },
  verificationBonuses: {
    engagement: 5,
    quality: 10,
    reliability: 10,
    safety: 15,
    growth: 0,
  },
};

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for activity event
 */
export const UserActivitySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  eventType: z.nativeEnum(UserActivityType),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for verification request
 */
export const VerificationRequestSchema = z.object({
  userId: z.string().min(1),
  verificationType: z.enum(['email', 'phone', 'identity']),
  documentIds: z.array(z.string()).optional(),
});

/**
 * Schema for trust score request
 */
export const UserScoreRequestSchema = z.object({
  userId: z.string().min(1),
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  includeDimensions: z.boolean().default(true),
});

// ============================================================================
// User Trust Service
// ============================================================================

/**
 * User Trust Service
 *
 * Provides comprehensive trust scoring for users.
 *
 * @example
 * ```typescript
 * const trustService = new UserTrustService({
 *   minActivity: 10,
 *   weights: { engagement: 0.3, quality: 0.3, reliability: 0.2, safety: 0.1, growth: 0.1 },
 * });
 *
 * // Record activity
 * await trustService.recordActivity({
 *   userId: 'user-123',
 *   eventType: UserActivityType.QUERY,
 *   metadata: { queryLength: 150 },
 * });
 *
 * // Get trust score
 * const score = await trustService.getUserScore('user-123', '30d');
 * console.log(`Trust level: ${score.level}`);
 * ```
 */
export class UserTrustService {
  private config: typeof DEFAULT_CONFIG;
  private activities: UserActivity[] = [];
  private scores: Map<string, UserScore> = new Map();
  private verifications: Map<string, UserVerification> = new Map();
  private userCreatedAt: Map<string, Date> = new Map();

  constructor(config: UserTrustConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      weights: { ...DEFAULT_WEIGHTS, ...config.weights },
      activityThresholds: { ...DEFAULT_CONFIG.activityThresholds, ...config.activityThresholds },
      verificationBonuses: { ...DEFAULT_CONFIG.verificationBonuses, ...config.verificationBonuses },
    };

    // Ensure weights sum to 1
    const weightSum = Object.values(this.config.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      const factor = 1 / weightSum;
      for (const key of Object.keys(this.config.weights) as (keyof UserScoreDimensions)[]) {
        this.config.weights[key] *= factor;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }

  /**
   * Get period date range
   */
  private getPeriodRange(period: '7d' | '30d' | '90d' | 'all'): { start: Date; end: Date } {
    const end = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365 * 10;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * Record user activity
   */
  async recordActivity(
    validatedData: z.infer<typeof UserActivitySchema>
  ): Promise<UserActivity> {
    // Track user creation date
    if (!this.userCreatedAt.has(validatedData.userId)) {
      this.userCreatedAt.set(validatedData.userId, new Date());
    }

    const activity: UserActivity = {
      ...validatedData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.activities.push(activity);

    // Handle special activity types
    if (validatedData.eventType === UserActivityType.VERIFICATION) {
      await this.processVerification(validatedData.userId, validatedData.metadata as Record<string, unknown>);
    }

    return activity;
  }

  /**
   * Get user trust score
   */
  async getUserScore(
    userId: string,
    period: '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<UserScore | null> {
    const score = this.scores.get(`${userId}:${period}`);
    return score || null;
  }

  /**
   * Calculate user trust score
   */
  async calculateUserScore(userId: string, period: '7d' | '30d' | '90d' | 'all'): Promise<UserScore | null> {
    const { start } = this.getPeriodRange(period);
    const activities = this.activities.filter(
      (a) => a.userId === userId && a.timestamp >= start
    );

    if (activities.length < this.config.minActivity) {
      return null;
    }

    const dimensions = await this.calculateDimensions(userId, activities, period);
    const overall = this.calculateOverallScore(dimensions);

    const verification = this.verifications.get(userId);
    const accountAge = this.userCreatedAt.has(userId)
      ? Math.floor((Date.now() - this.userCreatedAt.get(userId)!.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    const lastActivity = activities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )[0];

    const score: UserScore = {
      userId,
      overall,
      level: this.getTrustLevel(overall),
      dimensions,
      accountAge,
      totalInteractions: activities.length,
      lastActive: lastActivity?.timestamp || new Date(),
      verified: verification?.identity || false,
      verifiedAt: verification?.verifiedAt,
      period,
      lastUpdated: new Date(),
      trend: await this.calculateTrend(userId, period),
      confidence: Math.min(1, activities.length / (this.config.minActivity * 5)),
    };

    this.scores.set(`${userId}:${period}`, score);
    return score;
  }

  /**
   * Calculate score dimensions
   */
  private async calculateDimensions(
    userId: string,
    activities: UserActivity[],
    period: string
  ): Promise<UserScoreDimensions> {
    const [engagement, quality, reliability, safety, growth] = await Promise.all([
      this.calculateEngagement(activities),
      this.calculateQuality(userId, activities),
      this.calculateReliability(activities),
      this.calculateSafety(userId, activities),
      this.calculateGrowth(userId, activities, period as '7d' | '30d' | '90d' | 'all'),
    ]);

    return { engagement, quality, reliability, safety, growth };
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagement(activities: UserActivity[]): number {
    const { activityThresholds } = this.config;

    // Count unique days with activity
    const uniqueDays = new Set(
      activities.map((a) => a.timestamp.toISOString().split('T')[0])
    ).size;

    const periodDays = 30; // Assume 30-day period
    const avgDailyActivity = activities.length / periodDays;

    // Activity frequency score
    let frequencyScore: number;
    if (avgDailyActivity >= activityThresholds.high) {
      frequencyScore = 100;
    } else if (avgDailyActivity >= activityThresholds.medium) {
      frequencyScore = 70 + ((avgDailyActivity - activityThresholds.medium) / (activityThresholds.high - activityThresholds.medium)) * 30;
    } else if (avgDailyActivity >= activityThresholds.low) {
      frequencyScore = 40 + ((avgDailyActivity - activityThresholds.low) / (activityThresholds.medium - activityThresholds.low)) * 30;
    } else {
      frequencyScore = (avgDailyActivity / activityThresholds.low) * 40;
    }

    // Consistency score (days active / total days)
    const consistencyScore = (uniqueDays / periodDays) * 100;

    return (frequencyScore * 0.6 + consistencyScore * 0.4);
  }

  /**
   * Calculate quality score
   */
  private async calculateQuality(userId: string, activities: UserActivity[]): Promise<number> {
    const rated = activities.filter(
      (a) => a.eventType === UserActivityType.RATING && a.metadata?.rating
    );

    if (rated.length === 0) {
      // Fall back to query length and diversity
      const queries = activities.filter((a) => a.eventType === UserActivityType.QUERY);
      const avgLength = queries.reduce(
        (sum, q) => sum + ((q.metadata?.queryLength as number) || 50),
        0
      ) / (queries.length || 1);

      // Quality queries are typically 50-500 chars
      const lengthScore = avgLength >= 50 && avgLength <= 500
        ? 80
        : avgLength < 50 ? 50 : Math.max(60, 100 - (avgLength - 500) / 50);

      return lengthScore;
    }

    const avgRating = rated.reduce(
      (sum, a) => sum + ((a.metadata?.rating as number) || 3),
      0
    ) / rated.length;

    return (avgRating / 5) * 100;
  }

  /**
   * Calculate reliability score
   */
  private calculateReliability(activities: UserActivity[]): number {
    // Measure session patterns and return rates

    const logins = activities.filter((a) => a.eventType === UserActivityType.LOGIN);
    const logouts = activities.filter((a) => a.eventType === UserActivityType.LOGOUT);

    // Session completion rate
    const sessionRatio = logouts.length / logins.length;
    const sessionScore = Math.min(100, sessionRatio * 100);

    // Activity time distribution (spread = more reliable pattern)
    const hours = activities.map((a) => a.timestamp.getHours());
    const uniqueHours = new Set(hours).size;
    const timeSpreadScore = (uniqueHours / 24) * 80; // Max 80 for time spread

    // Subscriptions and payments (engaged users)
    const payments = activities.filter(
      (a) => a.eventType === UserActivityType.PAYMENT || a.eventType === UserActivityType.SUBSCRIPTION
    );
    const paymentScore = payments.length > 0 ? 100 : 50;

    return (sessionScore * 0.4 + timeSpreadScore * 0.3 + paymentScore * 0.3);
  }

  /**
   * Calculate safety score
   */
  private calculateSafety(userId: string, activities: UserActivity[]): number {
    const reports = activities.filter((a) => a.eventType === UserActivityType.REPORT);
    const flags = activities.filter((a) => a.eventType === UserActivityType.FLAG);

    // Start at 100 and penalize
    let score = 100;

    // Penalize for reports (each report -10 points)
    for (const report of reports) {
      score -= 10;
    }

    // Penalize for flags
    for (const flag of flags) {
      score -= 15;
    }

    // Check verification status
    const verification = this.verifications.get(userId);
    if (verification?.identity) {
      score = Math.min(100, score + 10);
    }
    if (verification?.email) {
      score = Math.min(100, score + 2);
    }
    if (verification?.phone) {
      score = Math.min(100, score + 3);
    }

    return Math.max(0, score);
  }

  /**
   * Calculate growth score
   */
  private async calculateGrowth(
    userId: string,
    activities: UserActivity[],
    period: '7d' | '30d' | '90d' | 'all'
  ): Promise<number> {
    // Compare recent activity to older activity

    if (period === '7d' || activities.length < 10) {
      return 70; // Not enough data for trend
    }

    const halfPoint = Math.floor(activities.length / 2);
    const firstHalf = activities.slice(0, halfPoint);
    const secondHalf = activities.slice(halfPoint);

    // Engagement trend
    const firstEngagement = firstHalf.length;
    const secondEngagement = secondHalf.length;

    let growthRate: number;
    if (firstEngagement === 0) {
      growthRate = secondEngagement > 0 ? 100 : 0;
    } else {
      growthRate = ((secondEngagement - firstEngagement) / firstEngagement) * 100;
    }

    // Quality trend
    const firstRated = firstHalf.filter((a) => a.metadata?.rating);
    const secondRated = secondHalf.filter((a) => a.metadata?.rating);

    let qualityTrend = 0;
    if (firstRated.length > 0 && secondRated.length > 0) {
      const firstAvg = firstRated.reduce((sum, a) => sum + ((a.metadata?.rating as number) || 3), 0) / firstRated.length;
      const secondAvg = secondRated.reduce((sum, a) => sum + ((a.metadata?.rating as number) || 3), 0) / secondRated.length;
      qualityTrend = ((secondAvg - firstAvg) / firstAvg) * 100;
    }

    // Normalize and combine
    const engagementGrowthScore = Math.max(0, Math.min(100, 50 + growthRate * 2));
    const qualityGrowthScore = Math.max(0, Math.min(100, 50 + qualityTrend * 10));

    return (engagementGrowthScore * 0.6 + qualityGrowthScore * 0.4);
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(dimensions: UserScoreDimensions): number {
    const { weights, verificationBonuses } = this.config;

    let score =
      dimensions.engagement * weights.engagement +
      dimensions.quality * weights.quality +
      dimensions.reliability * weights.reliability +
      dimensions.safety * weights.safety +
      dimensions.growth * weights.growth;

    // Apply verification bonuses
    const verification = this.verifications.get(dimensions as unknown as string);
    if (verification) {
      if (verification.email) score += verificationBonuses.engagement;
      if (verification.phone) score += verificationBonuses.quality;
      if (verification.identity) score += verificationBonuses.safety;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get trust level from score
   */
  private getTrustLevel(score: number): UserScore['level'] {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 20) return 'low';
    return 'critical';
  }

  /**
   * Calculate score trend
   */
  private async calculateTrend(userId: string, period: string): Promise<'improving' | 'declining' | 'stable'> {
    const { start } = this.getPeriodRange(period as '7d' | '30d' | '90d' | 'all');
    const activities = this.activities.filter(
      (a) => a.userId === userId && a.timestamp >= start
    );

    if (activities.length < 10) return 'stable';

    const halfPoint = Math.floor(activities.length / 2);
    const firstHalf = activities.slice(0, halfPoint);
    const secondHalf = activities.slice(halfPoint);

    const firstCount = firstHalf.length;
    const secondCount = secondHalf.length;

    const diff = secondCount - firstCount;

    if (diff > 3) return 'improving';
    if (diff < -3) return 'declining';
    return 'stable';
  }

  /**
   * Process verification
   */
  private async processVerification(
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const verification = this.verifications.get(userId) || {
      userId,
      email: false,
      phone: false,
      identity: false,
    };

    const type = metadata.type as string;
    if (type === 'email') verification.email = true;
    if (type === 'phone') verification.phone = true;
    if (type === 'identity') {
      verification.identity = true;
      verification.verifiedAt = new Date();
    }

    if (metadata.documentIds) {
      verification.documents = metadata.documentIds as string[];
    }

    this.verifications.set(userId, verification);
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<UserVerification | null> {
    return this.verifications.get(userId) || null;
  }

  /**
   * Get users by trust level
   */
  async getUsersByTrustLevel(
    level: UserScore['level'],
    limit: number = 100
  ): Promise<UserScore[]> {
    const scores = Array.from(this.scores.values())
      .filter((s) => s?.level === level)
      .sort((a, b) => b!.overall - a!.overall);

    return scores.slice(0, limit) as UserScore[];
  }

  /**
   * Get trusted users (high or excellent)
   */
  async getTrustedUsers(limit: number = 100): Promise<UserScore[]> {
    const scores = Array.from(this.scores.values())
      .filter((s): s is UserScore => s !== null && (s.level === 'high' || s.level === 'excellent'))
      .sort((a, b) => b.overall - a.overall);

    return scores.slice(0, limit);
  }

  /**
   * Get users requiring review
   */
  async getUsersRequiringReview(): Promise<UserScore[]> {
    return Array.from(this.scores.values())
      .filter((s): s is UserScore => s !== null && (s.level === 'low' || s.level === 'critical'))
      .sort((a, b) => a.overall - b.overall);
  }
}

/**
 * Get default score weights
 */
export function getDefaultWeights(): UserScoreDimensions {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Create validators
 */
export function createUserTrustValidators() {
  return {
    recordActivity: (data: unknown) => UserActivitySchema.parse(data),
    verify: (data: unknown) => VerificationRequestSchema.parse(data),
    getScore: (data: unknown) => UserScoreRequestSchema.parse(data),
  };
}

export default UserTrustService;
