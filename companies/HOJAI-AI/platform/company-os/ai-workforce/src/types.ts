/**
 * AI Workforce Types
 *
 * Types for AI worker deployment and lifecycle management.
 */

import { DepartmentType } from '../../composition-engine/src/types';

export type WorkerLevel = 'junior' | 'senior' | 'lead';

export interface AIWorker {
  id: string;
  name: string;
  department: DepartmentType;
  level: WorkerLevel;
  description: string;
  capabilities: string[];
  skills: string[];
  policies: string[];
  authority: WorkerAuthority;
  memory: WorkerMemory;
  twin: WorkerTwin;
  status: WorkerStatus;
  deployedAt?: string;
}

export type WorkerStatus = 'registered' | 'pending' | 'deploying' | 'active' | 'paused' | 'failed' | 'stopped';

export interface WorkerAuthority {
  maxTransactionValue: number;
  requireApprovalAbove: number;
  canApproveBudgets: boolean;
  canHireStaff: boolean;
  canFireVendors: boolean;
}

export interface WorkerMemory {
  shortTerm: boolean;
  longTerm: boolean;
  retention?: string;
  sources?: string[];
}

export interface WorkerTwin {
  type: string;
  updateFrequency: string;
}

export interface DeployedWorker {
  workerId: string;
  companyId: string;
  department: DepartmentType;
  status: WorkerStatus;
  endpoint?: string;
  health?: WorkerHealth;
  deployedAt: string;
  lastHeartbeat?: string;
}

export interface WorkerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  tasksProcessed: number;
  errors: number;
  memoryUsage: number;
}

export interface WorkerDeploymentRequest {
  workerId: string;
  companyId: string;
  department: DepartmentType;
  config?: Record<string, unknown>;
}

export interface WorkerDeploymentResult {
  success: boolean;
  deployedWorker?: DeployedWorker;
  error?: string;
}

export interface WorkerRegistry {
  [workerId: string]: AIWorker;
}

export interface CompanyWorkers {
  companyId: string;
  workers: DeployedWorker[];
  lastUpdated: string;
}

export interface WorkerPolicy {
  id: string;
  name: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  scope: string;
  maxAmount?: number;
  requiresApproval: boolean;
  approvers?: string[];
  conditions?: Record<string, unknown>;
}
