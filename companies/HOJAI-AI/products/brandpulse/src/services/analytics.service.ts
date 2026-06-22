import { Brand, IBrand, Review, SentimentRecord, Alert, IAlert } from '../models/index.js';
import { sentimentService } from './sentiment.service.js';

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface BrandOverview {
  brand: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    industry?: string;
  };
  stats: {
    totalReviews: number;
    averageRating: number;
    sentimentScore: number;
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
    lastUpdated: Date;
  };
  trends: {
    ratingTrend: 'improving' | 'declining' | 'stable';
    sentimentTrend: 'improving' | 'declining' | 'stable';
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  alerts: {
    active: number;
    critical: number;
    high: number;
  };
}

export interface SentimentTrend {
  period: 'day' | 'week' | 'month';
  data: TimeSeriesData[];
  overall: {
    current: number;
    previous: number;
    change: number;
    percentChange: number;
  };
}

export interface CompetitorAnalysis {
  name: string;
  mentions: number;
  sentiment: number;
  strength: 'positive' | 'negative' | 'neutral';
}

export class AnalyticsService {
  /**
   * Get brand overview
   */
  async getBrandOverview(brandId: string): Promise<BrandOverview | null> {
    const brand = await Brand.findOne({ brandId });
    if (!brand) return null;

    // Get alert counts
    const [activeAlerts, criticalAlerts, highAlerts] = await Promise.all([
      Alert.countDocuments({ brandId, status: 'active' }),
      Alert.countDocuments({ brandId, status: 'active', severity: 'critical' }),
      Alert.countDocuments({ brandId, status: 'active', severity: 'high' })
    ]);

    // Calculate trends
    const trends = await this.calculateTrends(brandId);

    return {
      brand: {
        id: brand.brandId,
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
        industry: brand.industry
      },
      stats: brand.stats,
      trends,
      alerts: {
        active: activeAlerts,
        critical: criticalAlerts,
        high: highAlerts
      }
    };
  }

  /**
   * Get sentiment trend over time
   */
  async getSentimentTrend(
    brandId: string,
    period: 'day' | 'week' | 'month' = 'day',
    days: number = 30
  ): Promise<SentimentTrend> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await SentimentRecord.find({
      brandId,
      period,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const data: TimeSeriesData[] = records.map(r => ({
      date: r.date.toISOString().split('T')[0],
      value: r.score
    }));

    // Calculate overall change
    const current = records.length > 0 ? records[records.length - 1].score : 0;
    const previous = records.length > 1 ? records[0].score : current;
    const change = current - previous;
    const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    return {
      period,
      data,
      overall: {
        current,
        previous,
        change,
        percentChange
      }
    };
  }

  /**
   * Get volume trend
   */
  async getVolumeTrend(
    brandId: string,
    period: 'day' | 'week' | 'month' = 'day',
    days: number = 30
  ): Promise<{
    data: TimeSeriesData[];
    total: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await SentimentRecord.find({
      brandId,
      period,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    const data: TimeSeriesData[] = records.map(r => ({
      date: r.date.toISOString().split('T')[0],
      value: r.total
    }));

    const total = records.reduce((sum, r) => sum + r.total, 0);
    const average = records.length > 0 ? total / records.length : 0;

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (records.length >= 2) {
      const recentHalf = records.slice(-Math.ceil(records.length / 2));
      const olderHalf = records.slice(0, Math.ceil(records.length / 2));

      const recentAvg = recentHalf.reduce((sum, r) => sum + r.total, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((sum, r) => sum + r.total, 0) / olderHalf.length;

      if (recentAvg > olderAvg * 1.1) trend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
    }

    return { data, total, average, trend };
  }

  /**
   * Get rating distribution
   */
  async getRatingDistribution(brandId: string): Promise<{
    distribution: { [key: number]: number };
    average: number;
    median: number;
  }> {
    const reviews = await Review.find({
      brandId,
      'moderation.status': 'approved'
    }).select('rating');

    if (reviews.length === 0) {
      return { distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, average: 0, median: 0 };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;

    for (const review of reviews) {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
      total += review.rating;
    }

    const average = total / reviews.length;

    // Calculate median
    const sorted = reviews.map(r => r.rating).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
      ? sorted[mid]
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;

    return { distribution, average, median };
  }

  /**
   * Get source breakdown
   */
  async getSourceBreakdown(brandId: string): Promise<{
    sources: { [key: string]: { count: number; avgRating: number; avgSentiment: number } };
    total: number;
  }> {
    const reviews = await Review.find({
      brandId,
      'moderation.status': 'approved'
    });

    const sources: { [key: string]: { count: number; totalRating: number; totalSentiment: number } } = {};

    for (const review of reviews) {
      if (!sources[review.source]) {
        sources[review.source] = { count: 0, totalRating: 0, totalSentiment: 0 };
      }
      sources[review.source].count++;
      sources[review.source].totalRating += review.rating;
      sources[review.source].totalSentiment += review.sentiment.score;
    }

    const result: { [key: string]: { count: number; avgRating: number; avgSentiment: number } } = {};
    let total = 0;

    for (const [source, data] of Object.entries(sources)) {
      result[source] = {
        count: data.count,
        avgRating: data.totalRating / data.count,
        avgSentiment: data.totalSentiment / data.count
      };
      total += data.count;
    }

    return { sources: result, total };
  }

  /**
   * Get aspect analysis
   */
  async getAspectAnalysis(brandId: string): Promise<{
    aspects: { name: string; mentions: number; score: number; trend: string }[];
    overall: { score: number; label: string };
  }> {
    const reviews = await Review.find({
      brandId,
      'moderation.status': 'approved'
    });

    const aspectStats: { [key: string]: { mentions: number; totalScore: number } } = {};

    for (const review of reviews) {
      for (const aspect of review.sentiment.aspects || []) {
        if (!aspectStats[aspect.name]) {
          aspectStats[aspect.name] = { mentions: 0, totalScore: 0 };
        }
        aspectStats[aspect.name].mentions++;
        aspectStats[aspect.name].totalScore += aspect.score;
      }
    }

    const aspects = Object.entries(aspectStats)
      .map(([name, stats]) => ({
        name,
        mentions: stats.mentions,
        score: stats.totalScore / stats.mentions,
        trend: stats.totalScore > 0 ? 'positive' : stats.totalScore < 0 ? 'negative' : 'neutral'
      }))
      .sort((a, b) => b.mentions - a.mentions);

    // Calculate overall
    const overallScore = aspects.length > 0
      ? aspects.reduce((sum, a) => sum + a.score, 0) / aspects.length
      : 0;

    return {
      aspects,
      overall: {
        score: overallScore,
        label: overallScore > 0.1 ? 'positive' : overallScore < -0.1 ? 'negative' : 'neutral'
      }
    };
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(brandId: string, severity?: IAlert['severity']): Promise<IAlert[]> {
    const query: any = { brandId, status: 'active' };
    if (severity) query.severity = severity;

    return Alert.find(query).sort({ severity: -1, createdAt: -1 });
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<IAlert | null> {
    return Alert.findByIdAndUpdate(
      alertId,
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId
      },
      { new: true }
    );
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<IAlert | null> {
    return Alert.findByIdAndUpdate(
      alertId,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId
      },
      { new: true }
    );
  }

  /**
   * Aggregate sentiment records
   */
  async aggregateSentiment(brandId: string, tenantId: string): Promise<void> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all reviews for today
    const reviews = await Review.find({
      brandId,
      'moderation.status': 'approved',
      publishedAt: { $gte: dayStart }
    });

    if (reviews.length === 0) return;

    // Calculate aggregates
    let positive = 0, neutral = 0, negative = 0;
    const ratings = { one: 0, two: 0, three: 0, four: 0, five: 0 };
    const sources = { google: 0, yelp: 0, tripadvisor: 0, facebook: 0, direct: 0, internal: 0 };
    let totalSentiment = 0;
    const aspectMap: { [key: string]: { count: number; totalScore: number } } = {};
    let totalEngagement = 0;

    for (const review of reviews) {
      if (review.sentiment.label === 'positive') positive++;
      else if (review.sentiment.label === 'negative') negative++;
      else neutral++;

      // Map numeric rating to string key
      const ratingKey = ['one', 'two', 'three', 'four', 'five'][review.rating - 1] as keyof typeof ratings;
      ratings[ratingKey]++;
      sources[review.source as keyof typeof sources]++;

      totalSentiment += review.sentiment.score;
      totalEngagement += review.engagement.helpful + review.engagement.shares;

      for (const aspect of review.sentiment.aspects || []) {
        if (!aspectMap[aspect.name]) {
          aspectMap[aspect.name] = { count: 0, totalScore: 0 };
        }
        aspectMap[aspect.name].count++;
        aspectMap[aspect.name].totalScore += aspect.score;
      }
    }

    const topAspects = Object.entries(aspectMap)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgScore: stats.totalScore / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Upsert record
    await SentimentRecord.findOneAndUpdate(
      { brandId, period: 'day', date: dayStart },
      {
        $set: {
          tenantId,
          total: reviews.length,
          positive,
          neutral,
          negative,
          ratings,
          sources,
          score: totalSentiment / reviews.length,
          topAspects,
          engagement: {
            total: totalEngagement,
            helpful: reviews.reduce((sum, r) => sum + r.engagement.helpful, 0),
            shares: reviews.reduce((sum, r) => sum + r.engagement.shares, 0)
          }
        }
      },
      { upsert: true }
    );
  }

  /**
   * Calculate brand trends
   */
  private async calculateTrends(brandId: string): Promise<{
    ratingTrend: 'improving' | 'declining' | 'stable';
    sentimentTrend: 'improving' | 'declining' | 'stable';
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = await Review.find({
      brandId,
      'moderation.status': 'approved',
      publishedAt: { $gte: thirtyDaysAgo }
    });

    if (recentReviews.length < 5) {
      return {
        ratingTrend: 'stable',
        sentimentTrend: 'stable',
        volumeTrend: 'stable'
      };
    }

    // Split into recent and older halves
    const sorted = recentReviews.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    const mid = Math.floor(sorted.length / 2);
    const recentHalf = sorted.slice(mid);
    const olderHalf = sorted.slice(0, mid);

    const avgRating = (arr: typeof recentReviews) => arr.reduce((sum, r) => sum + r.rating, 0) / arr.length;
    const avgSentiment = (arr: typeof recentReviews) => arr.reduce((sum, r) => sum + r.sentiment.score, 0) / arr.length;

    const recentAvgRating = avgRating(recentHalf);
    const olderAvgRating = avgRating(olderHalf);
    const recentAvgSentiment = avgSentiment(recentHalf);
    const olderAvgSentiment = avgSentiment(olderHalf);

    return {
      ratingTrend: recentAvgRating > olderAvgRating + 0.1 ? 'improving' :
        recentAvgRating < olderAvgRating - 0.1 ? 'declining' : 'stable',
      sentimentTrend: recentAvgSentiment > olderAvgSentiment + 0.1 ? 'improving' :
        recentAvgSentiment < olderAvgSentiment - 0.1 ? 'declining' : 'stable',
      volumeTrend: recentHalf.length > olderHalf.length * 1.2 ? 'increasing' :
        recentHalf.length < olderHalf.length * 0.8 ? 'decreasing' : 'stable'
    };
  }
}

export const analyticsService = new AnalyticsService();
