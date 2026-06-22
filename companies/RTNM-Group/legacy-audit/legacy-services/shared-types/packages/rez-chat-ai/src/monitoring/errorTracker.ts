// ── ReZ Agent OS - Error Tracking ─────────────────────────────────────────────
// Error monitoring and alerting system

import crypto from 'crypto';
import { logger } from '../logger';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'api' | 'tool' | 'memory' | 'socket' | 'auth' | 'validation' | 'unknown';

export interface TrackedError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorContext;
  userId?: string;
  conversationId?: string;
  retryable: boolean;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ErrorContext {
  appType?: string;
  toolName?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorSummary {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  recent: TrackedError[];
  criticalErrors: TrackedError[];
  errorRate: number;
  topErrors: Array<{ message: string; count: number; lastSeen: Date }>;
}

export class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastSeen: Map<string, Date> = new Map();
  private maxErrors = 1000;
  private alertCallbacks: Array<(error: TrackedError) => void> = [];

  // ── Error Tracking ────────────────────────────────────────────────────────────

  trackError(error: {
    severity: ErrorSeverity;
    category: ErrorCategory;
    message: string;
    stack?: string;
    context?: ErrorContext;
    userId?: string;
    conversationId?: string;
    retryable?: boolean;
  }): string {
    const id = `err_${crypto.randomUUID()}`;

    const trackedError: TrackedError = {
      id,
      timestamp: new Date(),
      severity: error.severity,
      category: error.category,
      message: error.message,
      stack: error.stack,
      context: error.context || {},
      userId: error.userId,
      conversationId: error.conversationId,
      retryable: error.retryable ?? false,
      resolved: false,
    };

    this.errors.set(id, trackedError);

    // Track error counts for aggregation
    const countKey = this.getErrorKey(error.category, error.message);
    const count = (this.errorCounts.get(countKey) || 0) + 1;
    this.errorCounts.set(countKey, count);
    this.lastSeen.set(countKey, new Date());

    // Log the error
    logger.error('[ErrorTracker]', {
      id,
      severity: error.severity,
      category: error.category,
      message: error.message,
      userId: error.userId,
      conversationId: error.conversationId,
    });

    // Trigger alerts for critical/high severity
    if (error.severity === 'critical' || error.severity === 'high') {
      this.triggerAlerts(trackedError);
    }

    // Cleanup old errors if exceeding max
    if (this.errors.size > this.maxErrors) {
      this.cleanup();
    }

    return id;
  }

  private getErrorKey(category: ErrorCategory, message: string): string {
    // Normalize message for grouping
    const normalized = message.toLowerCase().replace(/\d+/g, 'X');
    return `${category}:${normalized}`;
  }

  // ── Alerting ─────────────────────────────────────────────────────────────────

  onAlert(callback: (error: TrackedError) => void): void {
    this.alertCallbacks.push(callback);
  }

  private triggerAlerts(error: TrackedError): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(error);
      } catch (err) {
        logger.error('[ErrorTracker] Alert callback failed', { error: (err as Error).message });
      }
    }
  }

  // ── Resolution ────────────────────────────────────────────────────────────────

  resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date();

    logger.info('[ErrorTracker] Error resolved', { errorId });
    return true;
  }

  resolveByContext(conversationId: string): number {
    let resolved = 0;
    for (const [id, error] of this.errors.entries()) {
      if (error.conversationId === conversationId && !error.resolved) {
        error.resolved = true;
        error.resolvedAt = new Date();
        resolved++;
      }
    }
    return resolved;
  }

  // ── Error Retrieval ─────────────────────────────────────────────────────────

  getError(errorId: string): TrackedError | undefined {
    return this.errors.get(errorId);
  }

  getErrorsByConversation(conversationId: string): TrackedError[] {
    return Array.from(this.errors.values()).filter(
      (e) => e.conversationId === conversationId
    );
  }

  getErrorsByUser(userId: string): TrackedError[] {
    return Array.from(this.errors.values()).filter((e) => e.userId === userId);
  }

  getUnresolved(): TrackedError[] {
    return Array.from(this.errors.values()).filter((e) => !e.resolved);
  }

  getCritical(): TrackedError[] {
    return Array.from(this.errors.values()).filter(
      (e) => (e.severity === 'critical' || e.severity === 'high') && !e.resolved
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  getSummary(): ErrorSummary {
    const allErrors = Array.from(this.errors.values());

    // Count by severity
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // Count by category
    const byCategory: Record<ErrorCategory, number> = {
      api: 0,
      tool: 0,
      memory: 0,
      socket: 0,
      auth: 0,
      validation: 0,
      unknown: 0,
    };

    for (const error of allErrors) {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
    }

    // Recent errors (last 10)
    const recent = allErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Critical errors
    const criticalErrors = allErrors
      .filter((e) => (e.severity === 'critical' || e.severity === 'high') && !e.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Top errors by frequency
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => {
        const [category, message] = key.split(':');
        return {
          message: message.replace(/X/g, 'X'),
          count,
          lastSeen: this.lastSeen.get(key) || new Date(),
          category: category as ErrorCategory,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((e) => ({
        message: e.message,
        count: e.count,
        lastSeen: e.lastSeen,
      }));

    // Calculate error rate (errors in last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCount = allErrors.filter((e) => e.timestamp.getTime() > oneHourAgo).length;

    return {
      total: allErrors.length,
      bySeverity,
      byCategory,
      recent,
      criticalErrors,
      errorRate: recentCount,
      topErrors,
    };
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  private cleanup(): void {
    const sortedErrors = Array.from(this.errors.entries())
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());

    // Keep the most recent 80% of maxErrors
    const keepCount = Math.floor(this.maxErrors * 0.8);
    const toRemove = sortedErrors.slice(keepCount);

    for (const [id] of toRemove) {
      this.errors.delete(id);
    }

    logger.debug('[ErrorTracker] Cleanup complete', { removed: toRemove.length });
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  export(): TrackedError[] {
    return Array.from(this.errors.values());
  }

  clear(): void {
    this.errors.clear();
    this.errorCounts.clear();
    this.lastSeen.clear();
    logger.info('[ErrorTracker] Cleared all errors');
  }
}

// ── Singleton Instance ─────────────────────────────────────────────────────────

let errorTracker: ErrorTracker | null = null;

export function getErrorTracker(): ErrorTracker {
  if (!errorTracker) {
    errorTracker = new ErrorTracker();

    // Set up default alert handler
    errorTracker.onAlert((error) => {
      logger.error('[ErrorTracker] ALERT', {
        severity: error.severity,
        message: error.message,
        conversationId: error.conversationId,
      });
    });
  }
  return errorTracker;
}

export default ErrorTracker;
