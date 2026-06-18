/**
 * CorpID Cloud - RBAC Model
 * Roles, permissions, policies, and feature flags
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const roles = new Map();
export const permissions = new Map();
export const rolePermissions = new Map(); // roleId -> Set of permissionIds
export const policies = new Map();
export const userPermissionOverrides = new Map(); // userId -> { additional: [], denied: [] }
export const featureFlags = new Map();

// ============ DEFAULT PERMISSIONS ============

const DEFAULT_PERMISSIONS = [
  // Organization
  { id: 'org:read', name: 'organization:read', category: 'organization', type: 'read', description: 'View organization details' },
  { id: 'org:write', name: 'organization:write', category: 'organization', type: 'write', description: 'Update organization' },
  { id: 'org:delete', name: 'organization:delete', category: 'organization', type: 'delete', description: 'Delete organization' },
  { id: 'org:settings:read', name: 'organization:settings:read', category: 'organization', type: 'read', description: 'View organization settings' },
  { id: 'org:settings:write', name: 'organization:settings:write', category: 'organization', type: 'write', description: 'Update organization settings' },

  // Members
  { id: 'org:members:read', name: 'organization:members:read', category: 'organization', type: 'read', description: 'View organization members' },
  { id: 'org:members:write', name: 'organization:members:write', category: 'organization', type: 'write', description: 'Manage organization members' },
  { id: 'org:members:invite', name: 'organization:members:invite', category: 'organization', type: 'write', description: 'Invite new members' },
  { id: 'org:members:remove', name: 'organization:members:remove', category: 'organization', type: 'delete', description: 'Remove members' },
  { id: 'org:members:suspend', name: 'organization:members:suspend', category: 'organization', type: 'admin', description: 'Suspend members' },

  // Departments
  { id: 'dept:read', name: 'department:read', category: 'department', type: 'read', description: 'View departments' },
  { id: 'dept:write', name: 'department:write', category: 'department', type: 'write', description: 'Create/update departments' },
  { id: 'dept:delete', name: 'department:delete', category: 'department', type: 'delete', description: 'Delete departments' },
  { id: 'dept:members:manage', name: 'department:members:manage', category: 'department', type: 'admin', description: 'Manage department members' },

  // Teams
  { id: 'team:read', name: 'team:read', category: 'team', type: 'read', description: 'View teams' },
  { id: 'team:write', name: 'team:write', category: 'team', type: 'write', description: 'Create/update teams' },
  { id: 'team:delete', name: 'team:delete', category: 'team', type: 'delete', description: 'Delete teams' },
  { id: 'team:members:add', name: 'team:members:add', category: 'team', type: 'write', description: 'Add team members' },
  { id: 'team:members:remove', name: 'team:members:remove', category: 'team', type: 'write', description: 'Remove team members' },

  // Users
  { id: 'user:read', name: 'user:read', category: 'user', type: 'read', description: 'View user profiles' },
  { id: 'user:write', name: 'user:write', category: 'user', type: 'write', description: 'Update user profiles' },
  { id: 'user:delete', name: 'user:delete', category: 'user', type: 'delete', description: 'Delete users' },
  { id: 'user:profile:read', name: 'user:profile:read', category: 'user', type: 'read', description: 'Read own profile' },
  { id: 'user:profile:write', name: 'user:profile:write', category: 'user', type: 'write', description: 'Update own profile' },
  { id: 'user:password:change', name: 'user:password:change', category: 'user', type: 'write', description: 'Change own password' },

  // Roles
  { id: 'role:read', name: 'role:read', category: 'role', type: 'read', description: 'View roles' },
  { id: 'role:write', name: 'role:write', category: 'role', type: 'write', description: 'Create/update roles' },
  { id: 'role:delete', name: 'role:delete', category: 'role', type: 'delete', description: 'Delete roles' },
  { id: 'role:assign', name: 'role:assign', category: 'role', type: 'admin', description: 'Assign roles to users' },

  // API Keys
  { id: 'api-key:read', name: 'api-key:read', category: 'api-key', type: 'read', description: 'View API keys' },
  { id: 'api-key:write', name: 'api-key:write', category: 'api-key', type: 'write', description: 'Create/manage API keys' },
  { id: 'api-key:delete', name: 'api-key:delete', category: 'api-key', type: 'delete', description: 'Delete API keys' },

  // Sessions
  { id: 'session:read', name: 'session:read', category: 'session', type: 'read', description: 'View own sessions' },
  { id: 'session:manage', name: 'session:manage', category: 'session', type: 'admin', description: 'Manage all sessions' },

  // Audit
  { id: 'audit:read', name: 'audit:read', category: 'audit', type: 'read', description: 'View audit logs' },
  { id: 'audit:export', name: 'audit:export', category: 'audit', type: 'read', description: 'Export audit logs' },

  // Billing
  { id: 'billing:read', name: 'billing:read', category: 'billing', type: 'read', description: 'View billing' },
  { id: 'billing:write', name: 'billing:write', category: 'billing', type: 'write', description: 'Manage billing' },

  // System
  { id: 'system:*', name: 'system:*', category: 'system', type: 'admin', description: 'Full system access' },
  { id: '*', name: '*', category: 'system', type: 'admin', description: 'All permissions' }
];

// ============ DEFAULT ROLES ============

const DEFAULT_ROLES = [
  {
    id: 'superadmin',
    name: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access across all organizations',
    type: 'system',
    scope: 'global',
    isDefault: false,
    inheritsFrom: [],
    permissions: ['*'],
    constraints: {},
    metadata: { level: 100 }
  },
  {
    id: 'org-owner',
    name: 'org-owner',
    displayName: 'Organization Owner',
    description: 'Full control of organization',
    type: 'system',
    scope: 'organization',
    isDefault: false,
    inheritsFrom: [],
    permissions: [
      'org:*', 'dept:*', 'team:*',
      'org:members:*', 'user:*',
      'role:read', 'role:assign',
      'api-key:*', 'session:read', 'audit:read',
      'billing:read', 'billing:write'
    ],
    constraints: {},
    metadata: { level: 90 }
  },
  {
    id: 'org-admin',
    name: 'org-admin',
    displayName: 'Organization Admin',
    description: 'Administrative access within organization',
    type: 'system',
    scope: 'organization',
    isDefault: true,
    inheritsFrom: [],
    permissions: [
      'org:read', 'org:settings:read', 'org:settings:write',
      'org:members:*', 'user:*',
      'dept:*', 'team:*',
      'role:read',
      'api-key:read', 'api-key:write',
      'session:read',
      'audit:read'
    ],
    constraints: {},
    metadata: { level: 80 }
  },
  {
    id: 'department-manager',
    name: 'department-manager',
    displayName: 'Department Manager',
    description: 'Manage department and team members',
    type: 'system',
    scope: 'department',
    isDefault: false,
    inheritsFrom: [],
    permissions: [
      'dept:read', 'dept:write',
      'dept:members:manage',
      'team:read', 'team:write',
      'team:members:add', 'team:members:remove',
      'user:read', 'user:profile:read', 'user:profile:write'
    ],
    constraints: {},
    metadata: { level: 60 }
  },
  {
    id: 'team-lead',
    name: 'team-lead',
    displayName: 'Team Lead',
    description: 'Lead and coordinate team',
    type: 'system',
    scope: 'team',
    isDefault: false,
    inheritsFrom: [],
    permissions: [
      'team:read', 'team:write',
      'team:members:add',
      'user:read', 'user:profile:read'
    ],
    constraints: {},
    metadata: { level: 50 }
  },
  {
    id: 'member',
    name: 'member',
    displayName: 'Member',
    description: 'Standard organization member',
    type: 'system',
    scope: 'organization',
    isDefault: true,
    inheritsFrom: [],
    permissions: [
      'org:read',
      'dept:read',
      'team:read',
      'user:profile:read', 'user:profile:write', 'user:password:change',
      'session:read'
    ],
    constraints: {},
    metadata: { level: 10 }
  },
  {
    id: 'viewer',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access',
    type: 'system',
    scope: 'organization',
    isDefault: false,
    inheritsFrom: [],
    permissions: [
      'org:read',
      'dept:read',
      'team:read',
      'user:profile:read'
    ],
    constraints: {},
    metadata: { level: 5 }
  },
  {
    id: 'guest',
    name: 'guest',
    displayName: 'Guest',
    description: 'Limited access for external users',
    type: 'system',
    scope: 'organization',
    isDefault: false,
    inheritsFrom: [],
    permissions: [
      'user:profile:read'
    ],
    constraints: {},
    metadata: { level: 1 }
  }
];

// ============ INITIALIZATION ============

export function initializeRBAC() {
  // Initialize permissions
  for (const perm of DEFAULT_PERMISSIONS) {
    permissions.set(perm.id, {
      ...perm,
      createdAt: new Date().toISOString()
    });
  }

  // Initialize roles and their permissions
  for (const role of DEFAULT_ROLES) {
    const roleData = {
      ...role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    roles.set(role.id, roleData);

    // Store role permissions
    rolePermissions.set(role.id, new Set(role.permissions));
  }
}

// Initialize on module load
initializeRBAC();

// ============ HELPER FUNCTIONS ============

/**
 * Check if user has permission
 */
export function hasPermission(userId, permission, context = {}) {
  // Get user's roles (would come from membership in production)
  const userRoles = getUserRoles(userId);

  for (const roleId of userRoles) {
    const perms = rolePermissions.get(roleId);
    if (!perms) continue;

    // Check direct permission
    if (perms.has(permission)) return true;

    // Check wildcard
    if (perms.has('*')) return true;

    // Check category wildcard (e.g., org:*)
    const [category] = permission.split(':');
    if (perms.has(`${category}:*`)) return true;
  }

  // Check user overrides
  const overrides = userPermissionOverrides.get(userId);
  if (overrides) {
    if (overrides.denied?.includes(permission)) return false;
    if (overrides.additional?.includes(permission)) return true;
  }

  return false;
}

/**
 * Get user's effective roles (would include org role in production)
 */
function getUserRoles(userId) {
  // In production, this would query memberships
  // For now, return based on user type
  if (userId === 'system') return ['superadmin'];
  if (userId.startsWith('user-')) return ['member'];
  return ['guest'];
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(roleId) {
  const perms = rolePermissions.get(roleId);
  return perms ? Array.from(perms) : [];
}

/**
 * Get all roles
 */
export function getAllRoles() {
  return Array.from(roles.values());
}

/**
 * Get all permissions
 */
export function getAllPermissions() {
  return Array.from(permissions.values());
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category) {
  return Array.from(permissions.values()).filter(p => p.category === category);
}

/**
 * Expand wildcard permissions to concrete list
 */
export function expandWildcardPermissions(permissionList) {
  const expanded = new Set();
  const permissionMap = new Map(permissions);

  for (const perm of permissionList) {
    if (perm === '*') {
      // Add all permissions
      for (const p of permissions.values()) {
        expanded.add(p.id);
      }
    } else if (perm.endsWith(':*')) {
      // Add all permissions in category
      const category = perm.slice(0, -2);
      for (const p of permissions.values()) {
        if (p.category === category || p.id.startsWith(`${category}:`)) {
          expanded.add(p.id);
        }
      }
    } else {
      expanded.add(perm);
    }
  }

  return Array.from(expanded);
}

// ============ CRUD OPERATIONS ============

/**
 * Create custom role
 */
export function createRole(data) {
  const now = new Date().toISOString();

  const role = {
    id: `role-${uuidv4().slice(0, 8)}`,
    name: data.name,
    displayName: data.displayName || data.name,
    description: data.description || '',
    type: 'custom',
    scope: data.scope || 'organization',
    isDefault: false,
    inheritsFrom: data.inheritsFrom || [],
    permissions: expandWildcardPermissions(data.permissions || []),
    constraints: data.constraints || {},
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy
  };

  roles.set(role.id, role);
  rolePermissions.set(role.id, new Set(role.permissions));

  return role;
}

/**
 * Update role
 */
export function updateRole(roleId, data) {
  const role = roles.get(roleId);
  if (!role) return null;

  if (role.type === 'system' && !data.allowSystemUpdate) {
    throw new Error('Cannot modify system role');
  }

  const allowedFields = ['name', 'displayName', 'description', 'permissions', 'constraints', 'metadata'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'permissions') {
        role.permissions = expandWildcardPermissions(data.permissions);
        rolePermissions.set(role.id, new Set(role.permissions));
      } else {
        role[field] = data[field];
      }
    }
  }

  role.updatedAt = new Date().toISOString();
  roles.set(role.id, role);

  return role;
}

/**
 * Delete role
 */
export function deleteRole(roleId) {
  const role = roles.get(roleId);
  if (!role) return false;

  if (role.type === 'system') {
    throw new Error('Cannot delete system role');
  }

  roles.delete(roleId);
  rolePermissions.delete(roleId);

  return true;
}

/**
 * Create permission
 */
export function createPermission(data) {
  const permission = {
    id: data.id,
    name: data.name || data.id,
    category: data.category || 'custom',
    type: data.type || 'read',
    description: data.description || '',
    riskLevel: data.riskLevel || 'low',
    auditRequired: data.auditRequired || false,
    createdAt: new Date().toISOString()
  };

  permissions.set(permission.id, permission);
  return permission;
}

/**
 * Create policy (ABAC)
 */
export function createPolicy(data) {
  const policy = {
    id: `policy-${uuidv4().slice(0, 8)}`,
    name: data.name,
    description: data.description || '',
    status: data.status || 'active',
    conditions: data.conditions || {
      subjects: [],
      resources: [],
      actions: [],
      environment: []
    },
    effect: data.effect || 'allow',
    reason: data.reason || '',
    priority: data.priority || 0,
    auditRequired: data.auditRequired || false,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  policies.set(policy.id, policy);
  return policy;
}

/**
 * Evaluate policy
 */
export function evaluatePolicy(policy, context) {
  const { subject, resource, action, environment } = context;

  // Check subject conditions
  for (const subjectCond of policy.conditions.subjects || []) {
    if (!matchesCondition(subject, subjectCond)) return false;
  }

  // Check resource conditions
  for (const resourceCond of policy.conditions.resources || []) {
    if (!matchesCondition(resource, resourceCond)) return false;
  }

  // Check action
  const actions = policy.conditions.actions || [];
  if (actions.length > 0 && !actions.includes(action) && !actions.includes('*')) {
    return false;
  }

  // Check environment conditions
  for (const envCond of policy.conditions.environment || []) {
    if (!matchesCondition(environment, envCond)) return false;
  }

  return true;
}

function matchesCondition(target, condition) {
  if (!target || !condition) return true;

  const { type, attributes } = condition;

  if (type === 'user' && attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (target[key] !== value) return false;
    }
  }

  return true;
}

/**
 * Create feature flag
 */
export function createFeatureFlag(data) {
  const flag = {
    id: `flag-${uuidv4().slice(0, 8)}`,
    key: data.key,
    name: data.name,
    description: data.description || '',
    type: data.type || 'boolean',
    enabled: data.enabled || false,
    percentage: data.percentage || 0,
    userIds: data.userIds || [],
    roles: data.roles || [],
    organizations: data.organizations || [],
    conditions: data.conditions || {},
    rolloutStages: [],
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  featureFlags.set(flag.key, flag);
  return flag;
}

/**
 * Check if feature is enabled for user
 */
export function isFeatureEnabled(key, userContext = {}) {
  const flag = featureFlags.get(key);
  if (!flag || !flag.enabled) return false;

  // Check user-specific override
  if (flag.userIds.includes(userContext.userId)) return true;

  // Check role
  if (flag.roles.includes(userContext.role)) return true;

  // Check organization
  if (flag.organizations.includes(userContext.organizationId)) return true;

  // Check percentage rollout
  if (flag.percentage > 0 && userContext.userId) {
    // Simple hash-based distribution
    const hash = hashCode(userContext.userId);
    const bucket = hash % 100;
    return bucket < flag.percentage;
  }

  return false;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Add user permission override
 */
export function addUserPermissionOverride(userId, additional = [], denied = []) {
  const existing = userPermissionOverrides.get(userId) || { additional: [], denied: [] };

  userPermissionOverrides.set(userId, {
    additional: [...new Set([...existing.additional, ...additional])],
    denied: [...new Set([...existing.denied, ...denied])]
  });
}

/**
 * Remove user permission override
 */
export function removeUserPermissionOverride(userId) {
  userPermissionOverrides.delete(userId);
}
