// ============================================================================
// SUTAR Decision Engine - Policy Engine Service
// ============================================================================

import type { Condition, DecisionContext, Policy, PolicyRule } from '../types/index.js';
import type { DecisionOutcome } from '../types/index.js';
import { DecisionType, DecisionOutcome as DecisionOutcomeEnum, ConditionOperator } from '../types/index.js';

/**
 * PolicyEngine evaluates policies and rules against decision context
 */
export class PolicyEngine {
  private policies: Map<DecisionType, Policy> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default policies for all decision types
   */
  private initializeDefaultPolicies(): void {
    // OFFER Policy
    this.policies.set(DecisionType.OFFER, {
      id: 'policy-offer-default',
      name: 'Default Offer Policy',
      decisionType: DecisionType.OFFER,
      description: 'Default policy for offer decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-offer-high-risk',
          name: 'High Risk Offer',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 70 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'Risk score too high for offer',
        },
        {
          id: 'rule-offer-new-customer',
          name: 'New Customer Restriction',
          conditions: [
            { field: 'accountAge', operator: ConditionOperator.LT, value: 30 },
            { field: 'amount', operator: ConditionOperator.GTE, value: 1000 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 20,
          reason: 'New customer with high amount offer requires review',
        },
        {
          id: 'rule-offer-vip-express',
          name: 'VIP Express',
          conditions: [
            { field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.PROCEED,
          priority: 5,
          reason: 'VIP customers always approved for offers',
        },
      ],
    });

    // CASHBACK Policy
    this.policies.set(DecisionType.CASHBACK, {
      id: 'policy-cashback-default',
      name: 'Default Cashback Policy',
      decisionType: DecisionType.CASHBACK,
      description: 'Default policy for cashback decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-cashback-high-amount',
          name: 'High Amount Cashback',
          conditions: [
            { field: 'amount', operator: ConditionOperator.GTE, value: 5000 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High amount cashback requires manual review',
        },
        {
          id: 'rule-cashback-new-account',
          name: 'New Account Cashback',
          conditions: [
            { field: 'accountAge', operator: ConditionOperator.LT, value: 90 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.REJECT,
          priority: 15,
          reason: 'Cashback not available for accounts under 90 days',
        },
      ],
    });

    // PERSONALIZATION Policy
    this.policies.set(DecisionType.PERSONALIZATION, {
      id: 'policy-personalization-default',
      name: 'Default Personalization Policy',
      decisionType: DecisionType.PERSONALIZATION,
      description: 'Default policy for personalization decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-personalization-risk-threshold',
          name: 'Risk Threshold',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 80 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'Risk score too high for personalization',
        },
      ],
    });

    // ROUTING Policy
    this.policies.set(DecisionType.ROUTING, {
      id: 'policy-routing-default',
      name: 'Default Routing Policy',
      decisionType: DecisionType.ROUTING,
      description: 'Default policy for routing decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-routing-high-risk',
          name: 'High Risk Routing',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 75 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High risk transactions require manual routing',
        },
      ],
    });

    // FRAUD Policy
    this.policies.set(DecisionType.FRAUD, {
      id: 'policy-fraud-default',
      name: 'Default Fraud Policy',
      decisionType: DecisionType.FRAUD,
      description: 'Default policy for fraud decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.HOLD,
      rules: [
        {
          id: 'rule-fraud-critical',
          name: 'Critical Fraud Risk',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 85 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.REJECT,
          priority: 5,
          reason: 'Critical fraud risk detected - transaction rejected',
        },
        {
          id: 'rule-fraud-high',
          name: 'High Fraud Risk',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 60 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High fraud risk - pending review',
        },
        {
          id: 'rule-fraud-new-account',
          name: 'New Account Fraud Check',
          conditions: [
            { field: 'accountAge', operator: ConditionOperator.LT, value: 7 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 15,
          reason: 'New account requires additional fraud verification',
        },
      ],
    });

    // PRICING Policy
    this.policies.set(DecisionType.PRICING, {
      id: 'policy-pricing-default',
      name: 'Default Pricing Policy',
      decisionType: DecisionType.PRICING,
      description: 'Default policy for pricing decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-pricing-high-risk',
          name: 'High Risk Pricing',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 70 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High risk customer pricing requires review',
        },
        {
          id: 'rule-pricing-premium-tier',
          name: 'Premium Tier Pricing',
          conditions: [
            { field: 'customerTier', operator: ConditionOperator.IN, value: ['premium', 'vip'] },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.PROCEED,
          priority: 5,
          reason: 'Premium customers get standard pricing',
        },
      ],
    });

    // NEXT_ACTION Policy
    this.policies.set(DecisionType.NEXT_ACTION, {
      id: 'policy-next-action-default',
      name: 'Default Next Action Policy',
      decisionType: DecisionType.NEXT_ACTION,
      description: 'Default policy for next action decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [],
    });

    // RETENTION Policy
    this.policies.set(DecisionType.RETENTION, {
      id: 'policy-retention-default',
      name: 'Default Retention Policy',
      decisionType: DecisionType.RETENTION,
      description: 'Default policy for retention decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [
        {
          id: 'rule-retention-vip',
          name: 'VIP Retention Priority',
          conditions: [
            { field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.PROCEED,
          priority: 5,
          reason: 'VIP customers are priority for retention offers',
        },
      ],
    });

    // APPROVAL Policy
    this.policies.set(DecisionType.APPROVAL, {
      id: 'policy-approval-default',
      name: 'Default Approval Policy',
      decisionType: DecisionType.APPROVAL,
      description: 'Default policy for approval decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.HOLD,
      rules: [
        {
          id: 'rule-approval-high-amount',
          name: 'High Amount Approval',
          conditions: [
            { field: 'amount', operator: ConditionOperator.GTE, value: 10000 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High amount requires manual approval',
        },
        {
          id: 'rule-approval-vip-auto',
          name: 'VIP Auto Approval',
          conditions: [
            { field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' },
            { field: 'amount', operator: ConditionOperator.LT, value: 50000 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.PROCEED,
          priority: 5,
          reason: 'VIP customers auto-approved for amounts under 50000',
        },
      ],
    });

    // RISK Policy
    this.policies.set(DecisionType.RISK, {
      id: 'policy-risk-default',
      name: 'Default Risk Policy',
      decisionType: DecisionType.RISK,
      description: 'Default policy for risk decisions',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.HOLD,
      rules: [
        {
          id: 'rule-risk-critical',
          name: 'Critical Risk',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 90 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.REJECT,
          priority: 5,
          reason: 'Critical risk level - reject recommended',
        },
        {
          id: 'rule-risk-high',
          name: 'High Risk',
          conditions: [
            { field: 'riskScore', operator: ConditionOperator.GTE, value: 70 },
          ],
          conditionLogic: 'AND',
          outcome: DecisionOutcomeEnum.HOLD,
          priority: 10,
          reason: 'High risk level - hold for review',
        },
      ],
    });
  }

  /**
   * Get policy for a decision type
   */
  getPolicy(decisionType: DecisionType): Policy | undefined {
    return this.policies.get(decisionType);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Register or update a policy
   */
  registerPolicy(policy: Policy): void {
    this.policies.set(policy.decisionType, policy);
  }

  /**
   * Evaluate a policy against context and return the decision
   */
  evaluate(context: DecisionContext, overridePolicyId?: string): {
    policy: Policy;
    rule?: PolicyRule;
    outcome: DecisionOutcome;
    reason: string;
    confidence: number;
  } {
    const policy = this.policies.get(context.decisionType);

    if (!policy || !policy.enabled) {
      return {
        policy: this.createDefaultPolicy(context.decisionType),
        outcome: DecisionOutcomeEnum.PROCEED,
        reason: 'No policy found - defaulting to PROCEED',
        confidence: 0.5,
      };
    }

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);

    // Evaluate each rule
    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context)) {
        return {
          policy,
          rule,
          outcome: rule.outcome,
          reason: rule.reason,
          confidence: 0.9,
        };
      }
    }

    // No rules matched - use default outcome
    return {
      policy,
      outcome: policy.defaultOutcome,
      reason: `No rules matched - using default: ${policy.defaultOutcome}`,
      confidence: 0.7,
    };
  }

  /**
   * Evaluate a single rule against context
   */
  evaluateRule(rule: PolicyRule, context: DecisionContext): boolean {
    const results = rule.conditions.map(condition => this.evaluateCondition(condition, context));

    if (rule.conditionLogic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition against context
   */
  evaluateCondition(condition: Condition, context: DecisionContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (condition.operator) {
      case ConditionOperator.EQ:
        return fieldValue === condition.value;

      case ConditionOperator.NE:
        return fieldValue !== condition.value;

      case ConditionOperator.GT:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue > condition.value
          : false;

      case ConditionOperator.LT:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue < condition.value
          : false;

      case ConditionOperator.GTE:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue >= condition.value
          : false;

      case ConditionOperator.LTE:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue <= condition.value
          : false;

      case ConditionOperator.IN:
        if (Array.isArray(condition.value)) {
          const valueArray = condition.value as (string | number)[];
          return valueArray.includes(fieldValue as string | number);
        }
        return false;

      case ConditionOperator.CONTAINS:
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          return fieldValue.includes(condition.value);
        }
        if (Array.isArray(fieldValue) && typeof condition.value === 'string') {
          return (fieldValue as string[]).includes(condition.value);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(field: string, context: DecisionContext): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Create a default policy for a decision type
   */
  private createDefaultPolicy(decisionType: DecisionType): Policy {
    return {
      id: `policy-${decisionType.toLowerCase()}-default`,
      name: `Default ${decisionType} Policy`,
      decisionType,
      description: 'Auto-generated default policy',
      enabled: true,
      defaultOutcome: DecisionOutcomeEnum.PROCEED,
      rules: [],
    };
  }
}
