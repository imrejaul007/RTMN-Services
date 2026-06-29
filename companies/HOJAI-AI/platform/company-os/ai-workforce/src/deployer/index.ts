/**
 * AI Workforce Deployer
 *
 * Deploys AI workers to company tenants.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DeployedWorker,
  WorkerDeploymentRequest,
  WorkerDeploymentResult,
  CompanyWorkers,
  WorkerHealth,
  WorkerStatus,
} from '../types';
import { getWorker, getAllWorkers } from '../registry';

// ============================================
// Deployment Store
// ============================================

interface DeploymentStore {
  companies: Map<string, CompanyWorkers>;
  workers: Map<string, DeployedWorker>;
}

const store: DeploymentStore = {
  companies: new Map(),
  workers: new Map(),
};

// ============================================
// Deployer
// ============================================

export class WorkforceDeployer {
  /**
   * Deploy a worker to a company
   */
  async deploy(request: WorkerDeploymentRequest): Promise<WorkerDeploymentResult> {
    const { workerId, companyId, department, config } = request;

    // Validate worker exists
    const worker = getWorker(workerId);
    if (!worker) {
      return {
        success: false,
        error: `Worker not found: ${workerId}`,
      };
    }

    // Check if already deployed
    const existingKey = `${companyId}:${workerId}`;
    if (store.workers.has(existingKey)) {
      const existing = store.workers.get(existingKey)!;
      return {
        success: true,
        deployedWorker: existing,
      };
    }

    // Create deployed worker entry
    const deployed: DeployedWorker = {
      workerId,
      companyId,
      department,
      status: 'deploying',
      endpoint: this.getWorkerEndpoint(workerId, companyId),
      health: {
        status: 'healthy',
        uptime: 0,
        tasksProcessed: 0,
        errors: 0,
        memoryUsage: 0,
      },
      deployedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    // Store deployment
    store.workers.set(existingKey, deployed);

    // Update company workers list
    if (!store.companies.has(companyId)) {
      store.companies.set(companyId, {
        companyId,
        workers: [],
        lastUpdated: new Date().toISOString(),
      });
    }
    const company = store.companies.get(companyId)!;
    company.workers.push(deployed);
    company.lastUpdated = new Date().toISOString();

    // Simulate deployment delay
    await this.simulateDelay(100);

    // Mark as active
    deployed.status = 'active';
    deployed.lastHeartbeat = new Date().toISOString();

    console.log(`[WorkforceDeployer] Deployed ${workerId} to ${companyId}`);

    return {
      success: true,
      deployedWorker: deployed,
    };
  }

  /**
   * Deploy multiple workers
   */
  async deployMany(requests: WorkerDeploymentRequest[]): Promise<WorkerDeploymentResult[]> {
    const results: WorkerDeploymentResult[] = [];

    for (const request of requests) {
      const result = await this.deploy(request);
      results.push(result);
    }

    return results;
  }

  /**
   * Stop a deployed worker
   */
  async stop(companyId: string, workerId: string): Promise<boolean> {
    const key = `${companyId}:${workerId}`;
    const worker = store.workers.get(key);

    if (!worker) {
      return false;
    }

    worker.status = 'stopped';

    // Update company list
    const company = store.companies.get(companyId);
    if (company) {
      const idx = company.workers.findIndex(w => w.workerId === workerId);
      if (idx >= 0) {
        company.workers[idx] = worker;
      }
    }

    console.log(`[WorkforceDeployer] Stopped ${workerId} at ${companyId}`);

    return true;
  }

  /**
   * Get deployed workers for a company
   */
  getCompanyWorkers(companyId: string): CompanyWorkers | null {
    return store.companies.get(companyId) || null;
  }

  /**
   * Get a specific deployed worker
   */
  getDeployedWorker(companyId: string, workerId: string): DeployedWorker | null {
    const key = `${companyId}:${workerId}`;
    return store.workers.get(key) || null;
  }

  /**
   * Get worker health
   */
  getHealth(companyId: string, workerId: string): WorkerHealth | null {
    const worker = this.getDeployedWorker(companyId, workerId);
    return worker?.health || null;
  }

  /**
   * Update worker health (heartbeat)
   */
  updateHeartbeat(companyId: string, workerId: string): boolean {
    const worker = this.getDeployedWorker(companyId, workerId);
    if (!worker) {
      return false;
    }

    worker.lastHeartbeat = new Date().toISOString();
    worker.health!.uptime += 10; // Increment uptime counter
    worker.health!.tasksProcessed += Math.floor(Math.random() * 5); // Simulate tasks

    return true;
  }

  /**
   * Remove all workers for a company
   */
  removeCompany(companyId: string): void {
    const company = store.companies.get(companyId);
    if (!company) return;

    // Stop all workers
    for (const worker of company.workers) {
      const key = `${companyId}:${worker.workerId}`;
      store.workers.delete(key);
    }

    // Remove company
    store.companies.delete(companyId);

    console.log(`[WorkforceDeployer] Removed all workers for ${companyId}`);
  }

  /**
   * Get all deployed workers
   */
  getAllDeployedWorkers(): DeployedWorker[] {
    return Array.from(store.workers.values());
  }

  /**
   * Get deployment statistics
   */
  getStats(): {
    totalCompanies: number;
    totalWorkers: number;
    activeWorkers: number;
    byDepartment: Record<string, number>;
  } {
    const workers = Array.from(store.workers.values());

    const byDepartment: Record<string, number> = {};
    let activeWorkers = 0;

    for (const worker of workers) {
      byDepartment[worker.department] = (byDepartment[worker.department] || 0) + 1;
      if (worker.status === 'active') {
        activeWorkers++;
      }
    }

    return {
      totalCompanies: store.companies.size,
      totalWorkers: workers.length,
      activeWorkers,
      byDepartment,
    };
  }

  /**
   * Generate worker endpoint URL
   */
  private getWorkerEndpoint(workerId: string, companyId: string): string {
    return `http://worker.${companyId}.local/${workerId}`;
  }

  /**
   * Simulate async delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const deployer = new WorkforceDeployer();

// ============================================
// Deployment Orchestration
// ============================================

/**
 * Deploy AI workers based on company configuration
 */
export async function deployCompanyWorkers(
  companyId: string,
  aiDepartments: Record<string, { enabled: boolean; head: string }>
): Promise<WorkerDeploymentResult[]> {
  const results: WorkerDeploymentResult[] = [];

  for (const [department, config] of Object.entries(aiDepartments)) {
    if (config.enabled && config.head) {
      const result = await deployer.deploy({
        workerId: config.head,
        companyId,
        department: department as any,
      });
      results.push(result);
    }
  }

  return results;
}

/**
 * Get default workers for a department
 */
export function getDefaultWorkersForDepartment(department: string): string[] {
  const defaults: Record<string, string[]> = {
    finance: ['ai-cfo', 'ai-accountant', 'ai-treasury-manager'],
    hr: ['ai-recruiter', 'ai-payroll-manager'],
    marketing: ['ai-cmo', 'ai-content-manager'],
    sales: ['ai-sdr', 'ai-closer'],
    operations: ['ai-ops-manager'],
    legal: ['ai-legal-counsel'],
  };

  return defaults[department] || [];
}

/**
 * Deploy full department team
 */
export async function deployDepartmentTeam(
  companyId: string,
  department: string
): Promise<WorkerDeploymentResult[]> {
  const workerIds = getDefaultWorkersForDepartment(department);

  const requests: WorkerDeploymentRequest[] = workerIds.map(workerId => ({
    workerId,
    companyId,
    department: department as any,
  }));

  return deployer.deployMany(requests);
}
