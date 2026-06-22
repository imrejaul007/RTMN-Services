// ============================================================================
// Conversation Context Service - Multi-turn conversations
// ============================================================================

import { Intent } from '../index';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intentId?: string;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: Message[];
  intents: Intent[];
  turnCount: number;
  startedAt: string;
  lastActivityAt: string;
  isActive: boolean;
  metadata: ConversationMetadata;
  state: ConversationState;
}

export interface ConversationMetadata {
  averageResponseTime: number;
  topicHistory: string[];
  entityReferences: Record<string, any>;
  userSatisfaction?: number;
  escalationTriggered: boolean;
  transferCount: number;
}

export interface ConversationState {
  currentTopic?: string;
  pendingEntities: Record<string, any>;
  contextWindow: Message[];
  recentIntents: string[];
  dialogueActs: string[];
  sentiment: SentimentLevel;
  engagement: EngagementLevel;
}

export type SentimentLevel = 'positive' | 'neutral' | 'negative' | 'frustrated';
export type EngagementLevel = 'high' | 'medium' | 'low' | 'bored';

export interface DialogueAct {
  type: 'greeting' | 'question' | 'answer' | 'confirmation' | 'denial' | 'apology' | 'thanks' | 'closing';
  confidence: number;
  triggeredBy?: string;
}

export interface ContextUpdate {
  addMessage?: Message;
  addIntent?: Intent;
  updateState?: Partial<ConversationState>;
  updateMetadata?: Partial<ConversationMetadata>;
}

export interface ConversationQuery {
  userId?: string;
  sessionId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class ConversationContextService {
  private conversations: Map<string, ConversationContext>;
  private contextWindowSize: number;
  private maxConversationAge: number;

  constructor() {
    this.conversations = new Map();
    this.contextWindowSize = 10;
    this.maxConversationAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Create a new conversation
   */
  createConversation(sessionId: string, userId?: string): ConversationContext {
    const now = new Date().toISOString();

    const conversation: ConversationContext = {
      sessionId,
      userId,
      messages: [],
      intents: [],
      turnCount: 0,
      startedAt: now,
      lastActivityAt: now,
      isActive: true,
      metadata: {
        averageResponseTime: 0,
        topicHistory: [],
        entityReferences: {},
        escalationTriggered: false,
        transferCount: 0
      },
      state: {
        pendingEntities: {},
        contextWindow: [],
        recentIntents: [],
        dialogueActs: [],
        sentiment: 'neutral',
        engagement: 'medium'
      }
    };

    this.conversations.set(sessionId, conversation);
    return conversation;
  }

  /**
   * Get conversation by session ID
   */
  getConversation(sessionId: string): ConversationContext | undefined {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      this.updateActivity(sessionId);
    }
    return conversation;
  }

  /**
   * Update conversation context
   */
  updateContext(sessionId: string, update: ContextUpdate): ConversationContext | null {
    let conversation = this.conversations.get(sessionId);

    if (!conversation) {
      conversation = this.createConversation(sessionId);
    }

    // Add message
    if (update.addMessage) {
      conversation.messages.push(update.addMessage);
      conversation.turnCount++;
      this.updateContextWindow(conversation, update.addMessage);
      this.detectDialogueAct(conversation, update.addMessage);
    }

    // Add intent
    if (update.addIntent) {
      conversation.intents.push(update.addIntent);
      conversation.state.recentIntents.push(update.addIntent.id);
      if (conversation.state.recentIntents.length > 5) {
        conversation.state.recentIntents.shift();
      }
    }

    // Update state
    if (update.updateState) {
      conversation.state = { ...conversation.state, ...update.updateState };
    }

    // Update metadata
    if (update.updateMetadata) {
      conversation.metadata = { ...conversation.metadata, ...update.updateMetadata };
    }

    conversation.lastActivityAt = new Date().toISOString();
    this.conversations.set(sessionId, conversation);

    return conversation;
  }

  /**
   * Add a message to conversation
   */
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    this.updateContext(sessionId, { addMessage: fullMessage });
    return fullMessage;
  }

  /**
   * Get messages within a time window
   */
  getRecentMessages(sessionId: string, count: number = 10): Message[] {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return [];

    return conversation.messages.slice(-count);
  }

  /**
   * Get context window for LLM
   */
  getContextForLLM(sessionId: string): {
    systemPrompt: string;
    conversationHistory: Message[];
    currentState: ConversationState;
    relevantEntities: Record<string, any>;
  } {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      return {
        systemPrompt: this.generateSystemPrompt(),
        conversationHistory: [],
        currentState: { pendingEntities: {}, contextWindow: [], recentIntents: [], dialogueActs: [], sentiment: 'neutral', engagement: 'medium' },
        relevantEntities: {}
      };
    }

    return {
      systemPrompt: this.generateSystemPrompt(),
      conversationHistory: conversation.state.contextWindow,
      currentState: conversation.state,
      relevantEntities: conversation.metadata.entityReferences
    };
  }

  /**
   * Search conversations
   */
  searchConversations(query: ConversationQuery): ConversationContext[] {
    let results = Array.from(this.conversations.values());

    if (query.userId) {
      results = results.filter(c => c.userId === query.userId);
    }

    if (query.sessionId) {
      results = results.filter(c => c.sessionId === query.sessionId);
    }

    if (query.activeOnly) {
      results = results.filter(c => c.isActive);
    }

    // Sort by last activity
    results.sort((a, b) =>
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get conversation summary
   */
  getSummary(sessionId: string): {
    sessionId: string;
    turnCount: number;
    duration: number;
    topics: string[];
    sentiment: SentimentLevel;
    engagement: EngagementLevel;
    hasEscalation: boolean;
  } | null {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return null;

    return {
      sessionId,
      turnCount: conversation.turnCount,
      duration: new Date(conversation.lastActivityAt).getTime() - new Date(conversation.startedAt).getTime(),
      topics: conversation.metadata.topicHistory,
      sentiment: conversation.state.sentiment,
      engagement: conversation.state.engagement,
      hasEscalation: conversation.metadata.escalationTriggered
    };
  }

  /**
   * Detect topic from conversation
   */
  detectTopic(sessionId: string): string | undefined {
    const conversation = this.conversations.get(sessionId);
    if (!conversation || conversation.messages.length === 0) return undefined;

    // Simple keyword-based topic detection
    const recentMessages = conversation.messages.slice(-5);
    const allText = recentMessages.map(m => m.content.toLowerCase()).join(' ');

    const topicKeywords: Record<string, string[]> = {
      'product_inquiry': ['product', 'item', 'buy', 'price', 'available'],
      'order_status': ['order', 'delivery', 'shipping', 'tracking', 'arrived'],
      'returns': ['return', 'refund', 'exchange', 'wrong', 'damaged'],
      'technical_support': ['error', 'bug', 'issue', 'problem', 'not working'],
      'account': ['account', 'login', 'password', 'profile', 'settings'],
      'payment': ['payment', 'card', 'billing', 'invoice', 'charge']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matchCount = keywords.filter(k => allText.includes(k)).length;
      if (matchCount >= 2) {
        return topic;
      }
    }

    return 'general';
  }

  /**
   * Update sentiment
   */
  updateSentiment(sessionId: string, sentiment: SentimentLevel): void {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.state.sentiment = sentiment;
      this.conversations.set(sessionId, conversation);
    }
  }

  /**
   * Trigger escalation
   */
  triggerEscalation(sessionId: string, reason: string): void {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.metadata.escalationTriggered = true;
      conversation.metadata.transferCount++;
      conversation.metadata.entityReferences.escalationReason = reason;
      this.conversations.set(sessionId, conversation);
    }
  }

  /**
   * End conversation
   */
  endConversation(sessionId: string): void {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.isActive = false;
      this.conversations.set(sessionId, conversation);
    }
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations(): number {
    const cutoffTime = Date.now() - this.maxConversationAge;
    let cleanedCount = 0;

    this.conversations.forEach((conversation, sessionId) => {
      if (new Date(conversation.lastActivityAt).getTime() < cutoffTime) {
        this.conversations.delete(sessionId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  /**
   * Get active conversation count
   */
  getActiveCount(): number {
    return Array.from(this.conversations.values()).filter(c => c.isActive).length;
  }

  // Private helper methods

  private updateActivity(sessionId: string): void {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.lastActivityAt = new Date().toISOString();
      this.conversations.set(sessionId, conversation);
    }
  }

  private updateContextWindow(conversation: ConversationContext, message: Message): void {
    conversation.state.contextWindow.push(message);

    // Keep window size limited
    if (conversation.state.contextWindow.length > this.contextWindowSize) {
      conversation.state.contextWindow = conversation.state.contextWindow.slice(-this.contextWindowSize);
    }
  }

  private detectDialogueAct(conversation: ConversationContext, message: Message): void {
    const content = message.content.toLowerCase();
    let actType: DialogueAct['type'] | null = null;
    let confidence = 0.8;

    // Greeting detection
    if (conversation.turnCount === 1 && /^(hi|hello|hey|greetings)/.test(content)) {
      actType = 'greeting';
    }
    // Question detection
    else if (/^(what|how|why|when|where|who|can|could|would|is|are|do|does)/.test(content) || content.includes('?')) {
      actType = 'question';
    }
    // Confirmation detection
    else if (/^(yes|yeah|yep|correct|right|exactly|confirmed|agreed)/.test(content)) {
      actType = 'confirmation';
    }
    // Denial detection
    else if (/^(no|nope|nah|not|nothing|wrong|incorrect)/.test(content)) {
      actType = 'denial';
    }
    // Thanks detection
    else if (/thank|thanks|appreciate|grateful/i.test(content)) {
      actType = 'thanks';
    }
    // Closing detection
    else if (/bye|goodbye|see you|closing|end|finish/i.test(content)) {
      actType = 'closing';
    }

    if (actType) {
      conversation.state.dialogueActs.push(actType);
      if (conversation.state.dialogueActs.length > 10) {
        conversation.state.dialogueActs.shift();
      }
    }
  }

  private generateSystemPrompt(): string {
    return `You are a helpful assistant in the SUTAR Intent Bus system.
Your role is to assist users with their intents, provide relevant information,
and guide them through their tasks efficiently.

Key capabilities:
- Intent classification and routing
- Context-aware responses
- Entity extraction
- Multi-turn conversation support

Always be helpful, professional, and concise in your responses.`;
  }
}

// Export singleton instance
export const conversationContextService = new ConversationContextService();
