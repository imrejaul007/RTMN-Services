/**
 * REZ Central Permissions - Policy Engine
 * Evaluates hybrid RBAC+ABAC policies
 */

import {
  Policy,
  PolicyTarget,
  PolicyCondition,
  Obligation,
  Advice,
  PermissionResult,
  Action,
  AttributeMatcher,
} from '../types';

type CombineAlgorithm = 'first-applicable' | 'deny-overrides' | 'permit-overrides' | 'priority-order';

interface PolicyEvaluationRequest {
  subject: {
    id: string;
    type: string;
    roles: string[];
    attributes: Record<string, unknown>;
  };
  resource: {
    type: string;
    id?: string;
  };
  action: Action;
  environment: Record<string, unknown>;
}

const policyStore = new Map<string, Policy>();

export class PolicyEngine {
  private combineAlgorithm: CombineAlgorithm;

  constructor(combineAlgorithm: CombineAlgorithm = 'deny-overrides') {
    this.combineAlgorithm = combineAlgorithm;
  }

  /**
   * Set the combination algorithm
   */
  setCombineAlgorithm(algorithm: CombineAlgorithm): void {
    this.combineAlgorithm = algorithm;
  }

  /**
   * Add a policy to the engine
   */
  async addPolicy(policy: Policy): Promise<void> {
    policyStore.set(policy.id, policy);
  }

  /**
   * Remove a policy from the engine
   */
  async removePolicy(policyId: string): Promise<void> {
    policyStore.delete(policyId);
  }

  /**
   * Get all policies
   */
  async getPolicies(): Promise<Policy[]> {
    return Array.from(policyStore.values());
  }

  /**
   * Get a specific policy
   */
  async getPolicy(policyId: string): Promise<Policy | undefined> {
    return policyStore.get(policyId);
  }

  /**
   * Enable/disable a policy
   */
  async setPolicyEnabled(policyId: string, enabled: boolean): Promise<void> {
    const policy = policyStore.get(policyId);
    if (policy) {
      policy.enabled = enabled;
    }
  }

  /**
   * Evaluate all applicable policies
   */
  async evaluate(request: PolicyEvaluationRequest): Promise<PermissionResult> {
    const applicablePolicies = this.findApplicablePolicies(request);

    if (applicablePolicies.length === 0) {
      return {
        granted: false,
        reason: 'No applicable policies found',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Sort by priority
    applicablePolicies.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Evaluate based on combination algorithm
    return this.combineResults(applicablePolicies, request);
  }

  /**
   * Find policies that match the request
   */
  private findApplicablePolicies(request: PolicyEvaluationRequest): Policy[] {
    const applicable: Policy[] = [];

    for (const policy of policyStore.values()) {
      if (!policy.enabled) {
        continue;
      }

      if (this.matchesTarget(policy.target, request)) {
        applicable.push(policy);
      }
    }

    return applicable;
  }

  /**
   * Check if a policy target matches the request
   */
  private matchesTarget(target: PolicyTarget, request: PolicyEvaluationRequest): boolean {
    // Check subjects
    if (target.subjects && target.subjects.length > 0) {
      const subjectMatches = target.subjects.every(matcher =>
        this.matchesAttribute(matcher, request.subject)
      );
      if (!subjectMatches) {
        return false;
      }
    }

    // Check resources
    if (target.resources && target.resources.length > 0) {
      if (!target.resources.includes(request.resource.type) && !target.resources.includes('*')) {
        return false;
      }
    }

    // Check actions
    if (target.actions && target.actions.length > 0) {
      if (!target.actions.includes(request.action) && !target.actions.includes('*')) {
        return false;
      }
    }

    // Check contexts
    if (target.contexts && target.contexts.length > 0) {
      const contextMatches = target.contexts.every(matcher =>
        this.matchesAttribute(matcher, request.environment)
      );
      if (!contextMatches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match an attribute against a matcher
   */
  private matchesAttribute(matcher: AttributeMatcher, attributes: Record<string, unknown>): boolean {
    const value = attributes[matcher.attribute];
    const expected = matcher.value;

    switch (matcher.operator) {
      case 'eq':
        return value === expected;
      case 'ne':
        return value !== expected;
      case 'gt':
        return typeof value === 'number' && typeof expected === 'number' && value > expected;
      case 'lt':
        return typeof value === 'number' && typeof expected === 'number' && value < expected;
      case 'gte':
        return typeof value === 'number' && typeof expected === 'number' && value >= expected;
      case 'lte':
        return typeof value === 'number' && typeof expected === 'number' && value <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'nin':
        return Array.isArray(expected) && !expected.includes(value);
      case 'contains':
        if (typeof value === 'string' && typeof expected === 'string') {
          return value.includes(expected);
        }
        return false;
      case 'startsWith':
        return typeof value === 'string' && typeof expected === 'string' && value.startsWith(expected);
      case 'endsWith':
        return typeof value === 'string' && typeof expected === 'string' && value.endsWith(expected);
      case 'regex':
        if (typeof value === 'string' && typeof expected === 'string') {
          try {
            return new RegExp(expected).test(value);
          } catch {
            return false;
          }
        }
        return false;
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Combine results using the configured algorithm
   */
  private combineResults(policies: Policy[], request: PolicyEvaluationRequest): PermissionResult {
    switch (this.combineAlgorithm) {
      case 'first-applicable':
        return this.firstApplicable(policies, request);

      case 'deny-overrides':
        return this.denyOverrides(policies, request);

      case 'permit-overrides':
        return this.permitOverrides(policies, request);

      case 'priority-order':
        return this.priorityOrder(policies, request);

      default:
        return this.denyOverrides(policies, request);
    }
  }

  /**
   * First applicable policy wins
   */
  private firstApplicable(policies: Policy[], _request: PolicyEvaluationRequest): PermissionResult {
    for (const policy of policies) {
      if (this.evaluateConditions(policy.conditions)) {
        return this.buildResult(policy);
      }
    }

    return {
      granted: false,
      reason: 'No policy conditions matched',
      evaluated_policies: policies.map(p => p.id),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Deny takes precedence
   */
  private denyOverrides(policies: Policy[], _request: PolicyEvaluationRequest): PermissionResult {
    for (const policy of policies) {
      if (!this.evaluateConditions(policy.conditions)) {
        continue;
      }

      if (policy.effect === 'deny') {
        return this.buildResult(policy);
      }
    }

    // Check for any permit
    for (const policy of policies) {
      if (!this.evaluateConditions(policy.conditions)) {
        continue;
      }

      if (policy.effect === 'permit') {
        return this.buildResult(policy);
      }
    }

    return {
      granted: false,
      reason: 'Default deny (no matching policy)',
      evaluated_policies: policies.map(p => p.id),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Permit takes precedence
   */
  private permitOverrides(policies: Policy[], _request: PolicyEvaluationRequest): PermissionResult {
    for (const policy of policies) {
      if (!this.evaluateConditions(policy.conditions)) {
        continue;
      }

      if (policy.effect === 'permit') {
        return this.buildResult(policy);
      }
    }

    // Check for any deny
    for (const policy of policies) {
      if (!this.evaluateConditions(policy.conditions)) {
        continue;
      }

      if (policy.effect === 'deny') {
        return this.buildResult(policy);
      }
    }

    return {
      granted: false,
      reason: 'Default deny (no matching policy)',
      evaluated_policies: policies.map(p => p.id),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Priority order determines outcome
   */
  private priorityOrder(policies: Policy[], _request: PolicyEvaluationRequest): PermissionResult {
    // Policies are already sorted by priority
    for (const policy of policies) {
      if (this.evaluateConditions(policy.conditions)) {
        return this.buildResult(policy);
      }
    }

    return {
      granted: false,
      reason: 'Default deny (no matching policy)',
      evaluated_policies: policies.map(p => p.id),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(conditions?: PolicyCondition[]): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition): boolean {
    const { conditions, combinator } = condition;

    if (combinator === 'and') {
      return conditions.every(c => this.evaluateAttributeMatcher(c));
    } else {
      return conditions.some(c => this.evaluateAttributeMatcher(c));
    }
  }

  /**
   * Evaluate an attribute matcher within a condition
   */
  private evaluateAttributeMatcher(matcher: AttributeMatcher): boolean {
    // This is a simplified version - in production, you'd check against actual values
    return true;
  }

  /**
   * Build a permission result from a policy
   */
  private buildResult(policy: Policy): PermissionResult {
    return {
      granted: policy.effect === 'permit',
      reason: `Policy: ${policy.name}`,
      matched_policy: policy.id,
      evaluated_policies: [policy.id],
      evaluation_time_ms: 0,
      obligations: policy.obligations,
      advice: policy.advice,
    };
  }
}
