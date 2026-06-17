import {
  DecisionRequest,
  DecisionResult,
  DecisionOutcome,
  AlternativeOption,
  DecisionExplanation,
  RiskAssessment,
  ValueAssessment,
  PolicyEvaluation,
  ApprovalRequirement,
  DecisionType
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RiskCalculator } from './riskCalculator';
import { ValueAssessor } from './valueAssessor';
import { PolicyEvaluator } from './policyEvaluator';
import { ApprovalRouter } from './approvalRouter';
import { Decision } from '../models/Decision';
import { logger } from '../utils/logger';

export class DecisionMaker {
  private tenantId: string;
  private riskCalculator: RiskCalculator;
  private valueAssessor: ValueAssessor;
  private policyEvaluator: PolicyEvaluator;
  private approvalRouter: ApprovalRouter;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.riskCalculator = new RiskCalculator(tenantId);
    this.valueAssessor = new ValueAssessor(tenantId);
    this.policyEvaluator = new PolicyEvaluator(tenantId);
    this.approvalRouter = new ApprovalRouter(tenantId);
  }

  /**
   * Make a decision on a request
   */
  async makeDecision(request: DecisionRequest): Promise<DecisionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    logger.info(`Making decision for ${request.type}`, {
      requestId,
      tenantId: this.tenantId,
      customerId: request.customer.id
    });

    try {
      // Step 1: Calculate risk assessment
      const riskAssessment = await this.riskCalculator.calculateRisk(request);

      // Step 2: Assess customer value
      const valueAssessment = await this.valueAssessor.assessValue(request);

      // Step 3: Evaluate policies
      const policyEvaluations = await this.policyEvaluator.evaluatePolicies(request);

      // Step 4: Generate alternative options
      const alternatives = this.generateAlternatives(request, riskAssessment, valueAssessment);

      // Step 5: Determine approval requirements
      const approval = this.approvalRouter.determineApproval(
        request,
        riskAssessment,
        valueAssessment,
        policyEvaluations
      );

      // Step 6: Make the decision
      const { outcome, decision, amount } = this.determineOutcome(
        request,
        riskAssessment,
        valueAssessment,
        policyEvaluations,
        approval
      );

      // Step 7: Generate explanation
      const explanation = this.generateExplanation(
        request,
        riskAssessment,
        valueAssessment,
        policyEvaluations,
        alternatives,
        outcome,
        decision
      );

      const processingTime = Date.now() - startTime;

      // Build result
      const result: DecisionResult = {
        id: uuidv4(),
        requestId,
        tenantId: this.tenantId,
        type: request.type,
        outcome,
        decision,
        amount,
        riskAssessment,
        valueAssessment,
        policyEvaluations,
        alternatives,
        approval,
        explanation,
        processingTime,
        timestamp: new Date(),
        metadata: request.metadata
      };

      // Step 8: Persist decision
      await this.persistDecision(request, result);

      logger.info(`Decision made successfully`, {
        requestId,
        outcome,
        decision,
        processingTime
      });

      return result;

    } catch (error) {
      logger.error(`Error making decision`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Determine the final outcome based on all assessments
   */
  private determineOutcome(
    request: DecisionRequest,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment,
    policyEvaluations: PolicyEvaluation[],
    approval: ApprovalRequirement
  ): { outcome: DecisionOutcome; decision: 'approve' | 'deny' | 'partial' | 'escalate'; amount?: number } {
    // Check for hard denials first
    if (riskAssessment.level === 'critical') {
      return { outcome: 'denied', decision: 'deny' };
    }

    // Check policy denials
    const denialPolicies = policyEvaluations.filter(
      p => p.outcome === 'deny' && p.applicable && p.matched
    );
    if (denialPolicies.length > 0 && approval.level <= 2) {
      return { outcome: 'denied', decision: 'deny' };
    }

    // Check if escalation is required
    if (approval.required && approval.level >= 3) {
      return { outcome: 'escalated', decision: 'escalate' };
    }

    // High-value customers get benefit of the doubt
    if (valueAssessment.tier === 'vip' || valueAssessment.tier === 'platinum') {
      if (riskAssessment.level !== 'critical') {
        // Check if partial approval makes sense
        const requestedAmount = request.requestedAmount || request.transaction?.amount || 0;
        const approvedAmount = this.calculatePartialAmount(request, valueAssessment, riskAssessment);

        if (approvedAmount < requestedAmount) {
          return {
            outcome: 'partial',
            decision: 'partial',
            amount: approvedAmount
          };
        }

        return { outcome: 'approved', decision: 'approve', amount: requestedAmount };
      }
    }

    // Auto-approve low risk, high value
    if (riskAssessment.level === 'low' && valueAssessment.score > 50) {
      const requestedAmount = request.requestedAmount || request.transaction?.amount || 0;
      return { outcome: 'approved', decision: 'approve', amount: requestedAmount };
    }

    // Medium risk - partial approval or escalation
    if (riskAssessment.level === 'medium') {
      const approvedAmount = this.calculatePartialAmount(request, valueAssessment, riskAssessment);
      const requestedAmount = request.requestedAmount || request.transaction?.amount || 0;

      if (approvedAmount === 0) {
        return { outcome: 'escalated', decision: 'escalate' };
      }

      if (approvedAmount < requestedAmount) {
        return {
          outcome: 'partial',
          decision: 'partial',
          amount: approvedAmount
        };
      }

      return { outcome: 'approved', decision: 'approve', amount: requestedAmount };
    }

    // Default to escalation for review
    return { outcome: 'requires_review', decision: 'escalate' };
  }

  /**
   * Calculate partial approval amount
   */
  private calculatePartialAmount(
    request: DecisionRequest,
    valueAssessment: ValueAssessment,
    riskAssessment: RiskAssessment
  ): number {
    const requestedAmount = request.requestedAmount || request.transaction?.amount || 0;

    // Base percentage from value score
    let percentage = valueAssessment.score / 100;

    // Adjust for risk
    percentage = percentage * (1 - (riskAssessment.score / 200));

    // Minimum 20%, maximum 100%
    percentage = Math.max(0.2, Math.min(1, percentage));

    // VIP customers get at least 80%
    if (valueAssessment.tier === 'vip') {
      percentage = Math.max(0.8, percentage);
    }

    // Critical risk caps at 50%
    if (riskAssessment.level === 'critical') {
      percentage = Math.min(0.5, percentage);
    }

    return Math.round(requestedAmount * percentage);
  }

  /**
   * Generate alternative options
   */
  private generateAlternatives(
    request: DecisionRequest,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment
  ): AlternativeOption[] {
    const alternatives: AlternativeOption[] = [];

    // For refunds
    if (request.type === 'refund') {
      const transactionAmount = request.transaction?.amount || 0;

      // Partial refund
      if (transactionAmount > 0) {
        const partialAmount = Math.round(transactionAmount * 0.5);
        alternatives.push({
          type: 'refund',
          description: 'Partial refund (50%)',
          amount: partialAmount,
          conditions: ['Credit to original payment method', 'Processing time: 5-7 days'],
          feasibility: riskAssessment.level === 'low' ? 'high' : 'medium',
          reasoning: 'Provides customer goodwill while limiting exposure'
        });
      }

      // Store credit
      alternatives.push({
        type: 'discount',
        description: 'Store credit instead of refund',
        amount: transactionAmount,
        conditions: ['Credit valid for 12 months', 'No expiration on balance'],
        feasibility: 'high',
        reasoning: 'Retains customer revenue while fulfilling request'
      });

      // Future discount
      alternatives.push({
        type: 'discount',
        description: 'Future purchase discount',
        amount: Math.round(transactionAmount * 0.2),
        conditions: ['Discount code valid for 30 days', 'Minimum purchase applies'],
        feasibility: 'medium',
        reasoning: 'Encourages repeat business'
      });
    }

    // For cancellations
    if (request.type === 'cancel') {
      alternatives.push({
        type: 'discount',
        description: 'Reschedule instead of cancel',
        feasibility: 'high',
        reasoning: 'Maintains booking while accommodating customer'
      });

      alternatives.push({
        type: 'discount',
        description: 'Cancellation fee waiver',
        amount: request.transaction?.amount ? Math.round(request.transaction.amount * 0.1) : 1000,
        conditions: ['One-time courtesy'],
        feasibility: 'medium',
        reasoning: 'Goodwill gesture without full cancellation'
      });
    }

    // For discounts
    if (request.type === 'discount') {
      alternatives.push({
        type: 'discount',
        description: 'Loyalty points bonus',
        amount: request.requestedAmount ? Math.round(request.requestedAmount * 0.5) : 500,
        conditions: ['Points expire in 90 days'],
        feasibility: 'high',
        reasoning: 'Adds perceived value without direct discount'
      });

      alternatives.push({
        type: 'discount',
        description: 'Free upgrade or add-on',
        feasibility: 'high',
        reasoning: 'Provides value without affecting margin as much'
      });
    }

    // Sort by feasibility
    const feasibilityOrder = { high: 0, medium: 1, low: 2 };
    alternatives.sort((a, b) => feasibilityOrder[a.feasibility] - feasibilityOrder[b.feasibility]);

    // Return top 3
    return alternatives.slice(0, 3);
  }

  /**
   * Generate decision explanation
   */
  private generateExplanation(
    request: DecisionRequest,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment,
    policyEvaluations: PolicyEvaluation[],
    alternatives: AlternativeOption[],
    outcome: DecisionOutcome,
    decision: string
  ): DecisionExplanation {
    const reasoning: string[] = [];

    // Add decision summary
    reasoning.push(`Request type: ${request.type}`);
    reasoning.push(`Requested amount: $${((request.requestedAmount || 0) / 100).toFixed(2)}`);

    // Risk reasoning
    if (riskAssessment.level !== 'low') {
      reasoning.push(`Risk assessment: ${riskAssessment.level} (score: ${riskAssessment.score})`);
      if (riskAssessment.flags.length > 0) {
        reasoning.push(`Risk factors: ${riskAssessment.flags.join(', ')}`);
      }
    } else {
      reasoning.push('Risk assessment: Low risk');
    }

    // Value reasoning
    reasoning.push(`Customer value: ${valueAssessment.tier} tier (score: ${valueAssessment.score})`);
    reasoning.push(`Lifetime value: $${(valueAssessment.ltvScore * 10).toFixed(2)}`);

    // Policy reasoning
    if (policyEvaluations.length > 0) {
      const applicablePolicies = policyEvaluations.filter(p => p.applicable);
      if (applicablePolicies.length > 0) {
        reasoning.push(`${applicablePolicies.length} applicable policies evaluated`);
      }
    }

    // Outcome reasoning
    switch (outcome) {
      case 'approved':
        reasoning.push('Decision: Fully approved based on low risk and customer value');
        break;
      case 'denied':
        reasoning.push('Decision: Denied based on policy violations or high risk');
        break;
      case 'partial':
        reasoning.push('Decision: Partially approved based on risk-adjusted assessment');
        break;
      case 'escalated':
        reasoning.push('Decision: Escalated for human review');
        break;
    }

    // Generate summary
    const summary = this.generateSummary(request, outcome, riskAssessment, valueAssessment);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      request,
      outcome,
      riskAssessment,
      valueAssessment
    );

    return {
      summary,
      reasoning,
      factors: request.factors || [],
      policies: policyEvaluations,
      alternatives,
      recommendations
    };
  }

  /**
   * Generate decision summary
   */
  private generateSummary(
    request: DecisionRequest,
    outcome: DecisionOutcome,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment
  ): string {
    const amount = request.requestedAmount || 0;
    const formattedAmount = `$${(amount / 100).toFixed(2)}`;

    switch (outcome) {
      case 'approved':
        return `${request.type} of ${formattedAmount} approved for ${request.customer.tier} customer. Low risk (${riskAssessment.score}) with high value score (${valueAssessment.score}).`;

      case 'denied':
        return `${request.type} of ${formattedAmount} denied for ${request.customer.tier} customer. Risk factors or policy violations identified.`;

      case 'partial':
        const approvedAmount = amount * (valueAssessment.score / 100) * (1 - riskAssessment.score / 200);
        return `${request.type} partially approved at $${(approvedAmount / 100).toFixed(2)} (from ${formattedAmount}). Based on risk/value balance.`;

      case 'escalated':
        return `${request.type} of ${formattedAmount} escalated for human review. Risk: ${riskAssessment.level}, Value: ${valueAssessment.tier}.`;

      default:
        return `${request.type} request for ${formattedAmount} requires review.`;
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    request: DecisionRequest,
    outcome: DecisionOutcome,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment
  ): string[] {
    const recommendations: string[] = [];

    // VIP retention
    if (valueAssessment.tier === 'vip' && outcome === 'denied') {
      recommendations.push('Consider offering alternative compensation for VIP customer retention');
    }

    // High risk mitigation
    if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
      recommendations.push('Request additional verification or documentation');
      recommendations.push('Consider offering alternatives instead of full approval');
    }

    // Customer history
    if (request.customer.previousRefunds > 3) {
      recommendations.push('Flag customer for refund pattern monitoring');
    }

    // Value opportunity
    if (valueAssessment.potentialScore > 80 && outcome !== 'approved') {
      recommendations.push('Customer has high potential - consider retention offers');
    }

    // Policy
    if (outcome === 'denied' || outcome === 'partial') {
      recommendations.push('Provide clear explanation to customer about decision factors');
    }

    return recommendations;
  }

  /**
   * Persist decision to database
   */
  private async persistDecision(request: DecisionRequest, result: DecisionResult): Promise<void> {
    try {
      const decision = new Decision({
        requestId: result.requestId,
        tenantId: result.tenantId,
        type: result.type,
        outcome: result.outcome,
        decision: result.decision,
        amount: result.amount,
        reason: request.reason,
        customerId: request.customer.id,
        customerEmail: request.customer.email,
        customerTier: request.customer.tier,
        transactionId: request.transaction?.id,
        transactionAmount: request.transaction?.amount,
        riskScore: result.riskAssessment.score,
        riskLevel: result.riskAssessment.level,
        riskFactors: result.riskAssessment.factors,
        riskFlags: result.riskAssessment.flags,
        valueScore: result.valueAssessment.score,
        valueTier: result.valueAssessment.tier,
        policyEvaluations: result.policyEvaluations.map(p => ({
          policyId: p.policyId,
          policyName: p.policyName,
          applicable: p.applicable,
          outcome: p.outcome,
          reasoning: p.reasoning
        })),
        approvalRequired: result.approval.required,
        approvalRoute: result.approval.route,
        approvalLevel: result.approval.level,
        approvalReason: result.approval.reason,
        explanation: {
          summary: result.explanation.summary,
          reasoning: result.explanation.reasoning,
          recommendations: result.explanation.recommendations
        },
        alternatives: result.alternatives.map(a => ({
          type: a.type,
          description: a.description,
          amount: a.amount,
          feasibility: a.feasibility
        })),
        processingTime: result.processingTime,
        priority: request.priority,
        context: {
          ipAddress: request.context?.ipAddress,
          userAgent: request.context?.userAgent,
          channel: request.context?.channel,
          agentId: request.context?.agentId
        },
        metadata: result.metadata,
        auditLog: [
          {
            id: uuidv4(),
            action: 'created',
            actor: {
              id: 'decision-engine',
              type: 'system',
              name: 'Decision Intelligence Engine'
            },
            timestamp: new Date()
          }
        ]
      });

      await decision.save();

      logger.info(`Decision persisted`, {
        requestId: result.requestId,
        decisionId: decision._id
      });

    } catch (error) {
      logger.error(`Failed to persist decision`, {
        requestId: result.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - decision was already made
    }
  }
}
