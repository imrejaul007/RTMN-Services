import { v4 as uuidv4 } from 'uuid';
import { Bot, Conversation, Message, TemplateModel } from '../models';
import {
  BotSchema,
  BotStatusEnum,
  NodeTypeEnum,
  FlowNodeSchema,
  FlowSchema,
  ChannelTypeEnum
} from '../types';
import type { Flow, FlowNode, BotStatus } from '../types';

export class BotService {
  /**
   * Create a new bot
   */
  async createBot(data: {
    name: string;
    description?: string;
    tenantId: string;
    userId: string;
    channels?: string[];
    variables?: any[];
  }): Promise<Bot> {
    const bot = new Bot({
      name: data.name,
      description: data.description,
      tenantId: data.tenantId,
      userId: data.userId,
      status: 'draft' as BotStatus,
      channels: data.channels || ['whatsapp'],
      variables: data.variables || [],
      flows: [],
      settings: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        startTypingIndicator: true,
        readReceipts: true,
        blockAfterHours: false
      },
      analytics: {
        totalConversations: 0,
        activeConversations: 0,
        completedConversations: 0,
        averageResponseTime: 0
      }
    });

    await bot.save();
    return bot;
  }

  /**
   * Get bot by ID
   */
  async getBotById(botId: string, tenantId: string): Promise<Bot | null> {
    return Bot.findOne({ _id: botId, tenantId });
  }

  /**
   * Get all bots for a tenant
   */
  async getBotsByTenant(
    tenantId: string,
    options: {
      status?: BotStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ bots: Bot[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    const query: any = { tenantId };
    if (status) query.status = status;

    const [bots, total] = await Promise.all([
      Bot.find(query)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit),
      Bot.countDocuments(query)
    ]);

    return { bots, total };
  }

  /**
   * Update bot
   */
  async updateBot(
    botId: string,
    tenantId: string,
    updates: Partial<{
      name: string;
      description: string;
      status: BotStatus;
      channels: string[];
      variables: any[];
      settings: any;
    }>
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete bot
   */
  async deleteBot(botId: string, tenantId: string): Promise<boolean> {
    const result = await Bot.deleteOne({ _id: botId, tenantId });
    return result.deletedCount > 0;
  }

  /**
   * Add flow to bot
   */
  async addFlow(
    botId: string,
    tenantId: string,
    flowData: Flow
  ): Promise<Bot | null> {
    const flow = {
      ...flowData,
      id: flowData.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const bot = await Bot.findOneAndUpdate(
      { _id: botId, tenantId },
      {
        $push: { flows: flow },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    return bot;
  }

  /**
   * Update flow in bot
   */
  async updateFlow(
    botId: string,
    tenantId: string,
    flowId: string,
    updates: Partial<Flow>
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId, 'flows.id': flowId },
      {
        $set: {
          'flows.$': { ...updates, id: flowId, updatedAt: new Date() },
          updatedAt: new Date()
        }
      },
      { new: true }
    );
  }

  /**
   * Delete flow from bot
   */
  async deleteFlow(
    botId: string,
    tenantId: string,
    flowId: string
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId },
      {
        $pull: { flows: { id: flowId } },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Add node to flow
   */
  async addNode(
    botId: string,
    tenantId: string,
    flowId: string,
    nodeData: FlowNode
  ): Promise<Bot | null> {
    const node = {
      ...nodeData,
      id: nodeData.id || uuidv4(),
      createdAt: new Date()
    };

    return Bot.findOneAndUpdate(
      { _id: botId, tenantId, 'flows.id': flowId },
      {
        $push: { 'flows.$.nodes': node },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Update node in flow
   */
  async updateNode(
    botId: string,
    tenantId: string,
    flowId: string,
    nodeId: string,
    updates: Partial<FlowNode>
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId, 'flows.id': flowId, 'flows.nodes.id': nodeId },
      {
        $set: {
          'flows.$[flowIndex].nodes.$[nodeIndex]': { ...updates, id: nodeId },
          updatedAt: new Date()
        }
      },
      {
        arrayFilters: [{ 'flowIndex.id': flowId }, { 'nodeIndex.id': nodeId }],
        new: true
      }
    );
  }

  /**
   * Delete node from flow
   */
  async deleteNode(
    botId: string,
    tenantId: string,
    flowId: string,
    nodeId: string
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId, 'flows.id': flowId },
      {
        $pull: { 'flows.$.nodes': { id: nodeId } },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Connect two nodes
   */
  async connectNodes(
    botId: string,
    tenantId: string,
    flowId: string,
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<Bot | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, tenantId, 'flows.id': flowId, 'flows.nodes.id': sourceNodeId },
      {
        $set: {
          'flows.$[flowIndex].nodes.$[nodeIndex].nextNodeId': targetNodeId,
          updatedAt: new Date()
        }
      },
      {
        arrayFilters: [{ 'flowIndex.id': flowId }, { 'nodeIndex.id': sourceNodeId }],
        new: true
      }
    );
  }

  /**
   * Change bot status
   */
  async changeStatus(
    botId: string,
    tenantId: string,
    status: BotStatus
  ): Promise<Bot | null> {
    const validTransitions: Record<BotStatus, BotStatus[]> = {
      draft: ['testing', 'archived'],
      testing: ['active', 'draft', 'archived'],
      active: ['paused', 'archived'],
      paused: ['active', 'archived'],
      archived: ['draft']
    };

    const bot = await this.getBotById(botId, tenantId);
    if (!bot) return null;

    if (!validTransitions[bot.status as BotStatus]?.includes(status)) {
      throw new Error(`Cannot transition from ${bot.status} to ${status}`);
    }

    return Bot.findOneAndUpdate(
      { _id: botId, tenantId },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Clone bot
   */
  async cloneBot(
    botId: string,
    tenantId: string,
    newName: string,
    userId: string
  ): Promise<Bot | null> {
    const original = await this.getBotById(botId, tenantId);
    if (!original) return null;

    const clonedFlows = original.flows.map((flow: any) => ({
      ...flow.toObject ? flow.toObject() : flow,
      id: uuidv4(),
      name: `${flow.name} (Copy)`,
      nodes: (flow.nodes || []).map((node: any) => ({
        ...node,
        id: uuidv4()
      }))
    }));

    return this.createBot({
      name: newName,
      description: original.description,
      tenantId,
      userId,
      channels: original.channels,
      variables: original.variables
    }).then(async (bot) => {
      bot.flows = clonedFlows;
      await bot.save();
      return bot;
    });
  }

  /**
   * Duplicate flow from template
   */
  async createFromTemplate(
    templateId: string,
    tenantId: string,
    userId: string,
    botName: string
  ): Promise<Bot | null> {
    const template = await TemplateModel.findById(templateId);
    if (!template) return null;

    const newFlows = template.flows.map((flow: any) => ({
      ...flow.toObject ? flow.toObject() : flow,
      id: uuidv4(),
      nodes: (flow.nodes || []).map((node: any) => ({
        ...node,
        id: uuidv4()
      }))
    }));

    const bot = await this.createBot({
      name: botName,
      description: `Created from template: ${template.name}`,
      tenantId,
      userId
    });

    bot.flows = newFlows;
    bot.variables = template.variables.map((v: any) => ({
      name: v.name,
      type: v.type,
      required: v.required,
      description: v.description
    }));
    await bot.save();

    return bot;
  }

  /**
   * Get bot analytics
   */
  async getAnalytics(botId: string, tenantId: string) {
    const bot = await this.getBotById(botId, tenantId);
    if (!bot) return null;

    const conversations = await Conversation.find({
      botId: bot._id,
      tenantId
    });

    const messages = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversations.map((c) => c._id) }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const endedConversations = await Conversation.countDocuments({
      botId: bot._id,
      tenantId,
      status: 'ended'
    });

    const handoffConversations = await Conversation.countDocuments({
      botId: bot._id,
      tenantId,
      status: 'handoff'
    });

    const messageCounts = messages.reduce(
      (acc, m) => {
        acc[m._id] = m.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      botId: bot._id,
      status: bot.status,
      analytics: {
        ...bot.analytics,
        totalConversations: conversations.length,
        activeConversations: conversations.filter((c) => c.status === 'active').length,
        completedConversations: endedConversations,
        handoffRate: conversations.length > 0
          ? (handoffConversations / conversations.length) * 100
          : 0,
        messagesByType: messageCounts
      }
    };
  }

  /**
   * Test bot flow
   */
  async testBot(
    botId: string,
    tenantId: string,
    testUserId: string,
    testMessage?: string
  ): Promise<{
    success: boolean;
    flow: any;
    messages: any[];
    errors: string[];
  }> {
    const bot = await this.getBotById(botId, tenantId);
    if (!bot) {
      return { success: false, flow: null, messages: [], errors: ['Bot not found'] };
    }

    const errors: string[] = [];

    // Validate flows
    for (const flow of bot.flows) {
      // Check entry node exists
      if (!flow.entryNodeId) {
        errors.push(`Flow "${flow.name}" has no entry node`);
      }

      // Check all node references exist
      for (const node of flow.nodes) {
        if (node.nextNodeId) {
          const exists = flow.nodes.some((n: any) => n.id === node.nextNodeId);
          if (!exists) {
            errors.push(`Node "${node.label}" references non-existent node`);
          }
        }

        // Check condition branches
        if (node.config.branches) {
          for (const branch of node.config.branches) {
            const exists = flow.nodes.some((n: any) => n.id === branch.nextNodeId);
            if (!exists) {
              errors.push(`Condition branch references non-existent node`);
            }
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      flow: bot.flows[0],
      messages: [],
      errors
    };
  }
}

export const botService = new BotService();
