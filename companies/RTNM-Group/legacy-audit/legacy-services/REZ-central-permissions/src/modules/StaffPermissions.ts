/**
 * REZ Central Permissions - Staff Permissions Module
 * Handles staff-specific permission checks for store operations
 */

import { PermissionResult, Action } from '../types';

interface StaffPermissionRequest {
  staffId: string;
  storeId: string;
  userId: string;
  action: Action;
  resource: string;
  resourceId?: string;
}

// Staff roles
export enum StaffRole {
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cashier',
  INVENTORY_CLERK = 'inventory_clerk',
  SALES_ASSOCIATE = 'sales_associate',
  CUSTOMER_SERVICE = 'customer_service',
  DELIVERY = 'delivery',
}

// Staff resource permissions by role
const staffPermissions: Record<string, { resource: string; actions: Action[]; storeScope?: string }[]> = {
  [StaffRole.MANAGER]: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute'], storeScope: 'all' },
    { resource: 'staff', actions: ['create', 'read', 'update', 'delete'], storeScope: 'own' },
    { resource: 'report', actions: ['read', 'execute'], storeScope: 'own' },
    { resource: 'settings', actions: ['read', 'update'], storeScope: 'own' },
  ],
  [StaffRole.SUPERVISOR]: [
    { resource: 'order', actions: ['create', 'read', 'update', 'delete'], storeScope: 'own' },
    { resource: 'product', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'inventory', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'staff', actions: ['read'], storeScope: 'own' },
    { resource: 'customer', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'report', actions: ['read'], storeScope: 'own' },
    { resource: 'payment', actions: ['read', 'update'], storeScope: 'own' },
  ],
  [StaffRole.CASHIER]: [
    { resource: 'order', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'product', actions: ['read'], storeScope: 'own' },
    { resource: 'customer', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'payment', actions: ['create', 'read'], storeScope: 'own' },
  ],
  [StaffRole.INVENTORY_CLERK]: [
    { resource: 'inventory', actions: ['create', 'read', 'update', 'delete'], storeScope: 'own' },
    { resource: 'product', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'order', actions: ['read'], storeScope: 'own' },
  ],
  [StaffRole.SALES_ASSOCIATE]: [
    { resource: 'order', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'product', actions: ['read'], storeScope: 'own' },
    { resource: 'customer', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'cart', actions: ['create', 'read', 'update'], storeScope: 'own' },
  ],
  [StaffRole.CUSTOMER_SERVICE]: [
    { resource: 'order', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'customer', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'payment', actions: ['read'], storeScope: 'own' },
    { resource: 'refund', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'notification', actions: ['create', 'read', 'update'], storeScope: 'own' },
  ],
  [StaffRole.DELIVERY]: [
    { resource: 'order', actions: ['read', 'update'], storeScope: 'own' },
    { resource: 'shipping', actions: ['create', 'read', 'update'], storeScope: 'own' },
    { resource: 'customer', actions: ['read'], storeScope: 'own' },
    { resource: 'address', actions: ['read'], storeScope: 'own' },
  ],
};

export class StaffPermissions {
  private staffRoles = new Map<string, { storeId: string; role: StaffRole }[]>();
  private storeAssignments = new Map<string, Set<string>>(); // staffId -> storeIds

  /**
   * Check staff permission
   */
  async check(request: StaffPermissionRequest): Promise<PermissionResult> {
    const { staffId, storeId, userId, action, resource, resourceId } = request;

    // Verify user is the staff member or staff member has access
    if (staffId !== userId) {
      return {
        granted: false,
        reason: 'Staff can only access their own permissions',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Get staff roles for this store
    const roles = this.staffRoles.get(staffId)?.filter(r => r.storeId === storeId) || [];

    if (roles.length === 0) {
      return {
        granted: false,
        reason: 'Staff is not assigned to this store',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Check each role
    for (const roleEntry of roles) {
      const roleName = roleEntry.role;
      const perms = staffPermissions[roleName];

      if (!perms) {
        continue;
      }

      for (const perm of perms) {
        // Check store scope
        if (!this.checkStoreScope(perm.storeScope, staffId, storeId)) {
          continue;
        }

        // Wildcard resource
        if (perm.resource === '*') {
          if (perm.actions.includes(action)) {
            return {
              granted: true,
              reason: `Access granted via staff role: ${roleName}`,
              matched_policy: `staff_${roleName}`,
              evaluated_policies: [`staff_${roleName}`],
              evaluation_time_ms: 0,
            };
          }
        }

        // Exact resource match
        if (perm.resource === resource) {
          if (perm.actions.includes(action)) {
            return {
              granted: true,
              reason: `Access granted via staff role: ${roleName}`,
              matched_policy: `staff_${roleName}`,
              evaluated_policies: [`staff_${roleName}`],
              evaluation_time_ms: 0,
            };
          }
        }
      }
    }

    return {
      granted: false,
      reason: 'No matching staff permission found',
      evaluated_policies: roles.map(r => `staff_${r.role}`),
      evaluation_time_ms: 0,
    };
  }

  /**
   * Check if staff has access to store based on scope
   */
  private checkStoreScope(
    scope: string | undefined,
    staffId: string,
    storeId: string
  ): boolean {
    if (!scope || scope === 'all') {
      return true;
    }

    if (scope === 'own') {
      const stores = this.storeAssignments.get(staffId);
      return stores?.has(storeId) || false;
    }

    return false;
  }

  /**
   * Assign role to staff for store
   */
  assignRole(staffId: string, storeId: string, role: StaffRole): void {
    const staffRole = { storeId, role };
    const existing = this.staffRoles.get(staffId) || [];
    existing.push(staffRole);
    this.staffRoles.set(staffId, existing);

    // Add store assignment
    const stores = this.storeAssignments.get(staffId) || new Set();
    stores.add(storeId);
    this.storeAssignments.set(staffId, stores);
  }

  /**
   * Remove role from staff for store
   */
  removeRole(staffId: string, storeId: string, role: StaffRole): void {
    const existing = this.staffRoles.get(staffId) || [];
    const filtered = existing.filter(r => !(r.storeId === storeId && r.role === role));
    this.staffRoles.set(staffId, filtered);
  }

  /**
   * Get staff's roles for a store
   */
  getStoreRoles(staffId: string, storeId: string): StaffRole[] {
    const roles = this.staffRoles.get(staffId) || [];
    return roles.filter(r => r.storeId === storeId).map(r => r.role);
  }

  /**
   * Get staff's assigned stores
   */
  getAssignedStores(staffId: string): string[] {
    const stores = this.storeAssignments.get(staffId);
    return stores ? Array.from(stores) : [];
  }

  /**
   * Assign staff to additional store
   */
  assignToStore(staffId: string, storeId: string): void {
    const stores = this.storeAssignments.get(staffId) || new Set();
    stores.add(storeId);
    this.storeAssignments.set(staffId, stores);
  }

  /**
   * Remove staff from store
   */
  removeFromStore(staffId: string, storeId: string): void {
    const stores = this.storeAssignments.get(staffId);
    if (stores) {
      stores.delete(storeId);
      if (stores.size === 0) {
        this.storeAssignments.delete(staffId);
      }
    }

    // Remove all roles for this store
    const existing = this.staffRoles.get(staffId) || [];
    const filtered = existing.filter(r => r.storeId !== storeId);
    this.staffRoles.set(staffId, filtered);
  }

  /**
   * Get available staff roles
   */
  getAvailableRoles(): StaffRole[] {
    return Object.values(StaffRole);
  }

  /**
   * Get available actions for a resource at role
   */
  getResourceActions(resource: string, role?: StaffRole): Action[] {
    const effectiveRole = role || StaffRole.SALES_ASSOCIATE;
    const perms = staffPermissions[effectiveRole];

    if (!perms) {
      return [];
    }

    for (const perm of perms) {
      if (perm.resource === resource) {
        return perm.actions;
      }
    }

    return [];
  }

  /**
   * Check if staff can access specific resource
   */
  canAccessResource(staffId: string, storeId: string, role: StaffRole, resource: string, action: Action): boolean {
    const perms = staffPermissions[role];
    if (!perms) {
      return false;
    }

    for (const perm of perms) {
      if ((perm.resource === resource || perm.resource === '*') && perm.actions.includes(action)) {
        return true;
      }
    }

    return false;
  }
}
