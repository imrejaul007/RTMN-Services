import { Conversation } from '../models/Conversation.js';
import { ChannelType, Priority, DashboardAnalytics, AgentStats, QueueItem, SLAStats } from '../types/index.js';

export class AnalyticsService {
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConversations,
      openConversations,
      resolvedToday,
      channelBreakdown,
      priorityBreakdown,
      slaStats,
    ] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.countDocuments({ status: { $in: ['open', 'in_progress', 'pending'] } }),
      Conversation.countDocuments({ resolvedAt: { $gte: today } }),
      this.getChannelBreakdown(),
      this.getPriorityBreakdown(),
      this.getSLAStats(),
    ]);

    const conversationsWithTimes = await Conversation.find({
      messages: { $exists: true, $ne: [] }
    })
      .select('messages createdAt resolvedAt')
      .lean();

    let avgResponseTime = 0;
    let avgResolutionTime = 0;

    if (conversationsWithTimes.length > 0) {
      let totalResponseTime = 0;
      let totalResolutionTime = 0;
      let responseCount = 0;
      let resolutionCount = 0;

      for (const conv of conversationsWithTimes) {
        if (conv.messages.length > 0) {
          const firstAgentMsg = conv.messages.find(m => m.sender === 'agent');
          if (firstAgentMsg && conv.messages[0]) {
            const responseTime = new Date(firstAgentMsg.timestamp).getTime() - new Date(conv.messages[0].timestamp).getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }

        if (conv.resolvedAt) {
          const resolutionTime = new Date(conv.resolvedAt).getTime() - new Date(conv.createdAt).getTime();
          totalResolutionTime += resolutionTime;
          resolutionCount++;
        }
      }

      avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount / 1000 : 0;
      avgResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount / 1000 : 0;
    }

    return {
      totalConversations,
      openConversations,
      resolvedToday,
      avgResponseTime,
      avgResolutionTime,
      channelBreakdown,
      priorityBreakdown,
      slaStats,
    };
  }

  private async getChannelBreakdown(): Promise<Record<ChannelType, number>> {
    const results = await Conversation.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    const breakdown: Record<ChannelType, number> = {
      whatsapp: 0,
      email: 0,
      instagram: 0,
      web: 0,
      chat: 0,
    };

    results.forEach(r => {
      if (r._id in breakdown) {
        breakdown[r._id as ChannelType] = r.count;
      }
    });

    return breakdown;
  }

  private async getPriorityBreakdown(): Promise<Record<Priority, number>> {
    const results = await Conversation.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const breakdown: Record<Priority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    results.forEach(r => {
      if (r._id in breakdown) {
        breakdown[r._id as Priority] = r.count;
      }
    });

    return breakdown;
  }

  private async getSLAStats(): Promise<SLAStats> {
    const now = new Date();
    const slaBreachTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [withinSLA, breached, avgResolution] = await Promise.all([
      Conversation.countDocuments({
        status: { $in: ['resolved', 'closed'] },
        $or: [
          { slaDeadline: null },
          { resolvedAt: { $lte: '$slaDeadline' } }
        ]
      }),
      Conversation.countDocuments({
        slaDeadline: { $ne: null },
        slaDeadline: { $lt: now },
        status: { $nin: ['resolved', 'closed'] }
      }),
      Conversation.aggregate([
        {
          $match: {
            resolvedAt: { $exists: true },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $project: {
            resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' }
          }
        }
      ])
    ]);

    const total = withinSLA + breached;
    const avgResolutionTime = avgResolution[0]?.avgTime || 0;

    return {
      total,
      withinSLA,
      breached,
      breachRate: total > 0 ? breached / total : 0,
      avgResolutionTime: avgResolutionTime / 1000,
    };
  }

  async getAgentStats(): Promise<AgentStats[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agentStats = await Conversation.aggregate([
      {
        $match: {
          assignedAgent: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedAgent',
          agentName: { $first: '$assignedAgentName' },
          activeConversations: {
            $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress', 'pending']] }, 1, 0] }
          },
          resolvedToday: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'resolved'] }, { $gte: ['$resolvedAt', today] }] }, 1, 0] }
          },
        }
      }
    ]);

    return agentStats.map(a => ({
      agentId: a._id,
      agentName: a.agentName || 'Unknown',
      activeConversations: a.activeConversations,
      resolvedToday: a.resolvedToday,
      avgResponseTime: 0,
      avgResolutionTime: 0,
    }));
  }

  async getQueueByChannel(): Promise<QueueItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queueStats = await Conversation.aggregate([
      {
        $match: {
          status: { $in: ['open', 'pending'] },
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          avgWaitTime: { $avg: { $subtract: [new Date(), '$createdAt'] } }
        }
      }
    ]);

    return queueStats.map(q => ({
      channel: q._id as ChannelType,
      count: q.count,
      avgWaitTime: q.avgWaitTime / 1000,
    }));
  }
}
