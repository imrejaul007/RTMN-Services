import { v4 as uuidv4 } from 'uuid';
import { Bot, Conversation, Message } from '../models';
import { botService } from './BotService';
import type { FlowNode, Flow, Condition, ConversationContext } from '../types';

export class FlowExecutor {
  private redis: any;
  privateHOJAI_AGENTS_URL: string;
  private REZ_WHATSAPP_URL: string;

  constructor(redis: any) {
    this.redis = redis;
    this.HOJAI_AGENTS_URL = process.env.HOJAI_AGENTS_URL || 'http://localhost:4550';
    this.REZ_WHATSAPP_URL = process.env.REZ_WHATSAPP_URL || 'http://localhost:4202';
  }

  /**
   * Start a new conversation
   */
  async startConversation(
    botId: string,
    tenantId: string,
    userId: string,
    channel: string,
    metadata: any = {}
  ): Promise<Conversation> {
    const sessionId = `session_${uuidv4()}`;

    const conversation = new Conversation({
      sessionId,
      userId,
      tenantId,
      channel,
      botId,
      variables: {},
      tags: [],
      status: 'active',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      metadata
    });

    await conversation.save();

    // Get bot and execute welcome flow
    const bot = await botService.getBotById(botId, tenantId);
    if (bot && bot.flows.length > 0) {
      const flow = bot.flows.find((f: any) => f.id === bot.defaultFlowId) || bot.flows[0];
      if (flow) {
        await this.executeFromNode(conversation, flow, flow.entryNodeId);
      }
    }

    return conversation;
  }

  /**
   * Process incoming message
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    metadata: any = {}
  ): Promise<{ response: any; conversation: Conversation }> {
    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Save user message
    const userMsg = new Message({
      messageId: uuidv4(),
      conversationId: conversation._id,
      type: 'user',
      content: { text: userMessage },
      timestamp: new Date(),
      metadata: { sessionId }
    });
    await userMsg.save();

    // Get bot and current flow
    const bot = await Bot.findById(conversation.botId);
    if (!bot) {
      throw new Error('Bot not found');
    }

    const flow = bot.flows.find((f: any) => f.id === conversation.flowId) ||
                 bot.flows.find((f: any) => f.id === bot.defaultFlowId) ||
                 bot.flows[0];

    if (!flow) {
      throw new Error('No flow found');
    }

    // Find next node based on message
    const currentNode = flow.nodes.find((n: any) => n.id === conversation.currentNodeId);
    const nextNode = await this.findNextNode(flow, currentNode, userMessage, conversation);

    if (nextNode) {
      await this.executeFromNode(conversation, flow, nextNode.id);
    }

    // Update last activity
    conversation.lastActivityAt = new Date();
    await conversation.save();

    // Get bot response messages
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: -1 })
      .limit(5);

    return {
      response: messages[0] || null,
      conversation
    };
  }

  /**
   * Execute from a specific node
   */
  async executeFromNode(
    conversation: Conversation,
    flow: Flow,
    nodeId: string
  ): Promise<void> {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Update conversation current node
    conversation.currentNodeId = nodeId;
    conversation.flowId = flow.id;
    await conversation.save();

    // Execute node based on type
    switch (node.type) {
      case 'message':
        await this.executeMessageNode(conversation, node, flow);
        break;

      case 'ai_response':
        await this.executeAINode(conversation, node, flow);
        break;

      case 'condition':
        await this.executeConditionNode(conversation, node, flow);
        break;

      case 'delay':
        await this.executeDelayNode(conversation, node, flow);
        break;

      case 'action':
        await this.executeActionNode(conversation, node, flow);
        break;

      case 'webhook':
        await this.executeWebhookNode(conversation, node, flow);
        break;

      case 'handoff':
        await this.executeHandoffNode(conversation, node);
        break;

      case 'end':
        await this.executeEndNode(conversation);
        break;

      default:
        // Move to next node
        if (node.nextNodeId) {
          await this.executeFromNode(conversation, flow, node.nextNodeId);
        }
    }
  }

  /**
   * Execute message node
   */
  private async executeMessageNode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { message } = node.config;
    if (!message) return;

    const botMsg = new Message({
      messageId: uuidv4(),
      conversationId: conversation._id,
      nodeId: node.id,
      type: 'bot',
      content: {
        text: this.interpolateText(message.text || '', conversation.variables as Record<string, any>),
        media: message.media,
        quickReplies: message.quickReplies,
        buttons: message.buttons
      },
      timestamp: new Date(),
      metadata: { sessionId: conversation.sessionId }
    });
    await botMsg.save();

    // Send via channel
    await this.sendToChannel(conversation, botMsg);

    // Move to next node
    if (node.nextNodeId) {
      // Wait for user response if there are quick replies
      if (message.quickReplies?.length) {
        return; // Wait for user input
      }
      await this.executeFromNode(conversation, flow, node.nextNodeId);
    }
  }

  /**
   * Execute AI response node
   */
  private async executeAINode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { aiResponse } = node.config;
    if (!aiResponse) return;

    // Get recent messages for context
    const recentMessages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: -1 })
      .limit(aiResponse.contextWindow || 10);

    const context = recentMessages
      .reverse()
      .map((m) => `${m.type}: ${m.content.text}`)
      .join('\n');

    // Build prompt with variables
    const variables = this.getVariablesFromContext(conversation, aiResponse.variables || []);
    const systemPrompt = this.interpolateText(aiResponse.systemPrompt, variables);

    try {
      // Call AI service
      const response = await fetch(`${this.HOJAI_AGENTS_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiResponse.model,
          systemPrompt,
          context,
          temperature: aiResponse.temperature,
          maxTokens: aiResponse.maxTokens
        })
      });

      const data = await response.json();
      const aiText = data.response || aiResponse.fallbackMessage || 'I apologize, I could not process your request.';

      const botMsg = new Message({
        messageId: uuidv4(),
        conversationId: conversation._id,
        nodeId: node.id,
        type: 'bot',
        content: { text: aiText },
        timestamp: new Date(),
        metadata: { sessionId: conversation.sessionId }
      });
      await botMsg.save();

      await this.sendToChannel(conversation, botMsg);

      // Handle silence timeout
      if (aiResponse.silenceTimeout && aiResponse.silenceTimeoutMessage) {
        await this.scheduleSilenceTimeout(conversation, node.nextNodeId, aiResponse.silenceTimeout);
      }

    } catch (error) {
      console.error('AI execution error:', error);

      const botMsg = new Message({
        messageId: uuidv4(),
        conversationId: conversation._id,
        nodeId: node.id,
        type: 'bot',
        content: { text: aiResponse.fallbackMessage || 'I apologize, something went wrong.' },
        timestamp: new Date()
      });
      await botMsg.save();

      await this.sendToChannel(conversation, botMsg);
    }

    // Move to next node
    if (node.nextNodeId) {
      await this.executeFromNode(conversation, flow, node.nextNodeId);
    }
  }

  /**
   * Execute condition node
   */
  private async executeConditionNode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { branches, defaultBranchNextNodeId } = node.config;
    if (!branches) {
      if (node.nextNodeId) {
        await this.executeFromNode(conversation, flow, node.nextNodeId);
      }
      return;
    }

    // Evaluate branches in priority order
    for (const branch of branches.sort((a, b) => b.priority - a.priority)) {
      const result = this.evaluateConditions(branch.conditions, conversation.variables as Record<string, any>);
      if (result) {
        await this.executeFromNode(conversation, flow, branch.nextNodeId);
        return;
      }
    }

    // Default branch
    if (defaultBranchNextNodeId) {
      await this.executeFromNode(conversation, flow, defaultBranchNextNodeId);
    }
  }

  /**
   * Execute delay node
   */
  private async executeDelayNode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { delay } = node.config;
    if (!delay) {
      if (node.nextNodeId) {
        await this.executeFromNode(conversation, flow, node.nextNodeId);
      }
      return;
    }

    let delayMs: number;

    switch (delay.type) {
      case 'fixed':
        const value = delay.value || 0;
        const unit = delay.unit || 'seconds';
        delayMs = value * (unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : unit === 'days' ? 86400000 : 1000);
        break;
      case 'random':
        const min = (delay.value || 1) * 1000;
        const max = (delay.value || 5) * 1000 * 2;
        delayMs = Math.floor(Math.random() * (max - min) + min);
        break;
      case 'scheduled':
        // For scheduled, we would need a job queue
        delayMs = 0;
        break;
      default:
        delayMs = 0;
    }

    // Use setTimeout for delays (in production, use a job queue)
    if (delayMs > 0 && node.nextNodeId) {
      setTimeout(async () => {
        await this.executeFromNode(conversation, flow, node.nextNodeId!);
      }, delayMs);
    } else if (node.nextNodeId) {
      await this.executeFromNode(conversation, flow, node.nextNodeId);
    }
  }

  /**
   * Execute action node
   */
  private async executeActionNode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { actions } = node.config;
    if (!actions) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, conversation);
      } catch (error) {
        console.error('Action execution error:', error);
        if (action.onFailure?.goToNodeId) {
          await this.executeFromNode(conversation, flow, action.onFailure.goToNodeId);
          return;
        }
      }
    }

    if (node.nextNodeId && actions.every((a) => a.continueToNext !== false)) {
      await this.executeFromNode(conversation, flow, node.nextNodeId);
    }
  }

  /**
   * Execute webhook node
   */
  private async executeWebhookNode(
    conversation: Conversation,
    node: FlowNode,
    flow: Flow
  ): Promise<void> {
    const { webhook } = node.config;
    if (!webhook) return;

    const variables = conversation.variables as Record<string, any>;
    const body = this.interpolateObject(webhook.bodyTemplate || {}, variables);

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: webhook.method !== 'GET' ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      // Store response in variables
      conversation.variables.set('webhook_response', data);
      await conversation.save();

      if (response.ok && webhook.successNextNodeId) {
        await this.executeFromNode(conversation, flow, webhook.successNextNodeId);
      } else if (!response.ok && webhook.failureNextNodeId) {
        await this.executeFromNode(conversation, flow, webhook.failureNextNodeId);
      } else if (node.nextNodeId) {
        await this.executeFromNode(conversation, flow, node.nextNodeId);
      }
    } catch (error) {
      console.error('Webhook error:', error);
      if (webhook.failureNextNodeId) {
        await this.executeFromNode(conversation, flow, webhook.failureNextNodeId);
      }
    }
  }

  /**
   * Execute handoff node
   */
  private async executeHandoffNode(
    conversation: Conversation,
    node: FlowNode
  ): Promise<void> {
    const { handoff } = node.config;
    if (!handoff) return;

    conversation.status = 'handoff';
    conversation.metadata = {
      ...conversation.metadata,
      handoffPriority: handoff.priority,
      handoffDepartment: handoff.department,
      handoffCustomFields: handoff.customFields,
      handoffSummaryPrompt: handoff.summaryPrompt
    };
    await conversation.save();

    // In production, this would notify the agent dashboard
    console.log(`Conversation ${conversation.sessionId} handed off to agent`);
  }

  /**
   * Execute end node
   */
  private async executeEndNode(conversation: Conversation): Promise<void> {
    conversation.status = 'ended';
    conversation.endedAt = new Date();
    conversation.endedBy = 'bot';
    await conversation.save();
  }

  /**
   * Find next node based on user message
   */
  private async findNextNode(
    flow: Flow,
    currentNode: FlowNode | undefined,
    userMessage: string,
    conversation: Conversation
  ): Promise<FlowNode | undefined> {
    if (!currentNode) {
      // Start of flow - find entry node
      return flow.nodes.find((n) => n.id === flow.entryNodeId);
    }

    // Check if quick reply was selected
    const quickReplyNode = flow.nodes.find(
      (n) => n.config.message?.quickReplies?.some((qr) => qr.id === userMessage)
    );
    if (quickReplyNode) {
      return quickReplyNode;
    }

    // Check if button was clicked
    const buttonNode = flow.nodes.find(
      (n) => n.config.message?.buttons?.some((btn) => btn.id === userMessage)
    );
    if (buttonNode) {
      return buttonNode;
    }

    // Default next node
    return flow.nodes.find((n) => n.id === currentNode.nextNodeId);
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: Condition[],
    variables: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const value = variables[condition.field];
      const compareValue = condition.value;

      let conditionResult: boolean;

      switch (condition.operator) {
        case 'equals':
          conditionResult = value === compareValue;
          break;
        case 'not_equals':
          conditionResult = value !== compareValue;
          break;
        case 'contains':
          conditionResult = String(value).toLowerCase().includes(String(compareValue).toLowerCase());
          break;
        case 'not_contains':
          conditionResult = !String(value).toLowerCase().includes(String(compareValue).toLowerCase());
          break;
        case 'starts_with':
          conditionResult = String(value).toLowerCase().startsWith(String(compareValue).toLowerCase());
          break;
        case 'ends_with':
          conditionResult = String(value).toLowerCase().endsWith(String(compareValue).toLowerCase());
          break;
        case 'greater_than':
          conditionResult = Number(value) > Number(compareValue);
          break;
        case 'less_than':
          conditionResult = Number(value) < Number(compareValue);
          break;
        case 'in':
          conditionResult = Array.isArray(compareValue) && compareValue.includes(value);
          break;
        case 'not_in':
          conditionResult = !Array.isArray(compareValue) || !compareValue.includes(value);
          break;
        case 'has_value':
          conditionResult = value !== undefined && value !== null && value !== '';
          break;
        case 'is_empty':
          conditionResult = value === undefined || value === null || value === '';
          break;
        default:
          conditionResult = false;
      }

      if (i === 0) {
        result = conditionResult;
      } else if (condition.logicalOperator === 'or') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  /**
   * Execute action by type
   */
  private async executeAction(action: any, conversation: Conversation): Promise<void> {
    const { actionType, params } = action;

    switch (actionType) {
      case 'update_variable':
        const varName = params.name as string;
        const varValue = params.value;
        conversation.variables.set(varName, varValue);
        await conversation.save();
        break;

      case 'increment_counter':
        const counterName = params.name as string;
        const current = (conversation.variables.get(counterName) as number) || 0;
        conversation.variables.set(counterName, current + (params.increment as number || 1));
        await conversation.save();
        break;

      case 'add_tag':
        const tags = conversation.tags || [];
        if (!tags.includes(params.tag as string)) {
          conversation.tags = [...tags, params.tag as string];
          await conversation.save();
        }
        break;

      case 'remove_tag':
        conversation.tags = (conversation.tags || []).filter((t) => t !== params.tag);
        await conversation.save();
        break;

      case 'send_webhook':
        await fetch(params.url as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation._id,
            userId: conversation.userId,
            variables: conversation.variables
          })
        });
        break;

      default:
        console.log(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Send message to channel
   */
  private async sendToChannel(conversation: Conversation, message: Message): Promise<void> {
    // In production, this would integrate with WhatsApp, Instagram, etc.
    switch (conversation.channel) {
      case 'whatsapp':
        await this.sendWhatsApp(conversation, message);
        break;
      case 'instagram':
        await this.sendInstagram(conversation, message);
        break;
      default:
        console.log(`Channel ${conversation.channel} not implemented`);
    }
  }

  private async sendWhatsApp(conversation: Conversation, message: Message): Promise<void> {
    try {
      await fetch(`${this.REZ_WHATSAPP_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: conversation.metadata.userPhone,
          message: message.content.text,
          sessionId: conversation.sessionId
        })
      });
    } catch (error) {
      console.error('WhatsApp send error:', error);
    }
  }

  private async sendInstagram(conversation: Conversation, message: Message): Promise<void> {
    // Instagram DM integration would go here
    console.log(`Instagram DM to ${conversation.userId}: ${message.content.text}`);
  }

  /**
   * Interpolate text with variables
   */
  private interpolateText(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }

  /**
   * Interpolate object with variables
   */
  private interpolateObject(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.interpolateText(obj, variables);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObject(item, variables));
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, variables);
      }
      return result;
    }
    return obj;
  }

  /**
   * Get variables from context
   */
  private getVariablesFromContext(conversation: Conversation, keys: string[]): Record<string, any> {
    const vars = conversation.variables as Map<string, any>;
    const result: Record<string, any> = {};
    for (const key of keys) {
      result[key] = vars.get(key);
    }
    return result;
  }

  /**
   * Schedule silence timeout
   */
  private async scheduleSilenceTimeout(
    conversation: Conversation,
    nextNodeId: string,
    timeoutMs: number
  ): Promise<void> {
    setTimeout(async () => {
      const conv = await Conversation.findById(conversation._id);
      if (conv && conv.status === 'active' && conv.currentNodeId === nextNodeId) {
        // User didn't respond, continue to next node
        const bot = await Bot.findById(conv.botId);
        if (bot) {
          const flow = bot.flows.find((f: any) => f.id === conv.flowId);
          if (flow) {
            await this.executeFromNode(conv, flow, nextNodeId);
          }
        }
      }
    }, timeoutMs);
  }
}
