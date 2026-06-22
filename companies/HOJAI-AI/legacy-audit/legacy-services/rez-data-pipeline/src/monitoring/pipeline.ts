/**
 * Pipeline Monitoring
 * Monitors pipeline health, latency, and errors
 */

export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  components: {
    collectors: ComponentHealth;
    processors: ComponentHealth;
    storage: ComponentHealth;
    sinks: ComponentHealth;
  };
  metrics: PipelineMetrics;
  lastCheck: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number; // events per second
  errorRate: number;
  errors: ErrorInfo[];
}

export interface ErrorInfo {
  type: string;
  message: string;
  count: number;
  lastOccurrence: Date;
  stackTrace?: string;
}

export interface PipelineMetrics {
  totalEventsProcessed: number;
  totalEventsFailed: number;
  eventsPerSecond: number;
  averageLatencyMs: number;
  queueDepth: number;
  memoryUsageMB: number;
  timestamp: Date;
}

export interface LatencyRecord {
  eventType: string;
  latencyMs: number;
  timestamp: Date;
}

export class PipelineMonitor {
  private startTime: Date;
  private latencyRecords: Map<string, LatencyRecord[]> = new Map();
  private errorRecords: Map<string, ErrorInfo> = new Map();
  private eventCounts: Map<string, number> = new Map();
  private totalEventsProcessed: number = 0;
  private totalEventsFailed: number = 0;
  private maxLatencyRecords: number = 1000;
  private healthCheckInterval: number = 30000;
  private healthCheckTimer?: NodeJS.Timeout;

  // Thresholds
  private thresholds = {
    healthyLatencyP99: 500, // ms
    degradedLatencyP99: 1000, // ms
    healthyErrorRate: 0.01, // 1%
    degradedErrorRate: 0.05, // 5%
    healthyThroughput: 100, // events/sec
    degradedThroughput: 10 // events/sec
  };

  constructor(options?: { healthCheckIntervalMs?: number }) {
    this.startTime = new Date();
    if (options?.healthCheckIntervalMs) {
      this.healthCheckInterval = options.healthCheckIntervalMs;
    }
  }

  /**
   * Start health check timer
   */
  start(): void {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(() => {
      // Periodic health check can be added here
    }, this.healthCheckInterval);
  }

  /**
   * Stop health check timer
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Track latency for an event type
   */
  trackLatency(eventType: string, latency: number): void {
    const record: LatencyRecord = {
      eventType,
      latencyMs: latency,
      timestamp: new Date()
    };

    if (!this.latencyRecords.has(eventType)) {
      this.latencyRecords.set(eventType, []);
    }

    const records = this.latencyRecords.get(eventType)!;
    records.push(record);

    // Trim old records
    if (records.length > this.maxLatencyRecords) {
      records.shift();
    }

    // Track total counts
    const current = this.eventCounts.get(eventType) || 0;
    this.eventCounts.set(eventType, current + 1);
  }

  /**
   * Track an error
   */
  trackError(eventType: string, error: Error): void {
    this.totalEventsFailed++;

    const errorKey = `${eventType}:${error.message}`;
    const existing = this.errorRecords.get(errorKey);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = new Date();
    } else {
      this.errorRecords.set(errorKey, {
        type: error.name,
        message: error.message,
        count: 1,
        lastOccurrence: new Date(),
        stackTrace: error.stack
      });
    }
  }

  /**
   * Increment processed events count
   */
  incrementProcessed(count: number = 1): void {
    this.totalEventsProcessed += count;
  }

  /**
   * Increment failed events count
   */
  incrementFailed(count: number = 1): void {
    this.totalEventsFailed += count;
  }

  /**
   * Get overall pipeline health
   */
  getPipelineHealth(): PipelineHealth {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    const collectorsHealth = this.calculateComponentHealth('collector');
    const processorsHealth = this.calculateComponentHealth('processor');
    const storageHealth = this.calculateStorageHealth();
    const sinksHealth = this.calculateSinksHealth();

    const overallStatus = this.determineOverallStatus([
      collectorsHealth,
      processorsHealth,
      storageHealth,
      sinksHealth
    ]);

    return {
      status: overallStatus,
      uptime,
      components: {
        collectors: collectorsHealth,
        processors: processorsHealth,
        storage: storageHealth,
        sinks: sinksHealth
      },
      metrics: this.getMetrics(),
      lastCheck: now
    };
  }

  /**
   * Get latency stats for an event type
   */
  getLatencyStats(eventType: string): {
    count: number;
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  } {
    const records = this.latencyRecords.get(eventType) || [];
    if (records.length === 0) {
      return { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, max: 0 };
    }

    const latencies = records.map(r => r.latencyMs).sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);

    return {
      count: records.length,
      p50: this.percentile(latencies, 50),
      p95: this.percentile(latencies, 95),
      p99: this.percentile(latencies, 99),
      avg: sum / latencies.length,
      max: latencies[latencies.length - 1]
    };
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorInfo[] {
    return Array.from(this.errorRecords.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get error count by event type
   */
  getErrorCountByType(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, error] of this.errorRecords) {
      const eventType = key.split(':')[0];
      result[eventType] = (result[eventType] || 0) + error.count;
    }
    return result;
  }

  /**
   * Get metrics summary
   */
  getMetrics(): PipelineMetrics {
    const uptime = (new Date().getTime() - this.startTime.getTime()) / 1000;
    const eventsPerSecond = uptime > 0 ? this.totalEventsProcessed / uptime : 0;

    // Calculate average latency
    let totalLatency = 0;
    let latencyCount = 0;
    for (const records of this.latencyRecords.values()) {
      totalLatency += records.reduce((sum, r) => sum + r.latencyMs, 0);
      latencyCount += records.length;
    }
    const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

    return {
      totalEventsProcessed: this.totalEventsProcessed,
      totalEventsFailed: this.totalEventsFailed,
      eventsPerSecond: Math.round(eventsPerSecond * 100) / 100,
      averageLatencyMs: Math.round(avgLatency * 100) / 100,
      queueDepth: 0, // Would be populated from actual queues
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date()
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencyRecords.clear();
    this.errorRecords.clear();
    this.eventCounts.clear();
    this.totalEventsProcessed = 0;
    this.totalEventsFailed = 0;
  }

  // Private methods

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private calculateComponentHealth(prefix: string): ComponentHealth {
    const relevantLatencies: number[] = [];
    for (const [eventType, records] of this.latencyRecords) {
      if (eventType.startsWith(prefix)) {
        relevantLatencies.push(...records.map(r => r.latencyMs));
      }
    }

    relevantLatencies.sort((a, b) => a - b);

    const errorRate = this.totalEventsProcessed > 0
      ? this.totalEventsFailed / this.totalEventsProcessed
      : 0;

    return {
      status: this.determineStatus(errorRate, this.percentile(relevantLatencies, 99)),
      latency: {
        p50: this.percentile(relevantLatencies, 50),
        p95: this.percentile(relevantLatencies, 95),
        p99: this.percentile(relevantLatencies, 99)
      },
      throughput: this.calculateThroughput(prefix),
      errorRate,
      errors: this.getErrorsForPrefix(prefix)
    };
  }

  private calculateStorageHealth(): ComponentHealth {
    // Simplified - would check actual Redis/MongoDB connections
    return {
      status: 'healthy',
      latency: { p50: 5, p95: 20, p99: 50 },
      throughput: 1000,
      errorRate: 0,
      errors: []
    };
  }

  private calculateSinksHealth(): ComponentHealth {
    // Simplified - would check actual sink health
    return {
      status: 'healthy',
      latency: { p50: 50, p95: 200, p99: 500 },
      throughput: 500,
      errorRate: 0.001,
      errors: []
    };
  }

  private determineStatus(errorRate: number, p99Latency: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate > this.thresholds.degradedErrorRate || p99Latency > this.thresholds.degradedLatencyP99) {
      return 'unhealthy';
    }
    if (errorRate > this.thresholds.healthyErrorRate || p99Latency > this.thresholds.healthyLatencyP99) {
      return 'degraded';
    }
    return 'healthy';
  }

  private determineOverallStatus(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (components.some(c => c.status === 'unhealthy')) return 'unhealthy';
    if (components.some(c => c.status === 'degraded')) return 'degraded';
    return 'healthy';
  }

  private calculateThroughput(prefix: string): number {
    let count = 0;
    for (const [eventType, cnt] of this.eventCounts) {
      if (eventType.startsWith(prefix)) {
        count += cnt;
      }
    }
    const uptime = (new Date().getTime() - this.startTime.getTime()) / 1000;
    return uptime > 0 ? count / uptime : 0;
  }

  private getErrorsForPrefix(prefix: string): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    for (const [key, error] of this.errorRecords) {
      if (key.startsWith(prefix)) {
        errors.push(error);
      }
    }
    return errors;
  }
}

export const pipelineMonitor = new PipelineMonitor();
