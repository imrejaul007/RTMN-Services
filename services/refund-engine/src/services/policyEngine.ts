import {
  RefundRequest,
  TrustScoreContext
} from '../models/Refund';
import {
  policyStore,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyConditionConfig
} from '../models/Policy';
import { decisionEngine } from './decisionEngine';
import { logger } from '../utils/logger';

export class PolicyEngine {
  /**
   * Evaluate a refund request against all applicable policies
   */
  async evaluate(refund: RefundRequest): Promise<PolicyEvaluationResult | null> {
    try {
      // Find applicable policy
      const policy = policyStore.findByChannel(refund.channel);

      if (!policy || !policy.enabled) {
        logger.warn(`No enabled policy found for channel: ${refund.channel}`);
        return {
          applicable: false,
          matchedRules: [],
          suggestedAction: 'require_review',
          reason: 'No applicable policy found',
          requiresManualReview: true
        };
      }

      // Evaluate against rules
      const matchedRules: PolicyRule[] = [];
      let suggestedAction: PolicyEvaluationResult['suggestedAction'] = 'require_review';
      let requiresManualReview = false;

      // Sort rules by priority
      const sortedRules = [...policy.rules]
        .filter(r => r.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const rule of sortedRules) {
        const matches = await this.evaluateConditions(rule.conditions, rule.conditionLogic, refund);

        if (matches) {
          matchedRules.push(rule);

          // Determine action (take the most restrictive)
          for (const action of rule.actions) {
            if (action === 'auto_reject') {
              suggestedAction = 'auto_reject';
              break;
            }
            if (action === 'require_review' && suggestedAction !== 'auto_reject') {
              suggestedAction = 'require_review';
              requiresManualReview = true;
            }
            if (action === 'auto_approve' && suggestedAction === 'require_review') {
              suggestedAction = 'auto_approve';
              requiresManualReview = false;
            }
            if (action === 'escalate') {
              requiresManualReview = true;
            }
          }
        }
      }

      // Check policy-level auto-approve conditions
      if (suggestedAction !== 'auto_reject') {
        const canAutoApprove = this.checkAutoApproveConditions(refund, policy);

        if (canAutoApprove && suggestedAction !== 'auto_reject') {
          suggestedAction = 'auto_approve';
          requiresManualReview = false;
        }
      }

      // Calculate fees if applicable
      let processingFee: number | undefined;
      let adjustedAmount: number | undefined;

      if (suggestedAction === 'auto_approve' || suggestedAction === 'require_review') {
        // Apply processing fee
        if (policy.processingFeePercent) {
          const shouldWaiveFee = policy.waiveProcessingFeeAbove &&
            refund.refundAmount >= policy.waiveProcessingFeeAbove;

          if (!shouldWaiveFee) {
            processingFee = (refund.refundAmount * policy.processingFeePercent) / 100;
          }
        }

        // Check max refund amount
        if (policy.maxRefundAmount && refund.refundAmount > policy.maxRefundAmount) {
          adjustedAmount = policy.maxRefundAmount;
          logger.info(`Refund amount adjusted from ${refund.refundAmount} to ${policy.maxRefundAmount}`);
        }
      }

      // Check refund window
      if (policy.refundWindowDays) {
        const daysSincePurchase = this.getDaysSincePurchase(refund);
        if (daysSincePurchase > policy.refundWindowDays) {
          return {
            applicable: false,
            policy,
            matchedRules,
            suggestedAction: 'auto_reject',
            reason: `Refund window expired (${daysSincePurchase} days > ${policy.refundWindowDays} days)`,
            requiresManualReview: false
          };
        }
      }

      return {
        applicable: true,
        policy,
        matchedRules,
        suggestedAction,
        processingFee,
        adjustedAmount,
        reason: matchedRules.length > 0
          ? `Matched ${matchedRules.length} rule(s)`
          : 'No rules matched',
        requiresManualReview
      };
    } catch (error) {
      logger.error('Policy evaluation failed:', error);
      return {
        applicable: false,
        matchedRules: [],
        suggestedAction: 'require_review',
        reason: 'Policy evaluation failed',
        requiresManualReview: true
      };
    }
  }

  /**
   * Evaluate conditions against a refund request
   */
  private async evaluateConditions(
    conditions: PolicyConditionConfig[],
    logic: 'AND' | 'OR',
    refund: RefundRequest
  ): Promise<boolean> {
    if (conditions.length === 0) return false;

    const results: boolean[] = [];

    for (const condition of conditions) {
      const result = await this.evaluateSingleCondition(condition, refund);
      results.push(result);
    }

    if (logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateSingleCondition(
    condition: PolicyConditionConfig,
    refund: RefundRequest
  ): Promise<boolean> {
    const trustScore = refund.trustScoreContext?.trustScore || 0;

    switch (condition.condition) {
      case 'trust_score_above':
        return trustScore > Number(condition.value);

      case 'trust_score_below':
        return trustScore < Number(condition.value);

      case 'amount_above':
        return refund.refundAmount > Number(condition.value);

      case 'amount_below':
        return refund.refundAmount < Number(condition.value);

      case 'days_since_purchase_above':
        return this.getDaysSincePurchase(refund) > Number(condition.value);

      case 'days_since_purchase_below':
        return this.getDaysSincePurchase(refund) < Number(condition.value);

      case 'channel_equals':
        return refund.channel === condition.value;

      case 'region_in':
        const regions = Array.isArray(condition.value) ? condition.value : [condition.value];
        return refund.complianceInfo?.region
          ? regions.includes(refund.complianceInfo.region)
          : false;

      case 'customer_first_refund':
        return !refund.trustScoreContext?.previousRefunds ||
               refund.trustScoreContext.previousRefunds === 0;

      case 'customer_refund_count_below':
        return (refund.trustScoreContext?.previousRefunds || 0) < Number(condition.value);

      default:
        logger.warn(`Unknown condition type: ${condition.condition}`);
        return false;
    }
  }

  /**
   * Check auto-approve conditions from policy
   */
  private checkAutoApproveConditions(
    refund: RefundRequest,
    policy: { autoApproveMaxAmount?: number; autoApproveTrustScoreMin?: number }
  ): boolean {
    const trustScore = refund.trustScoreContext?.trustScore || 0;

    // Check amount threshold
    if (policy.autoApproveMaxAmount && refund.refundAmount > policy.autoApproveMaxAmount) {
      return false;
    }

    // Check trust score threshold
    if (policy.autoApproveTrustScoreMin && trustScore < policy.autoApproveTrustScoreMin) {
      return false;
    }

    return true;
  }

  /**
   * Get days since original transaction
   */
  private getDaysSincePurchase(refund: RefundRequest): number {
    const now = new Date();
    const created = new Date(refund.createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate refund against decision engine
   */
  async validateWithDecisionEngine(
    refund: RefundRequest,
    context: Record<string, unknown>
  ): Promise<{ approved: boolean; reason: string }> {
    return decisionEngine.evaluate({
      type: 'refund_request',
      action: 'approve',
      customerId: refund.customerId,
      amount: refund.refundAmount,
      channel: refund.channel,
      reason: refund.reason,
      trustScore: refund.trustScoreContext?.trustScore || 0,
      ...context
    });
  }

  /**
   * Preview policy evaluation without saving
   */
  async preview(refundData: Partial<RefundRequest>): Promise<PolicyEvaluationResult> {
    const mockRefund: RefundRequest = {
      id: 'preview',
      requestId: 'PREVIEW',
      customerId: refundData.customerId || 'preview-customer',
      channel: refundData.channel || 'order',
      channelRefId: refundData.channelRefId || 'preview-ref',
      originalAmount: refundData.originalAmount || 100,
      refundAmount: refundData.refundAmount || 100,
      currency: refundData.currency || 'USD',
      status: 'pending',
      priority: refundData.priority || 'normal',
      reason: refundData.reason || 'customer_request',
      trustScoreContext: refundData.trustScoreContext,
      autoApproved: false,
      auditTrail: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.evaluate(mockRefund) || {
      applicable: false,
      matchedRules: [],
      suggestedAction: 'require_review',
      reason: 'Preview failed',
      requiresManualReview: true
    };
  }
}

export const policyEngine = new PolicyEngine();
