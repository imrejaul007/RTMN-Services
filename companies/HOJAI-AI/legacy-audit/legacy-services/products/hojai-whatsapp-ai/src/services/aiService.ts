import { KnowledgeBaseModel, AutomationRuleModel } from './conversationService.js';

export class AIService {
  /**
   * Generate AI response based on context
   */
  async generateResponse(params: {
    tenantId: string;
    merchantId: string;
    userMessage: string;
    conversationHistory: Array<{ role: string; content: string }>;
    customerContext?: Record<string, unknown>;
  }): Promise<{
    response: string;
    intent: string;
    confidence: number;
    suggestedActions?: string[];
  }> {
    const { tenantId, merchantId, userMessage, conversationHistory, customerContext } = params;

    // 1. Detect intent
    const intentResult = await this.detectIntent(tenantId, merchantId, userMessage);

    // 2. Find knowledge base answer
    const kbAnswer = await this.findKnowledgeAnswer(tenantId, merchantId, userMessage, intentResult.intent);

    // 3. Check automation rules
    const automationAction = await this.checkAutomation(tenantId, merchantId, intentResult.intent, customerContext);

    // 4. Generate response
    let response: string;
    let suggestedActions: string[] | undefined;

    if (automationAction) {
      response = automationAction.response;
      suggestedActions = automationAction.actions;
    } else if (kbAnswer) {
      response = kbAnswer;
    } else {
      response = this.generateFallbackResponse(userMessage, customerContext);
    }

    return {
      response,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      suggestedActions
    };
  }

  private async detectIntent(tenantId: string, merchantId: string, message: string): Promise<{ intent: string; confidence: number }> {
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based intent detection
    // In production, use ML model
    const intentPatterns: Record<string, string[]> = {
      'order': ['order', 'buy', 'purchase', 'place order', 'want to order', 'i need', 'get me'],
      'booking': ['book', 'reservation', 'schedule', 'appointment', 'table for', 'slot'],
      'support': ['help', 'issue', 'problem', 'not working', 'broken', 'refund', 'cancel', 'return'],
      'menu': ['menu', 'what do you have', 'items', 'dishes', 'food options'],
      'hours': ['open', 'closed', 'timing', 'hours', 'when'],
      'location': ['address', 'where', 'location', 'directions', 'near me'],
      'price': ['price', 'cost', 'how much', 'rate', 'rupees', '₹'],
      'feedback': ['feedback', 'review', 'rating', 'suggestion'],
      'greeting': ['hi', 'hello', 'hey', 'good morning', 'good evening'],
      'thanks': ['thank', 'thanks', 'appreciate']
    };

    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(kw => lowerMessage.includes(kw))) {
        return { intent, confidence: 0.85 };
      }
    }

    return { intent: 'unknown', confidence: 0.3 };
  }

  private async findKnowledgeAnswer(tenantId: string, merchantId: string, message: string, intent: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase();

    // Find matching KB items
    const items = await KnowledgeBaseModel.find({
      tenantId,
      merchantId,
      active: true,
      $or: [
        { keywords: { $in: lowerMessage.split(' ') } },
        { intents: intent }
      ]
    }).limit(5);

    if (items.length === 0) return null;

    // Score items by relevance
    const scored = items.map(item => {
      let score = 0;
      const keywords = item.keywords || [];
      const intents = item.intents || [];

      // Check keyword match
      keywords.forEach((kw: string) => {
        if (lowerMessage.includes(kw.toLowerCase())) score += 2;
      });

      // Check intent match
      if (intents.includes(intent)) score += 3;

      return { item, score };
    }).filter(s => s.score > 0);

    if (scored.length === 0) return null;

    // Return best match
    scored.sort((a, b) => b.score - a.score);
    const bestMatch = scored[0].item;

    // Increment usage
    await KnowledgeBaseModel.updateOne({ _id: bestMatch._id }, { $inc: { usageCount: 1 } });

    return bestMatch.answer;
  }

  private async checkAutomation(
    tenantId: string,
    merchantId: string,
    intent: string,
    context?: Record<string, unknown>
  ): Promise<{ response: string; actions?: string[] } | null> {
    const rules = await AutomationRuleModel.find({
      tenantId,
      merchantId,
      active: true,
      'trigger.type': 'intent',
      'trigger.config.intent': intent
    }).sort({ priority: -1 });

    if (rules.length === 0) return null;

    const rule = rules[0];

    // Check conditions
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMet = rule.conditions.every(cond => {
        const value = context?.[cond.field as string];
        switch (cond.operator) {
          case 'equals': return value === cond.value;
          case 'contains': return String(value || '').includes(String(cond.value || ''));
          case 'greater_than': return Number(value) > Number(cond.value);
          case 'less_than': return Number(value) < Number(cond.value);
          default: return false;
        }
      });

      if (!conditionsMet) return null;
    }

    // Increment stats
    await AutomationRuleModel.updateOne({ _id: rule._id }, { $inc: { 'stats.triggers': 1 } });

    // Find reply action
    const replyAction = rule.actions.find(a => a.type === 'reply');
    if (replyAction && replyAction.config) {
      const config = replyAction.config as unknown as Record<string, unknown>;
      const actions: string[] = [];
      rule.actions.forEach(a => {
        if (a.type !== 'reply' && a.type) {
          actions.push(a.type);
        }
      });
      return {
        response: String(config.message || 'Thank you for your message'),
        actions
      };
    }

    return null;
  }

  private generateFallbackResponse(message: string, context?: Record<string, unknown>): string {
    const customerName = context?.customerName as string;
    const nameGreeting = customerName ? ` ${customerName}` : '';

    // Generic fallbacks based on message length and complexity
    if (message.length < 20) {
      return `Thanks for your message${nameGreeting}! I'd be happy to help. Could you please provide more details about what you're looking for?`;
    }

    return `Thanks for reaching out${nameGreeting}! I've received your message and will get back to you shortly with more information. Is there anything specific you'd like to know in the meantime?`;
  }

  /**
   * Generate personalized greeting based on time and context
   */
  generateGreeting(context?: { customerName?: string; isReturning?: boolean; lastVisit?: Date }): string {
    const hour = new Date().getHours();
    let timeGreeting: string;

    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const namePart = context?.customerName ? `, ${context.customerName}` : '';

    if (context?.isReturning && context?.customerName) {
      return `${timeGreeting}${namePart}! Welcome back! How can I help you today?`;
    }

    return `${timeGreeting}${namePart}! Welcome to our business! How can I assist you today?`;
  }
}

export const aiService = new AIService();
