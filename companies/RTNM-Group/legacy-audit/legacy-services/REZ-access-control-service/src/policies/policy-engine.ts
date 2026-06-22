import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { RBACEngine } from '../rbac/rbac-engine';
import { ABACEngine } from '../abac/abac-engine';
import { AccessContext } from '../index';

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  priority: number;
  target: PolicyTarget;
  conditions: PolicyCondition[];
  obligations: PolicyObligation[];
  advice: PolicyAdvice[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface PolicyTarget {
  subjects?: SubjectTarget[];
  resources?: ResourceTarget[];
  actions?: string[];
  environment?: Record<string, any>;
}

export interface SubjectTarget {
  type: 'user' | 'group' | 'role' | 'service';
  ids?: string[];
  attributes?: Record<string, any>;
}

export interface ResourceTarget {
  type: 'document' | 'api' | 'service' | 'data' | 'custom';
  ids?: string[];
  attributes?: Record<string, any>;
}

export interface PolicyCondition {
  id: string;
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches' | 'exists' | 'and' | 'or' | 'not';
  value: any;
  children?: PolicyCondition[];
}

export interface PolicyObligation {
  type: 'log' | 'notify' | 'transform' | 'custom';
  action: string;
  params?: Record<string, any>;
}

export interface PolicyAdvice {
  id: string;
  message: string;
  triggerOn: 'allow' | 'deny' | 'always';
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  matchedPolicies: string[];
  evaluatedPolicies: EvaluatedPolicy[];
  obligations: PolicyObligation[];
  advice: PolicyAdvice[];
  evaluatedAt: Date;
  duration: number;
}

export interface EvaluatedPolicy {
  policyId: string;
  policyName: string;
  matched: boolean;
  reason?: string;
}

export interface PolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PolicyEngine {
  private rbacEngine: RBACEngine;
  private abacEngine: ABACEngine;
  private policies: Map<string, Policy> = new Map();
  private policyNames: Map<string, string> = new Map();

  constructor(rbacEngine: RBACEngine, abacEngine: ABACEngine) {
    this.rbacEngine = rbacEngine;
    this.abacEngine = abacEngine;
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Default policy: Deny all if no other policy matches
    const defaultDeny: Policy = {
      id: 'default-deny',
      name: 'Default Deny',
      description: 'Deny access when no other policy applies',
      effect: 'deny',
      priority: -1000,
      target: {},
      conditions: [],
      obligations: [],
      advice: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Default policy: Allow authenticated users basic access
    const authenticatedAllow: Policy = {
      id: 'authenticated-allow',
      name: 'Authenticated User Access',
      description: 'Allow basic access to authenticated users',
      effect: 'allow',
      priority: -500,
      target: {
        subjects: [{ type: 'user', attributes: { authenticated: true } }],
        actions: ['read']
      },
      conditions: [
        {
          id: uuidv4(),
          attribute: 'subject.authenticated',
          operator: 'eq',
          value: true
        }
      ],
      obligations: [],
      advice: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(defaultDeny.id, defaultDeny);
    this.policies.set(authenticatedAllow.id, authenticatedAllow);
  }

  async evaluate(context: AccessContext): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    const evaluatedPolicies: EvaluatedPolicy[] = [];
    const matchedPolicies: string[] = [];
    const allObligations: PolicyObligation[] = [];
    const allAdvice: PolicyAdvice[] = [];

    // Get applicable policies sorted by priority
    const applicablePolicies = this.getApplicablePolicies(context)
      .sort((a, b) => b.priority - a.priority);

    let finalDecision: 'allow' | 'deny' = 'deny';
    let reason = 'No matching policy found';

    for (const policy of applicablePolicies) {
      const evaluation = await this.evaluatePolicy(policy, context);

      evaluatedPolicies.push({
        policyId: policy.id,
        policyName: policy.name,
        matched: evaluation.matched,
        reason: evaluation.reason
      });

      if (evaluation.matched) {
        matchedPolicies.push(policy.id);

        // Collect obligations
        if (policy.obligations.length > 0) {
          allObligations.push(...policy.obligations);
        }

        // Collect advice
        if (policy.advice.length > 0) {
          allAdvice.push(...policy.advice);
        }

        // Deny takes precedence over allow
        if (policy.effect === 'deny') {
          reason = `Access denied by policy: ${policy.name}`;
          finalDecision = 'deny';
          break;
        } else {
          reason = `Access allowed by policy: ${policy.name}`;
          finalDecision = 'allow';
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      allowed: finalDecision === 'allow',
      reason,
      matchedPolicies,
      evaluatedPolicies,
      obligations: allObligations,
      advice: allAdvice,
      evaluatedAt: new Date(),
      duration
    };
  }

  private async evaluatePolicy(policy: Policy, context: AccessContext): Promise<{ matched: boolean; reason?: string }> {
    // Check if policy is enabled
    if (!policy.enabled) {
      return { matched: false };
    }

    // Check expiration
    if (policy.expiresAt && new Date() > policy.expiresAt) {
      return { matched: false, reason: 'Policy has expired' };
    }

    // Check target match
    const targetMatch = this.evaluateTarget(policy.target, context);
    if (!targetMatch.matched) {
      return { matched: false, reason: targetMatch.reason };
    }

    // Evaluate conditions
    if (policy.conditions.length > 0) {
      const conditionsMatch = await this.evaluateConditions(policy.conditions, context);
      if (!conditionsMatch) {
        return { matched: false, reason: 'Policy conditions not satisfied' };
      }
    }

    return { matched: true };
  }

  private evaluateTarget(target: PolicyTarget, context: AccessContext): { matched: boolean; reason?: string } {
    // Empty target matches everything
    if (Object.keys(target).length === 0) {
      return { matched: true };
    }

    // Check actions
    if (target.actions && target.actions.length > 0) {
      if (!target.actions.includes(context.action) && !target.actions.includes('*')) {
        return { matched: false, reason: 'Action not in target' };
      }
    }

    // Check subjects
    if (target.subjects && target.subjects.length > 0) {
      let subjectMatch = false;
      for (const subject of target.subjects) {
        if (subject.type === 'user' && subject.ids) {
          if (subject.ids.includes(context.userId)) {
            subjectMatch = true;
            break;
          }
        }
        if (subject.type === 'role') {
          const userRoles = this.rbacEngine.getUserRoles(context.userId);
          if (subject.ids && userRoles.some(r => subject.ids!.includes(r))) {
            subjectMatch = true;
            break;
          }
        }
        if (subject.attributes) {
          subjectMatch = true;
        }
      }
      if (!subjectMatch) {
        return { matched: false, reason: 'Subject not in target' };
      }
    }

    // Check resources
    if (target.resources && target.resources.length > 0) {
      let resourceMatch = false;
      for (const resource of target.resources) {
        if (resource.ids && resource.ids.includes(context.resource)) {
          resourceMatch = true;
          break;
        }
        if (resource.type) {
          resourceMatch = true;
        }
      }
      if (!resourceMatch) {
        return { matched: false, reason: 'Resource not in target' };
      }
    }

    return { matched: true };
  }

  private async evaluateConditions(conditions: PolicyCondition[], context: AccessContext): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: PolicyCondition, context: AccessContext): Promise<boolean> {
    // Handle logical operators
    if (condition.operator === 'and' && condition.children) {
      return condition.children.every(c => this.evaluateCondition(c, context));
    }

    if (condition.operator === 'or' && condition.children) {
      return condition.children.some(c => this.evaluateCondition(c, context));
    }

    if (condition.operator === 'not' && condition.children) {
      return !condition.children.every(c => this.evaluateCondition(c, context));
    }

    // Get the actual value
    const value = this.getAttributeValue(condition.attribute, context);
    return this.compareValues(value, condition.value, condition.operator);
  }

  private getAttributeValue(attribute: string, context: AccessContext): any {
    const parts = attribute.split('.');
    const prefix = parts[0];
    const attrName = parts.slice(1).join('.');

    if (prefix === 'subject' || prefix === 'user') {
      if (context.attributes?.user) {
        return context.attributes.user[attrName];
      }
    }

    if (prefix === 'resource') {
      if (context.attributes?.resource) {
        return context.attributes.resource[attrName];
      }
    }

    if (prefix === 'environment') {
      return context.environment?.[attrName];
    }

    if (context.attributes && context.attributes[attribute]) {
      return context.attributes[attribute];
    }

    return undefined;
  }

  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'ne':
        return actual !== expected;
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'contains':
        if (typeof actual === 'string') return actual.includes(expected);
        if (Array.isArray(actual)) return actual.includes(expected);
        return false;
      case 'matches':
        if (typeof actual !== 'string') return false;
        return new RegExp(expected).test(actual);
      case 'exists':
        return actual !== undefined && actual !== null;
      default:
        return false;
    }
  }

  private getApplicablePolicies(context: AccessContext): Policy[] {
    return Array.from(this.policies.values())
      .filter(p => p.enabled && (!p.expiresAt || p.expiresAt > new Date()));
  }

  async addPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    const newPolicy: Policy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(newPolicy.id, newPolicy);
    this.policyNames.set(newPolicy.name, newPolicy.id);
    logger.info(`Policy created: ${newPolicy.name} (${newPolicy.id})`);

    return newPolicy;
  }

  updatePolicy(policyId: string, updates: Partial<Policy>): Policy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    // Handle name change
    if (updates.name && updates.name !== policy.name) {
      this.policyNames.delete(policy.name);
      this.policyNames.set(updates.name, policyId);
    }

    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      id: policyId,
      updatedAt: new Date()
    };

    this.policies.set(policyId, updatedPolicy);
    logger.info(`Policy updated: ${policyId}`);

    return updatedPolicy;
  }

  deletePolicy(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    this.policyNames.delete(policy.name);
    const deleted = this.policies.delete(policyId);

    if (deleted) {
      logger.info(`Policy deleted: ${policyId}`);
    }

    return deleted;
  }

  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  getPolicyByName(name: string): Policy | undefined {
    const policyId = this.policyNames.get(name);
    if (policyId) {
      return this.policies.get(policyId);
    }
    return undefined;
  }

  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  enablePolicy(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    policy.enabled = true;
    policy.updatedAt = new Date();
    logger.info(`Policy enabled: ${policyId}`);

    return true;
  }

  disablePolicy(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    policy.enabled = false;
    policy.updatedAt = new Date();
    logger.info(`Policy disabled: ${policyId}`);

    return true;
  }

  validatePolicy(policy: Partial<Policy>): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!policy.name || policy.name.trim() === '') {
      errors.push('Policy name is required');
    }

    if (!policy.effect || !['allow', 'deny'].includes(policy.effect)) {
      errors.push('Policy effect must be "allow" or "deny"');
    }

    if (policy.priority === undefined) {
      warnings.push('Policy priority not specified, defaulting to 0');
    }

    if (policy.conditions) {
      for (const condition of policy.conditions) {
        if (!condition.attribute) {
          errors.push('Condition attribute is required');
        }
        if (!condition.operator) {
          errors.push('Condition operator is required');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async evaluateWithObligations(context: AccessContext): Promise<PolicyEvaluationResult> {
    const result = await this.evaluate(context);

    // Execute obligations
    for (const obligation of result.obligations) {
      await this.executeObligation(obligation, context, result);
    }

    return result;
  }

  private async executeObligation(
    obligation: PolicyObligation,
    context: AccessContext,
    result: PolicyEvaluationResult
  ): Promise<void> {
    switch (obligation.type) {
      case 'log':
        logger.info(`Obligation: ${obligation.action}`, {
          context,
          result: { allowed: result.allowed, reason: result.reason }
        });
        break;
      case 'notify':
        logger.info(`Notification obligation: ${obligation.action}`);
        break;
      case 'transform':
        logger.debug(`Transform obligation: ${obligation.action}`);
        break;
      default:
        logger.warn(`Unknown obligation type: ${obligation.type}`);
    }
  }
}
