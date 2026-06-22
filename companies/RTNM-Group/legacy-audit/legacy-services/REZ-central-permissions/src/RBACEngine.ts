/**
 * REZ Central Permissions - RBAC Engine
 * Role-Based Access Control implementation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Role,
  RolePermission,
  PermissionResult,
  Action,
  UserType,
  PermissionCondition,
} from './types';

// In-memory role store (replace with database in production)
const roleStore = new Map<string, Role>();
const userRoles = new Map<string, Set<string>>();

// Default roles
const defaultRoles: Role[] = [
  // Merchant roles
  {
    id: 'merchant_owner',
    name: 'Merchant Owner',
    description: 'Full access to merchant resources',
    type: 'merchant',
    permissions: [
      { resource: '*', actions: ['create', 'read', 'update', 'delete'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'merchant_manager',
    name: 'Merchant Manager',
    description: 'Manage merchant operations',
    type: 'merchant',
    permissions: [
      { resource: 'order', actions: ['create', 'read', 'update'] },
      { resource: 'product', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'inventory', actions: ['create', 'read', 'update'] },
      { resource: 'report', actions: ['read'] },
      { resource: 'staff', actions: ['create', 'read', 'update'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'merchant_staff',
    name: 'Merchant Staff',
    description: 'Basic merchant staff access',
    type: 'merchant',
    permissions: [
      { resource: 'order', actions: ['read', 'update'] },
      { resource: 'product', actions: ['read'] },
      { resource: 'customer', actions: ['read', 'update'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Consumer roles
  {
    id: 'consumer_premium',
    name: 'Premium Consumer',
    description: 'Premium consumer with extended access',
    type: 'consumer',
    permissions: [
      { resource: 'order', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'wallet', actions: ['read', 'update'] },
      { resource: 'review', actions: ['create', 'read'] },
      { resource: 'wishlist', actions: ['create', 'read', 'update', 'delete'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'consumer_basic',
    name: 'Basic Consumer',
    description: 'Basic consumer access',
    type: 'consumer',
    permissions: [
      { resource: 'order', actions: ['create', 'read', 'update'] },
      { resource: 'wallet', actions: ['read'] },
      { resource: 'review', actions: ['create', 'read'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Staff roles
  {
    id: 'store_manager',
    name: 'Store Manager',
    description: 'Full access to store operations',
    type: 'staff',
    permissions: [
      { resource: 'order', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'product', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'inventory', actions: ['create', 'read', 'update'] },
      { resource: 'report', actions: ['read', 'execute'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'store_cashier',
    name: 'Store Cashier',
    description: 'Point of sale access',
    type: 'staff',
    permissions: [
      { resource: 'order', actions: ['create', 'read', 'update'] },
      { resource: 'payment', actions: ['create', 'read'] },
      { resource: 'customer', actions: ['read', 'update'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'store_inventory_clerk',
    name: 'Inventory Clerk',
    description: 'Inventory management access',
    type: 'staff',
    permissions: [
      { resource: 'inventory', actions: ['create', 'read', 'update'] },
      { resource: 'product', actions: ['read'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Admin roles
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access',
    type: 'system',
    permissions: [
      { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'platform_admin',
    name: 'Platform Admin',
    description: 'Platform administration access',
    type: 'system',
    permissions: [
      { resource: 'merchant', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'user', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'report', actions: ['read', 'execute'] },
      { resource: 'settings', actions: ['read', 'update'] },
      { resource: 'audit_log', actions: ['read'] },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Initialize default roles
defaultRoles.forEach(role => roleStore.set(role.id, role));

interface RBACEvaluationRequest {
  user_id: string;
  user_type: UserType;
  roles: string[];
  resource: string;
  action: Action;
  resource_id?: string;
}

interface RBACEvaluationContext {
  conditions?: PermissionCondition[];
  merchant_id?: string;
  store_id?: string;
}

export class RBACEngine {
  /**
   * Evaluate RBAC permissions
   */
  async evaluate(
    request: RBACEvaluationRequest,
    context?: RBACEvaluationContext
  ): Promise<PermissionResult> {
    const evaluatedPolicies: string[] = [];

    // Check each role the user has
    for (const roleId of request.roles) {
      const role = roleStore.get(roleId);

      if (!role || !role.is_active) {
        continue;
      }

      evaluatedPolicies.push(role.id);

      // Check if role type matches user type
      if (role.type !== request.user_type && role.type !== 'system') {
        continue;
      }

      // Check role permissions
      for (const permission of role.permissions) {
        // Wildcard matches all resources
        if (permission.resource === '*') {
          if (permission.actions.includes(request.action)) {
            return {
              granted: true,
              reason: `Access granted via role: ${role.name}`,
              matched_policy: role.id,
              evaluated_policies: evaluatedPolicies,
              evaluation_time_ms: 0,
            };
          }
        }

        // Exact resource match
        if (permission.resource === request.resource) {
          if (permission.actions.includes(request.action)) {
            // Check conditions if any
            if (permission.conditions && permission.conditions.length > 0) {
              const conditionsMet = this.evaluateConditions(
                permission.conditions,
                context
              );
              if (!conditionsMet) {
                continue;
              }
            }

            return {
              granted: true,
              reason: `Access granted via role: ${role.name} (${role.id})`,
              matched_policy: role.id,
              evaluated_policies: evaluatedPolicies,
              evaluation_time_ms: 0,
            };
          }
        }
      }
    }

    // Check for parent roles (role inheritance)
    for (const roleId of request.roles) {
      const role = roleStore.get(roleId);
      if (role?.parent_role) {
        const parentResult = await this.evaluate(
          { ...request, roles: [role.parent_role] },
          context
        );
        if (parentResult.granted) {
          return {
            ...parentResult,
            evaluated_policies: [...evaluatedPolicies, ...parentResult.evaluated_policies],
          };
        }
      }
    }

    return {
      granted: false,
      reason: 'No matching role permission found',
      evaluated_policies: evaluatedPolicies,
      evaluation_time_ms: 0,
    };
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasRole(userId: string, roles: string[]): Promise<boolean> {
    const userRoleSet = userRoles.get(userId);
    if (!userRoleSet) {
      return false;
    }
    return roles.some(role => userRoleSet.has(role));
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    if (!roleStore.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const userRoleSet = userRoles.get(userId) || new Set<string>();
    userRoleSet.add(roleId);
    userRoles.set(userId, userRoleSet);
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRoleSet = userRoles.get(userId);
    if (userRoleSet) {
      userRoleSet.delete(roleId);
      if (userRoleSet.size === 0) {
        userRoles.delete(userId);
      }
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const userRoleSet = userRoles.get(userId);
    return userRoleSet ? Array.from(userRoleSet) : [];
  }

  /**
   * Create new role
   */
  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const newRole: Role = {
      ...role,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    roleStore.set(newRole.id, newRole);
    return newRole;
  }

  /**
   * Update existing role
   */
  async updateRole(
    roleId: string,
    updates: Partial<Omit<Role, 'id' | 'created_at'>>
  ): Promise<Role> {
    const role = roleStore.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    const updatedRole: Role = {
      ...role,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    roleStore.set(roleId, updatedRole);
    return updatedRole;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    if (!roleStore.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }
    roleStore.delete(roleId);

    // Remove role from all users
    for (const [userId, roles] of userRoles.entries()) {
      roles.delete(roleId);
      if (roles.size === 0) {
        userRoles.delete(userId);
      }
    }
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    return Array.from(roleStore.values());
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role | undefined> {
    return roleStore.get(roleId);
  }

  /**
   * Get roles by type
   */
  async getRolesByType(type: UserType): Promise<Role[]> {
    return Array.from(roleStore.values()).filter(role => role.type === type);
  }

  /**
   * Add permission to role
   */
  async addPermissionToRole(
    roleId: string,
    permission: RolePermission
  ): Promise<void> {
    const role = roleStore.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    role.permissions.push(permission);
    role.updated_at = new Date().toISOString();
    roleStore.set(roleId, role);
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    resource: string
  ): Promise<void> {
    const role = roleStore.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    role.permissions = role.permissions.filter(p => p.resource !== resource);
    role.updated_at = new Date().toISOString();
    roleStore.set(roleId, role);
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: PermissionCondition[],
    context?: RBACEvaluationContext
  ): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: PermissionCondition,
    context?: RBACEvaluationContext
  ): boolean {
    const { field, operator, value } = condition;

    // Get field value from context
    let fieldValue: unknown;
    if (context) {
      fieldValue = (context as Record<string, unknown>)[field];
    }

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case 'gte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }
}
