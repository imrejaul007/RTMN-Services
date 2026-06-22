import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import {
  RolePermissions,
  Permission,
  OrgRole,
  Policy,
  PolicyEffect
} from '../../types/index.js';

interface RolePermissionsDocument extends RolePermissions {}

const RolePermissionsSchema = new Schema<RolePermissionsDocument>(
  {
    roleId: { type: Schema.Types.UUID, required: true },
    roleName: { type: String, required: true },
    tenantId: { type: Schema.Types.UUID, required: true, index: true },

    permissions: [{ type: String, enum: Object.values(Permission) }],

    resourceRestrictions: { type: Map, of: Schema.Types.Mixed },
    timeRestrictions: {
      allowedHours: [{ type: Number, min: 0, max: 23 }],
      allowedDays: [{ type: Number, min: 0, max: 6 }]
    }
  },
  {
    timestamps: true,
    collection: 'role_permissions'
  }
);

RolePermissionsSchema.index({ tenantId: 1, roleName: 1 }, { unique: true });

export const RolePermissionsModel: Model<RolePermissionsDocument> = mongoose.model<RolePermissionsDocument>(
  'RolePermissions',
  RolePermissionsSchema
);

// ============================================================================
// POLICY MODEL
// ============================================================================

interface PolicyDocument extends Policy {}

const PolicySchema = new Schema<PolicyDocument>(
  {
    tenantId: { type: Schema.Types.UUID, required: true, index: true },
    name: { type: String, required: true, minlength: 2, maxlength: 100 },
    description: { type: String },

    effect: { type: String, enum: Object.values(PolicyEffect), required: true },
    actions: [{ type: String, required: true }], // e.g., 'events:*', 'memory:read'
    resources: [{ type: String, required: true }], // e.g., 'events:orders:*'

    conditions: { type: Map, of: Schema.Types.Mixed },

    priority: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    collection: 'policies'
  }
);

PolicySchema.index({ tenantId: 1, priority: -1 });
PolicySchema.index({ tenantId: 1, enabled: 1 });

export const PolicyModel: Model<PolicyDocument> = mongoose.model<PolicyDocument>(
  'Policy',
  PolicySchema
);

// ============================================================================
// DEFAULT ROLES CONFIGURATION
// ============================================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  [OrgRole.OWNER]: [
    // Full access to everything
    Permission.TENANT_READ,
    Permission.TENANT_WRITE,
    Permission.TENANT_ADMIN,
    Permission.ORG_READ,
    Permission.ORG_WRITE,
    Permission.ORG_ADMIN,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_ADMIN,
    Permission.API_KEY_READ,
    Permission.API_KEY_WRITE,
    Permission.API_KEY_ADMIN,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.EVENTS_READ,
    Permission.EVENTS_WRITE,
    Permission.EVENTS_ADMIN,
    Permission.MEMORY_READ,
    Permission.MEMORY_WRITE,
    Permission.MEMORY_DELETE,
    Permission.MEMORY_ADMIN,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_WRITE,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_ADMIN,
    Permission.AGENT_READ,
    Permission.AGENT_WRITE,
    Permission.AGENT_EXECUTE,
    Permission.AGENT_ADMIN,
    Permission.PRIVILEGED_GRAPH,
    Permission.PRIVILEGED_IDENTITY,
    Permission.PRIVILEGED_ECOSYSTEM
  ],

  [OrgRole.ADMIN]: [
    Permission.ORG_READ,
    Permission.ORG_WRITE,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_ADMIN,
    Permission.API_KEY_READ,
    Permission.API_KEY_WRITE,
    Permission.AUDIT_READ,
    Permission.EVENTS_READ,
    Permission.EVENTS_WRITE,
    Permission.EVENTS_ADMIN,
    Permission.MEMORY_READ,
    Permission.MEMORY_WRITE,
    Permission.MEMORY_DELETE,
    Permission.MEMORY_ADMIN,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_WRITE,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_ADMIN,
    Permission.AGENT_READ,
    Permission.AGENT_WRITE,
    Permission.AGENT_EXECUTE
  ],

  [OrgRole.MEMBER]: [
    Permission.ORG_READ,
    Permission.USER_READ,
    Permission.API_KEY_READ,
    Permission.EVENTS_READ,
    Permission.EVENTS_WRITE,
    Permission.MEMORY_READ,
    Permission.MEMORY_WRITE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_EXECUTE,
    Permission.AGENT_READ,
    Permission.AGENT_EXECUTE
  ],

  [OrgRole.VIEWER]: [
    Permission.ORG_READ,
    Permission.USER_READ,
    Permission.EVENTS_READ,
    Permission.MEMORY_READ,
    Permission.WORKFLOW_READ,
    Permission.AGENT_READ
  ]
};

// ============================================================================
// RBAC SERVICE
// ============================================================================

export class RBACService {
  /**
   * Initialize default roles for a tenant
   */
  async initializeTenantRoles(tenantId: string): Promise<void> {
    const existing = await RolePermissionsModel.findOne({ tenantId });
    if (existing) return; // Already initialized

    const rolePromises = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(
      async ([roleName, permissions]) => {
        const role = new RolePermissionsModel({
          roleId: uuid(),
          roleName,
          tenantId,
          permissions
        });
        await role.save();
      }
    );

    await Promise.all(rolePromises);
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(
    tenantId: string,
    roleName: OrgRole
  ): Promise<Permission[]> {
    const role = await RolePermissionsModel.findOne({
      tenantId,
      roleName
    });

    return role?.permissions ?? [];
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    tenantId: string,
    roleName: OrgRole,
    requiredPermission: Permission
  ): Promise<boolean> {
    const permissions = await this.getRolePermissions(tenantId, roleName);
    return permissions.includes(requiredPermission);
  }

  /**
   * Check if a user has any of the required permissions
   */
  async hasAnyPermission(
    tenantId: string,
    roleName: OrgRole,
    requiredPermissions: Permission[]
  ): Promise<boolean> {
    const permissions = await this.getRolePermissions(tenantId, roleName);
    return requiredPermissions.some(p => permissions.includes(p));
  }

  /**
   * Check if a user has all required permissions
   */
  async hasAllPermissions(
    tenantId: string,
    roleName: OrgRole,
    requiredPermissions: Permission[]
  ): Promise<boolean> {
    const permissions = await this.getRolePermissions(tenantId, roleName);
    return requiredPermissions.every(p => permissions.includes(p));
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    tenantId: string,
    roleName: OrgRole,
    permissions: Permission[]
  ): Promise<void> {
    await RolePermissionsModel.findOneAndUpdate(
      { tenantId, roleName },
      { $set: { permissions } }
    );
  }

  /**
   * Create a custom role
   */
  async createCustomRole(
    tenantId: string,
    roleName: string,
    permissions: Permission[]
  ): Promise<RolePermissions> {
    const role = new RolePermissionsModel({
      roleId: uuid(),
      roleName,
      tenantId,
      permissions
    });

    await role.save();
    return role.toObject() as RolePermissions;
  }

  /**
   * List all roles for a tenant
   */
  async listRoles(tenantId: string): Promise<RolePermissions[]> {
    const roles = await RolePermissionsModel.find({ tenantId });
    return roles.map(r => r.toObject() as RolePermissions);
  }

  /**
   * Create a policy
   */
  async createPolicy(params: {
    tenantId: string;
    name: string;
    description?: string;
    effect: PolicyEffect;
    actions: string[];
    resources: string[];
    conditions?: Record<string, unknown>;
    priority?: number;
  }): Promise<Policy> {
    const policy = new PolicyModel({
      ...params,
      id: uuid(),
      priority: params.priority ?? 0,
      enabled: true
    });

    await policy.save();
    return policy.toObject() as Policy;
  }

  /**
   * Evaluate if an action is allowed on a resource
   */
  async evaluateAccess(params: {
    tenantId: string;
    action: string;
    resource: string;
    context?: Record<string, unknown>;
  }): Promise<boolean> {
    // Get all enabled policies for tenant, sorted by priority (highest first)
    const policies = await PolicyModel.find({
      tenantId: params.tenantId,
      enabled: true
    }).sort({ priority: -1 });

    // Check policies in order
    for (const policy of policies) {
      const actionMatches = this.matchesPattern(params.action, policy.actions);
      const resourceMatches = this.matchesPattern(params.resource, policy.resources);

      if (actionMatches && resourceMatches) {
        // Check conditions if any
        if (policy.conditions && Object.keys(policy.conditions).length > 0) {
          if (!this.evaluateConditions(params.context ?? {}, policy.conditions)) {
            continue;
          }
        }

        return policy.effect === PolicyEffect.ALLOW;
      }
    }

    // Default deny
    return false;
  }

  /**
   * Check if a value matches any pattern in a list
   */
  private matchesPattern(value: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern === '*') return true;

      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(value);
    });
  }

  /**
   * Evaluate policy conditions against context
   */
  private evaluateConditions(
    context: Record<string, unknown>,
    conditions: Record<string, unknown>
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key];

      if (Array.isArray(expectedValue)) {
        // Check if actual value is in allowed list
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (expectedValue !== actualValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * List policies for a tenant
   */
  async listPolicies(tenantId: string): Promise<Policy[]> {
    const policies = await PolicyModel.find({ tenantId }).sort({ priority: -1 });
    return policies.map(p => p.toObject() as Policy);
  }

  /**
   * Update a policy
   */
  async updatePolicy(
    tenantId: string,
    policyId: string,
    updates: Partial<Policy>
  ): Promise<Policy | null> {
    const policy = await PolicyModel.findOneAndUpdate(
      { _id: policyId, tenantId },
      { $set: updates },
      { new: true }
    );

    return policy ? (policy.toObject() as Policy) : null;
  }

  /**
   * Delete a policy
   */
  async deletePolicy(tenantId: string, policyId: string): Promise<boolean> {
    const result = await PolicyModel.deleteOne({ _id: policyId, tenantId });
    return result.deletedCount > 0;
  }

  /**
   * Check time-based restrictions
   */
  async checkTimeRestriction(
    tenantId: string,
    roleName: OrgRole
  ): Promise<boolean> {
    const role = await RolePermissionsModel.findOne({ tenantId, roleName });
    if (!role?.timeRestrictions) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const { allowedHours, allowedDays } = role.timeRestrictions;

    if (allowedHours && allowedHours.length > 0) {
      if (!allowedHours.includes(currentHour)) return false;
    }

    if (allowedDays && allowedDays.length > 0) {
      if (!allowedDays.includes(currentDay)) return false;
    }

    return true;
  }
}

export const rbacService = new RBACService();
