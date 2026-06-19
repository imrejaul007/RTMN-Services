/**
 * CorpID Cloud - RBAC Service
 * Role and permission management
 */

import {
  roles,
  permissions,
  policies,
  featureFlags,
  rolePermissions,
  createRole,
  updateRole,
  deleteRole,
  createPermission,
  createPolicy,
  createFeatureFlag,
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  hasPermission,
  isFeatureEnabled,
  addUserPermissionOverride,
  removeUserPermissionOverride
} from '../models/rbac.model.js';

import { dataAudit } from '../../../shared/utils/logger.js';
import { Errors } from '../../../shared/middleware/error-handler.js';

/**
 * RBAC Service - Role Management
 */
class RoleService {
  /**
   * Get all roles
   */
  getAll(options = {}) {
    let allRoles = Array.from(roles.values());

    if (options.type) {
      allRoles = allRoles.filter(r => r.type === options.type);
    }
    if (options.scope) {
      allRoles = allRoles.filter(r => r.scope === options.scope);
    }
    if (options.systemOnly) {
      allRoles = allRoles.filter(r => r.type === 'system');
    }
    if (options.customOnly) {
      allRoles = allRoles.filter(r => r.type === 'custom');
    }

    return allRoles.map(r => ({
      ...r,
      permissions: getRolePermissions(r.id)
    }));
  }

  /**
   * Get role by ID
   */
  getById(roleId) {
    const role = roles.get(roleId);
    if (!role) {
      throw Errors.notFound('Role not found');
    }
    return {
      ...role,
      permissions: getRolePermissions(roleId)
    };
  }

  /**
   * Create custom role
   */
  create(data, userId) {
    // Check for duplicate name
    const existing = Array.from(roles.values()).find(r => r.name === data.name);
    if (existing) {
      throw Errors.conflict('Role with this name already exists');
    }

    const role = createRole({
      ...data,
      createdBy: userId
    });

    dataAudit('role.created', { user: { id: userId } }, 'role', role.id);

    return {
      ...role,
      permissions: getRolePermissions(role.id)
    };
  }

  /**
   * Update role
   */
  update(roleId, data, userId) {
    const role = roles.get(roleId);
    if (!role) {
      throw Errors.notFound('Role not found');
    }

    if (role.type === 'system' && !data.allowSystemUpdate) {
      throw Errors.forbidden('Cannot modify system role');
    }

    // Check for duplicate name
    if (data.name && data.name !== role.name) {
      const existing = Array.from(roles.values()).find(r => r.name === data.name);
      if (existing) {
        throw Errors.conflict('Role with this name already exists');
      }
    }

    const updated = updateRole(roleId, data);

    dataAudit('role.updated', { user: { id: userId } }, 'role', roleId, {
      updatedFields: Object.keys(data)
    });

    return {
      ...updated,
      permissions: getRolePermissions(roleId)
    };
  }

  /**
   * Delete role
   */
  delete(roleId, userId) {
    const role = roles.get(roleId);
    if (!role) {
      throw Errors.notFound('Role not found');
    }

    if (role.type === 'system') {
      throw Errors.forbidden('Cannot delete system role');
    }

    deleteRole(roleId);

    dataAudit('role.deleted', { user: { id: userId } }, 'role', roleId);

    return { success: true, message: 'Role deleted' };
  }

  /**
   * Add permissions to role
   */
  addPermissions(roleId, permissionIds, userId) {
    const role = roles.get(roleId);
    if (!role) {
      throw Errors.notFound('Role not found');
    }

    const currentPerms = rolePermissions.get(roleId) || new Set();
    const newPerms = new Set([...currentPerms, ...permissionIds]);
    rolePermissions.set(roleId, newPerms);

    role.permissions = Array.from(newPerms);
    role.updatedAt = new Date().toISOString();
    roles.set(roleId, role);

    dataAudit('role.permissions.added', { user: { id: userId } }, 'role', roleId, {
      permissions: permissionIds
    });

    return {
      ...role,
      permissions: Array.from(newPerms)
    };
  }

  /**
   * Remove permissions from role
   */
  removePermissions(roleId, permissionIds, userId) {
    const role = roles.get(roleId);
    if (!role) {
      throw Errors.notFound('Role not found');
    }

    const currentPerms = rolePermissions.get(roleId) || new Set();
    for (const perm of permissionIds) {
      currentPerms.delete(perm);
    }
    rolePermissions.set(roleId, currentPerms);

    role.permissions = Array.from(currentPerms);
    role.updatedAt = new Date().toISOString();
    roles.set(roleId, role);

    dataAudit('role.permissions.removed', { user: { id: userId } }, 'role', roleId, {
      permissions: permissionIds
    });

    return {
      ...role,
      permissions: Array.from(currentPerms)
    };
  }
}

/**
 * Permission Service
 */
class PermissionService {
  /**
   * Get all permissions
   */
  getAll(options = {}) {
    let allPerms = Array.from(permissions.values());

    if (options.category) {
      allPerms = allPerms.filter(p => p.category === options.category);
    }
    if (options.type) {
      allPerms = allPerms.filter(p => p.type === options.type);
    }

    return allPerms;
  }

  /**
   * Get permissions by category
   */
  getByCategory(category) {
    return Array.from(permissions.values()).filter(p => p.category === category);
  }

  /**
   * Create custom permission
   */
  create(data, userId) {
    // Check for duplicate ID
    if (permissions.has(data.id)) {
      throw Errors.conflict('Permission with this ID already exists');
    }

    const permission = createPermission(data);

    dataAudit('permission.created', { user: { id: userId } }, 'permission', permission.id);

    return permission;
  }

  /**
   * Get permission by ID
   */
  getById(permissionId) {
    const permission = permissions.get(permissionId);
    if (!permission) {
      throw Errors.notFound('Permission not found');
    }
    return permission;
  }

  /**
   * Get roles that have a permission
   */
  getRolesWithPermission(permissionId) {
    const result = [];
    for (const [roleId, perms] of rolePermissions.entries()) {
      if (perms.has(permissionId) || perms.has('*')) {
        const role = roles.get(roleId);
        if (role) {
          result.push({
            id: role.id,
            name: role.name,
            displayName: role.displayName
          });
        }
      }
    }
    return result;
  }
}

/**
 * Policy Service
 */
class PolicyService {
  /**
   * Get all policies
   */
  getAll(options = {}) {
    let allPolicies = Array.from(policies.values());

    if (options.status) {
      allPolicies = allPolicies.filter(p => p.status === options.status);
    }

    return allPolicies;
  }

  /**
   * Get policy by ID
   */
  getById(policyId) {
    const policy = policies.get(policyId);
    if (!policy) {
      throw Errors.notFound('Policy not found');
    }
    return policy;
  }

  /**
   * Create policy
   */
  create(data, userId) {
    const policy = createPolicy(data);

    dataAudit('policy.created', { user: { id: userId } }, 'policy', policy.id);

    return policy;
  }

  /**
   * Update policy
   */
  update(policyId, data, userId) {
    const policy = policies.get(policyId);
    if (!policy) {
      throw Errors.notFound('Policy not found');
    }

    const allowedFields = ['name', 'description', 'status', 'conditions', 'effect', 'priority'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        policy[field] = data[field];
      }
    }

    policy.updatedAt = new Date().toISOString();
    policies.set(policyId, policy);

    dataAudit('policy.updated', { user: { id: userId } }, 'policy', policyId);

    return policy;
  }

  /**
   * Delete policy
   */
  delete(policyId, userId) {
    if (!policies.has(policyId)) {
      throw Errors.notFound('Policy not found');
    }

    policies.delete(policyId);

    dataAudit('policy.deleted', { user: { id: userId } }, 'policy', policyId);

    return { success: true, message: 'Policy deleted' };
  }

  /**
   * Activate policy
   */
  activate(policyId, userId) {
    const policy = policies.get(policyId);
    if (!policy) {
      throw Errors.notFound('Policy not found');
    }

    policy.status = 'active';
    policy.updatedAt = new Date().toISOString();
    policies.set(policyId, policy);

    return policy;
  }

  /**
   * Deactivate policy
   */
  deactivate(policyId, userId) {
    const policy = policies.get(policyId);
    if (!policy) {
      throw Errors.notFound('Policy not found');
    }

    policy.status = 'inactive';
    policy.updatedAt = new Date().toISOString();
    policies.set(policyId, policy);

    return policy;
  }

  /**
   * Evaluate policy for context
   */
  evaluate(policyId, context) {
    const { evaluatePolicy } = require('../models/rbac.model.js');
    const policy = policies.get(policyId);
    if (!policy) {
      throw Errors.notFound('Policy not found');
    }

    const result = evaluatePolicy(policy, context);
    return { policyId, result, effect: result ? policy.effect : 'deny' };
  }
}

/**
 * Feature Flag Service
 */
class FeatureFlagService {
  /**
   * Get all feature flags
   */
  getAll(options = {}) {
    let allFlags = Array.from(featureFlags.values());

    if (options.enabled !== undefined) {
      allFlags = allFlags.filter(f => f.enabled === options.enabled);
    }

    return allFlags;
  }

  /**
   * Get feature flag by key
   */
  getByKey(key) {
    const flag = featureFlags.get(key);
    if (!flag) {
      throw Errors.notFound('Feature flag not found');
    }
    return flag;
  }

  /**
   * Create feature flag
   */
  create(data, userId) {
    if (featureFlags.has(data.key)) {
      throw Errors.conflict('Feature flag with this key already exists');
    }

    const flag = createFeatureFlag(data);

    dataAudit('feature_flag.created', { user: { id: userId } }, 'feature_flag', flag.id);

    return flag;
  }

  /**
   * Update feature flag
   */
  update(key, data, userId) {
    const flag = featureFlags.get(key);
    if (!flag) {
      throw Errors.notFound('Feature flag not found');
    }

    const allowedFields = ['name', 'description', 'enabled', 'percentage', 'userIds', 'roles', 'organizations', 'conditions'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        flag[field] = data[field];
      }
    }

    flag.updatedAt = new Date().toISOString();
    featureFlags.set(key, flag);

    dataAudit('feature_flag.updated', { user: { id: userId } }, 'feature_flag', flag.id);

    return flag;
  }

  /**
   * Delete feature flag
   */
  delete(key, userId) {
    if (!featureFlags.has(key)) {
      throw Errors.notFound('Feature flag not found');
    }

    featureFlags.delete(key);

    dataAudit('feature_flag.deleted', { user: { id: userId } }, 'feature_flag', key);

    return { success: true, message: 'Feature flag deleted' };
  }

  /**
   * Enable feature flag
   */
  enable(key, userId) {
    return this.update(key, { enabled: true }, userId);
  }

  /**
   * Disable feature flag
   */
  disable(key, userId) {
    return this.update(key, { enabled: false }, userId);
  }

  /**
   * Check if feature is enabled for user
   */
  check(key, userContext) {
    const enabled = isFeatureEnabled(key, userContext);
    return { key, enabled, userContext };
  }
}

/**
 * Access Control Service
 */
class AccessControlService {
  /**
   * Check if user has permission
   */
  checkPermission(userId, permission, context = {}) {
    const result = hasPermission(userId, permission, context);
    return {
      allowed: result,
      permission,
      userId,
      context
    };
  }

  /**
   * Batch check permissions
   */
  batchCheckPermissions(userId, permissions, context = {}) {
    return permissions.map(perm => ({
      permission: perm,
      allowed: hasPermission(userId, perm, context)
    }));
  }

  /**
   * Get all permissions for user
   */
  getUserPermissions(userId, options = {}) {
    // Get user's roles
    const userRoles = this.getUserRoles(userId);

    const allPerms = new Set();

    for (const roleId of userRoles) {
      const perms = rolePermissions.get(roleId);
      if (perms) {
        for (const perm of perms) {
          allPerms.add(perm);
        }
      }
    }

    // Expand wildcards
    const { expandWildcardPermissions } = require('../models/rbac.model.js');
    const expanded = expandWildcardPermissions(Array.from(allPerms));

    // Filter by category if specified
    if (options.category) {
      const filtered = expanded.filter(permId => {
        const perm = permissions.get(permId);
        return perm && perm.category === options.category;
      });
      return filtered;
    }

    return expanded;
  }

  /**
   * Get user's roles
   */
  getUserRoles(userId) {
    // In production, this would query memberships
    // For now, return based on user type
    if (userId === 'system' || userId === 'admin') return ['superadmin'];
    if (userId === 'owner') return ['org-owner'];
    if (userId.startsWith('user-')) return ['member'];
    return ['guest'];
  }
}

export const roleService = new RoleService();
export const permissionService = new PermissionService();
export const policyService = new PolicyService();
export const featureFlagService = new FeatureFlagService();
export const accessControlService = new AccessControlService();

export default {
  roleService,
  permissionService,
  policyService,
  featureFlagService,
  accessControlService
};
