/**
 * SUTAR Agent ID Service - Storage Service
 * In-memory storage with TTL support for agent data
 */

import { Agent, AuthToken, Permission, PermissionRole, IdentityEvent, StorageOptions } from "../types/index.js";

interface StorageEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface StorageStats {
  totalEntries: number;
  expiredEntries: number;
  memoryUsage: number;
}

export class StorageService {
  private agents: Map<string, StorageEntry<Agent>> = new Map();
  private tokens: Map<string, StorageEntry<AuthToken>> = new Map();
  private permissions: Map<string, StorageEntry<Permission>> = new Map();
  private roles: Map<string, StorageEntry<PermissionRole>> = new Map();
  private events: StorageEntry<IdentityEvent>[] = [];
  private apiKeys: Map<string, string> = new Map(); // apiKey -> agentId
  private tokenHashes: Map<string, string> = new Map(); // tokenHash -> tokenId

  private readonly MAX_EVENTS = 10000;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    this.startCleanupTimer();
    this.initializeDefaultRoles();
  }

  // ============================================================================
  // Agent Storage
  // ============================================================================

  async setAgent(agent: Agent, options?: StorageOptions): Promise<void> {
    const entry: StorageEntry<Agent> = {
      value: agent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    this.agents.set(agent.id, entry);
    if (agent.apiKeyHash) {
      this.apiKeys.set(agent.apiKeyHash, agent.id);
    }
  }

  async getAgent(id: string): Promise<Agent | null> {
    const entry = this.agents.get(id);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.agents.delete(id);
      return null;
    }
    return entry.value;
  }

  async getAgentByApiKeyHash(apiKeyHash: string): Promise<Agent | null> {
    const agentId = this.apiKeys.get(apiKeyHash);
    if (!agentId) return null;
    return this.getAgent(agentId);
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    const entry = this.agents.get(id);
    if (!entry) return null;

    const updatedAgent = {
      ...entry.value,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const newEntry: StorageEntry<Agent> = {
      ...entry,
      value: updatedAgent,
      updatedAt: Date.now(),
    };

    this.agents.set(id, newEntry);
    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const entry = this.agents.get(id);
    if (!entry) return false;

    if (entry.value.apiKeyHash) {
      this.apiKeys.delete(entry.value.apiKeyHash);
    }

    this.agents.delete(id);
    return true;
  }

  async getAllAgents(): Promise<Agent[]> {
    this.cleanupExpired();
    return Array.from(this.agents.values())
      .filter(entry => !entry.expiresAt || entry.expiresAt > Date.now())
      .map(entry => entry.value);
  }

  async getAgentsByStatus(status: string): Promise<Agent[]> {
    const agents = await this.getAllAgents();
    return agents.filter(agent => agent.status === status);
  }

  async getAgentsByType(type: string): Promise<Agent[]> {
    const agents = await this.getAllAgents();
    return agents.filter(agent => agent.type === type);
  }

  async getAgentsByParent(parentAgentId: string): Promise<Agent[]> {
    const agents = await this.getAllAgents();
    return agents.filter(agent => agent.parentAgentId === parentAgentId);
  }

  async countAgents(): Promise<number> {
    this.cleanupExpired();
    return this.agents.size;
  }

  // ============================================================================
  // Token Storage
  // ============================================================================

  async setToken(token: AuthToken, options?: StorageOptions): Promise<void> {
    const entry: StorageEntry<AuthToken> = {
      value: token,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    this.tokens.set(token.id, entry);
    this.tokenHashes.set(token.tokenHash, token.id);
  }

  async getToken(id: string): Promise<AuthToken | null> {
    const entry = this.tokens.get(id);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.tokens.delete(id);
      return null;
    }
    return entry.value;
  }

  async getTokenByHash(tokenHash: string): Promise<AuthToken | null> {
    const tokenId = this.tokenHashes.get(tokenHash);
    if (!tokenId) return null;
    return this.getToken(tokenId);
  }

  async getTokensByAgent(agentId: string): Promise<AuthToken[]> {
    const allTokens = Array.from(this.tokens.values())
      .filter(entry => !entry.expiresAt || entry.expiresAt > Date.now())
      .map(entry => entry.value);
    return allTokens.filter(token => token.agentId === agentId);
  }

  async updateToken(id: string, updates: Partial<AuthToken>): Promise<AuthToken | null> {
    const entry = this.tokens.get(id);
    if (!entry) return null;

    const updatedToken = {
      ...entry.value,
      ...updates,
    };

    const newEntry: StorageEntry<AuthToken> = {
      ...entry,
      value: updatedToken,
      updatedAt: Date.now(),
    };

    this.tokens.set(id, newEntry);
    return updatedToken;
  }

  async deleteToken(id: string): Promise<boolean> {
    const entry = this.tokens.get(id);
    if (!entry) return false;

    this.tokenHashes.delete(entry.value.tokenHash);
    this.tokens.delete(id);
    return true;
  }

  async deleteTokensByAgent(agentId: string): Promise<number> {
    const tokens = await this.getTokensByAgent(agentId);
    let count = 0;
    for (const token of tokens) {
      if (await this.deleteToken(token.id)) count++;
    }
    return count;
  }

  // ============================================================================
  // Permission Storage
  // ============================================================================

  async setPermission(permission: Permission, options?: StorageOptions): Promise<void> {
    const entry: StorageEntry<Permission> = {
      value: permission,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    this.permissions.set(permission.id, entry);
  }

  async getPermission(id: string): Promise<Permission | null> {
    const entry = this.permissions.get(id);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.permissions.delete(id);
      return null;
    }
    return entry.value;
  }

  async getPermissionsByAgent(agentId: string): Promise<Permission[]> {
    const allPermissions = Array.from(this.permissions.values())
      .filter(entry => !entry.expiresAt || entry.expiresAt > Date.now())
      .map(entry => entry.value);
    return allPermissions.filter(perm => perm.agentId === agentId);
  }

  async getPermissionByResource(agentId: string, resource: string): Promise<Permission | null> {
    const permissions = await this.getPermissionsByAgent(agentId);
    return permissions.find(perm => perm.resource === resource) || null;
  }

  async updatePermission(id: string, updates: Partial<Permission>): Promise<Permission | null> {
    const entry = this.permissions.get(id);
    if (!entry) return null;

    const updatedPermission = {
      ...entry.value,
      ...updates,
    };

    const newEntry: StorageEntry<Permission> = {
      ...entry,
      value: updatedPermission,
      updatedAt: Date.now(),
    };

    this.permissions.set(id, newEntry);
    return updatedPermission;
  }

  async deletePermission(id: string): Promise<boolean> {
    return this.permissions.delete(id);
  }

  async deletePermissionsByAgent(agentId: string): Promise<number> {
    const permissions = await this.getPermissionsByAgent(agentId);
    let count = 0;
    for (const perm of permissions) {
      if (await this.deletePermission(perm.id)) count++;
    }
    return count;
  }

  // ============================================================================
  // Role Storage
  // ============================================================================

  async setRole(role: PermissionRole, options?: StorageOptions): Promise<void> {
    const entry: StorageEntry<PermissionRole> = {
      value: role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    this.roles.set(role.id, entry);
  }

  async getRole(id: string): Promise<PermissionRole | null> {
    const entry = this.roles.get(id);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.roles.delete(id);
      return null;
    }
    return entry.value;
  }

  async getRoleByName(name: string): Promise<PermissionRole | null> {
    const allRoles = Array.from(this.roles.values())
      .filter(entry => !entry.expiresAt || entry.expiresAt > Date.now())
      .map(entry => entry.value);
    return allRoles.find(role => role.name === name) || null;
  }

  async getAllRoles(): Promise<PermissionRole[]> {
    return Array.from(this.roles.values())
      .filter(entry => !entry.expiresAt || entry.expiresAt > Date.now())
      .map(entry => entry.value);
  }

  async deleteRole(id: string): Promise<boolean> {
    const entry = this.roles.get(id);
    if (entry?.value.isSystem) return false; // Cannot delete system roles
    return this.roles.delete(id);
  }

  // ============================================================================
  // Event Storage
  // ============================================================================

  async addEvent(event: IdentityEvent): Promise<void> {
    const entry: StorageEntry<IdentityEvent> = {
      value: event,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.events.unshift(entry);

    // Trim old events if over limit
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }
  }

  async getEvents(limit: number = 100): Promise<IdentityEvent[]> {
    return this.events.slice(0, limit).map(entry => entry.value);
  }

  async getEventsByAgent(agentId: string, limit: number = 100): Promise<IdentityEvent[]> {
    return this.events
      .filter(entry => entry.value.agentId === agentId)
      .slice(0, limit)
      .map(entry => entry.value);
  }

  async getEventsByType(type: string, limit: number = 100): Promise<IdentityEvent[]> {
    return this.events
      .filter(entry => entry.value.type === type)
      .slice(0, limit)
      .map(entry => entry.value);
  }

  // ============================================================================
  // Cleanup and Stats
  // ============================================================================

  private cleanupExpired(): void {
    const now = Date.now();

    // Clean expired agents
    for (const [id, entry] of this.agents.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        if (entry.value.apiKeyHash) {
          this.apiKeys.delete(entry.value.apiKeyHash);
        }
        this.agents.delete(id);
      }
    }

    // Clean expired tokens
    for (const [id, entry] of this.tokens.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.tokenHashes.delete(entry.value.tokenHash);
        this.tokens.delete(id);
      }
    }

    // Clean expired permissions
    for (const [id, entry] of this.permissions.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.permissions.delete(id);
      }
    }

    // Clean expired roles
    for (const [id, entry] of this.roles.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.roles.delete(id);
      }
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => this.cleanupExpired(), this.CLEANUP_INTERVAL);
  }

  async getStats(): Promise<StorageStats> {
    this.cleanupExpired();

    const totalEntries =
      this.agents.size +
      this.tokens.size +
      this.permissions.size +
      this.roles.size +
      this.events.length;

    // Estimate memory usage
    const agentSize = JSON.stringify(Array.from(this.agents.values())).length;
    const tokenSize = JSON.stringify(Array.from(this.tokens.values())).length;
    const permissionSize = JSON.stringify(Array.from(this.permissions.values())).length;
    const roleSize = JSON.stringify(Array.from(this.roles.values())).length;
    const eventSize = JSON.stringify(this.events).length;

    return {
      totalEntries,
      expiredEntries: 0, // Already cleaned
      memoryUsage: agentSize + tokenSize + permissionSize + roleSize + eventSize,
    };
  }

  async clear(): Promise<void> {
    this.agents.clear();
    this.tokens.clear();
    this.permissions.clear();
    this.roles.clear();
    this.events = [];
    this.apiKeys.clear();
    this.tokenHashes.clear();
  }

  // ============================================================================
  // Default Roles Initialization
  // ============================================================================

  private initializeDefaultRoles(): void {
    const defaultRoles: PermissionRole[] = [
      {
        id: "role-admin",
        name: "admin",
        description: "Full administrative access",
        permissions: [],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "role-user",
        name: "user",
        description: "Standard user access",
        permissions: [],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "role-readonly",
        name: "readonly",
        description: "Read-only access",
        permissions: [],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "role-service",
        name: "service",
        description: "Service account access",
        permissions: [],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.id, {
        value: role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
