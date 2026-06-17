/**
 * Intelligence Routes - AI-Powered Community Insights
 * Provides sentiment analysis, trend prediction, and personalization
 */

import { Router, Request, Response } from 'express';
import { AxomProfile, axomProfileStore } from '../models/AxomProfile';
import { logger } from '../index';

const router = Router();

// Analyze sentiment for area
router.get('/sentiment', async (req: Request, res: Response) => {
  try {
    const { areaId, timeframe = '7d' } = req.query;

    const cutoffTime = getCutoffTime(timeframe as string);
    const sentiments: { positive: number; neutral: number; negative: number } = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    axomProfileStore.forEach((profile) => {
      if (areaId && profile.primaryLocation.areaId !== areaId) return;

      profile.buzzContent.forEach((content) => {
        if (content.createdAt >= cutoffTime && content.sentiment) {
          sentiments[content.sentiment]++;
        }
      });
    });

    const total = sentiments.positive + sentiments.neutral + sentiments.negative;

    res.json({
      success: true,
      data: {
        overall: total > 0 ? (sentiments.positive - sentiments.negative) / total : 0,
        breakdown: {
          positive: total > 0 ? (sentiments.positive / total) * 100 : 0,
          neutral: total > 0 ? (sentiments.neutral / total) * 100 : 0,
          negative: total > 0 ? (sentiments.negative / total) * 100 : 0
        },
        volume: total
      },
      timeframe
    });
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Get personalized recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.query;

    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }

    const profile = axomProfileStore.get(profileId as string);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user's interests
    const userInterests = profile.interests.map((i) => i.tag);

    // Find profiles with similar interests
    const recommendations: Array<{
      type: 'profile' | 'event' | 'business';
      id: string;
      name: string;
      matchScore: number;
      reason: string;
    }> = [];

    // Profile recommendations
    axomProfileStore.forEach((otherProfile) => {
      if (otherProfile.profileId === profileId) return;

      const commonInterests = otherProfile.interests.filter((i) => userInterests.includes(i.tag));
      if (commonInterests.length > 0) {
        recommendations.push({
          type: 'profile',
          id: otherProfile.profileId,
          name: otherProfile.displayName,
          matchScore: commonInterests.length / Math.max(userInterests.length, otherProfile.interests.length),
          reason: `Shares interests: ${commonInterests.slice(0, 3).map((i) => i.tag).join(', ')}`
        });
      }
    });

    // Event recommendations
    axomProfileStore.forEach((otherProfile) => {
      otherProfile.localEvents.forEach((event) => {
        if (event.startDate < new Date()) return; // Skip past events

        const eventTags = event.tags || [];
        const matches = userInterests.filter((i) => eventTags.includes(i)).length;
        if (matches > 0) {
          recommendations.push({
            type: 'event',
            id: event.eventId,
            name: event.title,
            matchScore: matches / eventTags.length,
            reason: `Matches your interests in ${userInterests.filter((i) => eventTags.includes(i)).join(', ')}`
          });
        }
      });
    });

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: recommendations.slice(0, 20)
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Predict trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { areaId, category, limit = 10 } = req.query;

    const tagTrends: Map<string, { current: number; previous: number; velocity: number }> = new Map();

    axomProfileStore.forEach((profile) => {
      if (areaId && profile.primaryLocation.areaId !== areaId) return;

      profile.buzzContent.forEach((content) => {
        // Extract tags from content if not available
        const words = content.content.toLowerCase().split(/\s+/);
        words.forEach((word) => {
          if (word.length > 3) {
            const existing = tagTrends.get(word) || { current: 0, previous: 0, velocity: 0 };
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

            if (content.createdAt >= sevenDaysAgo) {
              existing.current++;
            } else if (content.createdAt >= fourteenDaysAgo) {
              existing.previous++;
            }

            tagTrends.set(word, existing);
          }
        });
      });
    });

    // Calculate velocity
    const trends = Array.from(tagTrends.entries())
      .map(([tag, data]) => ({
        tag,
        currentVolume: data.current,
        previousVolume: data.previous,
        velocity: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : data.current * 100,
        isRising: data.current > data.previous
      }))
      .filter((t) => t.currentVolume >= 3) // Minimum volume threshold
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        trending: trends.filter((t) => t.isRising),
        declining: trends.filter((t) => !t.isRising)
      }
    });
  } catch (error) {
    logger.error('Error predicting trends:', error);
    res.status(500).json({ error: 'Failed to predict trends' });
  }
});

// Analyze influence network
router.get('/influence-network', async (req: Request, res: Response) => {
  try {
    const { areaId } = req.query;

    interface NetworkNode {
      profileId: string;
      name: string;
      influenceScore: number;
      followers: number;
      connections: string[];
    }

    const nodes: NetworkNode[] = [];

    axomProfileStore.forEach((profile) => {
      if (areaId && profile.primaryLocation.areaId !== areaId) return;

      nodes.push({
        profileId: profile.profileId,
        name: profile.displayName,
        influenceScore: profile.stats.influenceScore,
        followers: profile.stats.followers,
        connections: profile.connectedBusinesses.map((b) => b.businessId)
      });
    });

    // Calculate network metrics
    const totalInfluence = nodes.reduce((sum, n) => sum + n.influenceScore, 0);
    const avgInfluence = nodes.length > 0 ? totalInfluence / nodes.length : 0;

    // Identify key influencers
    const keyInfluencers = nodes
      .filter((n) => n.influenceScore > avgInfluence)
      .sort((a, b) => b.influenceScore - a.influenceScore);

    res.json({
      success: true,
      data: {
        totalMembers: nodes.length,
        totalInfluence,
        averageInfluence: avgInfluence,
        keyInfluencers: keyInfluencers.slice(0, 10),
        networkDensity: calculateNetworkDensity(nodes)
      }
    });
  } catch (error) {
    logger.error('Error analyzing influence network:', error);
    res.status(500).json({ error: 'Failed to analyze network' });
  }
});

// Engagement prediction
router.get('/engagement-prediction', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.query;

    if (!profileId) {
      return res.status(400).json({ error: 'profileId is required' });
    }

    const profile = axomProfileStore.get(profileId as string);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate engagement prediction factors
    const factors = {
      historicalRate: profile.stats.engagementRate,
      contentFrequency: profile.stats.postsCount / 30, // Posts per month
      followerRatio: profile.stats.followers / Math.max(1, profile.stats.following),
      influenceLevel: profile.stats.influenceScore,
      contentQuality: calculateContentQuality(profile),
      optimalPostTime: predictOptimalTime(profile),
      predictedEngagement: 0
    };

    // Weighted prediction
    factors.predictedEngagement =
      factors.historicalRate * 0.3 +
      factors.contentQuality * 0.25 +
      factors.influenceLevel * 0.2 +
      factors.followerRatio * 10 * 0.15 +
      factors.contentFrequency * 5 * 0.1;

    res.json({
      success: true,
      data: {
        predictedEngagementRate: Math.min(100, Math.max(0, factors.predictedEngagement)),
        factors,
        recommendations: generateEngagementRecommendations(factors)
      }
    });
  } catch (error) {
    logger.error('Error predicting engagement:', error);
    res.status(500).json({ error: 'Failed to predict engagement' });
  }
});

// Community health score
router.get('/health-score', async (req: Request, res: Response) => {
  try {
    const { areaId } = req.query;

    let profiles: AxomProfile[] = [];
    axomProfileStore.forEach((profile) => {
      if (!areaId || profile.primaryLocation.areaId === areaId) {
        profiles.push(profile);
      }
    });

    const metrics = {
      memberCount: profiles.length,
      activeMembers: profiles.filter((p) => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return p.buzzContent.some((c) => c.createdAt >= weekAgo);
      }).length,
      avgEngagement: profiles.length > 0 ? profiles.reduce((sum, p) => sum + p.stats.engagementRate, 0) / profiles.length : 0,
      eventParticipation: profiles.length > 0
        ? profiles.reduce((sum, p) => sum + p.stats.eventsAttended, 0) / profiles.length
        : 0,
      positiveSentiment: calculateSentimentRatio(profiles),
      diversity: calculateDiversityScore(profiles)
    };

    const healthScore = calculateHealthScore(metrics);

    res.json({
      success: true,
      data: {
        score: healthScore,
        grade: getHealthGrade(healthScore),
        metrics,
        insights: generateHealthInsights(metrics)
      }
    });
  } catch (error) {
    logger.error('Error calculating health score:', error);
    res.status(500).json({ error: 'Failed to calculate health score' });
  }
});

// Helper functions
function getCutoffTime(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function calculateNetworkDensity(nodes: NetworkNode[]): number {
  if (nodes.length < 2) return 0;
  const maxConnections = (nodes.length * (nodes.length - 1)) / 2;
  const actualConnections = nodes.reduce((sum, n) => sum + n.connections.length, 0);
  return maxConnections > 0 ? actualConnections / maxConnections : 0;
}

function calculateContentQuality(profile: AxomProfile): number {
  if (profile.buzzContent.length === 0) return 0;

  const avgEngagement =
    profile.buzzContent.reduce((sum, c) => sum + c.engagementMetrics.likes + c.engagementMetrics.comments, 0) /
    profile.buzzContent.length;

  return Math.min(100, avgEngagement);
}

function predictOptimalTime(profile: AxomProfile): string {
  // Analyze when user's content gets most engagement
  const hourCounts: Record<number, number> = {};
  profile.buzzContent.forEach((content) => {
    const hour = content.createdAt.getHours();
    const engagement = content.engagementMetrics.likes + content.engagementMetrics.comments;
    hourCounts[hour] = (hourCounts[hour] || 0) + engagement;
  });

  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  return bestHour ? `${bestHour[0]}:00` : '18:00';
}

function generateEngagementRecommendations(factors: Record<string, number>): string[] {
  const recommendations: string[] = [];

  if (factors.contentFrequency < 2) {
    recommendations.push('Post more frequently to stay top of mind');
  }
  if (factors.followerRatio < 1) {
    recommendations.push('Engage with others to increase your visibility');
  }
  if (factors.contentQuality < 30) {
    recommendations.push('Focus on creating higher-quality, more engaging content');
  }

  recommendations.push(`Best time to post: ${factors.optimalPostTime}`);
  return recommendations;
}

function calculateSentimentRatio(profiles: AxomProfile[]): number {
  let positive = 0;
  let total = 0;

  profiles.forEach((profile) => {
    profile.buzzContent.forEach((content) => {
      if (content.sentiment) {
        total++;
        if (content.sentiment === 'positive') positive++;
      }
    });
  });

  return total > 0 ? positive / total : 0.5;
}

function calculateDiversityScore(profiles: AxomProfile[]): number {
  const allInterests = new Set<string>();
  profiles.forEach((profile) => {
    profile.interests.forEach((i) => allInterests.add(i.tag));
  });

  // Diversity based on unique interests vs total interest tags
  const totalTags = profiles.reduce((sum, p) => sum + p.interests.length, 0);
  return totalTags > 0 ? (allInterests.size / totalTags) * 100 : 0;
}

function calculateHealthScore(metrics: Record<string, number>): number {
  return (
    (metrics.memberCount > 0 ? Math.min(100, metrics.memberCount) * 0.1 : 0) +
    (metrics.activeMembers > 0 ? Math.min(100, (metrics.activeMembers / metrics.memberCount) * 100) * 0.25 : 0) +
    Math.min(100, metrics.avgEngagement) * 0.25 +
    Math.min(100, metrics.eventParticipation * 10) * 0.15 +
    metrics.positiveSentiment * 100 * 0.15 +
    Math.min(100, metrics.diversity) * 0.1
  );
}

function getHealthGrade(score: number): string {
  if (score >= 80) return 'A - Excellent';
  if (score >= 70) return 'B - Good';
  if (score >= 60) return 'C - Fair';
  if (score >= 50) return 'D - Needs Improvement';
  return 'F - Critical';
}

function generateHealthInsights(metrics: Record<string, number>): string[] {
  const insights: string[] = [];

  if (metrics.activeMembers / metrics.memberCount < 0.5) {
    insights.push('Low engagement rate - consider boosting activity');
  }
  if (metrics.avgEngagement < 20) {
    insights.push('Content engagement is low - focus on quality');
  }
  if (metrics.positiveSentiment < 0.6) {
    insights.push('Sentiment needs attention - monitor feedback');
  }
  if (metrics.diversity < 30) {
    insights.push('Low interest diversity - encourage varied content');
  }

  return insights;
}

export default router;
