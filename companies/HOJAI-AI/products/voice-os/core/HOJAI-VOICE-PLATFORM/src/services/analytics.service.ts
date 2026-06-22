// ============================================================================
// HOJAI VOICE PLATFORM - Analytics Service
// ============================================================================

import {
  AnalyticsSummary,
  AnalyticsDocument,
  LiveAnalyticsDocument,
  IntentCount,
  HourlyCount,
  SentimentTrend,
} from '../types';
import {
  AnalyticsModel,
  LiveAnalyticsModel,
  CallModel,
  SessionModel,
} from '../models/Analytics';

/**
 * Analytics Service - Handles analytics and reporting
 */
export class AnalyticsService {
  /**
   * Get overall analytics for an organization
   */
  async getOverallAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsSummary> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    // Get call statistics
    const callStats = await CallModel.getCallStats(organizationId, start, end);

    // Get session statistics
    const sessions = await SessionModel.find({
      organizationId,
      createdAt: { $gte: start, $lte: end },
    });

    // Calculate average sentiment from sessions
    let totalSentiment = 0;
    let sentimentCount = 0;

    for (const session of sessions) {
      for (const sentiment of session.sentimentHistory) {
        totalSentiment += sentiment.score;
        sentimentCount++;
      }
    }

    const averageSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

    // Count intents from sessions
    const intentCounts: Record<string, number> = {};
    let totalIntentCount = 0;

    for (const session of sessions) {
      for (const message of session.messageHistory) {
        if (message.intent && message.role === 'user') {
          intentCounts[message.intent] = (intentCounts[message.intent] || 0) + 1;
          totalIntentCount++;
        }
      }
    }

    const topIntents: IntentCount[] = Object.entries(intentCounts)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: totalIntentCount > 0 ? (count / totalIntentCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate calls by hour
    const callsByHour: HourlyCount[] = [];
    const hourCounts: Record<number, number> = {};

    for (let h = 0; h < 24; h++) {
      hourCounts[h] = 0;
    }

    const allCalls = await CallModel.find({
      organizationId,
      createdAt: { $gte: start, $lte: end },
    });

    for (const call of allCalls) {
      const hour = new Date(call.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    for (let h = 0; h < 24; h++) {
      callsByHour.push({ hour: h, count: hourCounts[h] });
    }

    // Calculate rates
    const completionRate =
      callStats.totalCalls > 0
        ? (callStats.completedCalls / callStats.totalCalls) * 100
        : 0;
    const transferRate =
      callStats.totalCalls > 0
        ? (callStats.transferredCalls / callStats.totalCalls) * 100
        : 0;

    return {
      totalCalls: callStats.totalCalls,
      completedCalls: callStats.completedCalls,
      averageDuration: callStats.averageDuration || 0,
      averageSentiment,
      topIntents,
      callsByHour,
      sentimentTrend: [], // Would need daily aggregation for this
      completionRate,
      transferRate,
      abandonmentRate: 100 - completionRate,
    };
  }

  /**
   * Get analytics for a specific agent
   */
  async getAgentAnalytics(
    agentId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    summary: AnalyticsSummary;
    agentId: string;
    period: { start: Date; end: Date };
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get call statistics for agent
    const callStats = await CallModel.getCallStats(organizationId, start, end);

    // Filter calls by agent
    const agentCalls = await CallModel.find({
      organizationId,
      agentId,
      createdAt: { $gte: start, $lte: end },
    });

    const agentCallStats = await CallModel.getCallStats(organizationId, start, end);

    // Get sessions for agent
    const sessions = await SessionModel.find({
      agentId,
      organizationId,
      createdAt: { $gte: start, $lte: end },
    });

    // Calculate average sentiment
    let totalSentiment = 0;
    let sentimentCount = 0;

    for (const session of sessions) {
      for (const sentiment of session.sentimentHistory) {
        totalSentiment += sentiment.score;
        sentimentCount++;
      }
    }

    const averageSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

    // Count intents
    const intentCounts: Record<string, number> = {};
    let totalIntentCount = 0;

    for (const session of sessions) {
      for (const message of session.messageHistory) {
        if (message.intent && message.role === 'user') {
          intentCounts[message.intent] = (intentCounts[message.intent] || 0) + 1;
          totalIntentCount++;
        }
      }
    }

    const topIntents: IntentCount[] = Object.entries(intentCounts)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: totalIntentCount > 0 ? (count / totalIntentCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const completionRate =
      agentCalls.length > 0
        ? (agentCallStats.completedCalls / agentCalls.length) * 100
        : 0;

    return {
      summary: {
        totalCalls: agentCalls.length,
        completedCalls: agentCallStats.completedCalls,
        averageDuration: agentCallStats.averageDuration || 0,
        averageSentiment,
        topIntents,
        callsByHour: [],
        sentimentTrend: [],
        completionRate,
        transferRate: 0,
        abandonmentRate: 100 - completionRate,
      },
      agentId,
      period: { start, end },
    };
  }

  /**
   * Get call metrics
   */
  async getCallMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    averageDuration: number;
    byStatus: Record<string, number>;
    byDirection: Record<string, number>;
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const calls = await CallModel.find({
      organizationId,
      createdAt: { $gte: start, $lte: end },
    });

    const byStatus: Record<string, number> = {};
    const byDirection: Record<string, number> = {};
    let totalDuration = 0;
    let completed = 0;
    let failed = 0;

    for (const call of calls) {
      byStatus[call.status] = (byStatus[call.status] || 0) + 1;
      byDirection[call.direction] = (byDirection[call.direction] || 0) + 1;

      if (call.duration) {
        totalDuration += call.duration;
      }

      if (call.status === 'completed') completed++;
      if (call.status === 'failed') failed++;
    }

    return {
      total: calls.length,
      completed,
      failed,
      averageDuration: calls.length > 0 ? totalDuration / calls.length : 0,
      byStatus,
      byDirection,
    };
  }

  /**
   * Create/update live analytics for a call
   */
  async updateLiveAnalytics(
    organizationId: string,
    agentId: string,
    callId: string,
    sessionId: string,
    data: {
      intent?: string;
      sentiment?: number;
    }
  ): Promise<LiveAnalyticsDocument> {
    let analytics = await LiveAnalyticsModel.findByCall(callId);

    if (!analytics) {
      analytics = await LiveAnalyticsModel.create({
        organizationId,
        agentId,
        callId,
        sessionId,
        currentIntent: data.intent || null,
        sentiment: data.sentiment || 0,
        turnCount: 0,
        lastActivity: new Date(),
      });
    } else {
      if (data.intent !== undefined) {
        await LiveAnalyticsModel.updateIntent(callId, data.intent);
      }
      if (data.sentiment !== undefined) {
        await LiveAnalyticsModel.updateSentiment(callId, data.sentiment);
      }
      await LiveAnalyticsModel.incrementTurn(callId);
      analytics = await LiveAnalyticsModel.findByCall(callId);
    }

    return analytics!;
  }

  /**
   * Get live analytics for an organization
   */
  async getLiveAnalytics(organizationId: string): Promise<LiveAnalyticsDocument[]> {
    return LiveAnalyticsModel.findActiveByOrganization(organizationId);
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(organizationId: string): Promise<{
    activeCalls: number;
    totalCallsToday: number;
    averageWaitTime: number;
    activeAgents: number;
    topIntents: IntentCount[];
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active calls
    const activeCalls = await CallModel.countDocuments({
      organizationId,
      status: 'in-progress',
    });

    // Today's calls
    const todayCalls = await CallModel.countDocuments({
      organizationId,
      createdAt: { $gte: today },
    });

    // Active sessions (proxy for active agents)
    const activeAgents = await SessionModel.countDocuments({
      organizationId,
      status: 'active',
    });

    // Recent sessions for intent and sentiment data
    const recentSessions = await SessionModel.find({
      organizationId,
      createdAt: { $gte: today },
    }).limit(100);

    // Count intents
    const intentCounts: Record<string, number> = {};
    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };

    for (const session of recentSessions) {
      for (const message of session.messageHistory) {
        if (message.intent && message.role === 'user') {
          intentCounts[message.intent] = (intentCounts[message.intent] || 0) + 1;
        }
        if (message.sentiment) {
          if (message.sentiment.label === 'positive') {
            sentimentBreakdown.positive++;
          } else if (message.sentiment.label === 'neutral') {
            sentimentBreakdown.neutral++;
          } else {
            sentimentBreakdown.negative++;
          }
        }
      }
    }

    const topIntents: IntentCount[] = Object.entries(intentCounts)
      .map(([intent, count]) => ({
        intent,
        count,
        percentage: 0, // Would need total count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeCalls,
      totalCallsToday: todayCalls,
      averageWaitTime: 0, // Would need wait time tracking
      activeAgents,
      topIntents,
      sentimentBreakdown,
    };
  }

  /**
   * Get hourly call distribution
   */
  async getHourlyDistribution(
    organizationId: string,
    date: Date
  ): Promise<HourlyCount[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const calls = await CallModel.find({
      organizationId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const hourCounts: Record<number, number> = {};

    for (let h = 0; h < 24; h++) {
      hourCounts[h] = 0;
    }

    for (const call of calls) {
      const hour = new Date(call.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour, 10),
      count,
    }));
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

export default AnalyticsService;
