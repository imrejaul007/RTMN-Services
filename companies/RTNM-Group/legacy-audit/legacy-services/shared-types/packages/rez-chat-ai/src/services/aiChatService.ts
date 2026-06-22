// ── AI Chat Service ───────────────────────────────────────────────────────────────
// Main service integrating all AI chat components

import {
  AppType,
  IndustryCategory,
  AIChatRequest,
  AIChatResponse,
  AIChatMessage,
  CustomerContext,
  AIAction,
} from '../types';
import { AIChatHandler, AIHandlerConfig, createAIHandler } from '../handlers/aiHandler';
import { createKnowledgeBase, MerchantKnowledgeData } from '../knowledge/providers';
import { defaultSanitizer, DataSanitizer } from '../sanitizers/sanitize';

export interface AIChatServiceConfig {
  appType: AppType;
  industryCategory?: IndustryCategory;
  merchantId?: string;
  merchantData?: MerchantKnowledgeData;
  enableAutoReply?: boolean;
  autoReplyDelay?: number;
  enableSuggestions?: boolean;
  maxSuggestions?: number;
  enableToolUse?: boolean;
  confidenceThreshold?: number;
  escalationKeywords?: string[];
  apiKey?: string;
}

export interface ChatContext {
  conversationId: string;
  userId: string;
  customerContext?: CustomerContext;
  chatHistory: AIChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export class AIChatService {
  private handlers: Map<string, AIChatHandler> = new Map();
  private contexts: Map<string, ChatContext> = new Map();
  private sanitizer: DataSanitizer;
  private config: AIChatServiceConfig;

  constructor(config: AIChatServiceConfig) {
    this.config = {
      enableAutoReply: true,
      autoReplyDelay: 1000,
      enableSuggestions: true,
      maxSuggestions: 3,
      enableToolUse: true,
      confidenceThreshold: 0.7,
      escalationKeywords: [
        'manager', 'supervisor', 'human', 'real person', 'person',
        'complaint', 'refund now', 'cancel everything', 'lawsuit', 'lawyer'
      ],
      ...config,
    };

    this.sanitizer = new DataSanitizer();
  }

  // ── Session Management ────────────────────────────────────────────────────────

  createSession(conversationId: string, userId: string, customerContext?: CustomerContext): ChatContext {
    const context: ChatContext = {
      conversationId,
      userId,
      customerContext,
      chatHistory: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.contexts.set(conversationId, context);
    return context;
  }

  getSession(conversationId: string): ChatContext | undefined {
    return this.contexts.get(conversationId);
  }

  updateSession(conversationId: string, updates: Partial<ChatContext>): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      Object.assign(context, updates, { lastActivity: new Date() });
    }
  }

  deleteSession(conversationId: string): void {
    this.contexts.delete(conversationId);
    this.handlers.delete(conversationId);
  }

  // ── Handler Management ────────────────────────────────────────────────────────

  private getOrCreateHandler(conversationId: string, customerContext?: CustomerContext): AIChatHandler {
    let handler = this.handlers.get(conversationId);

    if (!handler) {
      const handlerConfig: AIHandlerConfig = {
        appType: this.config.appType,
        industryCategory: this.config.industryCategory,
        merchantId: this.config.merchantId,
        merchantData: this.config.merchantData,
        customerContext,
        enableToolUse: this.config.enableToolUse,
        confidenceThreshold: this.config.confidenceThreshold,
        escalationKeywords: this.config.escalationKeywords,
        apiKey: this.config.apiKey,
      };
      handler = createAIHandler(handlerConfig);
      this.handlers.set(conversationId, handler);
    }

    return handler;
  }

  // ── Message Processing ────────────────────────────────────────────────────────

  async processMessage(request: AIChatRequest): Promise<AIChatResponse> {
    const { conversationId, message, customerContext, chatHistory } = request;

    // Get or create session context
    let context = this.getSession(conversationId);
    if (!context) {
      context = this.createSession(conversationId, request.userId, customerContext);
    }

    // Update context with latest customer context
    if (customerContext) {
      context.customerContext = customerContext;
    }

    // Sanitize incoming message
    const sanitizedMessage = this.sanitizer.sanitizeChatMessage(message);

    // Get or create handler
    const handler = this.getOrCreateHandler(conversationId, context.customerContext);

    // Build chat history
    const fullHistory: AIChatMessage[] = [
      ...(context.chatHistory),
      ...(chatHistory || []),
    ];

    // Process the request
    const response = await handler.handleMessage({
      ...request,
      message: sanitizedMessage,
      chatHistory: fullHistory,
    });

    // Add AI response to history
    const aiMessage: AIChatMessage = {
      id: `ai_${Date.now()}`,
      conversationId,
      sender: 'ai',
      content: response.message,
      timestamp: new Date(),
      metadata: {
        isAutomated: true,
        confidence: response.confidence,
        suggestions: response.suggestions,
        toolsUsed: response.actions?.map(a => a.type),
      },
    };

    context.chatHistory.push(aiMessage);
    this.updateSession(conversationId, context);

    // Generate suggestions if enabled
    if (this.config.enableSuggestions && (!response.suggestions || response.suggestions.length === 0)) {
      response.suggestions = this.generateSuggestions(sanitizedMessage, response, context.customerContext);
    }

    return response;
  }

  // ── Suggestion Generation ─────────────────────────────────────────────────────

  private generateSuggestions(
    message: string,
    response: AIChatResponse,
    context?: CustomerContext
  ): string[] {
    const suggestions: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Context-aware suggestions based on conversation and customer profile
    if (context?.tier) {
      suggestions.push(`View ${context.tier} benefits`);
    }

    // Booking-related suggestions
    if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
      suggestions.push('Check availability');
      suggestions.push('View current offers');
    }

    // Order-related suggestions
    if (lowerMessage.includes('order') || lowerMessage.includes('food')) {
      suggestions.push('View menu');
      suggestions.push('Popular items');
    }

    // Room service suggestions
    if (lowerMessage.includes('room') || lowerMessage.includes('service')) {
      suggestions.push('Order room service');
      suggestions.push('Request housekeeping');
    }

    // General fallback suggestions
    if (suggestions.length === 0) {
      suggestions.push('Track my order');
      suggestions.push('View my bookings');
      suggestions.push('Contact support');
    }

    return suggestions.slice(0, this.config.maxSuggestions || 3);
  }

  // ── Tool Execution ────────────────────────────────────────────────────────────

  async executeAction(
    conversationId: string,
    action: AIAction,
    customerContext: CustomerContext
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    const handler = this.handlers.get(conversationId);

    if (!handler) {
      return { success: false, message: 'Session not found' };
    }

    const toolName = this.mapActionToTool(action.type);
    if (!toolName) {
      return { success: false, message: `Unknown action type: ${action.type}` };
    }

    try {
      const result = await handler.executeTool(toolName, action.data, customerContext);

      if (result.success) {
        return {
          success: true,
          message: result.data ? String((result.data as { message?: string }).message || 'Action completed successfully') : 'Action completed successfully',
          data: result.data,
        };
      } else {
        return {
          success: false,
          message: result.error || 'Action failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  private mapActionToTool(actionType: AIAction['type']): string | null {
    const actionMap: Record<AIAction['type'], string | null> = {
      create_booking: 'create_hotel_booking',
      place_order: 'place_order',
      send_to_staff: 'escalate_to_staff',
      provide_info: null,
      suggest_product: null,
      escalate: 'escalate_to_staff',
    };
    return actionMap[actionType] || null;
  }

  // ── Typing Indicator Simulation ───────────────────────────────────────────────

  async *streamResponse(request: AIChatRequest): AsyncGenerator<string, void, unknown> {
    const response = await this.processMessage(request);

    // Simulate streaming by yielding words
    const words = response.message.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield words.slice(0, i + 1).join(' ') + (i < words.length - 1 ? ' ' : '');
      // Small delay to simulate typing
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  // ── Context Management ────────────────────────────────────────────────────────

  getContextForCustomer(customerId: string): CustomerContext | undefined {
    for (const context of this.contexts.values()) {
      if (context.customerContext?.customerId === customerId) {
        return context.customerContext;
      }
    }
    return undefined;
  }

  updateCustomerContext(conversationId: string, context: Partial<CustomerContext>): void {
    const session = this.contexts.get(conversationId);
    if (session && session.customerContext) {
      session.customerContext = { ...session.customerContext, ...context };
      this.updateSession(conversationId, session);
    }
  }

  // ── History Management ────────────────────────────────────────────────────────

  getConversationHistory(conversationId: string, limit?: number): AIChatMessage[] {
    const context = this.contexts.get(conversationId);
    if (!context) return [];

    const history = context.chatHistory;
    return limit ? history.slice(-limit) : history;
  }

  clearConversationHistory(conversationId: string): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.chatHistory = [];
      this.updateSession(conversationId, context);
    }
  }

  // ── Sensitive Data Helpers ─────────────────────────────────────────────────────

  sanitizeForLogging(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.sanitizer.sanitize(data);
    }
    if (typeof data === 'object' && data !== null) {
      return this.sanitizer.sanitizeObject(data as Record<string, unknown>);
    }
    return data;
  }

  // ── Configuration ─────────────────────────────────────────────────────────────

  updateConfig(updates: Partial<AIChatServiceConfig>): void {
    Object.assign(this.config, updates);
  }

  getConfig(): Readonly<AIChatServiceConfig> {
    return { ...this.config };
  }
}

// ── Factory Function ─────────────────────────────────────────────────────────────

export function createAIChatService(config: AIChatServiceConfig): AIChatService {
  return new AIChatService(config);
}

// ── Default Export ───────────────────────────────────────────────────────────────

export default AIChatService;
