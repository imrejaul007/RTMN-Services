// ============================================================================
// SUTAR GoalOS - Integration Service
// ============================================================================

import type { Goal, DecisionContext, DecisionResult, SimulationResult } from '../types/index.js';

export class IntegrationService {
  private decisionEngineUrl: string;
  private simulationOsUrl: string;
  private timeout: number;

  constructor(
    decisionEngineUrl: string = 'http://localhost:4240',
    simulationOsUrl: string = 'http://localhost:4241',
    timeout: number = 5000
  ) {
    this.decisionEngineUrl = decisionEngineUrl;
    this.simulationOsUrl = simulationOsUrl;
    this.timeout = timeout;
  }

  /**
   * Check Decision Engine health
   */
  async checkDecisionEngineHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.decisionEngineUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          healthy: true,
          latencyMs: Date.now() - start,
        };
      }

      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: `Status: ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check SimulationOS health
   */
  async checkSimulationOSHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.simulationOsUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          healthy: true,
          latencyMs: Date.now() - start,
        };
      }

      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: `Status: ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get recommendations from Decision Engine for goal optimization
   */
  async getRecommendations(goal: Goal): Promise<string[] | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const context: DecisionContext = {
        decisionType: 'GOAL_OPTIMIZATION',
        metadata: {
          goalId: goal.id,
          category: goal.category,
          priority: goal.priority,
          progress: goal.progress.percentage,
          deadline: goal.deadline,
          hasDeadline: !!goal.deadline,
        },
      };

      const response = await fetch(`${this.decisionEngineUrl}/api/v1/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[INTEGRATION] Decision Engine returned:', response.status);
        return null;
      }

      const result = await response.json();

      if (result.success && result.data) {
        return this.extractRecommendations(result.data);
      }

      return null;
    } catch (error) {
      console.log('[INTEGRATION] Decision Engine error:', error);
      return null;
    }
  }

  /**
   * Extract recommendations from decision result
   */
  private extractRecommendations(decision: DecisionResult): string[] {
    const recommendations: string[] = [];

    if (decision.reason) {
      recommendations.push(decision.reason);
    }

    if (decision.riskAssessment) {
      if (decision.riskAssessment.level === 'HIGH' || decision.riskAssessment.level === 'CRITICAL') {
        recommendations.push('High risk detected - consider breaking down into smaller goals');
      }
      if (decision.riskAssessment.overallScore > 70) {
        recommendations.push('Complex goal - recommend detailed planning');
      }
    }

    return recommendations;
  }

  /**
   * Run simulation for goal scenarios with SimulationOS
   */
  async simulateGoalScenarios(
    goal: Goal,
    scenarios: Array<{
      name: string;
      modifications: Partial<{
        deadline: string;
        priority: string;
        progress: number;
      }>;
    }>
  ): Promise<{
    baseline: SimulationResult | null;
    variations: Array<{
      name: string;
      result: SimulationResult | null;
      successProbability: number;
    }>;
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Longer timeout for simulations

      const simulationRequest = {
        name: `Goal Simulation: ${goal.title}`,
        type: 'CUSTOM',
        parameters: {
          goalId: goal.id,
          currentProgress: goal.progress.percentage,
          deadline: goal.deadline,
          scenarios: scenarios.map(s => ({
            name: s.name,
            ...s.modifications,
          })),
        },
        iterations: 100,
        confidenceLevel: 0.95,
      };

      const response = await fetch(`${this.simulationOsUrl}/api/v1/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('[INTEGRATION] SimulationOS returned:', response.status);
        return null;
      }

      const result = await response.json();

      if (result.success && result.data) {
        return {
          baseline: result.data.result || null,
          variations: scenarios.map((scenario, index) => ({
            name: scenario.name,
            result: result.data.variations?.[index] || null,
            successProbability: result.data.variations?.[index]?.probability || 0.5,
          })),
        };
      }

      return null;
    } catch (error) {
      console.log('[INTEGRATION] SimulationOS error:', error);
      return null;
    }
  }

  /**
   * Validate goal with Decision Engine
   */
  async validateGoal(goal: Goal): Promise<{
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check deadline
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const daysRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining < 7 && goal.progress.percentage < 50) {
        warnings.push(`Only ${daysRemaining} days remaining with less than 50% progress`);
        suggestions.push('Consider extending deadline or reducing scope');
      }

      if (daysRemaining < 0) {
        warnings.push('Goal deadline has passed');
      }
    }

    // Check priority alignment
    if (goal.priority === 'CRITICAL' && !goal.deadline) {
      warnings.push('Critical priority goal without a deadline');
      suggestions.push('Add a deadline for critical goals to track effectively');
    }

    // Get Decision Engine recommendations
    const recommendations = await this.getRecommendations(goal);
    if (recommendations && recommendations.length > 0) {
      suggestions.push(...recommendations);
    }

    return {
      valid: warnings.length === 0,
      warnings,
      suggestions,
    };
  }

  /**
   * Get health status of all integrations
   */
  async getIntegrationHealth(): Promise<{
    decisionEngine: { healthy: boolean; latencyMs?: number; error?: string };
    simulationOs: { healthy: boolean; latencyMs?: number; error?: string };
    allHealthy: boolean;
  }> {
    const [decisionEngine, simulationOs] = await Promise.all([
      this.checkDecisionEngineHealth(),
      this.checkSimulationOSHealth(),
    ]);

    return {
      decisionEngine,
      simulationOs,
      allHealthy: decisionEngine.healthy && simulationOs.healthy,
    };
  }
}