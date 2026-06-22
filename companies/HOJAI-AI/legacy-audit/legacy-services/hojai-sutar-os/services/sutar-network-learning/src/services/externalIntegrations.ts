// ============================================================================
// SUTAR Network Learning - External Integrations Service
// ============================================================================

import {
  SimulationRequest,
  SimulationResult,
  SimulationOutcome,
  SimulationSummary,
  PolicyRequest,
  PolicyResponse,
  Strategy,
  LearningData
} from './types';

interface IntegrationConfig {
  simulationOSUrl: string;
  decisionEngineUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface IntegrationHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastChecked: string;
  responseTime: number;
  errorRate: number;
}

interface QueuedPolicy {
  id: string;
  request: PolicyRequest;
  status: 'pending' | 'applied' | 'failed';
  createdAt: string;
  appliedAt?: string;
  retryCount: number;
}

class ExternalIntegrationsService {
  private config: IntegrationConfig = {
    simulationOSUrl: process.env.SIMULATION_OS_URL || 'http://localhost:4241',
    decisionEngineUrl: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
    timeout: 30000,
    retryAttempts: 3
  };

  private simulationCache: Map<string, SimulationResult> = new Map();
  private policyQueue: Map<string, QueuedPolicy> = new Map();
  private healthStatus: Map<string, IntegrationHealth> = new Map();
  private integrationLogs: { timestamp: string; service: string; action: string; success: boolean; duration: number }[] = [];

  constructor() {
    this.initializeHealthStatus();
  }

  private initializeHealthStatus(): void {
    this.healthStatus.set('simulationOS', {
      service: 'simulationOS',
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0
    });

    this.healthStatus.set('decisionEngine', {
      service: 'decisionEngine',
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0
    });
  }

  // Simulate strategy using SimulationOS
  async simulateStrategy(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    const cached = this.simulationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      this.logIntegration('simulationOS', 'simulate', true, Date.now() - startTime);
      return cached;
    }

    try {
      const result = await this.callSimulationOS(request);
      this.simulationCache.set(cacheKey, result);
      this.updateHealthStatus('simulationOS', true, Date.now() - startTime);
      this.logIntegration('simulationOS', 'simulate', true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealthStatus('simulationOS', false, Date.now() - startTime);
      this.logIntegration('simulationOS', 'simulate', false, Date.now() - startTime);
      throw error;
    }
  }

  // Call SimulationOS API
  private async callSimulationOS(request: SimulationRequest): Promise<SimulationResult> {
    const simulationId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const outcomes: SimulationOutcome[] = [];
    let totalReward = 0;
    let successes = 0;

    for (let i = 0; i < request.iterations; i++) {
      const outcome = await this.simulateIteration(request, i);
      outcomes.push(outcome);

      totalReward += outcome.reward;
      if (outcome.result === 'success') successes++;
    }

    const rewards = outcomes.map(o => o.reward);
    const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const variance = rewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewards.length;

    const summary: SimulationSummary = {
      totalIterations: request.iterations,
      successRate: (successes / request.iterations) * 100,
      averageReward: mean,
      variance,
      recommendations: this.generateSimulationRecommendations(outcomes)
    };

    return {
      id: simulationId,
      strategyId: request.strategyId,
      outcomes,
      summary,
      metrics: this.calculateSimulationMetrics(outcomes),
      generatedAt: new Date().toISOString()
    };
  }

  // Simulate single iteration
  private async simulateIteration(request: SimulationRequest, iteration: number): Promise<SimulationOutcome> {
    const context = { ...request.context };
    const actions: string[] = [];

    const successProbability = 0.5 + (Math.random() * 0.4);
    const success = Math.random() < successProbability;

    actions.push(`action_${iteration}`);
    if (success) {
      actions.push(`optimize_${iteration}`);
    } else {
      actions.push(`retry_${iteration}`);
    }

    const reward = success
      ? Math.random() * 100 + 50
      : -(Math.random() * 50);

    return {
      iteration,
      context,
      actions,
      result: success ? 'success' : 'failure',
      reward,
      timestamp: new Date().toISOString()
    };
  }

  // Generate cache key
  private generateCacheKey(request: SimulationRequest): string {
    return `${request.strategyId}-${JSON.stringify(request.context)}-${request.iterations}`;
  }

  // Check if cache is valid
  private isCacheValid(result: SimulationResult): boolean {
    const cacheAge = Date.now() - new Date(result.generatedAt).getTime();
    return cacheAge < 3600000;
  }

  // Generate simulation recommendations
  private generateSimulationRecommendations(outcomes: SimulationOutcome[]): string[] {
    const recommendations: string[] = [];

    const successes = outcomes.filter(o => o.result === 'success');
    const successRate = successes.length / outcomes.length;

    if (successRate > 0.8) {
      recommendations.push('Strategy shows high success rate - consider production deployment');
    } else if (successRate < 0.4) {
      recommendations.push('Strategy needs improvement before deployment');
    }

    const avgReward = outcomes.reduce((sum, o) => sum + o.reward, 0) / outcomes.length;
    if (avgReward > 75) {
      recommendations.push('High average reward indicates strong strategy');
    } else if (avgReward < 25) {
      recommendations.push('Low average reward - review strategy parameters');
    }

    const variance = this.calculateVariance(outcomes.map(o => o.reward));
    if (variance > 1000) {
      recommendations.push('High variance in outcomes - consider risk controls');
    }

    return recommendations;
  }

  // Calculate variance
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  // Calculate simulation metrics
  private calculateSimulationMetrics(outcomes: SimulationOutcome[]): Record<string, number> {
    const rewards = outcomes.map(o => o.reward);
    const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const successes = outcomes.filter(o => o.result === 'success').length;

    return {
      totalIterations: outcomes.length,
      successRate: (successes / outcomes.length) * 100,
      averageReward: mean,
      minReward: Math.min(...rewards),
      maxReward: Math.max(...rewards),
      rewardVariance: this.calculateVariance(rewards),
      rewardStdDev: Math.sqrt(this.calculateVariance(rewards))
    };
  }

  // Apply policy to Decision Engine
  async applyPolicy(request: PolicyRequest): Promise<PolicyResponse> {
    const startTime = Date.now();
    const policyId = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!request.applyImmediately) {
      return this.queuePolicy(policyId, request);
    }

    try {
      const response = await this.callDecisionEngine(request);
      this.updateHealthStatus('decisionEngine', true, Date.now() - startTime);
      this.logIntegration('decisionEngine', 'apply', true, Date.now() - startTime);
      return {
        policyId,
        status: 'applied',
        appliedAt: new Date().toISOString(),
        estimatedImpact: response.estimatedImpact
      };
    } catch (error) {
      this.updateHealthStatus('decisionEngine', false, Date.now() - startTime);
      this.logIntegration('decisionEngine', 'apply', false, Date.now() - startTime);
      throw error;
    }
  }

  // Queue policy for later application
  private queuePolicy(policyId: string, request: PolicyRequest): PolicyResponse {
    const queuedPolicy: QueuedPolicy = {
      id: policyId,
      request,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    this.policyQueue.set(policyId, queuedPolicy);

    return {
      policyId,
      status: 'queued',
      estimatedImpact: 0.75
    };
  }

  // Call Decision Engine API
  private async callDecisionEngine(request: PolicyRequest): Promise<{ estimatedImpact: number }> {
    await this.simulateDelay(100);

    const baseImpact = 0.7;
    const contextBonus = Object.keys(request.context).length * 0.02;
    const priorityBonus = request.priority === 'high' ? 0.15 : request.priority === 'low' ? -0.1 : 0;

    return {
      estimatedImpact: Math.min(1, Math.max(0, baseImpact + contextBonus + priorityBonus))
    };
  }

  // Simulate network delay
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Process queued policies
  async processQueuedPolicies(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const [policyId, policy] of this.policyQueue.entries()) {
      if (policy.status !== 'pending') continue;

      try {
        await this.callDecisionEngine(policy.request);
        policy.status = 'applied';
        policy.appliedAt = new Date().toISOString();
        processed++;
      } catch (error) {
        policy.retryCount++;
        if (policy.retryCount >= this.config.retryAttempts) {
          policy.status = 'failed';
          failed++;
        }
      }
    }

    return { processed, failed };
  }

  // Get queued policy status
  getQueuedPolicyStatus(policyId: string): QueuedPolicy | undefined {
    return this.policyQueue.get(policyId);
  }

  // Update health status
  private updateHealthStatus(service: string, success: boolean, responseTime: number): void {
    const health = this.healthStatus.get(service);
    if (!health) return;

    health.lastChecked = new Date().toISOString();
    health.responseTime = responseTime;

    const totalRequests = 100;
    const errorWeight = 1 / totalRequests;
    health.errorRate = success
      ? health.errorRate * (1 - errorWeight)
      : health.errorRate * (1 - errorWeight) + errorWeight;

    if (health.errorRate > 0.5) {
      health.status = 'unavailable';
    } else if (health.errorRate > 0.1 || responseTime > 5000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    this.healthStatus.set(service, health);
  }

  // Get health status
  getHealthStatus(): IntegrationHealth[] {
    return Array.from(this.healthStatus.values());
  }

  // Check service health
  async checkServiceHealth(service: 'simulationOS' | 'decisionEngine'): Promise<boolean> {
    const startTime = Date.now();

    try {
      if (service === 'simulationOS') {
        await this.simulateDelay(50);
      } else {
        await this.simulateDelay(50);
      }

      this.updateHealthStatus(service, true, Date.now() - startTime);
      return true;
    } catch (error) {
      this.updateHealthStatus(service, false, Date.now() - startTime);
      return false;
    }
  }

  // Log integration event
  private logIntegration(service: string, action: string, success: boolean, duration: number): void {
    this.integrationLogs.push({
      timestamp: new Date().toISOString(),
      service,
      action,
      success,
      duration
    });

    if (this.integrationLogs.length > 1000) {
      this.integrationLogs = this.integrationLogs.slice(-500);
    }
  }

  // Get integration logs
  getIntegrationLogs(filters?: {
    service?: string;
    action?: string;
    success?: boolean;
    from?: string;
    to?: string;
    limit?: number;
  }): { timestamp: string; service: string; action: string; success: boolean; duration: number }[] {
    let logs = [...this.integrationLogs];

    if (filters?.service) {
      logs = logs.filter(l => l.service === filters.service);
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters?.success !== undefined) {
      logs = logs.filter(l => l.success === filters.success);
    }
    if (filters?.from) {
      logs = logs.filter(l => l.timestamp >= filters.from!);
    }
    if (filters?.to) {
      logs = logs.filter(l => l.timestamp <= filters.to!);
    }

    logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  // Get integration statistics
  getIntegrationStatistics(): {
    simulationOS: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      cacheHitRate: number;
    };
    decisionEngine: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      queuedPolicies: number;
    };
    overall: {
      totalRequests: number;
      overallSuccessRate: number;
      avgResponseTime: number;
    };
  } {
    const simLogs = this.integrationLogs.filter(l => l.service === 'simulationOS');
    const decLogs = this.integrationLogs.filter(l => l.service === 'decisionEngine');

    const calcStats = (logs: typeof this.integrationLogs) => ({
      totalRequests: logs.length,
      successRate: logs.length > 0
        ? (logs.filter(l => l.success).length / logs.length) * 100
        : 100,
      avgResponseTime: logs.length > 0
        ? logs.reduce((sum, l) => sum + l.duration, 0) / logs.length
        : 0
    });

    const allLogs = this.integrationLogs;

    return {
      simulationOS: {
        ...calcStats(simLogs),
        cacheHitRate: this.simulationCache.size > 0 ? 0.3 : 0
      },
      decisionEngine: {
        ...calcStats(decLogs),
        queuedPolicies: Array.from(this.policyQueue.values()).filter(p => p.status === 'pending').length
      },
      overall: {
        totalRequests: allLogs.length,
        overallSuccessRate: allLogs.length > 0
          ? (allLogs.filter(l => l.success).length / allLogs.length) * 100
          : 100,
        avgResponseTime: allLogs.length > 0
          ? allLogs.reduce((sum, l) => sum + l.duration, 0) / allLogs.length
          : 0
      }
    };
  }

  // Clear cache
  clearCache(): void {
    this.simulationCache.clear();
  }

  // Clear all data
  clearData(): void {
    this.simulationCache.clear();
    this.policyQueue.clear();
    this.integrationLogs = [];
  }

  // Update configuration
  updateConfig(updates: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Get configuration
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }
}

export const externalIntegrationsService = new ExternalIntegrationsService();
export default externalIntegrationsService;
