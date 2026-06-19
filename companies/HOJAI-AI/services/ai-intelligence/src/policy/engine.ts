/**
 * HOJAI Intelligence - Policy Engine
 * Evaluates policies and determines appropriate actions
 */

import { v4 as uuidv4 } from 'uuid';
import { Policy, PolicyCondition, PolicyEvaluationResult, PolicyEvaluationResult as PolicyEvalResult } from '../types';
import { organizationMemory } from '../memory/organizationMemory';

// Policy operators
type Operator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'nin';

export class PolicyEngine {
  /**
   * Evaluate policies for a given context
   */
  async evaluate(
    orgId: string,
    context: Record<string, unknown>
  ): Promise<PolicyEvalResult> {
    const policies = await organizationMemory.getPolicies(orgId);

    if (policies.length === 0) {
      return {
        applicablePolicies: [],
        recommendedActions: [],
        requiresApproval: false,
      };
    }

    // Evaluate each policy
    const applicablePolicies: Policy[] = [];
    const allActions: string[] = [];
    let requiresApproval = false;
    const approverRoles: string[] = [];

    for (const policy of policies) {
      if (this.evaluateConditions(policy.conditions, context)) {
        applicablePolicies.push(policy);
        allActions.push(...policy.actions);

        // Check if policy requires approval
        if (policy.actions.some(a => a.includes('approval') || a.includes('manager'))) {
          requiresApproval = true;
          approverRoles.push(this.getApproverRole(policy));
        }
      }
    }

    // Sort applicable policies by priority
    applicablePolicies.sort((a, b) => b.priority - a.priority);

    // Deduplicate actions while preserving order
    const uniqueActions = [...new Set(allActions)];

    return {
      applicablePolicies,
      recommendedActions: uniqueActions,
      requiresApproval,
      approverRoles: [...new Set(approverRoles)],
    };
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(
    conditions: PolicyCondition[],
    context: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return false;

    // All conditions must be met (AND logic)
    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: PolicyCondition,
    context: Record<string, unknown>
  ): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue === targetValue;

      case 'neq':
        return fieldValue !== targetValue;

      case 'gt':
        return typeof fieldValue === 'number' && typeof targetValue === 'number'
          ? fieldValue > targetValue
          : false;

      case 'lt':
        return typeof fieldValue === 'number' && typeof targetValue === 'number'
          ? fieldValue < targetValue
          : false;

      case 'gte':
        return typeof fieldValue === 'number' && typeof targetValue === 'number'
          ? fieldValue >= targetValue
          : false;

      case 'lte':
        return typeof fieldValue === 'number' && typeof targetValue === 'number'
          ? fieldValue <= targetValue
          : false;

      case 'contains':
        if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
          return fieldValue.toLowerCase().includes(targetValue.toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(targetValue);
        }
        return false;

      case 'in':
        if (Array.isArray(targetValue)) {
          return targetValue.includes(fieldValue);
        }
        return false;

      case 'nin':
        if (Array.isArray(targetValue)) {
          return !targetValue.includes(fieldValue);
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Get required approver role for policy
   */
  private getApproverRole(policy: Policy): string {
    // Determine approver based on policy characteristics
    if (policy.name.toLowerCase().includes('high value')) {
      return 'finance_manager';
    }
    if (policy.name.toLowerCase().includes('legal')) {
      return 'legal_team';
    }
    if (policy.priority >= 25) {
      return 'senior_manager';
    }
    return 'supervisor';
  }

  /**
   * Check if action is automated
   */
  isAutomatedAction(action: string): boolean {
    const nonAutomatedActions = [
      'require_manager_approval',
      'legal_review',
      'executive_approval',
      'fraud_investigation',
    ];

    return !nonAutomatedActions.some(na => action.includes(na));
  }

  /**
   * Filter automated-eligible actions
   */
  filterAutomatedActions(actions: string[]): string[] {
    return actions.filter(action => this.isAutomatedAction(action));
  }

  /**
   * Get policy explanation
   */
  async explain(
    orgId: string,
    context: Record<string, unknown>
  ): Promise<Array<{ policy: Policy; matched: boolean; reason: string }>> {
    const policies = await organizationMemory.getPolicies(orgId);

    return policies.map(policy => {
      const matched = this.evaluateConditions(policy.conditions, context);
      const reasons = policy.conditions
        .map(c => `${c.field} ${c.operator} ${c.value}`)
        .join(' AND ');

      return {
        policy,
        matched,
        reason: matched
          ? `Conditions met: ${reasons}`
          : `Conditions not met: ${reasons}`,
      };
    });
  }

  /**
   * Simulate policy changes
   */
  async simulate(
    orgId: string,
    currentContext: Record<string, unknown>,
    policyChanges: Array<{ policyId: string; changes: Partial<Policy> }>
  ): Promise<{
    currentResult: PolicyEvalResult;
    simulatedResult: PolicyEvalResult;
    differences: string[];
  }> {
    // Get current result
    const currentResult = await this.evaluate(orgId, currentContext);

    // Simulate changes
    const simulatedPolicies = await organizationMemory.getPolicies(orgId);
    for (const change of policyChanges) {
      const policyIndex = simulatedPolicies.findIndex(p => p.id === change.policyId);
      if (policyIndex >= 0) {
        simulatedPolicies[policyIndex] = {
          ...simulatedPolicies[policyIndex],
          ...change.changes,
        };
      }
    }

    // Evaluate with simulated policies (simplified - in production, would need deeper integration)
    const simulatedResult = await this.evaluate(orgId, currentContext);

    // Calculate differences
    const differences: string[] = [];
    if (currentResult.recommendedActions.length !== simulatedResult.recommendedActions.length) {
      differences.push('Recommended actions changed');
    }
    if (currentResult.requiresApproval !== simulatedResult.requiresApproval) {
      differences.push('Approval requirement changed');
    }

    return {
      currentResult,
      simulatedResult,
      differences,
    };
  }

  /**
   * Get policy audit trail
   */
  async getAuditTrail(
    orgId: string,
    startDate?: number,
    endDate?: number
  ): Promise<Array<{
    timestamp: number;
    context: Record<string, unknown>;
    matchedPolicies: string[];
    actions: string[];
  }>> {
    // In production, this would query a persistent audit log
    // For now, return empty array
    return [];
  }

  /**
   * Create policy from template
   */
  createPolicyFromTemplate(
    template: 'refund' | 'escalation' | 'retention' | 'discount',
    overrides?: Partial<Policy>
  ): Omit<Policy, 'id'> {
    const templates: Record<string, Omit<Policy, 'id'>> = {
      refund: {
        name: 'Custom Refund Policy',
        description: 'Custom refund policy based on organization rules',
        conditions: [
          { field: 'requestType', operator: 'eq', value: 'refund' },
        ],
        actions: ['process_refund'],
        priority: 10,
        active: true,
      },
      escalation: {
        name: 'Custom Escalation Policy',
        description: 'Custom escalation rules',
        conditions: [
          { field: 'sentimentScore', operator: 'lt', value: -0.3 },
        ],
        actions: ['offer_supervisor'],
        priority: 15,
        active: true,
      },
      retention: {
        name: 'Customer Retention Policy',
        description: 'Retention offers for at-risk customers',
        conditions: [
          { field: 'churnRisk', operator: 'eq', value: 'high' },
        ],
        actions: ['offer_discount', 'schedule_callback'],
        priority: 20,
        active: true,
      },
      discount: {
        name: 'Discount Authorization',
        description: 'Discount approval rules',
        conditions: [
          { field: 'discountPercent', operator: 'lte', value: 20 },
        ],
        actions: ['auto_approve_discount'],
        priority: 5,
        active: true,
      },
    };

    return {
      ...templates[template],
      ...overrides,
    };
  }
}

export const policyEngine = new PolicyEngine();