import { RBACEngine } from '../rbac/rbac-engine';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
  description?: string;
  constraints?: PermissionConstraint[];
  metadata?: Record<string, any>;
}

export interface PermissionConstraint {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface PermissionGrant {
  id: string;
  principalType: 'user' | 'group' | 'service';
  principalId: string;
  permission: Permission;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  conditions?: PermissionConstraint[];
}

export interface PermissionCheckOptions {
  context?: Record<string, any>;
  bypassConstraints?: boolean;
  auditReason?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  permission?: Permission;
  reason: string;
  evaluatedConstraints?: {
    constraint: PermissionConstraint;
    satisfied: boolean;
  }[];
}

export interface UserPermissionSummary {
  userId: string;
  roles: string[];
  directPermissions: Permission[];
  effectivePermissions: Permission[];
  lastUpdated: Date;
}

export class PermissionManager {
  private rbacEngine: RBACEngine;
  private permissionCatalog: Map<string, Permission> = new Map();
  private permissionGrants: Map<string, PermissionGrant[]> = new Map();
  private groupMemberships: Map<string, string[]> = new Map();

  constructor(rbacEngine: RBACEngine) {
    this.rbacEngine = rbacEngine;
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    // Document permissions
    this.registerPermission({
      id: 'doc:read',
      resource: 'documents',
      actions: ['read'],
      description: 'Read documents'
    });

    this.registerPermission({
      id: 'doc:write',
      resource: 'documents',
      actions: ['write', 'read'],
      description: 'Create and read documents'
    });

    this.registerPermission({
      id: 'doc:update',
      resource: 'documents',
      actions: ['update', 'read'],
      description: 'Update documents'
    });

    this.registerPermission({
      id: 'doc:delete',
      resource: 'documents',
      actions: ['delete', 'read'],
      description: 'Delete documents'
    });

    // Media permissions
    this.registerPermission({
      id: 'media:read',
      resource: 'media',
      actions: ['read'],
      description: 'Read media files'
    });

    this.registerPermission({
      id: 'media:upload',
      resource: 'media',
      actions: ['write', 'read'],
      description: 'Upload media files'
    });

    // User management permissions
    this.registerPermission({
      id: 'user:read',
      resource: 'users',
      actions: ['read'],
      description: 'View user profiles'
    });

    this.registerPermission({
      id: 'user:manage',
      resource: 'users',
      actions: ['read', 'write', 'update', 'delete'],
      description: 'Manage users',
      constraints: [
        { field: 'role', operator: 'eq', value: 'admin' }
      ]
    });

    // Settings permissions
    this.registerPermission({
      id: 'settings:read',
      resource: 'settings',
      actions: ['read'],
      description: 'Read system settings'
    });

    this.registerPermission({
      id: 'settings:write',
      resource: 'settings',
      actions: ['read', 'write', 'update'],
      description: 'Modify system settings',
      constraints: [
        { field: 'role', operator: 'eq', value: 'admin' }
      ]
    });
  }

  registerPermission(permission: Permission): void {
    this.permissionCatalog.set(permission.id, permission);
    logger.debug(`Permission registered: ${permission.id}`);
  }

  getPermission(permissionId: string): Permission | undefined {
    return this.permissionCatalog.get(permissionId);
  }

  getAllPermissions(): Permission[] {
    return Array.from(this.permissionCatalog.values());
  }

  getPermissionsByResource(resource: string): Permission[] {
    return Array.from(this.permissionCatalog.values())
      .filter(p => p.resource === resource);
  }

  grantPermission(grant: Omit<PermissionGrant, 'id' | 'grantedAt'>): PermissionGrant {
    const newGrant: PermissionGrant = {
      ...grant,
      id: uuidv4(),
      grantedAt: new Date()
    };

    const principalKey = `${grant.principalType}:${grant.principalId}`;

    if (!this.permissionGrants.has(principalKey)) {
      this.permissionGrants.set(principalKey, []);
    }

    this.permissionGrants.get(principalKey)!.push(newGrant);

    logger.info(`Permission ${grant.permission.id} granted to ${grant.principalType}:${grant.principalId}`);
    return newGrant;
  }

  revokePermission(principalType: string, principalId: string, permissionId: string): boolean {
    const principalKey = `${principalType}:${principalId}`;
    const grants = this.permissionGrants.get(principalKey);

    if (!grants) return false;

    const index = grants.findIndex(g => g.permission.id === permissionId);
    if (index === -1) return false;

    grants.splice(index, 1);
    logger.info(`Permission ${permissionId} revoked from ${principalType}:${principalId}`);
    return true;
  }

  getGrants(principalType: string, principalId: string): PermissionGrant[] {
    const principalKey = `${principalType}:${principalId}`;
    return this.permissionGrants.get(principalKey) || [];
  }

  async checkPermission(
    principalType: string,
    principalId: string,
    permissionId: string,
    options: PermissionCheckOptions = {}
  ): Promise<PermissionCheckResult> {
    const permission = this.permissionCatalog.get(permissionId);

    if (!permission) {
      return {
        allowed: false,
        reason: `Permission not found: ${permissionId}`
      };
    }

    // Check if permission is in any of principal's grants
    const grants = this.getGrants(principalType, principalId);
    const matchingGrant = grants.find(g => g.permission.id === permissionId);

    if (!matchingGrant) {
      return {
        allowed: false,
        reason: `No grant found for permission: ${permissionId}`
      };
    }

    // Check expiration
    if (matchingGrant.expiresAt && new Date() > matchingGrant.expiresAt) {
      return {
        allowed: false,
        permission,
        reason: 'Permission grant has expired'
      };
    }

    // Check constraints
    const evaluatedConstraints: { constraint: PermissionConstraint; satisfied: boolean }[] = [];
    let allConstraintsSatisfied = true;

    const allConstraints = [
      ...(permission.constraints || []),
      ...(matchingGrant.conditions || [])
    ];

    if (!options.bypassConstraints && allConstraints.length > 0) {
      const context = options.context || {};

      for (const constraint of allConstraints) {
        const actualValue = context[constraint.field];
        const satisfied = this.evaluateConstraint(actualValue, constraint);
        evaluatedConstraints.push({ constraint, satisfied });

        if (!satisfied) {
          allConstraintsSatisfied = false;
        }
      }
    }

    if (!allConstraintsSatisfied) {
      return {
        allowed: false,
        permission,
        reason: 'Permission constraints not satisfied',
        evaluatedConstraints
      };
    }

    return {
      allowed: true,
      permission,
      reason: 'Permission granted and constraints satisfied',
      evaluatedConstraints
    };
  }

  private evaluateConstraint(actualValue: any, constraint: PermissionConstraint): boolean {
    const expected = constraint.value;

    switch (constraint.operator) {
      case 'eq':
        return actualValue === expected;
      case 'ne':
        return actualValue !== expected;
      case 'gt':
        return actualValue > expected;
      case 'lt':
        return actualValue < expected;
      case 'gte':
        return actualValue >= expected;
      case 'lte':
        return actualValue <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actualValue);
      case 'contains':
        if (typeof actualValue === 'string') {
          return actualValue.includes(expected);
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expected);
        }
        return false;
      default:
        return false;
    }
  }

  async getUserPermissions(userId: string): Promise<UserPermissionSummary> {
    const roles = this.rbacEngine.getUserRoles(userId);
    const directGrants = this.getGrants('user', userId);
    const directPermissions = directGrants
      .filter(g => !g.expiresAt || g.expiresAt > new Date())
      .map(g => g.permission);

    // Get permissions from groups
    const groupIds = this.groupMemberships.get(userId) || [];
    const groupPermissions: Permission[] = [];

    for (const groupId of groupIds) {
      const groupGrants = this.getGrants('group', groupId);
      const validGrants = groupGrants
        .filter(g => !g.expiresAt || g.expiresAt > new Date());

      for (const grant of validGrants) {
        if (!groupPermissions.find(p => p.id === grant.permission.id)) {
          groupPermissions.push(grant.permission);
        }
      }
    }

    // Get role-based permissions
    const rolePermissions: Permission[] = [];
    for (const roleId of roles) {
      const role = this.rbacEngine.getRole(roleId);
      if (role) {
        for (const rolePerm of role.permissions) {
          const permission: Permission = {
            id: `${roleId}:${rolePerm.resource}`,
            resource: rolePerm.resource,
            actions: rolePerm.actions
          };
          if (!rolePermissions.find(p => p.id === permission.id)) {
            rolePermissions.push(permission);
          }
        }
      }
    }

    // Merge all permissions (direct takes precedence)
    const effectivePermissions = [...directPermissions];
    for (const perm of [...groupPermissions, ...rolePermissions]) {
      if (!effectivePermissions.find(p => p.id === perm.id)) {
        effectivePermissions.push(perm);
      }
    }

    return {
      userId,
      roles,
      directPermissions,
      effectivePermissions,
      lastUpdated: new Date()
    };
  }

  addGroupMember(userId: string, groupId: string): void {
    if (!this.groupMemberships.has(userId)) {
      this.groupMemberships.set(userId, []);
    }

    const groups = this.groupMemberships.get(userId)!;
    if (!groups.includes(groupId)) {
      groups.push(groupId);
      logger.info(`User ${userId} added to group ${groupId}`);
    }
  }

  removeGroupMember(userId: string, groupId: string): boolean {
    const groups = this.groupMemberships.get(userId);
    if (!groups) return false;

    const index = groups.indexOf(groupId);
    if (index === -1) return false;

    groups.splice(index, 1);
    logger.info(`User ${userId} removed from group ${groupId}`);
    return true;
  }

  getUserGroups(userId: string): string[] {
    return this.groupMemberships.get(userId) || [];
  }

  getGroupMembers(groupId: string): string[] {
    const members: string[] = [];

    for (const [userId, groups] of this.groupMemberships.entries()) {
      if (groups.includes(groupId)) {
        members.push(userId);
      }
    }

    return members;
  }
}
