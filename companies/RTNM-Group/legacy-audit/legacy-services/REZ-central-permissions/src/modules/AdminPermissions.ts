/**
 * REZ Central Permissions - Admin Permissions Module
 * Handles system-level admin permission checks
 */

import { PermissionResult, Action } from '../types';

interface AdminPermissionRequest {
  userId: string;
  action: Action;
  resource: string;
  resourceId?: string;
}

// Admin permission levels
export enum AdminLevel {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  SUPPORT_ADMIN = 'support_admin',
  AUDIT_ADMIN = 'audit_admin',
  MERCHANT_ADMIN = 'merchant_admin',
}

// Admin resource permissions by level
const adminPermissions: Record<string, { resource: string; actions: Action[]; conditions?: string[] }[]> = {
  [AdminLevel.SUPER_ADMIN]: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete', 'execute'] },
  ],
  [AdminLevel.PLATFORM_ADMIN]: [
    { resource: 'merchant', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'user', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'report', actions: ['read', 'execute'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'api_key', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'webhook', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'category', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'coupon', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'payment', actions: ['read'] },
    { resource: 'notification', actions: ['read', 'update'] },
  ],
  [AdminLevel.SUPPORT_ADMIN]: [
    { resource: 'merchant', actions: ['read'] },
    { resource: 'user', actions: ['read', 'update'] },
    { resource: 'order', actions: ['read', 'update'] },
    { resource: 'payment', actions: ['read'] },
    { resource: 'notification', actions: ['create', 'read', 'update'] },
    { resource: 'report', actions: ['read'] },
  ],
  [AdminLevel.AUDIT_ADMIN]: [
    { resource: 'audit_log', actions: ['read', 'execute'] },
    { resource: 'report', actions: ['read', 'execute'] },
    { resource: 'merchant', actions: ['read'] },
    { resource: 'user', actions: ['read'] },
  ],
  [AdminLevel.MERCHANT_ADMIN]: [
    { resource: 'merchant', actions: ['read', 'update'] },
    { resource: 'user', actions: ['read', 'update'] },
    { resource: 'order', actions: ['read', 'update'] },
    { resource: 'payment', actions: ['read'] },
    { resource: 'report', actions: ['read'] },
    { resource: 'api_key', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'webhook', actions: ['create', 'read', 'update', 'delete'] },
  ],
};

export class AdminPermissions {
  private adminLevels = new Map<string, AdminLevel>();
  private adminResources = new Map<string, Set<string>>(); // adminId -> accessible resourceIds

  /**
   * Check admin permission
   */
  async check(request: AdminPermissionRequest): Promise<PermissionResult> {
    const { userId, action, resource, resourceId } = request;

    // Get admin level
    const level = this.adminLevels.get(userId);

    if (!level) {
      return {
        granted: false,
        reason: 'User is not an admin',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    const perms = adminPermissions[level];

    if (!perms) {
      return {
        granted: false,
        reason: `Invalid admin level: ${level}`,
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Check permissions
    for (const perm of perms) {
      // Wildcard resource
      if (perm.resource === '*') {
        if (perm.actions.includes(action)) {
          return {
            granted: true,
            reason: `Admin access granted via ${level}`,
            matched_policy: `admin_${level}`,
            evaluated_policies: [`admin_${level}`],
            evaluation_time_ms: 0,
          };
        }
      }

      // Exact resource match
      if (perm.resource === resource) {
        if (perm.actions.includes(action)) {
          // Check specific resource access if required
          if (resourceId && !this.canAccessResource(userId, resourceId)) {
            continue;
          }

          return {
            granted: true,
            reason: `Admin access granted via ${level}`,
            matched_policy: `admin_${level}`,
            evaluated_policies: [`admin_${level}`],
            evaluation_time_ms: 0,
          };
        }
      }
    }

    return {
      granted: false,
      reason: `Admin level '${level}' cannot perform '${action}' on '${resource}'`,
      evaluated_policies: [`admin_${level}`],
      evaluation_time_ms: 0,
    };
  }

  /**
   * Set admin level
   */
  setAdminLevel(userId: string, level: AdminLevel): void {
    this.adminLevels.set(userId, level);
  }

  /**
   * Get admin level
   */
  getAdminLevel(userId: string): AdminLevel | undefined {
    return this.adminLevels.get(userId);
  }

  /**
   * Grant access to specific resource
   */
  grantResourceAccess(adminId: string, resourceId: string): void {
    const resources = this.adminResources.get(adminId) || new Set();
    resources.add(resourceId);
    this.adminResources.set(adminId, resources);
  }

  /**
   * Revoke access to specific resource
   */
  revokeResourceAccess(adminId: string, resourceId: string): void {
    const resources = this.adminResources.get(adminId);
    if (resources) {
      resources.delete(resourceId);
      if (resources.size === 0) {
        this.adminResources.delete(adminId);
      }
    }
  }

  /**
   * Check if admin can access specific resource
   */
  canAccessResource(adminId: string, resourceId: string): boolean {
    // Super admins can access all resources
    const level = this.adminLevels.get(adminId);
    if (level === AdminLevel.SUPER_ADMIN) {
      return true;
    }

    const resources = this.adminResources.get(adminId);
    return resources?.has(resourceId) || false;
  }

  /**
   * Remove admin privileges
   */
  removeAdmin(userId: string): void {
    this.adminLevels.delete(userId);
    this.adminResources.delete(userId);
  }

  /**
   * Get available admin levels
   */
  getAvailableLevels(): AdminLevel[] {
    return Object.values(AdminLevel);
  }

  /**
   * Get admin's accessible resources
   */
  getAccessibleResources(adminId: string): string[] {
    const resources = this.adminResources.get(adminId);
    return resources ? Array.from(resources) : [];
  }

  /**
   * Get available actions for a resource at admin level
   */
  getResourceActions(resource: string, level?: AdminLevel): Action[] {
    const effectiveLevel = level || AdminLevel.PLATFORM_ADMIN;
    const perms = adminPermissions[effectiveLevel];

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
   * Check if admin can access any resource of a type
   */
  canAccessResourceType(adminId: string, resourceType: string): boolean {
    const level = this.adminLevels.get(adminId);
    if (!level) {
      return false;
    }

    // Super admin can access everything
    if (level === AdminLevel.SUPER_ADMIN) {
      return true;
    }

    const perms = adminPermissions[level];
    if (!perms) {
      return false;
    }

    for (const perm of perms) {
      if (perm.resource === resourceType || perm.resource === '*') {
        return true;
      }
    }

    return false;
  }
}
