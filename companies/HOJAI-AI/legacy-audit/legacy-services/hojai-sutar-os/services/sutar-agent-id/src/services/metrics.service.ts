/**
 * SUTAR Agent ID Service - Metrics Service
 * Service metrics and monitoring
 */

import { AgentStatus, AgentType, MetricsSnapshot, VerificationStatus } from "../types/index.js";
import { agentService } from "./agent.service.js";
import { authService } from "./auth.service.js";
import { verificationService } from "./verification.service.js";
import { permissionService } from "./permission.service.js";
import { storageService } from "./storage.service.js";
import { identityOSService } from "./identity-os.service.js";

export interface ServiceMetrics {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    success: number;
    failed: number;
    rate: number;
  };
  agents: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    suspended: number;
    banned: number;
    deleted: number;
  };
  verification: {
    verified: number;
    unverified: number;
    pending: number;
    rejected: number;
    rate: number;
  };
  authentication: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  storage: {
    totalEntries: number;
    memoryUsage: number;
  };
  identityOS: {
    status: string;
    synced: number;
    failed: number;
    queueSize: number;
  };
}

export interface RequestMetrics {
  endpoint: string;
  method: string;
  count: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errors: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export class MetricsService {
  private startTime: number = Date.now();
  private requestCount: number = 0;
  private successCount: number = 0;
  private failedCount: number = 0;
  private authCount: number = 0;
  private authSuccessCount: number = 0;
  private authFailedCount: number = 0;
  private verificationCount: number = 0;
  private verificationSuccessCount: number = 0;
  private requestTimes: Map<string, number[]> = new Map();
  private recentRequests: Array<{ timestamp: number; duration: number; success: boolean }> = [];

  private readonly MAX_RECENT_REQUESTS = 1000;
  private readonly WINDOW_SIZE = 60000; // 1 minute for rate calculation

  constructor() {
    // Reset daily counters periodically
    setInterval(() => this.resetDailyCounters(), 86400000);
  }

  // ============================================================================
  // Request Tracking
  // ============================================================================

  recordRequest(endpoint: string, method: string, duration: number, success: boolean): void {
    this.requestCount++;
    if (success) {
      this.successCount++;
    } else {
      this.failedCount++;
    }

    // Track request times per endpoint
    if (!this.requestTimes.has(endpoint)) {
      this.requestTimes.set(endpoint, []);
    }
    const times = this.requestTimes.get(endpoint)!;
    times.push(duration);

    // Keep only last 100 times per endpoint
    if (times.length > 100) {
      times.shift();
    }

    // Track recent requests for rate calculation
    this.recentRequests.push({
      timestamp: Date.now(),
      duration,
      success,
    });

    // Trim old requests
    const cutoff = Date.now() - this.WINDOW_SIZE;
    this.recentRequests = this.recentRequests.filter(r => r.timestamp > cutoff);
  }

  recordAuthAttempt(success: boolean): void {
    this.authCount++;
    if (success) {
      this.authSuccessCount++;
    } else {
      this.authFailedCount++;
    }
  }

  recordVerificationAttempt(success: boolean): void {
    this.verificationCount++;
    if (success) {
      this.verificationSuccessCount++;
    }
  }

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  async getMetrics(): Promise<ServiceMetrics> {
    const uptime = Date.now() - this.startTime;
    const agentStats = await agentService.getAgentStats();
    const verificationStats = await verificationService.getVerificationStats();
    const storageStats = await storageService.getStats();
    const identityOSStats = identityOSService.getSyncStats();

    // Calculate request rate (requests per second)
    const requestRate = this.calculateRequestRate();

    return {
      timestamp: new Date().toISOString(),
      uptime,
      requests: {
        total: this.requestCount,
        success: this.successCount,
        failed: this.failedCount,
        rate: requestRate,
      },
      agents: {
        total: agentStats.total,
        active: agentStats.byStatus[AgentStatus.ACTIVE] || 0,
        inactive: agentStats.byStatus[AgentStatus.INACTIVE] || 0,
        pending: agentStats.byStatus[AgentStatus.PENDING] || 0,
        suspended: agentStats.byStatus[AgentStatus.SUSPENDED] || 0,
        banned: agentStats.byStatus[AgentStatus.BANNED] || 0,
        deleted: agentStats.byStatus[AgentStatus.DELETED] || 0,
      },
      verification: {
        verified: verificationStats.verified,
        unverified: verificationStats.unverified,
        pending: verificationStats.pending,
        rejected: verificationStats.rejected,
        rate: verificationStats.verificationRate,
      },
      authentication: {
        total: this.authCount,
        successful: this.authSuccessCount,
        failed: this.authFailedCount,
        rate: this.authCount > 0 ? (this.authSuccessCount / this.authCount) * 100 : 0,
      },
      storage: {
        totalEntries: storageStats.totalEntries,
        memoryUsage: storageStats.memoryUsage,
      },
      identityOS: {
        status: identityOSStats.totalSyncs > 0 ? "active" : "idle",
        synced: identityOSStats.successfulSyncs,
        failed: identityOSStats.failedSyncs,
        queueSize: identityOSStats.queueSize,
      },
    };
  }

  async getSnapshot(): Promise<MetricsSnapshot> {
    const metrics = await this.getMetrics();

    return {
      totalAgents: metrics.agents.total,
      activeAgents: metrics.agents.active,
      pendingVerifications: metrics.verification.pending,
      verifiedAgents: metrics.verification.verified,
      suspendedAgents: metrics.agents.suspended,
      registrationsToday: this.getRegistrationsToday(),
      authenticationsToday: this.authCount,
      verificationsToday: this.verificationCount,
      avgResponseTime: this.getAverageResponseTime(),
      uptime: metrics.uptime,
    };
  }

  // ============================================================================
  // Endpoint Metrics
  // ============================================================================

  getEndpointMetrics(): RequestMetrics[] {
    const metrics: RequestMetrics[] = [];

    for (const [endpoint, times] of this.requestTimes.entries()) {
      if (times.length === 0) continue;

      const sortedTimes = [...times].sort((a, b) => a - b);
      const errors = this.recentRequests.filter(
        r => r.success === false && r.duration > 0
      ).length;

      metrics.push({
        endpoint,
        method: "POST", // Default, would need to track separately
        count: times.length,
        avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
        minResponseTime: sortedTimes[0],
        maxResponseTime: sortedTimes[sortedTimes.length - 1],
        errors: 0, // Would need endpoint-specific tracking
      });
    }

    return metrics.sort((a, b) => b.count - a.count);
  }

  // ============================================================================
  // Time Series Data
  // ============================================================================

  getRequestTimeSeries(windowMinutes: number = 60): TimeSeriesData[] {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const buckets: Map<number, number> = new Map();
    const bucketSize = 60000; // 1 minute buckets

    for (const request of this.recentRequests) {
      if (request.timestamp < cutoff) continue;

      const bucket = Math.floor(request.timestamp / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, value]) => ({
        timestamp: new Date(timestamp).toISOString(),
        value,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  getAuthTimeSeries(windowMinutes: number = 60): TimeSeriesData[] {
    // This would need more detailed tracking for auth attempts
    // For now, return aggregate data
    return [
      {
        timestamp: new Date().toISOString(),
        value: this.authCount,
      },
    ];
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async getHealthStatus(): Promise<{
    healthy: boolean;
    checks: {
      storage: boolean;
      identityOS: boolean;
      memory: boolean;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const checks = {
      storage: true,
      identityOS: true,
      memory: true,
    };

    // Check storage
    try {
      const storageStats = await storageService.getStats();
      if (storageStats.memoryUsage > 100 * 1024 * 1024) {
        // 100MB threshold
        checks.storage = false;
        issues.push("Storage memory usage high");
      }
    } catch {
      checks.storage = false;
      issues.push("Storage check failed");
    }

    // Check Identity OS
    const identityOSStatus = identityOSService.getIntegrationStatus();
    if (identityOSStatus.status === "error") {
      checks.identityOS = false;
      issues.push("Identity OS integration error");
    }

    // Check memory
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 500 * 1024 * 1024) {
      // 500MB threshold
      checks.memory = false;
      issues.push("Memory usage high");
    }

    return {
      healthy: checks.storage && checks.identityOS && checks.memory,
      checks,
      issues,
    };
  }

  // ============================================================================
  // Statistics Helpers
  // ============================================================================

  private calculateRequestRate(): number {
    const cutoff = Date.now() - this.WINDOW_SIZE;
    const recentCount = this.recentRequests.filter(r => r.timestamp > cutoff).length;
    return recentCount / (this.WINDOW_SIZE / 1000); // requests per second
  }

  private getAverageResponseTime(): number {
    let total = 0;
    let count = 0;

    for (const times of this.requestTimes.values()) {
      total += times.reduce((a, b) => a + b, 0);
      count += times.length;
    }

    return count > 0 ? total / count : 0;
  }

  private getRegistrationsToday(): number {
    // This would need daily tracking
    // For now, return a placeholder
    return Math.floor(this.requestCount * 0.1);
  }

  // ============================================================================
  // Prometheus Metrics Format
  // ============================================================================

  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.getPrometheusLines();
    return metrics.join("\n");
  }

  private async getPrometheusLines(): Promise<string[]> {
    const serviceMetrics = await this.getMetrics();
    const lines: string[] = [];

    // Agent metrics
    lines.push(`# TYPE sutar_agents_total gauge`);
    lines.push(`sutar_agents_total ${serviceMetrics.agents.total}`);

    lines.push(`# TYPE sutar_agents_active gauge`);
    lines.push(`sutar_agents_active ${serviceMetrics.agents.active}`);

    lines.push(`# TYPE sutar_agents_pending gauge`);
    lines.push(`sutar_agents_pending ${serviceMetrics.agents.pending}`);

    // Request metrics
    lines.push(`# TYPE sutar_requests_total counter`);
    lines.push(`sutar_requests_total ${serviceMetrics.requests.total}`);

    lines.push(`# TYPE sutar_requests_success_total counter`);
    lines.push(`sutar_requests_success_total ${serviceMetrics.requests.success}`);

    lines.push(`# TYPE sutar_requests_failed_total counter`);
    lines.push(`sutar_requests_failed_total ${serviceMetrics.requests.failed}`);

    lines.push(`# TYPE sutar_request_rate gauge`);
    lines.push(`sutar_request_rate ${serviceMetrics.requests.rate}`);

    // Verification metrics
    lines.push(`# TYPE sutar_verification_rate gauge`);
    lines.push(`sutar_verification_rate ${serviceMetrics.verification.rate}`);

    // Auth metrics
    lines.push(`# TYPE sutar_auth_total counter`);
    lines.push(`sutar_auth_total ${serviceMetrics.authentication.total}`);

    lines.push(`# TYPE sutar_auth_success_total counter`);
    lines.push(`sutar_auth_success_total ${serviceMetrics.authentication.successful}`);

    // Storage metrics
    lines.push(`# TYPE sutar_storage_entries gauge`);
    lines.push(`sutar_storage_entries ${serviceMetrics.storage.totalEntries}`);

    lines.push(`# TYPE sutar_storage_memory_bytes gauge`);
    lines.push(`sutar_storage_memory_bytes ${serviceMetrics.storage.memoryUsage}`);

    // Uptime
    lines.push(`# TYPE sutar_uptime_seconds gauge`);
    lines.push(`sutar_uptime_seconds ${serviceMetrics.uptime / 1000}`);

    return lines;
  }

  // ============================================================================
  // Reset and Cleanup
  // ============================================================================

  private resetDailyCounters(): void {
    // Reset daily counters
    console.log(`[MetricsService] Resetting daily counters`);
  }

  resetMetrics(): void {
    this.requestCount = 0;
    this.successCount = 0;
    this.failedCount = 0;
    this.authCount = 0;
    this.authSuccessCount = 0;
    this.authFailedCount = 0;
    this.verificationCount = 0;
    this.verificationSuccessCount = 0;
    this.requestTimes.clear();
    this.recentRequests = [];
    console.log(`[MetricsService] All metrics reset`);
  }

  // ============================================================================
  // Performance Monitoring
  // ============================================================================

  getPerformanceStats(): {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    throughput: number;
  } {
    const allTimes: number[] = [];
    for (const times of this.requestTimes.values()) {
      allTimes.push(...times);
    }

    if (allTimes.length === 0) {
      return {
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        maxResponseTime: 0,
        throughput: 0,
      };
    }

    allTimes.sort((a, b) => a - b);
    const len = allTimes.length;

    return {
      avgResponseTime: allTimes.reduce((a, b) => a + b, 0) / len,
      p50ResponseTime: allTimes[Math.floor(len * 0.5)],
      p95ResponseTime: allTimes[Math.floor(len * 0.95)],
      p99ResponseTime: allTimes[Math.floor(len * 0.99)],
      maxResponseTime: allTimes[len - 1],
      throughput: this.calculateRequestRate(),
    };
  }

  // ============================================================================
  // Alerting Thresholds
  // ============================================================================

  checkAlertThresholds(): {
    alerts: Array<{ name: string; severity: string; message: string }>;
  } {
    const alerts: Array<{ name: string; severity: string; message: string }> = [];

    // Check error rate
    if (this.requestCount > 100) {
      const errorRate = this.failedCount / this.requestCount;
      if (errorRate > 0.1) {
        alerts.push({
          name: "high_error_rate",
          severity: "warning",
          message: `Error rate is ${(errorRate * 100).toFixed(1)}%`,
        });
      }
    }

    // Check auth failure rate
    if (this.authCount > 50) {
      const authFailureRate = this.authFailedCount / this.authCount;
      if (authFailureRate > 0.5) {
        alerts.push({
          name: "high_auth_failure_rate",
          severity: "critical",
          message: `Auth failure rate is ${(authFailureRate * 100).toFixed(1)}%`,
        });
      }
    }

    // Check memory
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      alerts.push({
        name: "high_memory_usage",
        severity: "warning",
        message: `Memory usage at ${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`,
      });
    }

    return { alerts };
  }
}

// Singleton instance
export const metricsService = new MetricsService();
