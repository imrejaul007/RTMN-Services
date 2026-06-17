export type PolicyCondition =
  | 'trust_score_above'
  | 'trust_score_below'
  | 'amount_above'
  | 'amount_below'
  | 'days_since_purchase_above'
  | 'days_since_purchase_below'
  | 'item_category_in'
  | 'item_category_not_in'
  | 'channel_equals'
  | 'region_in'
  | 'customer_first_refund'
  | 'customer_refund_count_below';

export type PolicyAction =
  | 'auto_approve'
  | 'auto_reject'
  | 'require_review'
  | 'apply_processing_fee'
  | 'reduce_refund_amount'
  | 'escalate';

export interface PolicyConditionConfig {
  condition: PolicyCondition;
  value: number | string | string[] | boolean;
  operator?: 'and' | 'or';
}

export interface PolicyRule {
  id: string;
  name: string;
  conditions: PolicyConditionConfig[];
  conditionLogic: 'AND' | 'OR';
  actions: PolicyAction[];
  priority: number;
  enabled: boolean;
}

export interface RefundPolicy {
  id: string;
  name: string;
  description: string;
  version: string;

  // Applicability
  channel?: RefundChannel; // If undefined, applies to all channels
  region?: string[];
  itemCategories?: string[];

  // Time windows
  refundWindowDays: number;
  partialRefundWindowDays?: number;

  // Amount limits
  maxRefundAmount?: number;
  minRefundAmount?: number;
  autoApproveMaxAmount?: number;

  // Trust score thresholds
  autoApproveTrustScoreMin?: number;
  manualReviewTrustScoreMin?: number;

  // Fees
  processingFeePercent?: number;
  waiveProcessingFeeAbove?: number;

  // Rules
  rules: PolicyRule[];

  // Status
  enabled: boolean;
  priority: number;

  // Compliance
  regulatoryCompliant: boolean;
  auditRequired: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type RefundChannel = 'order' | 'payment' | 'subscription' | 'wallet' | 'loyalty';

export interface PolicyEvaluationResult {
  applicable: boolean;
  policy?: RefundPolicy;
  matchedRules: PolicyRule[];
  suggestedAction: PolicyAction;
  processingFee?: number;
  adjustedAmount?: number;
  reason: string;
  requiresManualReview: boolean;
}

// In-memory policy store
export class PolicyStore {
  private policies: Map<string, RefundPolicy> = new Map();
  private defaultPolicyId: string | null = null;

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    // Default policy for all refunds
    const defaultPolicy: RefundPolicy = {
      id: 'default',
      name: 'Default Refund Policy',
      description: 'Standard refund policy for all transactions',
      version: '1.0.0',
      refundWindowDays: 30,
      maxRefundAmount: 10000,
      minRefundAmount: 1,
      autoApproveMaxAmount: 500,
      autoApproveTrustScoreMin: 750,
      processingFeePercent: 2.5,
      rules: [
        {
          id: 'auto-approve-high-trust',
          name: 'Auto-approve for high trust customers',
          conditions: [
            { condition: 'trust_score_above', value: 850 },
            { condition: 'amount_below', value: 500 }
          ],
          conditionLogic: 'AND',
          actions: ['auto_approve'],
          priority: 1,
          enabled: true
        },
        {
          id: 'auto-approve-small-amounts',
          name: 'Auto-approve small amounts',
          conditions: [
            { condition: 'amount_below', value: 50 }
          ],
          conditionLogic: 'AND',
          actions: ['auto_approve'],
          priority: 2,
          enabled: true
        },
        {
          id: 'require-review-fraud',
          name: 'Require review for low trust scores',
          conditions: [
            { condition: 'trust_score_below', value: 500 }
          ],
          conditionLogic: 'AND',
          actions: ['require_review', 'escalate'],
          priority: 3,
          enabled: true
        },
        {
          id: 'apply-fee-large-refunds',
          name: 'Apply processing fee for large refunds',
          conditions: [
            { condition: 'amount_above', value: 1000 }
          ],
          conditionLogic: 'AND',
          actions: ['apply_processing_fee'],
          priority: 4,
          enabled: true
        }
      ],
      enabled: true,
      priority: 0,
      regulatoryCompliant: true,
      auditRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.policies.set(defaultPolicy.id, defaultPolicy);
    this.defaultPolicyId = defaultPolicy.id;

    // Order-specific policy
    const orderPolicy: RefundPolicy = {
      id: 'order-refund',
      name: 'Order Refund Policy',
      description: 'Policy for order-based refunds',
      version: '1.0.0',
      channel: 'order',
      refundWindowDays: 30,
      partialRefundWindowDays: 7,
      maxRefundAmount: 50000,
      autoApproveMaxAmount: 1000,
      autoApproveTrustScoreMin: 700,
      processingFeePercent: 2.5,
      waiveProcessingFeeAbove: 5000,
      rules: [
        {
          id: 'order-auto-approve',
          name: 'Auto-approve order refunds under threshold',
          conditions: [
            { condition: 'amount_below', value: 500 },
            { condition: 'trust_score_above', value: 700 }
          ],
          conditionLogic: 'AND',
          actions: ['auto_approve'],
          priority: 1,
          enabled: true
        },
        {
          id: 'order-require-review-damaged',
          name: 'Require review for damaged product claims',
          conditions: [
            { condition: 'channel_equals', value: 'order' }
          ],
          conditionLogic: 'AND',
          actions: ['require_review'],
          priority: 2,
          enabled: true
        }
      ],
      enabled: true,
      priority: 1,
      regulatoryCompliant: true,
      auditRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.policies.set(orderPolicy.id, orderPolicy);

    // Subscription policy
    const subscriptionPolicy: RefundPolicy = {
      id: 'subscription-refund',
      name: 'Subscription Refund Policy',
      description: 'Policy for subscription cancellations and refunds',
      version: '1.0.0',
      channel: 'subscription',
      refundWindowDays: 7,
      maxRefundAmount: 5000,
      autoApproveMaxAmount: 200,
      autoApproveTrustScoreMin: 800,
      processingFeePercent: 5,
      rules: [
        {
          id: 'sub-first-month',
          name: 'First month subscription refund',
          conditions: [
            { condition: 'days_since_purchase_below', value: 7 }
          ],
          conditionLogic: 'AND',
          actions: ['auto_approve'],
          priority: 1,
          enabled: true
        }
      ],
      enabled: true,
      priority: 1,
      regulatoryCompliant: true,
      auditRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.policies.set(subscriptionPolicy.id, subscriptionPolicy);
  }

  create(policy: RefundPolicy): RefundPolicy {
    this.policies.set(policy.id, policy);
    return policy;
  }

  findById(id: string): RefundPolicy | undefined {
    return this.policies.get(id);
  }

  findByChannel(channel: RefundChannel): RefundPolicy | undefined {
    // Find policy specific to channel first
    for (const policy of this.policies.values()) {
      if (policy.channel === channel && policy.enabled) {
        return policy;
      }
    }
    // Fall back to default policy
    return this.defaultPolicyId ? this.policies.get(this.defaultPolicyId) : undefined;
  }

  findAll(): RefundPolicy[] {
    return Array.from(this.policies.values())
      .sort((a, b) => a.priority - b.priority);
  }

  update(id: string, updates: Partial<RefundPolicy>): RefundPolicy | undefined {
    const existing = this.policies.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.policies.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    if (id === 'default') return false; // Can't delete default policy
    return this.policies.delete(id);
  }

  setDefaultPolicy(id: string): boolean {
    if (!this.policies.has(id)) return false;
    this.defaultPolicyId = id;
    return true;
  }
}

export const policyStore = new PolicyStore();
