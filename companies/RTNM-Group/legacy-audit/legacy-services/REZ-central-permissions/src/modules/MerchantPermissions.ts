/**
 * REZ Central Permissions - Merchant Permissions Module
 * Handles merchant-specific permission checks
 */

import { PermissionResult, Action } from '../types';

interface MerchantPermissionRequest {
  merchantId: string;
  userId: string;
  action: Action;
  resource: string;
  resourceId?: string;
}

// Merchant resource permissions map
const merchantResourcePermissions: Record<string, Action[]> = {
  order: ['create', 'read', 'update', 'delete'],
  product: ['create', 'read', 'update', 'delete'],
  inventory: ['create', 'read', 'update', 'delete'],
  staff: ['create', 'read', 'update', 'delete'],
  customer: ['read', 'update'],
  report: ['read', 'execute'],
  store: ['create', 'read', 'update', 'delete'],
  payment: ['read'],
  settings: ['read', 'update'],
  webhook: ['create', 'read', 'update', 'delete'],
  api_key: ['create', 'read', 'update', 'delete'],
  coupon: ['create', 'read', 'update', 'delete'],
  category: ['create', 'read', 'update', 'delete'],
};

// Role-based permissions
const rolePermissions: Record<string, { resource: string; actions: Action[] }[]> = {
  owner: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute'] },
  ],
  manager: [
    { resource: 'order', actions: ['create', 'read', 'update'] },
    { resource: 'product', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'inventory', actions: ['create', 'read', 'update'] },
    { resource: 'staff', actions: ['create', 'read', 'update'] },
    { resource: 'customer', actions: ['read', 'update'] },
    { resource: 'report', actions: ['read'] },
    { resource: 'store', actions: ['read', 'update'] },
    { resource: 'coupon', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'category', actions: ['create', 'read', 'update', 'delete'] },
  ],
  cashier: [
    { resource: 'order', actions: ['create', 'read', 'update'] },
    { resource: 'customer', actions: ['read', 'update'] },
    { resource: 'payment', actions: ['read'] },
  ],
  inventory_clerk: [
    { resource: 'inventory', actions: ['create', 'read', 'update'] },
    { resource: 'product', actions: ['read'] },
  ],
  viewer: [
    { resource: 'order', actions: ['read'] },
    { resource: 'product', actions: ['read'] },
    { resource: 'report', actions: ['read'] },
  ],
};

export class MerchantPermissions {
  private userRoles = new Map<string, { merchantId: string; role: string }[]>();

  /**
   * Check merchant permission
   */
  async check(request: MerchantPermissionRequest): Promise<PermissionResult> {
    const { merchantId, userId, action, resource, resourceId } = request;

    // Get user roles for this merchant
    const roles = this.userRoles.get(userId)?.filter(r => r.merchantId === merchantId) || [];

    if (roles.length === 0) {
      return {
        granted: false,
        reason: 'User is not associated with this merchant',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Check each role
    for (const roleEntry of roles) {
      const roleName = roleEntry.role.toLowerCase();
      const rolePerms = rolePermissions[roleName];

      if (!rolePerms) {
        continue;
      }

      for (const perm of rolePerms) {
        // Wildcard resource
        if (perm.resource === '*') {
          if (perm.actions.includes(action)) {
            return {
              granted: true,
              reason: `Access granted via merchant role: ${roleName}`,
              matched_policy: `merchant_${roleName}`,
              evaluated_policies: [`merchant_${roleName}`],
              evaluation_time_ms: 0,
            };
          }
        }

        // Exact resource match
        if (perm.resource === resource) {
          if (perm.actions.includes(action)) {
            // Additional checks based on resource
            if (resource === 'staff' && action === 'delete') {
              // Cannot delete yourself or other owners
              if (resourceId === userId) {
                continue;
              }
            }

            return {
              granted: true,
              reason: `Access granted via merchant role: ${roleName}`,
              matched_policy: `merchant_${roleName}`,
              evaluated_policies: [`merchant_${roleName}`],
              evaluation_time_ms: 0,
            };
          }
        }
      }
    }

    return {
      granted: false,
      reason: 'No matching merchant permission found',
      evaluated_policies: roles.map(r => `merchant_${r.role}`),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Check if resource permissions are defined
   */
  hasResourcePermission(resource: string, action: Action): boolean {
    const actions = merchantResourcePermissions[resource];
    return actions?.includes(action) || false;
  }

  /**
   * Get available actions for a resource
   */
  getResourceActions(resource: string): Action[] {
    return merchantResourcePermissions[resource] || [];
  }

  /**
   * Assign role to user for merchant
   */
  assignRole(userId: string, merchantId: string, role: string): void {
    const userRole = { merchantId, role };
    const existing = this.userRoles.get(userId) || [];
    existing.push(userRole);
    this.userRoles.set(userId, existing);
  }

  /**
   * Remove role from user for merchant
   */
  removeRole(userId: string, merchantId: string, role: string): void {
    const existing = this.userRoles.get(userId) || [];
    const filtered = existing.filter(r => !(r.merchantId === merchantId && r.role === role));
    this.userRoles.set(userId, filtered);
  }

  /**
   * Get user's roles for a merchant
   */
  getUserRoles(userId: string, merchantId: string): string[] {
    const roles = this.userRoles.get(userId) || [];
    return roles.filter(r => r.merchantId === merchantId).map(r => r.role);
  }

  /**
   * Get all merchant roles
   */
  getAvailableRoles(): string[] {
    return Object.keys(rolePermissions);
  }
}
