import { Brand } from '../models/Brand';
import { Mention } from '../models/Mention';
import { Sentiment } from '../models/Sentiment';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

interface BrandHealthScore {
  overall: number;
  components: {
    sentiment: number;
    engagement: number;
    reach: number;
    growth: number;
    crisis: number;
  };
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
  factors: {
    positive: string[];
    negative: string[];
    recommendations: string[];
  };
}

export class BrandHealthService {
  // Weights for health score calculation
  private weights = {
    sentiment: 0.30,
    engagement: 0.25,
    reach: 0.20,
    growth: 0.15,
    crisis: 0.10
  };

  async calculateHealthScore(brandId: string): Promise<BrandHealthScore> {
    const days = 30; // Look back period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all mentions in period
    const mentions = await Mention.find({
      brandId,
      publishedAt: { $gte: startDate }
    });

    // Calculate components
    const sentimentScore = await this.calculateSentimentScore(mentions);
    const engagementScore = await this.calculateEngagementScore(mentions);
    const reachScore = await this.calculateReachScore(mentions);
    const growthScore = await this.calculateGrowthScore(brandId, startDate);
    const crisisScore = await this.calculateCrisisScore(mentions, startDate);

    // Calculate overall score (weighted average)
    const overall = Math.round(
      sentimentScore * this.weights.sentiment +
      engagementScore * this.weights.engagement +
      reachScore * this.weights.reach +
      growthScore * this.weights.growth +
      crisisScore * this.weights.crisis
    );

    // Determine trend
    const trend = await this.calculateTrend(brandId, overall);

    // Generate factors
    const factors = this.generateFactors(
      sentimentScore,
      engagementScore,
      reachScore,
      growthScore,
      crisisScore
    );

    // Update brand with new health score
    await Brand.updateOne(
      { brandId },
      {
        'currentHealth.score': overall,
        'currentHealth.trend': trend,
        'currentHealth.lastUpdated': new Date()
      }
    );

    return {
      overall,
      components: {
        sentiment: Math.round(sentimentScore),
        engagement: Math.round(engagementScore),
        reach: Math.round(reachScore),
        growth: Math.round(growthScore),
        crisis: Math.round(crisisScore)
      },
      trend,
      lastUpdated: new Date(),
      factors
    };
  }

  private async calculateSentimentScore(mentions: any[]): Promise<number> {
    if (mentions.length === 0) return 50; // Neutral baseline

    const positive = mentions.filter(m => m.sentiment.label === 'positive').length;
    const negative = mentions.filter(m => m.sentiment.label === 'negative').length;
    const neutral = mentions.filter(m => m.sentiment.label === 'neutral').length;
    const total = mentions.length;

    // Score formula: positive - negative ratio, scaled 0-100
    const ratio = (positive - negative) / total;
    const score = 50 + (ratio * 50); // 0-100 scale

    return Math.max(0, Math.min(100, score));
  }

  private async calculateEngagementScore(mentions: any[]): Promise<number> {
    if (mentions.length === 0) return 50;

    // Calculate average engagement
    let totalEngagement = 0;
    for (const mention of mentions) {
      const engagement = (mention.engagement?.likes || 0) +
                        (mention.engagement?.comments || 0) * 2 +
                        (mention.engagement?.shares || 0) * 3;
      totalEngagement += engagement;
    }

    const avgEngagement = totalEngagement / mentions.length;

    // Score based on engagement levels
    // Benchmark: 10 = average, 100 = excellent
    const score = Math.min(100, (avgEngagement / 2));

    return Math.max(0, Math.min(100, score));
  }

  private async calculateReachScore(mentions: any[]): Promise<number> {
    if (mentions.length === 0) return 50;

    // Calculate total and unique reach
    const totalReach = mentions.reduce((acc, m) => acc + (m.engagement?.reach || 0), 0);
    const uniqueAuthors = new Set(mentions.map(m => m.author?.handle || m.author?.name));
    const uniqueReach = mentions.reduce((acc, m) => {
      const authorReach = m.author?.followers || 0;
      return acc + (uniqueAuthors.has(m.author?.handle || m.author?.name) ? 0 : authorReach);
    }, 0);

    // Score based on reach volume and diversity
    const reachScore = Math.min(100, (totalReach / 10000) + (uniqueReach / 1000));

    return Math.max(0, Math.min(100, reachScore));
  }

  private async calculateGrowthScore(brandId: string, startDate: Date): Promise<number> {
    // Compare current period to previous period
    const periodLength = 30 * 24 * 60 * 60 * 1000;
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [currentMentions, previousMentions] = await Promise.all([
      Mention.countDocuments({
        brandId,
        publishedAt: { $gte: startDate }
      }),
      Mention.countDocuments({
        brandId,
        publishedAt: { $gte: previousStartDate, $lt: startDate }
      })
    ]);

    if (previousMentions === 0) {
      return currentMentions > 0 ? 75 : 50; // New brand gets moderate score
    }

    const growthRate = ((currentMentions - previousMentions) / previousMentions) * 100;

    // Score: 50 is baseline, each 10% growth adds 5 points
    const score = 50 + (growthRate / 2);

    return Math.max(0, Math.min(100, score));
  }

  private async calculateCrisisScore(mentions: any[], startDate: Date): Promise<number> {
    // Count crisis mentions and sudden negative spikes
    const crisisMentions = mentions.filter(m => m.isCrisis).length;

    // Check for velocity spike (sudden increase in negative mentions)
    const days = 7;
    const dailyMentions: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayMentions = mentions.filter(m =>
        m.publishedAt >= dayStart && m.publishedAt < dayEnd
      );

      dailyMentions[dayStart.toISOString().split('T')[0]] = dayMentions.length;
    }

    // Calculate average and spike
    const values = Object.values(dailyMentions) as number[];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const spikeRatio = avg > 0 ? max / avg : 1;

    // Crisis score: 100 = no crisis, lower = more crisis indicators
    let score = 100 - (crisisMentions * 10) - (spikeRatio * 10);

    return Math.max(0, Math.min(100, score));
  }

  private async calculateTrend(brandId: string, currentScore: number): Promise<'up' | 'down' | 'stable'> {
    // Get previous health scores from brand history
    const brand = await Brand.findOne({ brandId });
    if (!brand) return 'stable';

    // For simplicity, we'll use the previous score if available
    const previousScore = (brand as any).previousHealthScore || brand.currentHealth.score;

    const change = currentScore - previousScore;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private generateFactors(
    sentiment: number,
    engagement: number,
    reach: number,
    growth: number,
    crisis: number
  ): { positive: string[]; negative: string[]; recommendations: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];
    const recommendations: string[] = [];

    // Sentiment analysis
    if (sentiment >= 70) {
      positive.push('Strong positive sentiment from customers');
    } else if (sentiment < 40) {
      negative.push('Negative sentiment trend needs attention');
      recommendations.push('Investigate root causes of negative mentions');
    }

    // Engagement analysis
    if (engagement >= 60) {
      positive.push('High engagement levels from audience');
    } else if (engagement < 30) {
      negative.push('Low engagement on brand mentions');
      recommendations.push('Consider more interactive content or responses');
    }

    // Reach analysis
    if (reach >= 50) {
      positive.push('Good brand visibility and reach');
    } else {
      recommendations.push('Expand reach through partnerships or advertising');
    }

    // Growth analysis
    if (growth >= 60) {
      positive.push('Growing brand mention volume');
    } else if (growth < 40) {
      negative.push('Declining mention growth rate');
      recommendations.push('Launch awareness campaigns to boost mentions');
    }

    // Crisis analysis
    if (crisis < 70) {
      negative.push('Crisis indicators detected');
      recommendations.push('Monitor for potential reputation issues');
    } else {
      positive.push('No crisis indicators detected');
    }

    // Add general recommendations if list is short
    if (recommendations.length === 0) {
      recommendations.push('Continue current brand strategy');
    }

    return { positive, negative, recommendations };
  }

  async updateHealthScore(brandId: string): Promise<BrandHealthScore> {
    return this.calculateHealthScore(brandId);
  }

  // Get health score history
  async getHealthHistory(brandId: string, days: number = 90): Promise<any[]> {
    const brand = await Brand.findOne({ brandId });
    if (!brand) return [];

    // For now, return current score with historical data points
    // In production, this would query a separate health_history collection
    return [{
      score: brand.currentHealth.score,
      trend: brand.currentHealth.trend,
      date: brand.currentHealth.lastUpdated
    }];
  }
}
