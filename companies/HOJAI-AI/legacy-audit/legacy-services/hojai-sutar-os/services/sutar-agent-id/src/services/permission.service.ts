/**
 * SUTAR Agent ID Service - Permission Service
 * Role-based access control and permission management
 */

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  Permission,
  PermissionLevel,
  PermissionRole,
  Agent,
  AgentStatus,
  IdentityEvent,
  IdentityEventType,
} from "../types/index.js";
import { PermissionSchema } from "../types/index.js";
import { storageService } from "./storage.service.js";
import { agentService } from "./agent.service.js";

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredLevel?: PermissionLevel;
  currentLevel?: PermissionLevel;
}

export interface PermissionGrant {
  resource: string;
  actions: string[];
  level: PermissionLevel;
  conditions?: Record<string, unknown>;
  grantedBy?: string;
  expiresAt?: string;
}

export interface RoleAssignment {
  agentId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: string;
}

export interface ResourcePermission {
  resource: string;
  allowed: boolean;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    execute: boolean;
  };
}

// Default resource permissions
const DEFAULT_RESOURCES = [
  "agents",
  "tokens",
  "permissions",
  "roles",
  "events",
  "metadata",
  "capabilities",
];

export class PermissionService {
  // ============================================================================
  // Permission Management
  // ============================================================================

  async grantPermission(agentId: string, grant: PermissionGrant): Promise<Permission | null> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      console.log(`[PermissionService] Agent ${agentId} not found`);
      return null;
    }

    const permission: Permission = {
      id: uuidv4(),
      agentId,
      resource: grant.resource,
      actions: grant.actions,
      level: grant.level,
      conditions: grant.conditions,
      grantedBy: grant.grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt: grant.expiresAt,
    };

    await storageService.setPermission(permission);

    // Update agent permissions
    const updatedPermissions = {
      ...agent.permissions,
      [grant.resource]: grant.level,
    };

    await storageService.updateAgent(agentId, {
      permissions: updatedPermissions,
    });

    // Create event
    await this.createPermissionEvent(IdentityEventType.PERMISSION_CHANGED, agentId, {
      action: "grant",
      resource: grant.resource,
      level: grant.level,
      actions: grant.actions,
      grantedBy: grant.grantedBy,
    });

    console.log(`[PermissionService] Granted ${grant.level} permission on ${grant.resource} to agent ${agentId}`);
    return permission;
  }

  async revokePermission(permissionId: string): Promise<boolean> {
    const permission = await storageService.getPermission(permissionId);

    if (!permission) {
      return false;
    }

    const agent = await agentService.getAgent(permission.agentId);

    if (agent) {
      const updatedPermissions = { ...agent.permissions };
      delete updatedPermissions[permission.resource];

      await storageService.updateAgent(permission.agentId, {
        permissions: updatedPermissions,
      });
    }

    const deleted = await storageService.deletePermission(permissionId);

    if (deleted) {
      await this.createPermissionEvent(IdentityEventType.PERMISSION_CHANGED, permission.agentId, {
        action: "revoke",
        resource: permission.resource,
        permissionId,
      });
    }

    return deleted;
  }

  async getAgentPermissions(agentId: string): Promise<Permission[]> {
    return storageService.getPermissionsByAgent(agentId);
  }

  async getAgentPermission(agentId: string, resource: string): Promise<Permission | null> {
    return storageService.getPermissionByResource(agentId, resource);
  }

  async updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission | null> {
    return storageService.updatePermission(permissionId, updates);
  }

  async bulkGrantPermissions(agentId: string, grants: PermissionGrant[]): Promise<{
    success: number;
    failed: number;
    permissions: Permission[];
    errors: Array<{ resource: string; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      permissions: [] as Permission[],
      errors: [] as Array<{ resource: string; error: string }>,
    };

    for (const grant of grants) {
      try {
        const permission = await this.grantPermission(agentId, grant);
        if (permission) {
          result.success++;
          result.permissions.push(permission);
        } else {
          result.failed++;
          result.errors.push({ resource: grant.resource, error: "Failed to grant permission" });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({ resource: grant.resource, error: String(error) });
      }
    }

    return result;
  }

  async bulkRevokePermissions(agentId: string, resources: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ resource: string; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ resource: string; error: string }>,
    };

    const permissions = await storageService.getPermissionsByAgent(agentId);

    for (const resource of resources) {
      const permission = permissions.find(p => p.resource === resource);
      if (permission) {
        const revoked = await this.revokePermission(permission.id);
        if (revoked) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ resource, error: "Failed to revoke permission" });
        }
      } else {
        result.failed++;
        result.errors.push({ resource, error: "Permission not found" });
      }
    }

    return result;
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  async checkPermission(agentId: string, resource: string, action: string): Promise<PermissionCheck> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return {
        allowed: false,
        reason: "Agent not found",
      };
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      return {
        allowed: false,
        reason: "Agent is not active",
      };
    }

    // Check agent-level permissions first
    const agentLevel = agent.permissions[resource];

    if (agentLevel !== undefined) {
      const hasPermission = this.checkLevelPermission(agentLevel, action);
      return {
        allowed: hasPermission,
        reason: hasPermission ? "Allowed by agent permission" : "Insufficient permission level",
        requiredLevel: this.getRequiredLevel(action),
        currentLevel: agentLevel,
      };
    }

    // Check specific permissions
    const permission = await storageService.getPermissionByResource(agentId, resource);

    if (!permission) {
      return {
        allowed: false,
        reason: "No permission found for resource",
      };
    }

    if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
      return {
        allowed: false,
        reason: "Permission has expired",
      };
    }

    const hasPermission = permission.actions.includes(action) ||
      permission.actions.includes("*") ||
      (action === "read" && permission.actions.includes("read"));

    return {
      allowed: hasPermission,
      reason: hasPermission ? "Allowed by permission" : "Action not permitted",
      requiredLevel: this.getRequiredLevel(action),
      currentLevel: permission.level,
    };
  }

  async checkMultiplePermissions(agentId: string, checks: Array<{ resource: string; action: string }>): Promise<{
    allAllowed: boolean;
    results: Record<string, PermissionCheck>;
  }> {
    const results: Record<string, PermissionCheck> = {};
    let allAllowed = true;

    for (const check of checks) {
      const key = `${check.resource}:${check.action}`;
      const result = await this.checkPermission(agentId, check.resource, check.action);
      results[key] = result;
      if (!result.allowed) {
        allAllowed = false;
      }
    }

    return { allAllowed, results };
  }

  async getResourcePermissions(agentId: string, resource: string): Promise<ResourcePermission> {
    const agent = await agentService.getAgent(agentId);
    const permission = await storageService.getPermissionByResource(agentId, resource);

    const level = agent?.permissions[resource] || permission?.level || PermissionLevel.NONE;

    return {
      resource,
      allowed: level >= PermissionLevel.READ,
      actions: {
        create: this.checkLevelPermission(level, "create"),
        read: this.checkLevelPermission(level, "read"),
        update: this.checkLevelPermission(level, "update"),
        delete: this.checkLevelPermission(level, "delete"),
        execute: this.checkLevelPermission(level, "execute"),
      },
    };
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  async getRole(roleId: string): Promise<PermissionRole | null> {
    return storageService.getRole(roleId);
  }

  async getRoleByName(name: string): Promise<PermissionRole | null> {
    return storageService.getRoleByName(name);
  }

  async getAllRoles(): Promise<PermissionRole[]> {
    return storageService.getAllRoles();
  }

  async createRole(name: string, description: string, permissions?: Permission[]): Promise<PermissionRole> {
    const role: PermissionRole = {
      id: uuidv4(),
      name,
      description,
      permissions: permissions || [],
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storageService.setRole(role);
    return role;
  }

  async updateRole(roleId: string, updates: Partial<PermissionRole>): Promise<PermissionRole | null> {
    const role = await storageService.getRole(roleId);

    if (!role) {
      return null;
    }

    if (role.isSystem) {
      console.log(`[PermissionService] Cannot update system role ${roleId}`);
      return null;
    }

    const updatedRole: PermissionRole = {
      ...role,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await storageService.setRole(updatedRole);
    return updatedRole;
  }

  async deleteRole(roleId: string): Promise<boolean> {
    return storageService.deleteRole(roleId);
  }

  async assignRole(assignment: RoleAssignment): Promise<boolean> {
    const agent = await agentService.getAgent(assignment.agentId);
    const role = await this.getRole(assignment.roleId);

    if (!agent || !role) {
      return false;
    }

    // Apply role permissions to agent
    for (const perm of role.permissions) {
      await this.grantPermission(assignment.agentId, {
        resource: perm.resource,
        actions: perm.actions,
        level: perm.level,
        conditions: perm.conditions,
        grantedBy: assignment.assignedBy,
        expiresAt: assignment.expiresAt,
      });
    }

    return true;
  }

  async unassignRole(agentId: string, roleId: string): Promise<boolean> {
    const role = await this.getRole(roleId);

    if (!role) {
      return false;
    }

    // Revoke all permissions from this role
    for (const perm of role.permissions) {
      const permission = await storageService.getPermissionByResource(agentId, perm.resource);
      if (permission) {
        await this.revokePermission(permission.id);
      }
    }

    return true;
  }

  // ============================================================================
  // Permission Inheritance
  // ============================================================================

  async getEffectivePermissions(agentId: string): Promise<Record<string, PermissionLevel>> {
    const agent = await agentService.getAgent(agentId);
    const effectivePermissions: Record<string, PermissionLevel> = {};

    if (!agent) {
      return effectivePermissions;
    }

    // Start with agent's direct permissions
    for (const [resource, level] of Object.entries(agent.permissions)) {
      effectivePermissions[resource] = level;
    }

    // Check parent agent for inherited permissions
    if (agent.parentAgentId) {
      const parentPermissions = await this.getEffectivePermissions(agent.parentAgentId);

      for (const [resource, level] of Object.entries(parentPermissions)) {
        // Only inherit if not explicitly set on this agent
        if (effectivePermissions[resource] === undefined) {
          effectivePermissions[resource] = level;
        }
      }
    }

    return effectivePermissions;
  }

  async checkInheritedPermission(agentId: string, resource: string, action: string): Promise<PermissionCheck> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return { allowed: false, reason: "Agent not found" };
    }

    // Check this agent first
    const selfCheck = await this.checkPermission(agentId, resource, action);
    if (selfCheck.allowed) {
      return selfCheck;
    }

    // Check parent agent
    if (agent.parentAgentId) {
      return this.checkInheritedPermission(agent.parentAgentId, resource, action);
    }

    return { allowed: false, reason: "No permission found" };
  }

  // ============================================================================
  // Permission Validation
  // ============================================================================

  validatePermissionSchema(permissions: unknown[]): {
    valid: boolean;
    errors: string[];
    parsed: z.infer<typeof PermissionSchema>[];
  } {
    const errors: string[] = [];
    const parsed: z.infer<typeof PermissionSchema>[] = [];

    for (let i = 0; i < permissions.length; i++) {
      try {
        const result = PermissionSchema.parse(permissions[i]);
        parsed.push(result);
      } catch (error) {
        errors.push(`Permission ${i}: ${String(error)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      parsed,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private checkLevelPermission(level: PermissionLevel, action: string): boolean {
    const actionLevels: Record<string, PermissionLevel> = {
      create: PermissionLevel.WRITE,
      read: PermissionLevel.READ,
      update: PermissionLevel.WRITE,
      delete: PermissionLevel.ADMIN,
      execute: PermissionLevel.READ,
    };

    const requiredLevel = actionLevels[action] || PermissionLevel.READ;
    return level >= requiredLevel;
  }

  private getRequiredLevel(action: string): PermissionLevel {
    const actionLevels: Record<string, PermissionLevel> = {
      create: PermissionLevel.WRITE,
      read: PermissionLevel.READ,
      update: PermissionLevel.WRITE,
      delete: PermissionLevel.ADMIN,
      execute: PermissionLevel.READ,
    };

    return actionLevels[action] || PermissionLevel.READ;
  }

  private async createPermissionEvent(
    type: IdentityEventType,
    agentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const event: IdentityEvent = {
      id: uuidv4(),
      type,
      agentId,
      data,
      timestamp: new Date().toISOString(),
    };

    await storageService.addEvent(event);
  }

  // ============================================================================
  // Permission Statistics
  // ============================================================================

  async getPermissionStats(): Promise<{
    totalPermissions: number;
    byLevel: Record<PermissionLevel, number>;
    byResource: Record<string, number>;
    agentsWithPermissions: number;
  }> {
    const agents = await agentService.getAllAgents();
    const allPermissions: Permission[] = [];

    for (const agent of agents) {
      const perms = await storageService.getPermissionsByAgent(agent.id);
      allPermissions.push(...perms);
    }

    const stats = {
      totalPermissions: allPermissions.length,
      byLevel: {} as Record<PermissionLevel, number>,
      byResource: {} as Record<string, number>,
      agentsWithPermissions: 0,
    };

    for (const level of Object.values(PermissionLevel) as PermissionLevel[]) {
      stats.byLevel[level] = 0;
    }

    for (const perm of allPermissions) {
      stats.byLevel[perm.level]++;
      stats.byResource[perm.resource] = (stats.byResource[perm.resource] || 0) + 1;
    }

    const agentsWithPerms = new Set(allPermissions.map(p => p.agentId));
    stats.agentsWithPermissions = agentsWithPerms.size;

    return stats;
  }

  // ============================================================================
  // Default Permissions Setup
  // ============================================================================

  async setupDefaultPermissions(agentId: string): Promise<void> {
    const agent = await agentService.getAgent(agentId);

    if (!agent) {
      return;
    }

    // Grant default permissions based on agent type
    const defaultResources = DEFAULT_RESOURCES;

    for (const resource of defaultResources) {
      let level: PermissionLevel = PermissionLevel.READ;

      switch (agent.type) {
        case "system":
          level = PermissionLevel.SUPER_ADMIN;
          break;
        case "orchestrator":
          level = PermissionLevel.ADMIN;
          break;
        case "service":
          level = PermissionLevel.WRITE;
          break;
        case "user":
          level = PermissionLevel.READ;
          break;
        default:
          level = PermissionLevel.NONE;
      }

      if (level > PermissionLevel.NONE) {
        await this.grantPermission(agentId, {
          resource,
          actions: this.getActionsForLevel(level),
          level,
        });
      }
    }
  }

  private getActionsForLevel(level: PermissionLevel): string[] {
    switch (level) {
      case PermissionLevel.READ:
        return ["read"];
      case PermissionLevel.WRITE:
        return ["read", "create", "update", "execute"];
      case PermissionLevel.ADMIN:
        return ["create", "read", "update", "delete", "execute"];
      case PermissionLevel.SUPER_ADMIN:
        return ["create", "read", "update", "delete", "execute", "admin"];
      default:
        return [];
    }
  }
}

// Singleton instance
export const permissionService = new PermissionService();
