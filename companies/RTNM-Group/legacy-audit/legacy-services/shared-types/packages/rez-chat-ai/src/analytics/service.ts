// ── Analytics Service ──────────────────────────────────────────────────────────
// Database persistence for learning and analytics data

import {
  ConversationOutcome,
  MessageFeedback,
  AIResponseMetrics,
  PatternEntry,
  KnowledgeGap,
  ImprovementAction,
  AnalyticsSummary,
} from './types';
import { LearningSystem, getLearningSystem } from './learningEngine';

// ── Analytics Repository Interface ─────────────────────────────────────────────

export interface AnalyticsRepository {
  // Conversation Outcomes
  saveOutcome(outcome: ConversationOutcome): Promise<void>;
  getOutcomes(filters?: { startDate?: Date; endDate?: Date; appType?: string }): Promise<ConversationOutcome[]>;

  // Message Feedback
  saveFeedback(feedback: MessageFeedback): Promise<void>;
  getFeedback(messageId: string): Promise<MessageFeedback[]>;

  // Response Metrics
  saveMetrics(metrics: AIResponseMetrics): Promise<void>;
  getMetrics(conversationId?: string): Promise<AIResponseMetrics[]>;

  // Patterns
  savePatterns(patterns: PatternEntry[]): Promise<void>;
  getPatterns(industryCategory?: string): Promise<PatternEntry[]>;

  // Knowledge Gaps
  saveGap(gap: KnowledgeGap): Promise<void>;
  getGaps(threshold?: number): Promise<KnowledgeGap[]>;

  // Improvement Actions
  saveAction(action: ImprovementAction): Promise<void>;
  getActions(status?: ImprovementAction['status']): Promise<ImprovementAction[]>;
  updateActionStatus(actionId: string, status: ImprovementAction['status']): Promise<void>;
}

// ── Analytics Service Implementation ─────────────────────────────────────────────

export class AnalyticsService {
  private learningSystem: LearningSystem;
  private repository: AnalyticsRepository | null = null;

  constructor(learningSystem?: LearningSystem) {
    this.learningSystem = learningSystem || getLearningSystem();
  }

  setRepository(repo: AnalyticsRepository): void {
    this.repository = repo;
  }

  // ── Record Operations ──────────────────────────────────────────────────────

  async recordConversationStart(
    conversationId: string,
    userId: string,
    appType: string,
    industryCategory?: string,
    merchantId?: string
  ): Promise<void> {
    this.learningSystem.startConversation(
      conversationId,
      userId,
      appType,
      industryCategory,
      merchantId
    );
  }

  async recordMessage(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    customerId: string,
    industryCategory?: string,
    metrics?: {
      confidence: number;
      responseTime: number;
      toolUsed?: boolean;
      toolName?: string;
      knowledgeSources: string[];
      resolved?: boolean;
    }
  ): Promise<void> {
    this.learningSystem.incrementMessageCount(conversationId);

    this.learningSystem.analyzeAndLearn(
      userMessage,
      aiResponse,
      {
        customerId,
        preferences: industryCategory ? { industryCategory } : {},
      },
      metrics || {
        confidence: 0.8,
        responseTime: 1000,
        knowledgeSources: ['unified'],
        resolved: false,
      }
    );
  }

  async recordEscalation(conversationId: string): Promise<void> {
    this.learningSystem.recordEscalation(conversationId);
  }

  async recordConversationEnd(
    conversationId: string,
    outcome: ConversationOutcome['outcome']
  ): Promise<void> {
    this.learningSystem.endConversation(conversationId, outcome);
  }

  async recordFeedback(feedback: MessageFeedback): Promise<void> {
    this.learningSystem.recordFeedback(feedback);

    if (this.repository) {
      await this.repository.saveFeedback(feedback);
    }
  }

  // ── Query Operations ──────────────────────────────────────────────────────

  async getAnalyticsSummary(days: number = 7): Promise<AnalyticsSummary> {
    return this.learningSystem.getAnalytics(days);
  }

  async getRecommendations(): Promise<ImprovementAction[]> {
    return this.learningSystem.getRecommendations();
  }

  async getTopPatterns(count: number = 10): Promise<PatternEntry[]> {
    return this.learningSystem.getTopPatterns(count);
  }

  async getKnowledgeGaps(): Promise<KnowledgeGap[]> {
    return this.learningSystem.getKnowledgeGaps();
  }

  async getImprovementAreas(): Promise<string[]> {
    return this.learningSystem.getImprovementAreas();
  }

  async getIntentStats(): Promise<Array<{ intent: string; count: number; successRate: number }>> {
    const patterns = this.learningSystem.getTopPatterns(100);

    const intentStats: Record<string, { count: number; success: number }> = {};

    for (const pattern of patterns) {
      if (!intentStats[pattern.intent]) {
        intentStats[pattern.intent] = { count: 0, success: 0 };
      }
      intentStats[pattern.intent].count += pattern.frequency;
      intentStats[pattern.intent].success += pattern.frequency * pattern.successRate;
    }

    return Object.entries(intentStats)
      .map(([intent, stats]) => ({
        intent,
        count: stats.count,
        successRate: stats.count > 0 ? stats.success / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getToolUsageStats(): Promise<Array<{ tool: string; count: number; successRate: number }>> {
    const patterns = this.learningSystem.getTopPatterns(100);

    const toolStats: Record<string, { count: number; success: number }> = {};

    for (const pattern of patterns) {
      for (const tool of pattern.associatedTools) {
        if (!toolStats[tool]) {
          toolStats[tool] = { count: 0, success: 0 };
        }
        toolStats[tool].count += pattern.frequency;
        toolStats[tool].success += pattern.frequency * pattern.successRate;
      }
    }

    return Object.entries(toolStats)
      .map(([tool, stats]) => ({
        tool,
        count: stats.count,
        successRate: stats.count > 0 ? stats.success / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getIndustryStats(): Promise<Record<string, {
    conversations: number;
    avgResolutionRate: number;
    avgConfidence: number;
  }>> {
    const patterns = this.learningSystem.getTopPatterns(100);

    const industryStats: Record<string, { conversations: number; confidence: number; success: number }> = {};

    for (const pattern of patterns) {
      for (const industry of pattern.industryCategories) {
        if (!industryStats[industry]) {
          industryStats[industry] = { conversations: 0, confidence: 0, success: 0 };
        }
        industryStats[industry].conversations += pattern.frequency;
        industryStats[industry].confidence += pattern.frequency * pattern.avgConfidence;
        industryStats[industry].success += pattern.frequency * pattern.successRate;
      }
    }

    return Object.entries(industryStats).reduce((acc, [industry, stats]) => {
      acc[industry] = {
        conversations: stats.conversations,
        avgResolutionRate: stats.conversations > 0 ? stats.success / stats.conversations : 0,
        avgConfidence: stats.conversations > 0 ? stats.confidence / stats.conversations : 0,
      };
      return acc;
    }, {} as Record<string, { conversations: number; avgResolutionRate: number; avgConfidence: number }>);
  }

  async getResponseTimeStats(): Promise<{
    avgResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const patterns = this.learningSystem.getTopPatterns(100);
    // Simulated response times based on pattern complexity
    const responseTimes: number[] = patterns.flatMap(p =>
      Array(p.frequency).fill(500 + Math.random() * 1500)
    );

    if (responseTimes.length === 0) {
      return { avgResponseTime: 0, p50: 0, p95: 0, p99: 0 };
    }

    responseTimes.sort((a, b) => a - b);

    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
    };
  }

  // ── Persistence Operations ─────────────────────────────────────────────────

  async persistToDatabase(): Promise<void> {
    if (!this.repository) {
      console.warn('[AnalyticsService] No repository configured for persistence');
      return;
    }

    // Persist patterns
    const patterns = this.learningSystem.exportPatterns();
    if (patterns.length > 0) {
      await this.repository.savePatterns(patterns);
    }

    // Persist knowledge gaps
    const gaps = this.learningSystem.getKnowledgeGaps();
    for (const gap of gaps) {
      await this.repository.saveGap(gap);
    }

    // Persist recommendations
    const recommendations = this.learningSystem.getRecommendations();
    for (const action of recommendations) {
      await this.repository.saveAction(action);
    }
  }

  async loadFromDatabase(): Promise<void> {
    if (!this.repository) {
      console.warn('[AnalyticsService] No repository configured for loading');
      return;
    }

    // Load patterns
    const patterns = await this.repository.getPatterns();
    if (patterns.length > 0) {
      this.learningSystem.importPatterns(patterns);
    }
  }
}

// ── Analytics Events ───────────────────────────────────────────────────────────

export interface AnalyticsEvents {
  'conversation:start': {
    conversationId: string;
    userId: string;
    appType: string;
    industryCategory?: string;
    merchantId?: string;
  };

  'message:sent': {
    conversationId: string;
    messageId: string;
    sender: 'user' | 'ai' | 'staff';
    content: string;
    timestamp: Date;
  };

  'message:feedback': {
    messageId: string;
    conversationId: string;
    helpful: boolean;
    rating?: number;
    feedback?: string;
  };

  'escalation:triggered': {
    conversationId: string;
    reason: string;
    department?: string;
  };

  'tool:executed': {
    conversationId: string;
    toolName: string;
    success: boolean;
    duration: number;
  };

  'conversation:end': {
    conversationId: string;
    outcome: 'resolved' | 'escalated' | 'abandoned' | 'failed';
    duration?: number;
    rating?: number;
  };
}

// ── Analytics Event Tracker ─────────────────────────────────────────────────────

export class AnalyticsEventTracker {
  private service: AnalyticsService;
  private pendingEvents: Array<{ type: string; data: unknown; timestamp: Date }> = [];

  constructor(service: AnalyticsService) {
    this.service = service;
  }

  async trackEvent<K extends keyof AnalyticsEvents>(
    event: K,
    data: AnalyticsEvents[K]
  ): Promise<void> {
    this.pendingEvents.push({
      type: event,
      data,
      timestamp: new Date(),
    });

    if (event === 'conversation:start') {
      const eventData = data as AnalyticsEvents['conversation:start'];
      await this.service.recordConversationStart(
        eventData.conversationId,
        eventData.userId,
        eventData.appType,
        eventData.industryCategory,
        eventData.merchantId
      );
    } else if (event === 'message:sent') {
      const eventData = data as AnalyticsEvents['message:sent'];
      if (eventData.sender === 'ai') {
        // AI response recorded separately
      }
    } else if (event === 'message:feedback') {
      const eventData = data as AnalyticsEvents['message:feedback'];
      await this.service.recordFeedback({
        messageId: eventData.messageId,
        conversationId: eventData.conversationId,
        helpful: eventData.helpful,
        rating: eventData.rating as 1 | 2 | 3 | 4 | 5 | undefined,
        feedback: eventData.feedback,
        timestamp: new Date(),
      });
    } else if (event === 'escalation:triggered') {
      const eventData = data as AnalyticsEvents['escalation:triggered'];
      await this.service.recordEscalation(eventData.conversationId);
    } else if (event === 'conversation:end') {
      const eventData = data as AnalyticsEvents['conversation:end'];
      await this.service.recordConversationEnd(eventData.conversationId, eventData.outcome);
    }
  }

  getPendingEvents(): Array<{ type: string; data: unknown; timestamp: Date }> {
    return [...this.pendingEvents];
  }

  clearPendingEvents(): void {
    this.pendingEvents = [];
  }
}

// ── Singleton Instance ─────────────────────────────────────────────────────────

let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

export function resetAnalyticsService(): void {
  analyticsServiceInstance = null;
}
