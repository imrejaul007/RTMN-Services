import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AccessContext } from '../index';

export interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  priority: number;
  target: ABACTarget;
  conditions: ABACCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ABACTarget {
  users?: UserTarget[];
  resources?: ResourceTarget[];
  actions?: string[];
  environment?: Record<string, any>;
}

export interface UserTarget {
  attribute: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches';
}

export interface ResourceTarget {
  attribute: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches';
}

export interface ABACCondition {
  attribute: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches' | 'and' | 'or' | 'not';
  children?: ABACCondition[];
}

export interface ABACEvaluationResult {
  allowed: boolean;
  reason: string;
  matchedPolicies: string[];
  evaluatedAt: Date;
}

export interface ResourceAttributes {
  [resourceId: string]: Record<string, any>;
}

export interface UserAttributes {
  [userId: string]: Record<string, any>;
}

export interface EnvironmentAttributes {
  [key: string]: any;
}

export class ABACEngine {
  private policies: Map<string, ABACPolicy> = new Map();
  private resourceAttributes: ResourceAttributes = {};
  private userAttributes: UserAttributes = {};
  private environmentAttributes: EnvironmentAttributes = {};

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Policy: Allow users to read their own profile
    const ownProfilePolicy: ABACPolicy = {
      id: 'policy-own-profile-read',
      name: 'Read Own Profile',
      description: 'Allow users to read their own profile information',
      effect: 'allow',
      priority: 100,
      target: {
        resources: [{ attribute: 'owner', value: 'user.id', operator: 'eq' }],
        actions: ['read']
      },
      conditions: [
        { attribute: 'resource.owner', operator: 'eq', value: 'user.id' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Policy: Deny access to confidential resources
    const confidentialPolicy: ABACPolicy = {
      id: 'policy-confidential-deny',
      name: 'Deny Confidential Access',
      description: 'Deny access to resources marked as confidential',
      effect: 'deny',
      priority: 200,
      target: {
        resources: [{ attribute: 'classification', value: 'confidential', operator: 'eq' }]
      },
      conditions: [
        { attribute: 'resource.classification', operator: 'eq', value: 'confidential' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Policy: Allow access during business hours
    const businessHoursPolicy: ABACPolicy = {
      id: 'policy-business-hours',
      name: 'Business Hours Access',
      description: 'Restrict certain actions to business hours only',
      effect: 'allow',
      priority: 50,
      target: {
        actions: ['write', 'delete']
      },
      conditions: [
        { attribute: 'environment.timeOfDay', operator: 'gte', value: 9 },
        { attribute: 'environment.timeOfDay', operator: 'lte', value: 17 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(ownProfilePolicy.id, ownProfilePolicy);
    this.policies.set(confidentialPolicy.id, confidentialPolicy);
    this.policies.set(businessHoursPolicy.id, businessHoursPolicy);
  }

  async evaluate(context: AccessContext): Promise<ABACEvaluationResult> {
    const matchedPolicies: string[] = [];
    let finalDecision: 'allow' | 'deny' = 'deny';
    let reason = 'No matching policy found';

    // Get all applicable policies sorted by priority
    const applicablePolicies = this.getApplicablePolicies(context)
      .sort((a, b) => b.priority - a.priority);

    if (applicablePolicies.length === 0) {
      return {
        allowed: false,
        reason: 'No applicable policies found',
        matchedPolicies: [],
        evaluatedAt: new Date()
      };
    }

    // Evaluate policies in priority order
    for (const policy of applicablePolicies) {
      const conditionsMet = await this.evaluateConditions(policy.conditions, context);

      if (conditionsMet) {
        matchedPolicies.push(policy.id);

        if (policy.effect === 'deny') {
          // Deny overrides allow (deny takes precedence)
          return {
            allowed: false,
            reason: `Access denied by policy: ${policy.name}`,
            matchedPolicies,
            evaluatedAt: new Date()
          };
        } else {
          finalDecision = 'allow';
          reason = `Access allowed by policy: ${policy.name}`;
        }
      }
    }

    return {
      allowed: finalDecision === 'allow',
      reason,
      matchedPolicies,
      evaluatedAt: new Date()
    };
  }

  private getApplicablePolicies(context: AccessContext): ABACPolicy[] {
    const applicable: ABACPolicy[] = [];

    for (const policy of this.policies.values()) {
      if (this.policyAppliesToContext(policy, context)) {
        applicable.push(policy);
      }
    }

    return applicable;
  }

  private policyAppliesToContext(policy: ABACPolicy, context: AccessContext): boolean {
    const target = policy.target;

    // Check if action matches
    if (target.actions && !target.actions.includes(context.action) && !target.actions.includes('*')) {
      return false;
    }

    // Check user target conditions
    if (target.users && target.users.length > 0) {
      const userAttrs = this.getUserAttributes(context.userId);
      const matches = target.users.every(t => this.evaluateTarget(t, userAttrs, 'user', context));
      if (!matches) return false;
    }

    // Check resource target conditions
    if (target.resources && target.resources.length > 0) {
      const resourceAttrs = this.getResourceAttributes(context.resource);
      const matches = target.resources.every(t => this.evaluateTarget(t, resourceAttrs, 'resource', context));
      if (!matches) return false;
    }

    return true;
  }

  private evaluateTarget(
    target: UserTarget | ResourceTarget,
    attributes: Record<string, any>,
    prefix: 'user' | 'resource',
    context: AccessContext
  ): boolean {
    const value = this.resolveAttributeValue(target.attribute, prefix, context, attributes);
    return this.compareValues(value, target.value, target.operator);
  }

  private resolveAttributeValue(
    attribute: string,
    prefix: 'user' | 'resource' | 'environment',
    context: AccessContext,
    attributes: Record<string, any>
  ): any {
    // Check context attributes first
    const contextAttr = `${prefix}.${attribute}`;

    if (context.attributes && context.attributes[attribute] !== undefined) {
      return context.attributes[attribute];
    }

    // Check stored attributes
    if (attributes[attribute] !== undefined) {
      return attributes[attribute];
    }

    // Check environment attributes
    if (context.environment && context.environment[attribute] !== undefined) {
      return context.environment[attribute];
    }

    // Handle special context references
    if (attribute === 'id') {
      return prefix === 'user' ? context.userId : context.resource;
    }

    return undefined;
  }

  private async evaluateConditions(
    conditions: ABACCondition[],
    context: AccessContext
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  private evaluateCondition(condition: ABACCondition, context: AccessContext): boolean {
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

    // Extract prefix from attribute (e.g., "user.department" -> "user")
    const parts = condition.attribute.split('.');
    const prefix = parts[0] as 'user' | 'resource' | 'environment';
    const attrName = parts.slice(1).join('.');

    let attributes: Record<string, any> = {};
    if (prefix === 'user') {
      attributes = this.getUserAttributes(context.userId);
    } else if (prefix === 'resource') {
      attributes = this.getResourceAttributes(context.resource);
    } else if (prefix === 'environment') {
      attributes = context.environment || {};
    }

    const actualValue = this.resolveAttributeValue(attrName, prefix, context, attributes);
    return this.compareValues(actualValue, condition.value, condition.operator);
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
        try {
          // Validate regex pattern is safe before creating
          if (!this.isValidRegexPattern(expected)) {
            logger.warn(`Potential ReDoS pattern detected: ${expected}`);
            return false;
          }
          const regex = new RegExp(expected);
          return regex.test(actual);
        } catch {
          return false;
        }
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  addPolicy(policy: Omit<ABACPolicy, 'id' | 'createdAt' | 'updatedAt'>): ABACPolicy {
    const newPolicy: ABACPolicy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(newPolicy.id, newPolicy);
    logger.info(`ABAC policy created: ${newPolicy.name} (${newPolicy.id})`);
    return newPolicy;
  }

  updatePolicy(policyId: string, updates: Partial<ABACPolicy>): ABACPolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const updatedPolicy: ABACPolicy = {
      ...policy,
      ...updates,
      id: policyId,
      updatedAt: new Date()
    };

    this.policies.set(policyId, updatedPolicy);
    logger.info(`ABAC policy updated: ${policyId}`);
    return updatedPolicy;
  }

  deletePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    if (deleted) {
      logger.info(`ABAC policy deleted: ${policyId}`);
    }
    return deleted;
  }

  getPolicy(policyId: string): ABACPolicy | undefined {
    return this.policies.get(policyId);
  }

  getAllPolicies(): ABACPolicy[] {
    return Array.from(this.policies.values());
  }

  setUserAttributes(userId: string, attributes: Record<string, any>): void {
    this.userAttributes[userId] = {
      ...this.userAttributes[userId],
      ...attributes
    };
    logger.debug(`User attributes updated for: ${userId}`);
  }

  getUserAttributes(userId: string): Record<string, any> {
    return this.userAttributes[userId] || {};
  }

  setResourceAttributes(resourceId: string, attributes: Record<string, any>): void {
    this.resourceAttributes[resourceId] = {
      ...this.resourceAttributes[resourceId],
      ...attributes
    };
    logger.debug(`Resource attributes updated for: ${resourceId}`);
  }

  getResourceAttributes(resourceId: string): Record<string, any> {
    return this.resourceAttributes[resourceId] || {};
  }

  setEnvironmentAttributes(attributes: Record<string, any>): void {
    this.environmentAttributes = {
      ...this.environmentAttributes,
      ...attributes
    };
  }

  getEnvironmentAttributes(): Record<string, any> {
    return { ...this.environmentAttributes };
  }

  /**
   * Validate regex pattern to prevent ReDoS attacks
   * Checks for patterns that could cause exponential backtracking
   */
  private isValidRegexPattern(pattern: string): boolean {
    // Reject patterns that are likely to cause ReDoS
    const dangerousPatterns = [
      /(\.\*){3,}/,           // Multiple consecutive .*
      /\(\.\*\+\)\{2,}/,      // Multiple nested .*+
      /(\+\|\*){2,}/,         // Multiple consecutive + or *
      /\(.*\)\{.*\}/,         // Nested quantifiers
    ];

    for (const dangerous of dangerousPatterns) {
      if (dangerous.test(pattern)) {
        return false;
      }
    }

    // Check for excessive repetition
    if (pattern.length > 100) {
      return false;
    }

    return true;
  }
}
