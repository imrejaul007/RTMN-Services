/**
 * REZ Integration Hub - Execution Pipeline
 *
 * Safe execution with approval, rollback, retry, safety limits, audit logs
 */

import { ServiceRegistry } from '../contracts/registry';
import { MerchantConstraints } from '../context/store';

// Execution Types
export interface ExecutionRequest {
  id: string;
  merchantId: string;
  action: string;
  params: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  maxRetries: number;
  timeout: number;
  createdAt: Date;
  createdBy: 'ai' | 'merchant' | 'system';
}

export interface ExecutionResult {
  executionId: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  approvedBy?: string;
  executedAt?: Date;
  completedAt?: Date;
  duration?: number;
  output?: unknown;
  error?: string;
  rollbackStatus?: 'success' | 'failed' | 'not_needed';
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

export interface RollbackAction {
  action: string;
  params: Record<string, unknown>;
  reverse: Record<string, unknown>;
}

// Risk Assessment
export interface RiskAssessment {
  executionId: string;
  risks: Risk[];  confidence: number;
  recommendation: 'approve' | 'review' | 'reject';
  blocked: boolean;
}

export interface Risk {
  type: 'margin' | 'budget' | 'fraud' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  reason: string;
  mitigation?: string;
}

// Execution Pipeline
export class ExecutionPipeline {
  private pending: Map<string, ExecutionRequest> = new Map();
  private results: Map<string, ExecutionResult> = new Map();
  private registry: ServiceRegistry;
  private auditLog: AuditEntry[] = [];

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
  }

  /**
   * Submit execution request
   */
  submit(request: Omit<ExecutionRequest, 'id' | 'createdAt'>): ExecutionRequest {
    const fullRequest: ExecutionRequest = {
      ...request,
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.pending.set(fullRequest.id, fullRequest);
    this.addAudit(fullRequest.id, 'submitted', request.createdBy, `Action: ${request.action}`);

    return fullRequest;
  }

  /**
   * Assess risk for execution
   */
  assessRisk(
    request: ExecutionRequest,
    constraints: MerchantConstraints,
    merchantHealth: { profitMargin: number; cashFlow: number }
  ): RiskAssessment {
    const risks: Risk[] = [];

    // Margin check
    if (request.params.discount) {
      const discount = request.params.discount as number;
      const projectedMargin = merchantHealth.profitMargin * (1 - discount / 100);
      if (projectedMargin < 0.1) {
        risks.push({
          type: 'margin',
          severity: 'critical',
          probability: 0.9,
          impact: 0.9,
          reason: `Discount of ${discount}% would reduce margin below 10%`,
          mitigation: 'Reduce discount or require approval',
        });
      }
    }

    // Budget check
    if (request.params.budget) {
      const budget = request.params.budget as number;
      if (budget > merchantHealth.cashFlow * 0.5) {
        risks.push({
          type: 'budget',
          severity: budget > merchantHealth.cashFlow ? 'critical' : 'high',
          probability: 0.7,
          impact: 0.8,
          reason: `Budget exceeds 50% of available cash flow`,
          mitigation: 'Reduce budget or stage spending',
        });
      }
    }

    // Compliance check
    if (request.action.includes('customer_data')) {
      risks.push({
        type: 'compliance',
        severity: 'high',
        probability: 0.3,
        impact: 0.9,
        reason: 'Customer data access',
        mitigation: 'Ensure GDPR consent',
      });
    }

    // Fraud check
    if (request.action.includes('refund') && (request.params.amount as number) > 10000) {
      risks.push({
        type: 'fraud',
        severity: 'high',
        probability: 0.4,
        impact: 0.7,
        reason: 'High-value refund',
        mitigation: 'Manual review required',
      });
    }

    const highRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');
    const recommendation = highRisks.length > 0 ? 'reject' : risks.length > 0 ? 'review' : 'approve';

    return {
      executionId: request.id,
      risks,
      confidence: 0.85,
      recommendation,
      blocked: highRisks.length > 0,
    };
  }

  /**
   * Approve execution
   */
  async approve(
    executionId: string,
    approvedBy: string
  ): Promise<ExecutionResult | null> {
    const request = this.pending.get(executionId);
    if (!request) return null;

    const result: ExecutionResult = {
      executionId,
      status: 'approved',
      approvedBy,
      auditLog: [],
    };

    this.results.set(executionId, result);
    this.addAudit(executionId, 'approved', approvedBy, 'Execution approved');

    return result;
  }

  /**
   * Execute action
   */
  async execute(
    executionId: string,
    executor: () => Promise<unknown>
  ): Promise<ExecutionResult> {
    const request = this.pending.get(executionId);
    const result = this.results.get(executionId) || {
      executionId,
      status: 'executing' as const,
      auditLog: [],
    };

    result.status = 'executing';
    this.results.set(executionId, result);
    this.addAudit(executionId, 'started', 'system', 'Execution started');

    const startTime = Date.now();

    try {
      // Check timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout'), request?.timeout || 30000);
      });

      const output = await Promise.race([executor(), timeoutPromise]);

      result.status = 'completed';
      result.executedAt = new Date();
      result.duration = Date.now() - startTime;
      result.output = output;
      this.addAudit(executionId, 'completed', 'system', `Duration: ${result.duration}ms`);

    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
      result.duration = Date.now() - startTime;
      this.addAudit(executionId, 'failed', 'system', `Error: ${result.error}`);

      // Auto-retry if configured
      if ((request?.maxRetries || 0) > 0) {
        return this.retry(executionId, request!, executor);
      }
    }

    this.results.set(executionId, result);
    return result;
  }

  /**
   * Retry failed execution
   */
  private async retry(
    request: ExecutionRequest,
    executor: () => Promise<unknown>
  ): Promise<ExecutionResult> {
    const newRequest = { ...request, maxRetries: request.maxRetries - 1 };
    this.pending.set(request.id, newRequest);

    this.addAudit(request.id, 'retrying', 'system', `Retries remaining: ${request.maxRetries - 1}`);

    return this.execute(request.id, executor);
  }

  /**
   * Rollback execution
   */
  async rollback(
    executionId: string,
    rollbackFn: () => Promise<unknown>
  ): Promise<ExecutionResult> {
    const result = this.results.get(executionId);
    if (!result) {
      throw new Error('Execution not found');
    }

    try {
      await rollbackFn();
      result.status = 'rolled_back';
      result.rollbackStatus = 'success';
      this.addAudit(executionId, 'rolled_back', 'system', 'Rollback successful');
    } catch (error) {
      result.rollbackStatus = 'failed';
      this.addAudit(executionId, 'rollback_failed', 'system', `Error: ${(error as Error).message}`);
    }

    this.results.set(executionId, result);
    return result;
  }

  /**
   * Get execution status
   */
  getStatus(executionId: string): ExecutionResult | undefined {
    return this.results.get(executionId);
  }

  /**
   * Get pending executions
   */
  getPending(): ExecutionRequest[] {
    return Array.from(this.pending.values());
  }

  /**
   * Get audit log
   */
  getAuditLog(executionId: string): AuditEntry[] {
    return this.results.get(executionId)?.auditLog || [];
  }

  /**
   * Add audit entry
   */
  private addAudit(executionId: string, action: string, actor: string, details: string): void {
    const entry: AuditEntry = {
      timestamp: new Date(),
      action,
      actor,
      details,
    };

    if (this.results.has(executionId)) {
      this.results.get(executionId)!.auditLog.push(entry);
    }

    this.auditLog.push(entry);

    // Keep last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  /**
   * Get execution history
   */
  getHistory(merchantId: string, limit = 100): ExecutionResult[] {
    return Array.from(this.results.values())
      .filter(r => r.executionId.includes(merchantId))
      .sort((a, b) =>
        (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0)
      )
      .slice(0, limit);
  }

  /**
   * Get execution stats
   */
  getStats(merchantId?: string): {
    total: number;
    completed: number;
    failed: number;
    rolledBack: number;
    pending: number;
    avgDuration: number;
    successRate: number;
  } {
    let results = Array.from(this.results.values());
    if (merchantId) {
      results = results.filter(r => r.executionId.includes(merchantId));
    }

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const rolledBack = results.filter(r => r.status === 'rolled_back').length;
    const pending = this.pending.size;

    const durations = results
      .filter(r => r.duration)
      .map(r => r.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      total: results.length,
      completed,
      failed,
      rolledBack,
      pending,
      avgDuration: Math.round(avgDuration),
      successRate: results.length > 0 ? completed / results.length : 0,
    };
  }
}

// Default exports
export const executionPipeline = new ExecutionPipeline(serviceRegistry);
