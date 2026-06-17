import { ApprovalRule, RuleCondition, RuleAction } from './Approval';
import { v4 as uuidv4 } from 'uuid';

class RulesStore {
  private rules: Map<string, ApprovalRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  create(rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>): ApprovalRule {
    const newRule: ApprovalRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  get(id: string): ApprovalRule | undefined {
    return this.rules.get(id);
  }

  getByRequestType(requestType: string): ApprovalRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.requestType === requestType && r.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  getAll(): ApprovalRule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => a.priority - b.priority);
  }

  getActive(): ApprovalRule[] {
    return Array.from(this.rules.values())
      .filter(r => r.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  update(id: string, updates: Partial<ApprovalRule>): ApprovalRule | undefined {
    const existing = this.rules.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.rules.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.rules.delete(id);
  }

  toggleActive(id: string): ApprovalRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    this.rules.set(id, rule);
    return rule;
  }

  initializeDefaultRules(): void {
    if (this.rules.size > 0) return;

    const defaultRules: ApprovalRule[] = [
      // VIP Diamond - High trust, auto approve
      {
        id: uuidv4(),
        name: 'VIP Diamond Auto Approve',
        description: 'Auto approve transactions for Diamond VIP customers',
        requestType: 'TRANSACTION',
        priority: 1,
        conditions: [
          { field: 'vipTier', operator: 'eq', value: 'DIAMOND' },
          { field: 'trustScore', operator: 'gte', value: 90 }
        ],
        actions: [
          { type: 'APPROVE', reason: 'VIP Diamond customer with excellent trust score' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // VIP Platinum - High trust
      {
        id: uuidv4(),
        name: 'VIP Platinum Auto Approve',
        description: 'Auto approve for Platinum VIP with good trust score',
        requestType: 'TRANSACTION',
        priority: 2,
        conditions: [
          { field: 'vipTier', operator: 'eq', value: 'PLATINUM' },
          { field: 'trustScore', operator: 'gte', value: 80 }
        ],
        actions: [
          { type: 'APPROVE', reason: 'VIP Platinum customer with good trust score' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Low trust score - Reject
      {
        id: uuidv4(),
        name: 'Low Trust Score Rejection',
        description: 'Reject requests from customers with low trust scores',
        requestType: 'TRANSACTION',
        priority: 100,
        conditions: [
          { field: 'trustScore', operator: 'lt', value: 40 }
        ],
        actions: [
          { type: 'REJECT', reason: 'Trust score below minimum threshold' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // High amount - Manual review
      {
        id: uuidv4(),
        name: 'High Amount Manual Review',
        description: 'Require manual review for high-value transactions',
        requestType: 'TRANSACTION',
        priority: 50,
        conditions: [
          { field: 'amount', operator: 'gt', value: 100000 }
        ],
        actions: [
          { type: 'ESCALATE', reason: 'High-value transaction requires manual review' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Refund auto approve for good customers
      {
        id: uuidv4(),
        name: 'VIP Refund Auto Approve',
        description: 'Auto approve refunds for Gold+ VIP customers',
        requestType: 'REFUND',
        priority: 1,
        conditions: [
          { field: 'vipTier', operator: 'in', value: ['GOLD', 'PLATINUM', 'DIAMOND'] },
          { field: 'trustScore', operator: 'gte', value: 70 }
        ],
        actions: [
          { type: 'APPROVE', reason: 'VIP customer with good standing' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Credit increase policy
      {
        id: uuidv4(),
        name: 'Credit Increase for Excellent Customers',
        description: 'Auto approve credit increases for excellent customers',
        requestType: 'CREDIT_INCREASE',
        priority: 1,
        conditions: [
          { field: 'trustScore', operator: 'gte', value: 85 },
          { field: 'vipTier', operator: 'in', value: ['GOLD', 'PLATINUM', 'DIAMOND'] }
        ],
        actions: [
          { type: 'APPROVE', reason: 'Excellent customer profile' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Account upgrade for good customers
      {
        id: uuidv4(),
        name: 'Account Upgrade Auto Approve',
        description: 'Auto approve account upgrades for good-standing customers',
        requestType: 'ACCOUNT_UPGRADE',
        priority: 1,
        conditions: [
          { field: 'trustScore', operator: 'gte', value: 60 },
          { field: 'vipTier', operator: 'neq', value: 'NONE' }
        ],
        actions: [
          { type: 'APPROVE', reason: 'Customer in good standing' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Manager escalation for disputes
      {
        id: uuidv4(),
        name: 'Manager Escalation for Disputes',
        description: 'Escalate to manager for customers with recent disputes',
        requestType: 'REFUND',
        priority: 75,
        conditions: [
          { field: 'metadata.disputeHistory', operator: 'gt', value: 2 }
        ],
        actions: [
          { type: 'ESCALATE', reason: 'Recent dispute history requires manager review' }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  reset(): void {
    this.rules.clear();
    this.initializeDefaultRules();
  }
}

export const rulesStore = new RulesStore();
