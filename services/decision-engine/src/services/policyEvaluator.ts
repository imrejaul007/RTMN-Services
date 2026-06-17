import {
  DecisionRequest,
  PolicyEvaluation,
  PolicyOutcome
} from '../types';
import { Policy } from '../models/Policy';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class PolicyEvaluator {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Evaluate all applicable policies for a decision request
   */
  async evaluatePolicies(request: DecisionRequest): Promise<PolicyEvaluation[]> {
    const startTime = Date.now();
    logger.info(`Evaluating policies for ${request.type}`, {
      tenantId: this.tenantId,
      customerId: request.customer.id
    });

    // Find all active policies for this decision type
    const policies = await Policy.findActiveByType(this.tenantId, request.type);

    logger.info(`Found ${policies.length} policies to evaluate`, {
      tenantId: this.tenantId
    });

    // Evaluate each policy
    const evaluations: PolicyEvaluation[] = [];

    for (const policy of policies) {
      const evaluation = await this.evaluatePolicy(policy, request);
      evaluations.push(evaluation);
    }

    // Sort by priority (highest first)
    evaluations.sort((a, b) => {
      // Policy evaluations without policyId go last
      if (!a.policyId) return 1;
      if (!b.policyId) return -1;
      return 0;
    });

    const processingTime = Date.now() - startTime;
    logger.info(`Policy evaluation complete`, {
      tenantId: this.tenantId,
      policiesEvaluated: evaluations.length,
      processingTime
    });

    return evaluations;
  }

  /**
   * Evaluate a single policy against the request
   */
  private async evaluatePolicy(policy: any, request: DecisionRequest): Promise<PolicyEvaluation> {
    // Build evaluation context
    const context = this.buildContext(request);

    // Check if policy conditions are met
    const conditionsMet = this.evaluateConditions(policy.conditions, context);

    // Check if policy constraints are satisfied
    const constraints = await this.evaluateConstraints(policy.constraints, request);

    // Determine outcome based on conditions and constraints
    const outcome = this.determineOutcome(policy, conditionsMet, constraints);

    // Generate reasoning
    const reasoning = this.generateReasoning(policy, conditionsMet, constraints, outcome);

    return {
      policyId: policy.policyId,
      policyName: policy.name,
      applicable: true,
      matched: conditionsMet.all,
      constraints,
      outcome,
      recommendation: outcome === 'allow' ? 'approved' :
                      outcome === 'deny' ? 'denied' :
                      outcome === 'escalate' ? 'escalated' : 'partial',
      reasoning
    };
  }

  /**
   * Build context for policy evaluation
   */
  private buildContext(request: DecisionRequest): Record<string, unknown> {
    return {
      // Customer
      'customer.id': request.customer.id,
      'customer.tier': request.customer.tier,
      'customer.lifetimeValue': request.customer.lifetimeValue,
      'customer.accountAge': request.customer.accountAge,
      'customer.previousRefunds': request.customer.previousRefunds,
      'customer.previousDisputes': request.customer.previousDisputes,
      'customer.satisfactionScore': request.customer.satisfactionScore,
      'customer.tags': request.customer.tags,

      // Transaction
      'transaction.id': request.transaction?.id,
      'transaction.amount': request.transaction?.amount,
      'transaction.currency': request.transaction?.currency,
      'transaction.type': request.transaction?.type,
      'transaction.date': request.transaction?.date,

      // Request
      'request.type': request.type,
      'request.requestedAmount': request.requestedAmount,
      'request.priority': request.priority,
      'request.reason': request.reason,
      'request.channel': request.context?.channel,

      // Computed
      'computed.refundRatio': request.transaction?.amount
        ? (request.requestedAmount || 0) / request.transaction.amount
        : 0,
      'computed.isHighValue': (request.transaction?.amount || 0) > 50000,
      'computed.isNewCustomer': request.customer.accountAge < 30,
      'computed.isVIP': ['platinum', 'vip'].includes(request.customer.tier)
    };
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(
    conditions: any[],
    context: Record<string, unknown>
  ): { all: boolean; results: Array<{ condition: any; passed: boolean }> } {
    const results = conditions.map(condition => {
      const fieldValue = this.getNestedValue(context, condition.field);
      const passed = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      return { condition, passed };
    });

    return {
      all: results.every(r => r.passed),
      results
    };
  }

  /**
   * Get nested value from context
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    // First try direct access
    if (path in obj) {
      return obj[path];
    }

    // Then try nested access
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: unknown, operator: string, conditionValue: unknown): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === conditionValue;

      case 'neq':
        return fieldValue !== conditionValue;

      case 'gt':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number'
          && fieldValue > conditionValue;

      case 'gte':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number'
          && fieldValue >= conditionValue;

      case 'lt':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number'
          && fieldValue < conditionValue;

      case 'lte':
        return typeof fieldValue === 'number' && typeof conditionValue === 'number'
          && fieldValue <= conditionValue;

      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);

      case 'nin':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);

      case 'contains':
        return typeof fieldValue === 'string' && typeof conditionValue === 'string'
          && fieldValue.includes(conditionValue);

      case 'exists':
        return conditionValue ? fieldValue !== undefined : fieldValue === undefined;

      default:
        logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  /**
   * Evaluate policy constraints
   */
  private async evaluateConstraints(
    constraints: any[],
    request: DecisionRequest
  ): Promise<Array<{
    name: string;
    satisfied: boolean;
    expected?: string | number;
    actual?: string | number;
  }>> {
    const results = [];

    for (const constraint of constraints) {
      const actual = await this.getConstraintValue(constraint, request);
      const satisfied = this.checkConstraint(constraint, actual);

      results.push({
        name: constraint.name,
        satisfied,
        expected: Array.isArray(constraint.value)
          ? `${constraint.value[0]}-${constraint.value[1]}`
          : constraint.value,
        actual
      });
    }

    return results;
  }

  /**
   * Get actual value for constraint
   */
  private async getConstraintValue(constraint: any, request: DecisionRequest): Promise<number> {
    const { type, period } = constraint;

    switch (type) {
      case 'amount':
        return request.requestedAmount || 0;

      case 'count':
        // Would normally query decision history
        // For now, use request metadata
        return request.metadata?.requestCount as number || 0;

      case 'frequency':
        // Would calculate from historical data
        return request.customer.previousRefunds || 0;

      case 'time':
        // Time-based constraints
        if (request.transaction?.date) {
          const daysSinceTransaction = Math.floor(
            (Date.now() - new Date(request.transaction.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSinceTransaction;
        }
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Check if constraint is satisfied
   */
  private checkConstraint(constraint: any, actual: number): boolean {
    const { operator, value } = constraint;

    switch (operator) {
      case 'lte':
        return actual <= (value as number);

      case 'gte':
        return actual >= (value as number);

      case 'eq':
        return actual === value;

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return actual >= value[0] && actual <= value[1];
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Determine policy outcome
   */
  private determineOutcome(
    policy: any,
    conditionsMet: { all: boolean },
    constraints: Array<{ name: string; satisfied: boolean }>
  ): 'allow' | 'deny' | 'conditional' | 'escalate' {
    if (!conditionsMet.all) {
      return 'deny';
    }

    const allConstraintsSatisfied = constraints.every(c => c.satisfied);

    if (allConstraintsSatisfied) {
      // Check policy outcomes for match
      if (policy.outcomes && policy.outcomes.length > 0) {
        // Default to first matching outcome
        return this.matchPolicyOutcome(policy.outcomes[0]);
      }
      return 'allow';
    }

    // Some constraints not met
    const criticalConstraints = ['amount', 'frequency'];
    const unsatisfiedCritical = constraints.some(
      c => !c.satisfied && criticalConstraints.includes(c.name.toLowerCase())
    );

    if (unsatisfiedCritical) {
      return 'escalate';
    }

    return 'conditional';
  }

  /**
   * Match policy outcome type
   */
  private matchPolicyOutcome(outcome: PolicyOutcome): 'allow' | 'deny' | 'conditional' | 'escalate' {
    switch (outcome.outcome) {
      case 'approved':
        return 'allow';
      case 'denied':
        return 'deny';
      case 'escalated':
        return 'escalate';
      case 'partial':
      case 'requires_review':
        return 'conditional';
      default:
        return 'allow';
    }
  }

  /**
   * Generate reasoning for evaluation
   */
  private generateReasoning(
    policy: any,
    conditionsMet: { all: boolean; results: Array<{ condition: any; passed: boolean }> },
    constraints: Array<{ name: string; satisfied: boolean; expected?: string; actual?: string | number }>,
    outcome: 'allow' | 'deny' | 'conditional' | 'escalate'
  ): string {
    const reasoning: string[] = [];

    // Policy description
    reasoning.push(`Policy: ${policy.name}`);

    // Conditions status
    if (policy.conditions.length > 0) {
      const passedCount = conditionsMet.results.filter(r => r.passed).length;
      reasoning.push(`Conditions: ${passedCount}/${policy.conditions.length} met`);

      if (!conditionsMet.all) {
        const failedConditions = conditionsMet.results
          .filter(r => !r.passed)
          .map(r => r.condition.field);
        reasoning.push(`Failed conditions: ${failedConditions.join(', ')}`);
      }
    }

    // Constraints status
    if (constraints.length > 0) {
      const satisfiedCount = constraints.filter(c => c.satisfied).length;
      reasoning.push(`Constraints: ${satisfiedCount}/${constraints.length} satisfied`);

      const unsatisfied = constraints.filter(c => !c.satisfied);
      for (const c of unsatisfied) {
        reasoning.push(`Constraint "${c.name}" not met: expected ${c.expected}, got ${c.actual}`);
      }
    }

    // Final outcome
    reasoning.push(`Decision: ${outcome.toUpperCase()}`);

    return reasoning.join('; ');
  }
}
