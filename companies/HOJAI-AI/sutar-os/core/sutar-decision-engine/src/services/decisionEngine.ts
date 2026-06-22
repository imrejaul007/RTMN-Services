// ============================================================================
// SUTAR Decision Engine - Core Decision Logic
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Decision,
  DecisionContext,
  DecisionRequest,
  DecisionStats,
  SimulationRequest,
  SimulationResult,
} from '../types/index.js';
import { DecisionOutcome, DecisionType } from '../types/index.js';
import { PolicyEngine } from './policyEngine.js';
import { RiskAssessmentService } from './riskAssessment.js';

/**
 * DecisionEngine is the core service for making decisions
 */
export class DecisionEngine {
  private policyEngine: PolicyEngine;
  private riskAssessmentService: RiskAssessmentService;
  private stats: DecisionStats;
  private simulationOsUrl: string;
  private simulationOsTimeout: number;

  constructor(simulationOsUrl: string = 'http://localhost:4241', simulationOsTimeout: number = 5000) {
    this.policyEngine = new PolicyEngine();
    this.riskAssessmentService = new RiskAssessmentService();
    this.simulationOsUrl = simulationOsUrl;
    this.simulationOsTimeout = simulationOsTimeout;
    this.stats = this.initializeStats();
  }

  /**
   * Initialize decision statistics
   */
  private initializeStats(): DecisionStats {
    return {
      totalDecisions: 0,
      byOutcome: {
        [DecisionOutcome.PROCEED]: 0,
        [DecisionOutcome.HOLD]: 0,
        [DecisionOutcome.REJECT]: 0,
      },
      byDecisionType: Object.fromEntries(
        Object.values(DecisionType).map(type => [type, 0])
      ) as Record<DecisionType, number>,
      averageRiskScore: 0,
      averageProcessingTimeMs: 0,
      last24Hours: {
        total: 0,
        byOutcome: {
          [DecisionOutcome.PROCEED]: 0,
          [DecisionOutcome.HOLD]: 0,
          [DecisionOutcome.REJECT]: 0,
        },
      },
    };
  }

  /**
   * Make a decision based on context
   */
  async makeDecision(request: DecisionRequest): Promise<Decision> {
    const startTime = Date.now();
    const { context, skipRiskAssessment, overridePolicyId } = request;

    // Perform risk assessment unless skipped
    const riskAssessment = skipRiskAssessment
      ? this.riskAssessmentService.assess(context)
      : this.riskAssessmentService.assess(context);

    // Enhance context with risk score
    const enhancedContext: DecisionContext = {
      ...context,
      riskScore: riskAssessment.overallScore,
    };

    // Evaluate policy
    const policyResult = overridePolicyId
      ? this.policyEngine.evaluate(enhancedContext, overridePolicyId)
      : this.policyEngine.evaluate(enhancedContext);

    // Calculate confidence based on risk assessment confidence
    const confidence = Math.min(
      policyResult.confidence * (riskAssessment.confidence / 100),
      0.95
    );

    const processingTimeMs = Date.now() - startTime;

    const decision: Decision = {
      id: uuidv4(),
      decisionType: context.decisionType,
      outcome: policyResult.outcome,
      confidence: Math.round(confidence * 100) / 100,
      policyId: policyResult.policy.id,
      ruleId: policyResult.rule?.id,
      reason: policyResult.reason,
      riskAssessment,
      context: enhancedContext,
      timestamp: new Date().toISOString(),
      processingTimeMs,
    };

    // Update statistics
    this.updateStats(decision);

    return decision;
  }

  /**
   * Simulate what-if scenarios using SimulationOS
   */
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();

    // Get baseline decision
    const baselineDecision = await this.makeDecision({
      context: request.context,
    });

    // Simulate variations
    const variations = await Promise.all(
      request.scenarioVariations.map(async (variation) => {
        const modifiedContext: DecisionContext = {
          ...request.context,
          ...variation.modifications,
        };

        const decision = await this.makeDecision({
          context: modifiedContext,
        });

        return {
          name: variation.name,
          decision,
          delta: {
            outcomeChanged: decision.outcome !== baselineDecision.outcome,
            riskScoreDelta: decision.riskAssessment.overallScore - baselineDecision.riskAssessment.overallScore,
            reason: decision.outcome !== baselineDecision.outcome
              ? `Outcome changed from ${baselineDecision.outcome} to ${decision.outcome}`
              : 'No outcome change',
          },
        };
      })
    );

    const executionTimeMs = Date.now() - startTime;

    return {
      baselineDecision,
      variations,
      executionTimeMs,
    };
  }

  /**
   * Simulate using external SimulationOS service
   */
  async simulateWithSimulationOS(request: SimulationRequest): Promise<SimulationResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.simulationOsTimeout);

      const response = await fetch(`${this.simulationOsUrl}/api/v1/simulation/whatif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: {
            name: 'Decision Engine What-If',
            description: 'What-if analysis from Decision Engine',
          },
          baseline: request.context,
          variations: request.scenarioVariations.map(v => ({
            name: v.name,
            context: {
              ...request.context,
              ...v.modifications,
            },
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`SimulationOS returned ${response.status}, falling back to local simulation`);
        return this.simulate(request);
      }

      const data = await response.json() as { success: boolean; data?: { baseline: Decision; variations: Array<{ name: string; decision: Decision; delta: { outcomeChanged: boolean; riskScoreDelta: number; reason: string } }> }; executionTimeMs?: number } ;

      if (!data.success || !data.data) {
        console.warn('SimulationOS returned invalid response, falling back to local simulation');
        return this.simulate(request);
      }

      return {
        baselineDecision: data.data.baseline,
        variations: data.data.variations,
        executionTimeMs: data.executionTimeMs || 0,
      };
    } catch (error) {
      console.warn(`SimulationOS unavailable: ${error}, falling back to local simulation`);
      return this.simulate(request);
    }
  }

  /**
   * Get current decision statistics
   */
  getStats(): DecisionStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get policy engine for inspection
   */
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  /**
   * Get risk assessment service for inspection
   */
  getRiskAssessmentService(): RiskAssessmentService {
    return this.riskAssessmentService;
  }

  /**
   * Update statistics after a decision
   */
  private updateStats(decision: Decision): void {
    this.stats.totalDecisions++;
    this.stats.byOutcome[decision.outcome]++;
    this.stats.byDecisionType[decision.decisionType]++;

    // Update running averages
    const n = this.stats.totalDecisions;
    this.stats.averageRiskScore =
      ((this.stats.averageRiskScore * (n - 1)) + decision.riskAssessment.overallScore) / n;
    this.stats.averageProcessingTimeMs =
      ((this.stats.averageProcessingTimeMs * (n - 1)) + decision.processingTimeMs) / n;

    // Update last 24 hours (simplified - in production use time-bucketed storage)
    this.stats.last24Hours.total++;
    this.stats.last24Hours.byOutcome[decision.outcome]++;
  }
}
