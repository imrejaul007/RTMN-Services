import { ApprovalRule, RuleCondition, RuleAction, ApprovalRecord } from '../models/Approval';
import { rulesStore } from '../models/Rules';

export class RuleEngine {
  /**
   * Evaluate conditions against data
   */
  evaluateCondition(condition: RuleCondition, data: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue === targetValue;
      case 'neq':
        return fieldValue !== targetValue;
      case 'gt':
        return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue > targetValue;
      case 'gte':
        return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue >= targetValue;
      case 'lt':
        return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue < targetValue;
      case 'lte':
        return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue <= targetValue;
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && typeof targetValue === 'string' && fieldValue.includes(targetValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate all conditions for a rule
   */
  evaluateRule(rule: ApprovalRule, data: Record<string, any>): boolean {
    if (rule.conditions.length === 0) return true;

    let result = true;
    let currentOperator: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);

      if (i === 0) {
        result = conditionResult;
      } else {
        // Use the logical operator from previous condition or default to AND
        if (currentOperator === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set current operator for next iteration
      currentOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * Find all matching rules for given data
   */
  findMatchingRules(data: {
    requestType: string;
    trustScore?: number;
    vipTier?: string;
    amount?: number;
    metadata?: Record<string, any>;
  }): ApprovalRule[] {
    const rules = rulesStore.getByRequestType(data.requestType);

    const matchingRules = rules.filter(rule =>
      this.evaluateRule(rule, {
        requestType: data.requestType,
        trustScore: data.trustScore || 0,
        vipTier: data.vipTier || 'NONE',
        amount: data.amount || 0,
        metadata: data.metadata || {}
      })
    );

    // Sort by priority (lower number = higher priority)
    return matchingRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate record and determine action
   */
  evaluateRecord(record: ApprovalRecord): {
    matchedRule: ApprovalRule | null;
    action: RuleAction | null;
    shouldApprove: boolean;
  } {
    const rules = rulesStore.getByRequestType(record.requestType);

    // Build evaluation data from record
    const data = {
      requestType: record.requestType,
      trustScore: record.trustScore || 0,
      vipTier: record.vipTier || 'NONE',
      amount: record.amount || 0,
      metadata: record.metadata || {}
    };

    // Find first matching rule (highest priority)
    const matchingRule = rules.find(rule =>
      rule.isActive && this.evaluateRule(rule, data)
    );

    if (!matchingRule) {
      return {
        matchedRule: null,
        action: null,
        shouldApprove: false
      };
    }

    // Return first action from matched rule
    const action = matchingRule.actions[0];

    return {
      matchedRule,
      action,
      shouldApprove: action.type === 'APPROVE'
    };
  }

  /**
   * Initialize default rules
   */
  initializeDefaultRules(): void {
    rulesStore.initializeDefaultRules();
  }

  /**
   * Get recommendation for manual review
   */
  getRecommendation(record: ApprovalRecord): {
    recommendedAction: 'APPROVE' | 'REJECT' | 'ESCALATE';
    confidence: number;
    reasons: string[];
  } {
    const { matchedRule, action } = this.evaluateRecord(record);
    const reasons: string[] = [];
    let confidence = 0.5;

    if (matchedRule) {
      reasons.push(`Rule matched: ${matchedRule.name}`);
      confidence = 0.8;
    }

    if (record.trustScore !== undefined) {
      if (record.trustScore >= 80) {
        reasons.push('High trust score (80+)');
        confidence += 0.1;
      } else if (record.trustScore < 40) {
        reasons.push('Low trust score (<40)');
        confidence -= 0.2;
      }
    }

    if (record.vipTier && ['GOLD', 'PLATINUM', 'DIAMOND'].includes(record.vipTier)) {
      reasons.push(`VIP ${record.vipTier} customer`);
      confidence += 0.1;
    }

    if (record.amount && record.amount > 100000) {
      reasons.push('High-value transaction');
    }

    confidence = Math.max(0, Math.min(1, confidence));

    let recommendedAction: 'APPROVE' | 'REJECT' | 'ESCALATE' = 'ESCALATE';
    if (action?.type === 'APPROVE') {
      recommendedAction = 'APPROVE';
    } else if (action?.type === 'REJECT') {
      recommendedAction = 'REJECT';
    } else if (action?.type === 'ESCALATE') {
      recommendedAction = 'ESCALATE';
    }

    return {
      recommendedAction,
      confidence,
      reasons
    };
  }
}
