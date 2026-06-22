/**
 * REZ Central Permissions - Policy Templates
 * Common policy templates for quick policy creation
 */

import { Policy, PolicyTarget, PolicyCondition, AttributeMatcher } from '../types';

export interface PolicyTemplate {
  name: string;
  description: string;
  createPolicy: (params?: Record<string, unknown>) => Policy;
}

export const PolicyTemplates: Record<string, PolicyTemplate> = {
  // Role-based policy template
  roleBased: {
    name: 'Role-Based Access',
    description: 'Grant access based on user role',
    createPolicy: (params) => ({
      id: `policy_role_${Date.now()}`,
      name: params?.name || 'Role-Based Policy',
      type: 'rbac',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'type',
            operator: 'eq',
            value: params?.role || 'user',
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['read'],
      },
      priority: params?.priority || 50,
      enabled: true,
    }),
  },

  // Resource ownership policy template
  resourceOwnership: {
    name: 'Resource Ownership',
    description: 'Grant access to resource owners',
    createPolicy: (params) => ({
      id: `policy_owner_${Date.now()}`,
      name: params?.name || 'Resource Ownership Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'id',
            operator: 'eq',
            value: '${resource.owner_id}',
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['read', 'update', 'delete'],
      },
      priority: params?.priority || 70,
      enabled: true,
    }),
  },

  // Time-restricted policy template
  timeRestricted: {
    name: 'Time-Restricted Access',
    description: 'Grant access only during specified hours',
    createPolicy: (params) => ({
      id: `policy_time_${Date.now()}`,
      name: params?.name || 'Time-Restricted Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'type',
            operator: 'in',
            value: params?.roles || ['merchant', 'staff'],
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['create', 'update', 'delete'],
        contexts: [
          {
            attribute: 'time_range',
            operator: 'regex',
            value: params?.timeRegex || '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 60,
      enabled: true,
    }),
  },

  // Amount threshold policy template
  amountThreshold: {
    name: 'Amount Threshold',
    description: 'Grant access based on transaction amount',
    createPolicy: (params) => ({
      id: `policy_amount_${Date.now()}`,
      name: params?.name || 'Amount Threshold Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        resources: params?.resources as string[] || ['order', 'payment'],
        actions: params?.actions as string[] || ['create'],
        contexts: [
          {
            attribute: 'amount_threshold',
            operator: params?.operator || 'lte',
            value: params?.threshold || 10000,
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      conditions: [
        {
          type: 'amount',
          conditions: [
            {
              attribute: 'amount_threshold',
              operator: params?.operator || 'lte',
              value: params?.threshold || 10000,
              source: 'context',
            },
          ],
          combinator: 'and',
        } as PolicyCondition,
      ],
      priority: params?.priority || 75,
      enabled: true,
    }),
  },

  // IP-based policy template
  ipRestricted: {
    name: 'IP-Restricted Access',
    description: 'Grant access only from specified IP addresses',
    createPolicy: (params) => ({
      id: `policy_ip_${Date.now()}`,
      name: params?.name || 'IP-Restricted Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['*'],
        contexts: [
          {
            attribute: 'ip_address',
            operator: 'in',
            value: params?.allowedIPs || ['127.0.0.1'],
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 80,
      enabled: true,
    }),
  },

  // Device trust policy template
  trustedDevice: {
    name: 'Trusted Device Access',
    description: 'Grant extended access for trusted devices',
    createPolicy: (params) => ({
      id: `policy_device_${Date.now()}`,
      name: params?.name || 'Trusted Device Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'type',
            operator: 'in',
            value: params?.roles || ['merchant', 'staff', 'consumer'],
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['update', 'delete'],
        contexts: [
          {
            attribute: 'device_trusted',
            operator: 'eq',
            value: true,
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 65,
      enabled: true,
    }),
  },

  // Location-based policy template
  locationRestricted: {
    name: 'Location-Restricted Access',
    description: 'Grant access based on geographic location',
    createPolicy: (params) => ({
      id: `policy_location_${Date.now()}`,
      name: params?.name || 'Location Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['*'],
        contexts: [
          {
            attribute: 'country',
            operator: params?.allowMode ? 'in' : 'nin',
            value: params?.countries || ['XX'],
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 70,
      enabled: true,
    }),
  },

  // Rate limit policy template
  rateLimited: {
    name: 'Rate-Limited Access',
    description: 'Apply rate limiting to API access',
    createPolicy: (params) => ({
      id: `policy_rate_${Date.now()}`,
      name: params?.name || 'Rate Limit Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'key_type',
            operator: 'eq',
            value: 'api_key',
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['*'],
        contexts: [
          {
            attribute: 'request_count',
            operator: 'lt',
            value: params?.maxRequests || 1000,
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 40,
      enabled: true,
    }),
  },

  // MFA required policy template
  mfaRequired: {
    name: 'MFA Required',
    description: 'Require MFA for sensitive operations',
    createPolicy: (params) => ({
      id: `policy_mfa_${Date.now()}`,
      name: params?.name || 'MFA Required Policy',
      type: 'abac',
      effect: 'permit',
      target: {
        subjects: params?.subjects as AttributeMatcher[] || [
          {
            attribute: 'type',
            operator: 'in',
            value: ['merchant', 'staff', 'consumer'],
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: params?.resources as string[] || ['*'],
        actions: params?.actions as string[] || ['update', 'delete'],
        contexts: [
          {
            attribute: 'mfa_verified',
            operator: 'eq',
            value: true,
            source: 'context',
          } as AttributeMatcher,
        ],
      },
      priority: params?.priority || 85,
      enabled: true,
    }),
  },

  // Admin unrestricted policy template
  adminUnrestricted: {
    name: 'Admin Unrestricted Access',
    description: 'System admins have unrestricted access',
    createPolicy: (params) => ({
      id: `policy_admin_${Date.now()}`,
      name: params?.name || 'Admin Unrestricted Policy',
      type: 'hybrid',
      effect: 'permit',
      target: {
        subjects: [
          {
            attribute: 'type',
            operator: 'eq',
            value: 'system',
            source: 'subject',
          } as AttributeMatcher,
        ],
        resources: ['*'],
        actions: ['create', 'read', 'update', 'delete', 'execute'],
      },
      priority: 100,
      enabled: true,
    }),
  },
};

/**
 * Create a policy from a template
 */
export function createPolicyFromTemplate(
  templateName: string,
  params?: Record<string, unknown>
): Policy {
  const template = PolicyTemplates[templateName];
  if (!template) {
    throw new Error(`Unknown policy template: ${templateName}`);
  }
  return template.createPolicy(params);
}

/**
 * Get all available template names
 */
export function getTemplateNames(): string[] {
  return Object.keys(PolicyTemplates);
}

/**
 * Get template details
 */
export function getTemplateDetails(templateName: string): PolicyTemplate | undefined {
  return PolicyTemplates[templateName];
}
