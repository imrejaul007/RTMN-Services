/**
 * Worker Health Monitor
 *
 * Monitors AI worker health and status.
 */

import { WorkerHealth, WorkerStatus, DeployedWorker } from '../types';
import { deployer } from '../deployer';

// ============================================
// Health Thresholds
// ============================================

const HEALTH_THRESHOLDS = {
  maxMemoryUsage: 0.85, // 85% memory usage
  maxErrorRate: 0.05, // 5% error rate
  maxResponseTime: 5000, // 5 seconds
  heartbeatTimeout: 300000, // 5 minutes
};

// ============================================
// Health Monitor
// ============================================

export class WorkerHealthMonitor {
  /**
   * Check worker health
   */
  checkHealth(worker: DeployedWorker): WorkerHealth {
    const health = worker.health;

    if (!health) {
      return {
        status: 'unhealthy',
        uptime: 0,
        tasksProcessed: 0,
        errors: 1,
        memoryUsage: 1,
      };
    }

    // Calculate error rate
    const errorRate = health.tasksProcessed > 0
      ? health.errors / health.tasksProcessed
      : 0;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      health.memoryUsage > HEALTH_THRESHOLDS.maxMemoryUsage ||
      errorRate > HEALTH_THRESHOLDS.maxErrorRate
    ) {
      status = 'degraded';
    }

    if (
      health.memoryUsage > 0.95 ||
      errorRate > 0.1 ||
      !worker.lastHeartbeat
    ) {
      status = 'unhealthy';
    }

    return {
      ...health,
      status,
    };
  }

  /**
   * Check if heartbeat is stale
   */
  isHeartbeatStale(worker: DeployedWorker): boolean {
    if (!worker.lastHeartbeat) return true;

    const lastBeat = new Date(worker.lastHeartbeat).getTime();
    const now = Date.now();
    const stale = now - lastBeat > HEALTH_THRESHOLDS.heartbeatTimeout;

    return stale;
  }

  /**
   * Get all unhealthy workers
   */
  getUnhealthyWorkers(): DeployedWorker[] {
    const allWorkers = deployer.getAllDeployedWorkers();

    return allWorkers.filter(worker => {
      const health = this.checkHealth(worker);
      return health.status === 'unhealthy' || this.isHeartbeatStale(worker);
    });
  }

  /**
   * Get all degraded workers
   */
  getDegradedWorkers(): DeployedWorker[] {
    const allWorkers = deployer.getAllDeployedWorkers();

    return allWorkers.filter(worker => {
      const health = this.checkHealth(worker);
      return health.status === 'degraded';
    });
  }

  /**
   * Get overall fleet health
   */
  getFleetHealth(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    uptime: number;
  } {
    const allWorkers = deployer.getAllDeployedWorkers();

    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let totalUptime = 0;

    for (const worker of allWorkers) {
      const health = this.checkHealth(worker);

      switch (health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
      }

      totalUptime += health.uptime;
    }

    return {
      total: allWorkers.length,
      healthy,
      degraded,
      unhealthy,
      uptime: allWorkers.length > 0 ? totalUptime / allWorkers.length : 0,
    };
  }

  /**
   * Auto-heal unhealthy workers
   */
  async autoHeal(): Promise<{ healed: number; failed: number }> {
    const unhealthy = this.getUnhealthyWorkers();
    let healed = 0;
    let failed = 0;

    for (const worker of unhealthy) {
      try {
        // Attempt to restart worker
        // In production, this would call the actual deployment API
        console.log(`[HealthMonitor] Attempting to heal ${worker.workerId} for ${worker.companyId}`);

        // Simulate healing
        worker.health = {
          status: 'healthy',
          uptime: 0,
          tasksProcessed: 0,
          errors: 0,
          memoryUsage: 0.3,
        };
        worker.lastHeartbeat = new Date().toISOString();
        worker.status = 'active';

        healed++;
      } catch (error) {
        console.error(`[HealthMonitor] Failed to heal ${worker.workerId}:`, error);
        failed++;
      }
    }

    return { healed, failed };
  }

  /**
   * Get health report for a company
   */
  getCompanyHealth(companyId: string): {
    workers: Array<{
      workerId: string;
      department: string;
      status: WorkerStatus;
      health: WorkerHealth;
      isStale: boolean;
    }>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const companyWorkers = deployer.getCompanyWorkers(companyId);

    if (!companyWorkers) {
      return {
        workers: [],
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
      };
    }

    const workerReports = companyWorkers.workers.map(worker => ({
      workerId: worker.workerId,
      department: worker.department,
      status: worker.status,
      health: this.checkHealth(worker),
      isStale: this.isHeartbeatStale(worker),
    }));

    return {
      workers: workerReports,
      summary: {
        total: workerReports.length,
        healthy: workerReports.filter(w => w.health.status === 'healthy' && !w.isStale).length,
        degraded: workerReports.filter(w => w.health.status === 'degraded').length,
        unhealthy: workerReports.filter(w => w.health.status === 'unhealthy' || w.isStale).length,
      },
    };
  }
}

// Singleton instance
export const healthMonitor = new WorkerHealthMonitor();
