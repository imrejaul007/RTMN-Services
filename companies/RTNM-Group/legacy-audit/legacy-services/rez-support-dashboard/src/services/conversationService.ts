import { Conversation, IConversation } from '../models/Conversation.js';
import { ChannelType, ConversationStatus, Priority, ReplyInput, ConversationCreateInput, Message } from '../types/index.js';

export class ConversationService {
  async getConversations(filters: {
    channel?: ChannelType;
    status?: ConversationStatus;
    priority?: Priority;
    agentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ conversations: IConversation[]; total: number; page: number; totalPages: number }> {
    const { channel, status, priority, agentId, search, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {};

    if (channel) query.channel = channel;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (agentId) query.assignedAgent = agentId;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(query),
    ]);

    return {
      conversations: conversations as IConversation[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(id: string): Promise<IConversation | null> {
    return Conversation.findById(id).lean() as Promise<IConversation | null>;
  }

  async createConversation(input: ConversationCreateInput): Promise<IConversation> {
    const conversation = new Conversation({
      channel: input.channel,
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      status: 'open',
      priority: 'medium',
      subject: input.subject,
      tags: [],
      messages: input.initialMessage ? [{
        id: `msg_${Date.now()}`,
        content: input.initialMessage,
        sender: 'customer' as const,
        timestamp: new Date(),
        read: false,
      }] : [],
      sourceService: input.sourceService,
      sourceConversationId: input.sourceConversationId,
      metadata: input.metadata,
    });

    await conversation.save();
    return conversation;
  }

  async reply(conversationId: string, input: ReplyInput, agentId: string, agentName: string): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    const message: Message = {
      id: `msg_${Date.now()}`,
      content: input.content,
      sender: 'agent',
      senderId: agentId,
      senderName: agentName,
      timestamp: new Date(),
      read: true,
    };

    if (input.attachments) {
      message.attachments = input.attachments.map((a, i) => ({
        id: `att_${Date.now()}_${i}`,
        ...a,
      }));
    }

    conversation.messages.push(message);
    conversation.status = 'in_progress';
    conversation.updatedAt = new Date();

    await conversation.save();
    return conversation;
  }

  async assignAgent(conversationId: string, agentId: string, agentName: string): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    conversation.assignedAgent = agentId;
    conversation.assignedAgentName = agentName;
    conversation.status = 'in_progress';
    conversation.updatedAt = new Date();

    await conversation.save();
    return conversation;
  }

  async updateStatus(conversationId: string, status: ConversationStatus): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    conversation.status = status;
    conversation.updatedAt = new Date();

    if (status === 'resolved' || status === 'closed') {
      conversation.resolvedAt = new Date();
    }

    await conversation.save();
    return conversation;
  }

  async updatePriority(conversationId: string, priority: Priority): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    conversation.priority = priority;
    conversation.updatedAt = new Date();

    await conversation.save();
    return conversation;
  }

  async addTags(conversationId: string, tags: string[]): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    conversation.tags = [...new Set([...conversation.tags, ...tags])];
    conversation.updatedAt = new Date();

    await conversation.save();
    return conversation;
  }

  async markAsRead(conversationId: string): Promise<IConversation | null> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    conversation.messages.forEach(msg => {
      if (!msg.read && msg.sender !== 'agent') {
        msg.read = true;
      }
    });
    conversation.updatedAt = new Date();

    await conversation.save();
    return conversation;
  }
}
