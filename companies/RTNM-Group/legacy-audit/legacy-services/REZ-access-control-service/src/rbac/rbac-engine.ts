import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  parentRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface RBACCheckResult {
  allowed: boolean;
  reason: string;
  matchedRoles: string[];
  evaluatedAt: Date;
}

export interface UserRoleMapping {
  [userId: string]: string[];
}

export class RBACEngine {
  private roles: Map<string, Role> = new Map();
  private userRoleMappings: UserRoleMapping = {};
  private roleHierarchy: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    // Admin role - explicit permissions for all resources (least privilege)
    const adminRole: Role = {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: [
        { resource: 'users', actions: ['*'] },
        { resource: 'roles', actions: ['*'] },
        { resource: 'policies', actions: ['*'] },
        { resource: 'permissions', actions: ['*'] },
        { resource: 'audit', actions: ['read', 'write'] },
        { resource: 'system', actions: ['read', 'update'] },
        { resource: 'identities', actions: ['*'] },
        { resource: 'loans', actions: ['*'] },
        { resource: 'bnpl', actions: ['*'] },
        { resource: 'payments', actions: ['*'] },
        { resource: 'reports', actions: ['*'] }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Editor role - read/write access
    const editorRole: Role = {
      id: 'editor',
      name: 'Editor',
      description: 'Can read and write content',
      permissions: [
        { resource: 'documents', actions: ['read', 'write', 'update', 'delete'] },
        { resource: 'media', actions: ['read', 'write', 'update'] },
        { resource: 'comments', actions: ['read', 'write', 'update', 'delete'] }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Viewer role - read-only access
    const viewerRole: Role = {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to resources',
      permissions: [
        { resource: 'documents', actions: ['read'] },
        { resource: 'media', actions: ['read'] },
        { resource: 'comments', actions: ['read'] }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Guest role - minimal access
    const guestRole: Role = {
      id: 'guest',
      name: 'Guest',
      description: 'Minimal access for unauthenticated users',
      permissions: [
        { resource: 'public', actions: ['read'] }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(adminRole.id, adminRole);
    this.roles.set(editorRole.id, editorRole);
    this.roles.set(viewerRole.id, viewerRole);
    this.roles.set(guestRole.id, guestRole);

    // Set up role hierarchy
    this.roleHierarchy.set('admin', ['editor', 'viewer', 'guest']);
    this.roleHierarchy.set('editor', ['viewer', 'guest']);
    this.roleHierarchy.set('viewer', ['guest']);
  }

  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<RBACCheckResult> {
    const userRoles = this.getUserRoles(userId);

    if (userRoles.length === 0) {
      return {
        allowed: false,
        reason: 'User has no assigned roles',
        matchedRoles: [],
        evaluatedAt: new Date()
      };
    }

    const allRoles = this.resolveRoleHierarchy(userRoles);
    const matchedRoles: string[] = [];

    for (const roleId of allRoles) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      for (const permission of role.permissions) {
        if (this.permissionMatches(permission, resource, action)) {
          matchedRoles.push(roleId);
          return {
            allowed: true,
            reason: `Access granted by role: ${role.name}`,
            matchedRoles: [...new Set(matchedRoles)],
            evaluatedAt: new Date()
          };
        }
      }
    }

    return {
      allowed: false,
      reason: 'No matching permission found for the requested action',
      matchedRoles: [],
      evaluatedAt: new Date()
    };
  }

  private permissionMatches(permission: Permission, resource: string, action: string): boolean {
    // Wildcard resource matches everything
    if (permission.resource === '*') {
      return permission.actions.includes('*') || permission.actions.includes(action);
    }

    // Check resource pattern matching
    if (!this.resourceMatches(permission.resource, resource)) {
      return false;
    }

    // Check action
    return permission.actions.includes('*') || permission.actions.includes(action);
  }

  private resourceMatches(pattern: string, resource: string): boolean {
    // Exact match
    if (pattern === resource) return true;

    // Wildcard patterns
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(resource);
    }

    // Prefix matching (e.g., "documents:" matches "documents:123")
    if (pattern.endsWith(':')) {
      return resource.startsWith(pattern) || resource === pattern.slice(0, -1);
    }

    return false;
  }

  private resolveRoleHierarchy(roles: string[]): string[] {
    const resolved = new Set<string>();

    for (const role of roles) {
      resolved.add(role);

      const inheritedRoles = this.roleHierarchy.get(role);
      if (inheritedRoles) {
        for (const inherited of inheritedRoles) {
          resolved.add(inherited);
        }
      }
    }

    return Array.from(resolved);
  }

  getUserRoles(userId: string): string[] {
    return this.userRoleMappings[userId] || [];
  }

  assignRole(userId: string, roleId: string, assignedBy: string): RoleAssignment {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (!this.userRoleMappings[userId]) {
      this.userRoleMappings[userId] = [];
    }

    if (!this.userRoleMappings[userId].includes(roleId)) {
      this.userRoleMappings[userId].push(roleId);
    }

    const assignment: RoleAssignment = {
      userId,
      roleId,
      assignedAt: new Date(),
      assignedBy
    };

    logger.info(`Role ${roleId} assigned to user ${userId} by ${assignedBy}`);
    return assignment;
  }

  revokeRole(userId: string, roleId: string): boolean {
    if (!this.userRoleMappings[userId]) {
      return false;
    }

    const index = this.userRoleMappings[userId].indexOf(roleId);
    if (index === -1) {
      return false;
    }

    this.userRoleMappings[userId].splice(index, 1);
    logger.info(`Role ${roleId} revoked from user ${userId}`);
    return true;
  }

  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const newRole: Role = {
      ...role,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(newRole.id, newRole);
    logger.info(`Role created: ${newRole.name} (${newRole.id})`);
    return newRole;
  }

  updateRole(roleId: string, updates: Partial<Role>): Role | null {
    const role = this.roles.get(roleId);
    if (!role) return null;

    const updatedRole: Role = {
      ...role,
      ...updates,
      id: roleId,
      updatedAt: new Date()
    };

    this.roles.set(roleId, updatedRole);
    logger.info(`Role updated: ${roleId}`);
    return updatedRole;
  }

  deleteRole(roleId: string): boolean {
    // Prevent deletion of default roles
    if (['admin', 'editor', 'viewer', 'guest'].includes(roleId)) {
      throw new Error(`Cannot delete default role: ${roleId}`);
    }

    // Remove role from all users
    for (const userId of Object.keys(this.userRoleMappings)) {
      this.userRoleMappings[userId] = this.userRoleMappings[userId].filter(
        r => r !== roleId
      );
    }

    const deleted = this.roles.delete(roleId);
    if (deleted) {
      logger.info(`Role deleted: ${roleId}`);
    }
    return deleted;
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  setRoleHierarchy(parentRole: string, childRoles: string[]): void {
    this.roleHierarchy.set(parentRole, childRoles);
    logger.info(`Role hierarchy updated: ${parentRole} -> ${childRoles.join(', ')}`);
  }
}
