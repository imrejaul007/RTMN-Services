// ── ReZ Agent OS - Analytics ────────────────────────────────────────────────────
// Agent metrics tracking and reporting

import { logger } from '../logger';

export interface AgentMetrics {
  conversationId: string;
  userId: string;
  appType: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  messageCount: number;
  toolCalls: ToolCallMetric[];
  escalations: number;
  satisfaction?: number;
}

export interface ToolCallMetric {
  toolName: string;
  calledAt: Date;
  duration: number;
  success: boolean;
  error?: string;
}

export interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  avgSessionDuration: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  toolUsageStats: Record<string, number>;
  escalationRate: number;
  topTools: Array<{ tool: string; count: number }>;
  appTypeDistribution: Record<string, number>;
  hourlyActivity: number[];
}

export class AgentAnalytics {
  private sessions: Map<string, AgentMetrics> = new Map();
  private toolUsage: Map<string, number> = new Map();

  // ── Session Management ────────────────────────────────────────────────────────

  startSession(conversationId: string, userId: string, appType: string): void {
    const metrics: AgentMetrics = {
      conversationId,
      userId,
      appType,
      startedAt: new Date(),
      messageCount: 0,
      toolCalls: [],
      escalations: 0,
    };
    this.sessions.set(conversationId, metrics);
    logger.debug('[Analytics] Session started', { conversationId, userId, appType });
  }

  endSession(conversationId: string, satisfaction?: number): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    session.endedAt = new Date();
    session.duration = session.endedAt.getTime() - session.startedAt.getTime();
    session.satisfaction = satisfaction;

    logger.debug('[Analytics] Session ended', {
      conversationId,
      duration: session.duration,
      messageCount: session.messageCount,
      toolCalls: session.toolCalls.length,
    });
  }

  // ── Message Tracking ─────────────────────────────────────────────────────────

  trackMessage(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      session.messageCount++;
    }
  }

  // ── Tool Call Tracking ───────────────────────────────────────────────────────

  trackToolCall(
    conversationId: string,
    toolName: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      session.toolCalls.push({
        toolName,
        calledAt: new Date(),
        duration,
        success,
        error,
      });
    }

    // Aggregate tool usage
    const count = this.toolUsage.get(toolName) || 0;
    this.toolUsage.set(toolName, count + 1);
  }

  // ── Escalation Tracking ─────────────────────────────────────────────────────

  trackEscalation(conversationId: string): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      session.escalations++;
    }
  }

  // ── Session Retrieval ─────────────────────────────────────────────────────────

  getSession(conversationId: string): AgentMetrics | undefined {
    return this.sessions.get(conversationId);
  }

  getActiveSessions(): AgentMetrics[] {
    return Array.from(this.sessions.values()).filter((s) => !s.endedAt);
  }

  // ── Summary Report ─────────────────────────────────────────────────────────

  getSummary(): SessionSummary {
    const allSessions = Array.from(this.sessions.values());
    const completedSessions = allSessions.filter((s) => s.endedAt);

    // Calculate averages
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

    const totalMessages = allSessions.reduce((sum, s) => sum + s.messageCount, 0);
    const avgMessages = allSessions.length > 0 ? totalMessages / allSessions.length : 0;

    // Escalation rate
    const totalEscalations = allSessions.reduce((sum, s) => sum + s.escalations, 0);
    const escalationRate = allSessions.length > 0 ? totalEscalations / allSessions.length : 0;

    // Top tools
    const topTools = Array.from(this.toolUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count }));

    // App type distribution
    const appTypeDistribution: Record<string, number> = {};
    for (const session of allSessions) {
      appTypeDistribution[session.appType] = (appTypeDistribution[session.appType] || 0) + 1;
    }

    // Hourly activity (0-23)
    const hourlyActivity = new Array(24).fill(0);
    for (const session of allSessions) {
      const hour = session.startedAt.getHours();
      hourlyActivity[hour]++;
    }

    return {
      totalSessions: allSessions.length,
      activeSessions: this.getActiveSessions().length,
      avgSessionDuration: avgDuration,
      totalMessages,
      avgMessagesPerSession: avgMessages,
      toolUsageStats: Object.fromEntries(this.toolUsage),
      escalationRate,
      topTools,
      appTypeDistribution,
      hourlyActivity,
    };
  }

  // ── Tool Performance ───────────────────────────────────────────────────────────

  getToolPerformance(): Array<{
    tool: string;
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    errorRate: number;
  }> {
    const toolStats: Map<string, { total: number; success: number; duration: number; errors: number }> = new Map();

    for (const session of this.sessions.values()) {
      for (const call of session.toolCalls) {
        const stats = toolStats.get(call.toolName) || { total: 0, success: 0, duration: 0, errors: 0 };
        stats.total++;
        stats.duration += call.duration;
        if (call.success) stats.success++;
        if (!call.success) stats.errors++;
        toolStats.set(call.toolName, stats);
      }
    }

    return Array.from(toolStats.entries()).map(([tool, stats]) => ({
      tool,
      totalCalls: stats.total,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      avgDuration: stats.total > 0 ? stats.duration / stats.total : 0,
      errorRate: stats.total > 0 ? stats.errors / stats.total : 0,
    }));
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.startedAt.getTime() < cutoff && session.endedAt) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    logger.info('[Analytics] Cleanup complete', { cleaned });
    return cleaned;
  }

  // ── Export for External Analytics ────────────────────────────────────────────

  exportForExternal(): Record<string, unknown> {
    const summary = this.getSummary();
    const toolPerformance = this.getToolPerformance();
    const activeSessions = this.getActiveSessions().map((s) => ({
      conversationId: s.conversationId,
      userId: s.userId,
      appType: s.appType,
      startedAt: s.startedAt.toISOString(),
      messageCount: s.messageCount,
    }));

    return {
      summary,
      toolPerformance,
      activeSessions,
      exportedAt: new Date().toISOString(),
    };
  }
}

// ── Singleton Instance ─────────────────────────────────────────────────────────

let analytics: AgentAnalytics | null = null;

export function getAgentAnalytics(): AgentAnalytics {
  if (!analytics) {
    analytics = new AgentAnalytics();
  }
  return analytics;
}

export default AgentAnalytics;
