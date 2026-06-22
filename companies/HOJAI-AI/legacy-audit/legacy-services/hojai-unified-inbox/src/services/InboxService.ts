import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, Agent, Team, CannedResponse } from '../models';

export class InboxService {
  // ============ CONVERSATIONS ============

  async createConversation(data: {
    channel: string;
    tenantId: string;
    customer: {
      id: string;
      name: string;
      phone?: string;
      email?: string;
    };
    subject?: string;
    context?: any;
  }): Promise<Conversation> {
    const conversation = new Conversation({
      conversationId: uuidv4(),
      channel: data.channel,
      tenantId: data.tenantId,
      customer: data.customer,
      subject: data.subject,
      status: 'new',
      priority: 'normal',
      tags: [],
      labels: [],
      messageCount: 0,
      aiHandled: false,
      context: data.context
    });

    await conversation.save();
    return conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    return Conversation.findOne({ conversationId });
  }

  async getConversations(
    tenantId: string,
    filters: {
      status?: string;
      channel?: string;
      assignedAgentId?: string;
      assignedTeam?: string;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const { status, channel, assignedAgentId, assignedTeam, priority, search, limit = 50, offset = 0 } = filters;

    const query: any = { tenantId };
    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (assignedAgentId) query.assignedAgentId = assignedAgentId;
    if (assignedTeam) query.assignedTeam = assignedTeam;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { lastMessage: { $regex: search, $options: 'i' } }
      ];
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit),
      Conversation.countDocuments(query)
    ]);

    return { conversations, total };
  }

  async assignConversation(
    conversationId: string,
    agentId: string
  ): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          assignedAgentId: agentId,
          status: 'assigned',
          assignedAt: new Date()
        }
      },
      { new: true }
    );
  }

  async resolveConversation(conversationId: string): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date()
        },
        $expr: {
          $set: {
            resolutionTime: {
              $subtract: [new Date(), '$createdAt']
            }
          }
        }
      },
      { new: true }
    );
  }

  async closeConversation(conversationId: string): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          status: 'closed',
          closedAt: new Date()
        }
      },
      { new: true }
    );
  }

  async transferConversation(
    conversationId: string,
    teamId: string
  ): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      {
        $set: {
          assignedTeam: teamId,
          assignedAgentId: null,
          status: 'new'
        }
      },
      { new: true }
    );
  }

  async addTag(conversationId: string, tag: string): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      { $addToSet: { tags: tag } },
      { new: true }
    );
  }

  async removeTag(conversationId: string, tag: string): Promise<Conversation | null> {
    return Conversation.findOneAndUpdate(
      { conversationId },
      { $pull: { tags: tag } },
      { new: true }
    );
  }

  // ============ MESSAGES ============

  async addMessage(data: {
    conversationId: string;
    channel: string;
    type: string;
    direction: string;
    content: any;
    sender: any;
    metadata?: any;
  }): Promise<Message | null> {
    const conversation = await Conversation.findOne({ conversationId: data.conversationId });
    if (!conversation) return null;

    const message = new Message({
      messageId: uuidv4(),
      conversationId: conversation._id,
      channel: data.channel,
      type: data.type,
      direction: data.direction,
      content: data.content,
      sender: data.sender,
      metadata: data.metadata,
      timestamp: new Date()
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = data.content.text || `[${data.type}]`;
    conversation.lastMessageAt = new Date();
    conversation.messageCount++;
    await conversation.save();

    return message;
  }

  async getMessages(
    conversationId: string,
    limit = 50,
    before?: Date
  ): Promise<Message[]> {
    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) return [];

    const query: any = { conversationId: conversation._id };
    if (before) query.timestamp = { $lt: before };

    return Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  // ============ AGENTS ============

  async createAgent(data: {
    tenantId: string;
    userId: string;
    name: string;
    email: string;
    role?: string;
    teams?: string[];
    skills?: string[];
  }): Promise<Agent> {
    const agent = new Agent({
      agentId: uuidv4(),
      ...data,
      status: 'offline',
      maxConcurrentChats: 5,
      stats: {
        totalConversations: 0,
        resolvedConversations: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0
      }
    });

    await agent.save();
    return agent;
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    return Agent.findOne({ agentId });
  }

  async getAgents(
    tenantId: string,
    filters: { status?: string; team?: string } = {}
  ): Promise<Agent[]> {
    const query: any = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.team) query.teams = filters.team;
    return Agent.find(query);
  }

  async setAgentStatus(agentId: string, status: string): Promise<Agent | null> {
    return Agent.findOneAndUpdate(
      { agentId },
      {
        $set: {
          status,
          'stats.lastActiveAt': new Date()
        }
      },
      { new: true }
    );
  }

  async getAvailableAgent(tenantId: string, channel?: string): Promise<Agent | null> {
    const query: any = {
      tenantId,
      status: 'online',
      $expr: {
        $lt: ['$stats.totalConversations', '$maxConcurrentChats']
      }
    };
    if (channel) query.teams = channel;

    return Agent.findOne(query).sort({ 'stats.totalConversations': 1 });
  }

  // ============ TEAMS ============

  async createTeam(data: {
    tenantId: string;
    name: string;
    channels?: string[];
    supervisorId?: string;
  }): Promise<Team> {
    const team = new Team({
      teamId: uuidv4(),
      ...data,
      skills: data.channels || [],
      autoAssign: true,
      maxQueueSize: 50,
      routingRule: 'round_robin'
    });

    await team.save();
    return team;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return Team.findOne({ teamId });
  }

  async getTeams(tenantId: string): Promise<Team[]> {
    return Team.find({ tenantId });
  }

  // ============ CANNED RESPONSES ============

  async createCannedResponse(data: {
    tenantId: string;
    shortcut: string;
    content: string;
    category?: string;
    agentId?: string;
  }): Promise<CannedResponse> {
    const response = new CannedResponse({
      responseId: uuidv4(),
      ...data,
      tags: [],
      usageCount: 0
    });

    await response.save();
    return response;
  }

  async searchCannedResponses(
    tenantId: string,
    query: string,
    limit = 10
  ): Promise<CannedResponse[]> {
    return CannedResponse.find({
      tenantId,
      $or: [
        { shortcut: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ usageCount: -1 })
      .limit(limit);
  }

  async incrementCannedResponseUsage(responseId: string): Promise<void> {
    await CannedResponse.findOneAndUpdate(
      { responseId },
      { $inc: { usageCount: 1 } }
    );
  }

  // ============ STATISTICS ============

  async getStats(tenantId: string): Promise<any> {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalConversations,
      activeConversations,
      newConversations,
      assignedConversations,
      pendingConversations,
      resolvedToday,
      closedToday,
      queueSize,
      agentsOnline,
      agentsBusy,
      byChannel,
      byStatus
    ] = await Promise.all([
      Conversation.countDocuments({ tenantId }),
      Conversation.countDocuments({ tenantId, status: { $in: ['new', 'assigned', 'in_progress'] } }),
      Conversation.countDocuments({ tenantId, status: 'new' }),
      Conversation.countDocuments({ tenantId, status: 'assigned' }),
      Conversation.countDocuments({ tenantId, status: 'pending' }),
      Conversation.countDocuments({ tenantId, status: 'resolved', resolvedAt: { $gte: startOfDay } }),
      Conversation.countDocuments({ tenantId, status: 'closed', closedAt: { $gte: startOfDay } }),
      Conversation.countDocuments({ tenantId, status: 'new' }),
      Agent.countDocuments({ tenantId, status: 'online' }),
      Agent.countDocuments({ tenantId, status: 'busy' }),
      Conversation.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$channel', count: { $sum: 1 } } }
      ]),
      Conversation.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const channelBreakdown: Record<string, number> = {};
    byChannel.forEach((c) => { channelBreakdown[c._id] = c.count; });

    const statusBreakdown: Record<string, number> = {};
    byStatus.forEach((s) => { statusBreakdown[s._id] = s.count; });

    // Calculate avg response and resolution time
    const stats = await Conversation.aggregate([
      {
        $match: {
          tenantId,
          resolvedAt: { $exists: true },
          createdAt: { $exists: true }
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
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    return {
      totalConversations,
      activeConversations,
      newConversations,
      assignedConversations,
      pendingConversations,
      resolvedToday,
      closedToday,
      avgResponseTime: 0,
      avgResolutionTime: stats[0]?.avgResolutionTime || 0,
      byChannel: channelBreakdown,
      byStatus: statusBreakdown,
      queueSize,
      agentsOnline,
      agentsBusy
    };
  }
}

export const inboxService = new InboxService();
