/**
 * REZ Integration Hub - AI Observability Dashboard
 *
 * Monitor: why AI acted, what agents decided, execution history,
 * confidence scores, failures, performance
 */

import { BaseEvent } from '../events/schema';

// Observability Types
export interface AgentDecision {
  agentId: string;
  agentName: string;
  decision: string;
  reasoning: string;
  confidence: number;
  input: unknown;
  output: unknown;
  timestamp: Date;
  duration: number;
  success: boolean;
}

export interface ExecutionTrace {
  traceId: string;
  spans: Span[];
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  status: 'running' | 'completed' | 'failed';
}

export interface Span {
  spanId: string;
  name: string;
  serviceId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'ok' | 'error';
  metadata?: Record<string, unknown>;
}

export interface AgentHealth {
  agentId: string;
  agentName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  requestsProcessed: number;
  successRate: number;
  avgLatency: number;
  lastHeartbeat: Date;
  errors: string[];
}

export interface SystemMetrics {
  timestamp: Date;
  eventsPerSecond: number;
  avgLatency: number;
  errorRate: number;
  activeAgents: number;
  pendingExecutions: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

// Observability Dashboard
export class ObservabilityDashboard {
  private decisions: Map<string, AgentDecision> = new Map();
  private traces: Map<string, ExecutionTrace> = new Map();
  private agentHealth: Map<string, AgentHealth> = new Map();
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];

  /**
   * Record agent decision
   */
  recordDecision(decision: AgentDecision): void {
    const id = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.decisions.set(id, decision);

    // Keep last 10000 decisions
    if (this.decisions.size > 10000) {
      const oldest = Array.from(this.decisions.keys())[0];
      this.decisions.delete(oldest);
    }

    // Create alert if low confidence
    if (decision.confidence < 0.6) {
      this.addAlert({
        severity: 'warning',
        source: decision.agentId,
        message: `Low confidence (${(decision.confidence * 100).toFixed(0)}%): ${decision.decision}`,
      });
    }

    // Create alert if failed
    if (!decision.success) {
      this.addAlert({
        severity: 'error',
        source: decision.agentId,
        message: `Agent failed: ${decision.decision}`,
      });
    }
  }

  /**
   * Start trace
   */
  startTrace(traceId: string): void {
    const trace: ExecutionTrace = {
      traceId,
      spans: [],
      startTime: new Date(),
      status: 'running',
      totalDuration: 0,
    };
    this.traces.set(traceId, trace);
  }

  /**
   * Add span to trace
   */
  addSpan(traceId: string, span: Omit<Span, 'spanId'>): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    const newSpan: Span = {
      ...span,
      spanId: `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    trace.spans.push(newSpan);
    this.traces.set(traceId, trace);
  }

  /**
   * End trace
   */
  endTrace(traceId: string, status: 'completed' | 'failed'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.status = status;
    trace.totalDuration =
      trace.endTime.getTime() - trace.startTime.getTime();

    // Mark spans as ended
    for (const span of trace.spans) {
      if (!span.endTime) {
        span.endTime = trace.endTime;
        span.duration =
          trace.endTime.getTime() - span.startTime.getTime();
      }
    }
  }

  /**
   * Record agent health
   */
  recordAgentHealth(health: AgentHealth): void {
    this.agentHealth.set(health.agentId, health);

    // Alert on unhealthy
    if (health.status === 'unhealthy') {
      this.addAlert({
        severity: 'error',
        source: health.agentId,
        message: `Agent unhealthy: ${health.agentName}`,
      });
    }

    // Alert on high error rate
    if (health.successRate < 0.8) {
      this.addAlert({
        severity: 'warning',
        source: health.agentId,
        message: `Low success rate (${(health.successRate * 100).toFixed(0)}%): ${health.agentName}`,
      });
    }
  }

  /**
   * Record metrics
   */
  recordMetrics(metrics: Omit<SystemMetrics, 'timestamp'>): void {
    this.metrics.push({
      ...metrics,
      timestamp: new Date(),
    });

    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // Alert on high error rate
    if (metrics.errorRate > 0.1) {
      this.addAlert({
        severity: 'warning',
        source: 'system',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
      });
    }
  }

  /**
   * Add alert
   */
  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const fullAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false,
    };
    this.alerts.unshift(fullAlert);

    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  // Getters

  /**
   * Get recent decisions
   */
  getDecisions(limit = 100): AgentDecision[] {
    return Array.from(this.decisions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get decisions by agent
   */
  getDecisionsByAgent(agentId: string, limit = 50): AgentDecision[] {
    return Array.from(this.decisions.values())
      .filter(d => d.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get agent health
   */
  getAgentHealth(): AgentHealth[] {
    return Array.from(this.agentHealth.values());
  }

  /**
   * Get unacknowledged alerts
   */
  getAlerts(unacknowledgedOnly = true): Alert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return this.alerts;
  }

  /**
   * Get recent metrics
   */
  getMetrics(limit = 100): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get dashboard summary
   */
  getSummary(): {
    decisions: { total: number; avgConfidence: number; successRate: number };
    agents: { healthy: number; degraded: number; unhealthy: number };
    alerts: { total: number; unacknowledged: number; critical: number };
    traces: { active: number; completed: number; failed: number };
  } {
    const decisions = Array.from(this.decisions.values());
    const agents = Array.from(this.agentHealth.values());

    return {
      decisions: {
        total: decisions.length,
        avgConfidence:
          decisions.length > 0
            ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
            : 0,
        successRate:
          decisions.length > 0
            ? decisions.filter(d => d.success).length / decisions.length
            : 0,
      },
      agents: {
        healthy: agents.filter(a => a.status === 'healthy').length,
        degraded: agents.filter(a => a.status === 'degraded').length,
        unhealthy: agents.filter(a => a.status === 'unhealthy').length,
      },
      alerts: {
        total: this.alerts.length,
        unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
      },
      traces: {
        active: Array.from(this.traces.values()).filter(t => t.status === 'running').length,
        completed: Array.from(this.traces.values()).filter(t => t.status === 'completed').length,
        failed: Array.from(this.traces.values()).filter(t => t.status === 'failed').length,
      },
    };
  }

  /**
   * Get trace
   */
  getTrace(traceId: string): ExecutionTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Clear old data
   */
  cleanup(maxAgeHours = 24): void {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    // Clear old decisions
    for (const [id, decision] of this.decisions) {
      if (decision.timestamp.getTime() < cutoff) {
        this.decisions.delete(id);
      }
    }

    // Clear old metrics
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);

    // Clear acknowledged alerts older than 7 days
    this.alerts = this.alerts.filter(
      a => !a.acknowledged || a.timestamp.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
  }
}

export const observability = new ObservabilityDashboard();

// Utility to create span from event
export function createSpanFromEvent(event: BaseEvent): Span {
  return {
    spanId: event.id,
    name: `${event.namespace.category}.${event.namespace.action}`,
    serviceId: event.source.serviceId,
    startTime: event.timestamp,
    status: 'ok',
    metadata: {
      eventId: event.id,
      category: event.namespace.category,
      source: event.source.serviceName,
    },
  };
}
