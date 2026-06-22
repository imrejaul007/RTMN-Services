/**
 * REZ Central Permissions - ABAC Engine
 * Attribute-Based Access Control implementation
 */

import {
  AttributePolicy,
  AttributeMatcher,
  PermissionResult,
  PermissionContext,
  UserType,
  Action,
} from './types';

// In-memory policy store
const policyStore = new Map<string, AttributePolicy>();

// Default ABAC policies
const defaultPolicies: AttributePolicy[] = [
  {
    id: 'merchant_time_restricted',
    name: 'Merchant Time-Restricted Access',
    description: 'Allow merchant operations only during business hours',
    resource: '*',
    actions: ['create', 'update', 'delete'],
    subject_attributes: [
      { attribute: 'user_type', operator: 'eq', value: 'merchant', source: 'subject' },
    ],
    context_attributes: [
      {
        attribute: 'time_range',
        operator: 'regex',
        value: '^(0[8-9]|1[0-8]):[0-5][0-9]$',
        source: 'context',
      },
    ],
    effect: 'permit',
    priority: 50,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'high_value_order_requires_mfa',
    name: 'High Value Order MFA Requirement',
    description: 'Require MFA for orders above threshold',
    resource: 'order',
    actions: ['create'],
    context_attributes: [
      {
        attribute: 'amount_threshold',
        operator: 'gte',
        value: 10000,
        source: 'context',
      },
    ],
    effect: 'permit',
    priority: 80,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'trusted_device_bypass',
    name: 'Trusted Device Extended Access',
    description: 'Allow extended permissions for trusted devices',
    resource: '*',
    actions: ['update', 'delete'],
    subject_attributes: [
      { attribute: 'user_type', operator: 'in', value: ['merchant', 'staff'], source: 'subject' },
    ],
    context_attributes: [
      { attribute: 'device_trusted', operator: 'eq', value: true, source: 'context' },
    ],
    effect: 'permit',
    priority: 70,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'admin_unrestricted',
    name: 'Admin Unrestricted Access',
    description: 'System admins have unrestricted access',
    resource: '*',
    actions: ['create', 'read', 'update', 'delete', 'execute'],
    subject_attributes: [
      { attribute: 'user_type', operator: 'eq', value: 'system', source: 'subject' },
    ],
    effect: 'permit',
    priority: 100,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'consumer_own_resources',
    name: 'Consumer Own Resources Access',
    description: 'Consumers can only access their own resources',
    resource: '*',
    actions: ['read', 'update', 'delete'],
    subject_attributes: [
      { attribute: 'user_type', operator: 'eq', value: 'consumer', source: 'subject' },
    ],
    resource_attributes: [
      {
        attribute: 'owner_id',
        operator: 'eq',
        value: '${subject.id}',
        source: 'resource',
      },
    ],
    effect: 'permit',
    priority: 60,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'location_restricted',
    name: 'Location-Restricted Resources',
    description: 'Some resources require specific location access',
    resource: 'report',
    actions: ['read', 'execute'],
    context_attributes: [
      {
        attribute: 'country',
        operator: 'nin',
        value: ['XX', 'YY', 'ZZ'], // Blocked countries example
        source: 'context',
      },
    ],
    effect: 'permit',
    priority: 75,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'api_key_rate_limit',
    name: 'API Key Rate Limit Policy',
    description: 'Limit API access based on rate limits',
    resource: '*',
    actions: ['create', 'read', 'update', 'delete'],
    subject_attributes: [
      { attribute: 'key_type', operator: 'eq', value: 'api_key', source: 'subject' },
    ],
    context_attributes: [
      {
        attribute: 'request_count',
        operator: 'lt',
        value: 1000,
        source: 'context',
      },
    ],
    effect: 'permit',
    priority: 40,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Initialize default policies
defaultPolicies.forEach(policy => policyStore.set(policy.id, policy));

interface ABACEvaluationRequest {
  user_id: string;
  user_type: UserType;
  roles: string[];
  attributes: Record<string, unknown>;
  resource: string;
  resource_id?: string;
  action: Action;
  context: PermissionContext;
}

export class ABACEngine {
  /**
   * Evaluate ABAC policies
   */
  async evaluate(request: ABACEvaluationRequest): Promise<PermissionResult> {
    const evaluatedPolicies: string[] = [];
    const applicablePolicies = this.findApplicablePolicies(request);

    if (applicablePolicies.length === 0) {
      return {
        granted: false,
        reason: 'No applicable ABAC policies found',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Sort by priority (highest first)
    applicablePolicies.sort((a, b) => b.priority - a.priority);

    for (const policy of applicablePolicies) {
      evaluatedPolicies.push(policy.id);

      const matches = await this.evaluatePolicy(policy, request);

      if (matches) {
        return {
          granted: policy.effect === 'permit',
          reason: `ABAC Policy: ${policy.name}`,
          matched_policy: policy.id,
          evaluated_policies: evaluatedPolicies,
          evaluation_time_ms: 0,
        };
      }
    }

    return {
      granted: false,
      reason: 'No ABAC policy conditions matched',
      evaluated_policies: evaluatedPolicies,
      evaluation_time_ms: 0,
    };
  }

  /**
   * Find policies that apply to this request
   */
  private findApplicablePolicies(request: ABACEvaluationRequest): AttributePolicy[] {
    const applicable: AttributePolicy[] = [];

    for (const policy of policyStore.values()) {
      if (!policy.is_active) {
        continue;
      }

      // Check resource match
      if (policy.resource !== '*' && policy.resource !== request.resource) {
        continue;
      }

      // Check action match
      if (!policy.actions.includes(request.action) && !policy.actions.includes('*')) {
        continue;
      }

      applicable.push(policy);
    }

    return applicable;
  }

  /**
   * Evaluate if a policy matches the request
   */
  private async evaluatePolicy(
    policy: AttributePolicy,
    request: ABACEvaluationRequest
  ): Promise<boolean> {
    // Evaluate subject attributes
    if (policy.subject_attributes && policy.subject_attributes.length > 0) {
      const subjectMatch = this.evaluateMatchers(
        policy.subject_attributes,
        {
          ...request.attributes,
          id: request.user_id,
          user_type: request.user_type,
          roles: request.roles,
        }
      );
      if (!subjectMatch) {
        return false;
      }
    }

    // Evaluate resource attributes
    if (policy.resource_attributes && policy.resource_attributes.length > 0) {
      // In a real system, we would fetch resource attributes
      // For now, we'll check against a hypothetical resource object
      const resourceAttrs = await this.getResourceAttributes(
        request.resource,
        request.resource_id
      );
      const resourceMatch = this.evaluateMatchers(policy.resource_attributes, resourceAttrs);
      if (!resourceMatch) {
        return false;
      }
    }

    // Evaluate context attributes
    if (policy.context_attributes && policy.context_attributes.length > 0) {
      const contextMatch = this.evaluateMatchers(
        policy.context_attributes,
        request.context as Record<string, unknown>
      );
      if (!contextMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate attribute matchers
   */
  private evaluateMatchers(
    matchers: AttributeMatcher[],
    attributes: Record<string, unknown>
  ): boolean {
    for (const matcher of matchers) {
      const value = attributes[matcher.attribute];

      if (!this.matchAttribute(value, matcher)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Match a single attribute against a matcher
   */
  private matchAttribute(value: unknown, matcher: AttributeMatcher): boolean {
    const { operator, value: expectedValue } = matcher;

    // Handle variable substitution (e.g., ${subject.id})
    const resolvedExpected = this.resolveVariable(expectedValue as string, matcher.source || 'subject');

    switch (operator) {
      case 'eq':
        return value === resolvedExpected;

      case 'ne':
        return value !== resolvedExpected;

      case 'gt':
        return typeof value === 'number' && typeof resolvedExpected === 'number' && value > resolvedExpected;

      case 'lt':
        return typeof value === 'number' && typeof resolvedExpected === 'number' && value < resolvedExpected;

      case 'gte':
        return typeof value === 'number' && typeof resolvedExpected === 'number' && value >= resolvedExpected;

      case 'lte':
        return typeof value === 'number' && typeof resolvedExpected === 'number' && value <= resolvedExpected;

      case 'in':
        return Array.isArray(resolvedExpected) && resolvedExpected.includes(value);

      case 'nin':
        return Array.isArray(resolvedExpected) && !resolvedExpected.includes(value);

      case 'contains':
        if (typeof value === 'string' && typeof resolvedExpected === 'string') {
          return value.includes(resolvedExpected);
        }
        if (Array.isArray(value)) {
          return value.includes(resolvedExpected);
        }
        return false;

      case 'startsWith':
        return typeof value === 'string' && typeof resolvedExpected === 'string' && value.startsWith(resolvedExpected);

      case 'endsWith':
        return typeof value === 'string' && typeof resolvedExpected === 'string' && value.endsWith(resolvedExpected);

      case 'regex':
        if (typeof value === 'string' && typeof resolvedExpected === 'string') {
          try {
            return new RegExp(resolvedExpected).test(value);
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
   * Resolve variable references in attribute values
   */
  private resolveVariable(value: unknown, source: string): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    // Check for variable reference pattern: ${source.attribute}
    const variablePattern = /^\$\{([^}]+)\}$/;
    const match = value.match(variablePattern);

    if (!match) {
      return value;
    }

    // In a real implementation, we would look up the variable from context
    // For now, return the value as-is
    return value;
  }

  /**
   * Get attributes for a resource
   */
  private async getResourceAttributes(
    resourceType: string,
    resourceId?: string
  ): Promise<Record<string, unknown>> {
    // In a real implementation, this would fetch from a database or service
    // For now, return empty object
    return {
      type: resourceType,
      id: resourceId,
    };
  }

  /**
   * Create new ABAC policy
   */
  async createPolicy(
    policy: Omit<AttributePolicy, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AttributePolicy> {
    const newPolicy: AttributePolicy = {
      ...policy,
      id: `policy_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    policyStore.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Update existing policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<AttributePolicy, 'id' | 'created_at'>>
  ): Promise<AttributePolicy> {
    const policy = policyStore.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy: AttributePolicy = {
      ...policy,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    policyStore.set(policyId, updatedPolicy);
    return updatedPolicy;
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    if (!policyStore.has(policyId)) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    policyStore.delete(policyId);
  }

  /**
   * Get all policies
   */
  async getPolicies(): Promise<AttributePolicy[]> {
    return Array.from(policyStore.values());
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string): Promise<AttributePolicy | undefined> {
    return policyStore.get(policyId);
  }

  /**
   * Enable/disable policy
   */
  async setPolicyActive(policyId: string, isActive: boolean): Promise<void> {
    const policy = policyStore.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    policy.is_active = isActive;
    policy.updated_at = new Date().toISOString();
    policyStore.set(policyId, policy);
  }
}
