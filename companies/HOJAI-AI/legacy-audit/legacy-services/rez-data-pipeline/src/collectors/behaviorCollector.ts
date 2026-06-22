/**
 * Behavior Events Collector
 * Collects granular user behavior events for analytics
 */

export interface BehaviorEvent {
  eventType: string;
  customerId: string;
  sessionId: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface EnrichedBehaviorEvent extends BehaviorEvent {
  customerTier?: 'new' | 'regular' | 'vip';
  sessionMetadata?: {
    startTime: Date;
    duration: number;
    pageViews: number;
    deviceInfo: {
      type: 'mobile' | 'desktop' | 'tablet';
      browser?: string;
      os?: string;
    };
    referrer?: string;
    utmParams?: Record<string, string>;
  };
  pageContext?: {
    path: string;
    title?: string;
    category?: string;
  };
  interactionContext?: {
    elementId?: string;
    elementType?: string;
    action: string;
  };
}

export type BehaviorEventHandler = (event: EnrichedBehaviorEvent) => Promise<void>;

export interface BehaviorEventOptions {
  sessionTimeoutMs?: number;
  maxPropertiesDepth?: number;
}

export class BehaviorCollector {
  private handlers: BehaviorEventHandler[] = [];
  private eventBuffer: BehaviorEvent[] = [];
  private bufferSize: number;
  private flushIntervalMs: number;
  private flushTimer?: NodeJS.Timeout;
  private sessionTimeoutMs: number;
  private activeSessions: Map<string, { startTime: Date; lastActivity: Date; eventCount: number }>;
  private metrics = {
    totalEvents: 0,
    uniqueSessions: new Set<string>(),
    uniqueCustomers: new Set<string>(),
    byEventType: new Map<string, number>()
  };

  constructor(options: BehaviorEventOptions & { bufferSize?: number; flushIntervalMs?: number } = {}) {
    this.bufferSize = options.bufferSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.sessionTimeoutMs = options.sessionTimeoutMs ?? 30 * 60 * 1000; // 30 minutes default
    this.activeSessions = new Map();
  }

  /**
   * Register an event handler
   */
  onEvent(handler: BehaviorEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Collect a behavior event
   */
  async collect(event: BehaviorEvent): Promise<void> {
    if (!this.validateEvent(event)) {
      throw new Error(`Invalid behavior event: ${JSON.stringify(event)}`);
    }

    // Sanitize properties
    const sanitizedProperties = this.sanitizeProperties(event.properties);

    const processedEvent: BehaviorEvent = {
      ...event,
      properties: sanitizedProperties,
      timestamp: new Date()
    };

    // Update metrics
    this.metrics.totalEvents++;
    this.metrics.uniqueSessions.add(event.sessionId);
    this.metrics.uniqueCustomers.add(event.customerId);
    const currentCount = this.metrics.byEventType.get(event.eventType) || 0;
    this.metrics.byEventType.set(event.eventType, currentCount + 1);

    // Track session
    this.updateSession(event.sessionId);

    this.eventBuffer.push(processedEvent);

    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Track a page view
   */
  async trackPageView(
    customerId: string,
    sessionId: string,
    page: { path: string; title?: string; category?: string }
  ): Promise<void> {
    return this.collect({
      eventType: 'page_view',
      customerId,
      sessionId,
      properties: {
        page,
        timestamp: Date.now()
      },
      timestamp: new Date()
    });
  }

  /**
   * Track a click event
   */
  async trackClick(
    customerId: string,
    sessionId: string,
    element: { id?: string; type: string; action: string },
    context?: Record<string, any>
  ): Promise<void> {
    return this.collect({
      eventType: 'click',
      customerId,
      sessionId,
      properties: {
        element,
        context: context || {},
        timestamp: Date.now()
      },
      timestamp: new Date()
    });
  }

  /**
   * Track form interactions
   */
  async trackFormInteraction(
    customerId: string,
    sessionId: string,
    form: { id: string; action: 'start' | 'submit' | 'abandon'; fields?: string[] }
  ): Promise<void> {
    return this.collect({
      eventType: `form_${form.action}`,
      customerId,
      sessionId,
      properties: {
        formId: form.id,
        fields: form.fields || [],
        timestamp: Date.now()
      },
      timestamp: new Date()
    });
  }

  /**
   * Start periodic flush
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.startSessionCleanup();
  }

  /**
   * Stop and flush remaining
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Get collector metrics
   */
  getMetrics(): {
    totalEvents: number;
    uniqueSessions: number;
    uniqueCustomers: number;
    byEventType: Record<string, number>;
  } {
    return {
      totalEvents: this.metrics.totalEvents,
      uniqueSessions: this.metrics.uniqueSessions.size,
      uniqueCustomers: this.metrics.uniqueCustomers.size,
      byEventType: Object.fromEntries(this.metrics.byEventType)
    };
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    this.cleanupExpiredSessions();
    return this.activeSessions.size;
  }

  private updateSession(sessionId: string): void {
    const now = new Date();
    const existing = this.activeSessions.get(sessionId);

    if (existing) {
      existing.lastActivity = now;
      existing.eventCount++;
    } else {
      this.activeSessions.set(sessionId, {
        startTime: now,
        lastActivity: now,
        eventCount: 1
      });
    }
  }

  private startSessionCleanup(): void {
    setInterval(() => this.cleanupExpiredSessions(), this.sessionTimeoutMs);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > this.sessionTimeoutMs) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const maxDepth = 5;

    const sanitize = (obj: any, depth: number): any => {
      if (depth > maxDepth) return '[MAX_DEPTH_EXCEEDED]';
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'function') return '[FUNCTION]';
      if (typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.slice(0, 100).map(item => sanitize(item, depth + 1));
      }

      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive fields
        if (['password', 'token', 'secret', 'key', 'authorization'].some(s => key.toLowerCase().includes(s))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitize(value, depth + 1);
        }
      }
      return result;
    };

    return sanitize(properties, 0);
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of events) {
      for (const handler of this.handlers) {
        try {
          await handler(event as EnrichedBehaviorEvent);
        } catch (error) {
          console.error(`Error processing behavior event:`, error);
        }
      }
    }
  }

  private validateEvent(event: BehaviorEvent): boolean {
    if (typeof event !== 'object') return false;
    if (typeof event.eventType !== 'string' || !event.eventType) return false;
    if (typeof event.customerId !== 'string' || !event.customerId) return false;
    if (typeof event.sessionId !== 'string' || !event.sessionId) return false;
    if (typeof event.properties !== 'object' || event.properties === null) return false;
    if (!(event.timestamp instanceof Date)) return false;
    return true;
  }
}

export const behaviorCollector = new BehaviorCollector();
