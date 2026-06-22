/**
 * SUTAR Agent ID Service - Agent Service
 * Core agent management and registration logic
 */

import { v4 as uuidv4 } from "uuid";
import {
  Agent,
  AgentStatus,
  AgentType,
  AgentMetadata,
  AgentRegistrationRequest,
  AgentRegistrationResponse,
  AgentUpdateSchema,
  VerificationStatus,
  IdentityEvent,
  IdentityEventType,
} from "../types/index.js";
import { storageService } from "./storage.service.js";
import { identityOSService } from "./identity-os.service.js";

export interface CreateAgentOptions {
  skipVerification?: boolean;
  skipIdentityOS?: boolean;
  customId?: string;
  createdBy?: string;
}

export interface UpdateAgentOptions {
  updatedBy?: string;
  reason?: string;
}

export interface AgentFilter {
  type?: AgentType;
  status?: AgentStatus;
  tags?: string[];
  capabilities?: string[];
  parentAgentId?: string;
}

export class AgentService {
  private readonly ID_PREFIX = "AGT";
  private readonly ID_VERSION = "01";

  // ============================================================================
  // Agent Registration
  // ============================================================================

  async registerAgent(request: AgentRegistrationRequest, options?: CreateAgentOptions): Promise<AgentRegistrationResponse> {
    const startTime = Date.now();

    // Generate unique agent ID
    const agentId = options?.customId || this.generateAgentId();
    const id = uuidv4();

    // Generate API key for the agent
    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);

    // Create agent metadata with timestamps
    const now = new Date().toISOString();
    const metadata: AgentMetadata = {
      name: request.name,
      description: request.metadata?.description,
      email: request.metadata?.email,
      phone: request.metadata?.phone,
      avatar: request.metadata?.avatar,
      website: request.metadata?.website,
      tags: request.metadata?.tags || [],
      custom: request.metadata?.custom,
      createdAt: now,
      updatedAt: now,
    };

    // Create the agent entity
    const agent: Agent = {
      id,
      agentId,
      name: request.name,
      type: request.type || AgentType.SERVICE,
      status: options?.skipVerification ? AgentStatus.ACTIVE : AgentStatus.PENDING,
      metadata,
      capabilities: request.capabilities || [],
      permissions: request.permissions || {},
      verification: {
        status: options?.skipVerification ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED,
        verificationMethods: [],
        verifiedAt: options?.skipVerification ? now : undefined,
      },
      parentAgentId: request.parentAgentId,
      apiKeyHash,
      createdAt: now,
      updatedAt: now,
    };

    // Store the agent
    await storageService.setAgent(agent);

    // Create identity event
    await this.createEvent(IdentityEventType.AGENT_CREATED, agent.id, {
      agentId: agent.agentId,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      createdBy: options?.createdBy,
    });

    // Sync with Identity OS if enabled
    if (!options?.skipIdentityOS) {
      try {
        await identityOSService.syncAgent(agent, "create");
      } catch (error) {
        console.error("[AgentService] Failed to sync with Identity OS:", error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AgentService] Registered agent ${agentId} in ${duration}ms`);

    return {
      agent,
      apiKey,
      message: `Agent ${agent.name} registered successfully. API key generated.`,
    };
  }

  // ============================================================================
  // Agent Retrieval
  // ============================================================================

  async getAgent(id: string): Promise<Agent | null> {
    return storageService.getAgent(id);
  }

  async getAgentByAgentId(agentId: string): Promise<Agent | null> {
    const allAgents = await storageService.getAllAgents();
    return allAgents.find(a => a.agentId === agentId) || null;
  }

  async getAgentByApiKey(apiKey: string): Promise<Agent | null> {
    const apiKeyHash = this.hashApiKey(apiKey);
    return storageService.getAgentByApiKeyHash(apiKeyHash);
  }

  async getAllAgents(filter?: AgentFilter): Promise<Agent[]> {
    let agents = await storageService.getAllAgents();

    if (filter) {
      if (filter.type) {
        agents = agents.filter(a => a.type === filter.type);
      }
      if (filter.status) {
        agents = agents.filter(a => a.status === filter.status);
      }
      if (filter.tags && filter.tags.length > 0) {
        agents = agents.filter(a =>
          filter.tags!.some(tag => a.metadata.tags.includes(tag))
        );
      }
      if (filter.capabilities && filter.capabilities.length > 0) {
        agents = agents.filter(a =>
          filter.capabilities!.some(cap => a.capabilities.includes(cap))
        );
      }
      if (filter.parentAgentId) {
        agents = agents.filter(a => a.parentAgentId === filter.parentAgentId);
      }
    }

    return agents;
  }

  async getAgentChildren(parentAgentId: string): Promise<Agent[]> {
    return storageService.getAgentsByParent(parentAgentId);
  }

  // ============================================================================
  // Agent Update
  // ============================================================================

  async updateAgent(id: string, updates: z.infer<typeof AgentUpdateSchema>, options?: UpdateAgentOptions): Promise<Agent | null> {
    const startTime = Date.now();
    const existingAgent = await storageService.getAgent(id);

    if (!existingAgent) {
      return null;
    }

    const now = new Date().toISOString();
    const updateData: Partial<Agent> = {
      updatedAt: now,
    };

    if (updates.name) {
      updateData.name = updates.name;
      updateData.metadata = {
        ...existingAgent.metadata,
        name: updates.name,
        updatedAt: now,
      };
    }

    if (updates.metadata) {
      updateData.metadata = {
        ...existingAgent.metadata,
        ...updates.metadata,
        updatedAt: now,
      };
    }

    if (updates.capabilities) {
      updateData.capabilities = updates.capabilities;
    }

    if (updates.status && updates.status !== existingAgent.status) {
      updateData.status = updates.status;

      // Create status change event
      await this.createEvent(IdentityEventType.STATUS_CHANGED, id, {
        oldStatus: existingAgent.status,
        newStatus: updates.status,
        changedBy: options?.updatedBy,
        reason: options?.reason,
      });
    }

    const updatedAgent = await storageService.updateAgent(id, updateData);

    if (updatedAgent) {
      await this.createEvent(IdentityEventType.AGENT_UPDATED, id, {
        agentId: updatedAgent.agentId,
        updates: Object.keys(updates),
        updatedBy: options?.updatedBy,
      });

      // Sync with Identity OS
      try {
        await identityOSService.syncAgent(updatedAgent, "update");
      } catch (error) {
        console.error("[AgentService] Failed to sync with Identity OS:", error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AgentService] Updated agent ${id} in ${duration}ms`);

    return updatedAgent;
  }

  // ============================================================================
  // Agent Deletion
  // ============================================================================

  async deleteAgent(id: string, soft: boolean = true): Promise<boolean> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return false;
    }

    if (soft) {
      // Soft delete - change status to deleted
      return !!(await this.updateAgent(id, { status: AgentStatus.DELETED }));
    } else {
      // Hard delete - remove from storage
      const deleted = await storageService.deleteAgent(id);

      if (deleted) {
        // Delete associated tokens and permissions
        await storageService.deleteTokensByAgent(id);
        await storageService.deletePermissionsByAgent(id);

        // Create deletion event
        await this.createEvent(IdentityEventType.AGENT_DELETED, id, {
          agentId: agent.agentId,
          name: agent.name,
        });

        // Sync with Identity OS
        try {
          await identityOSService.syncAgent(agent, "delete");
        } catch (error) {
          console.error("[AgentService] Failed to sync with Identity OS:", error);
        }
      }

      return deleted;
    }
  }

  // ============================================================================
  // Agent Status Management
  // ============================================================================

  async activateAgent(id: string, activatedBy?: string): Promise<Agent | null> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return null;
    }

    if (agent.status === AgentStatus.DELETED) {
      throw new Error("Cannot activate a deleted agent");
    }

    const updatedAgent = await storageService.updateAgent(id, {
      status: AgentStatus.ACTIVE,
      lastActivity: new Date().toISOString(),
    });

    if (updatedAgent) {
      await this.createEvent(IdentityEventType.AGENT_ACTIVATED, id, {
        agentId: updatedAgent.agentId,
        activatedBy,
      });
    }

    return updatedAgent;
  }

  async deactivateAgent(id: string, deactivatedBy?: string, reason?: string): Promise<Agent | null> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return null;
    }

    const updatedAgent = await storageService.updateAgent(id, {
      status: AgentStatus.INACTIVE,
    });

    if (updatedAgent) {
      await this.createEvent(IdentityEventType.AGENT_SUSPENDED, id, {
        agentId: updatedAgent.agentId,
        deactivatedBy,
        reason,
      });
    }

    return updatedAgent;
  }

  async suspendAgent(id: string, suspendedBy?: string, reason?: string): Promise<Agent | null> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return null;
    }

    const updatedAgent = await storageService.updateAgent(id, {
      status: AgentStatus.SUSPENDED,
    });

    if (updatedAgent) {
      await this.createEvent(IdentityEventType.AGENT_SUSPENDED, id, {
        agentId: updatedAgent.agentId,
        suspendedBy,
        reason,
      });
    }

    return updatedAgent;
  }

  async banAgent(id: string, bannedBy?: string, reason?: string): Promise<Agent | null> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return null;
    }

    const updatedAgent = await storageService.updateAgent(id, {
      status: AgentStatus.BANNED,
    });

    if (updatedAgent) {
      // Revoke all tokens
      await storageService.deleteTokensByAgent(id);

      await this.createEvent(IdentityEventType.AGENT_SUSPENDED, id, {
        agentId: updatedAgent.agentId,
        bannedBy,
        reason,
        action: "ban",
      });
    }

    return updatedAgent;
  }

  // ============================================================================
  // Agent Activity Tracking
  // ============================================================================

  async recordActivity(id: string, activityType: string, details?: Record<string, unknown>): Promise<void> {
    const agent = await storageService.getAgent(id);

    if (!agent) {
      return;
    }

    await storageService.updateAgent(id, {
      lastActivity: new Date().toISOString(),
    });

    await this.createEvent(IdentityEventType.AGENT_AUTHENTICATED, id, {
      activityType,
      ...details,
    });
  }

  // ============================================================================
  // Agent Statistics
  // ============================================================================

  async getAgentStats(): Promise<{
    total: number;
    byStatus: Record<AgentStatus, number>;
    byType: Record<AgentType, number>;
    verified: number;
    unverified: number;
  }> {
    const agents = await storageService.getAllAgents();

    const stats = {
      total: agents.length,
      byStatus: {} as Record<AgentStatus, number>,
      byType: {} as Record<AgentType, number>,
      verified: 0,
      unverified: 0,
    };

    // Initialize counters
    for (const status of Object.values(AgentStatus)) {
      stats.byStatus[status] = 0;
    }
    for (const type of Object.values(AgentType)) {
      stats.byType[type] = 0;
    }

    // Count agents
    for (const agent of agents) {
      stats.byStatus[agent.status]++;
      stats.byType[agent.type]++;

      if (agent.verification.status === VerificationStatus.VERIFIED) {
        stats.verified++;
      } else {
        stats.unverified++;
      }
    }

    return stats;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateAgentId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${this.ID_PREFIX}-${this.ID_VERSION}-${timestamp}-${random}`;
  }

  private generateApiKey(): string {
    const prefix = "skt";
    const timestamp = Date.now().toString(36);
    const random = Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join("");
    return `${prefix}_${timestamp}_${random}`;
  }

  private hashApiKey(apiKey: string): string {
    // Simple hash for demo - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async createEvent(type: IdentityEventType, agentId: string, data: Record<string, unknown>): Promise<void> {
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
  // Batch Operations
  // ============================================================================

  async bulkUpdateStatus(ids: string[], status: AgentStatus, updatedBy?: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const id of ids) {
      try {
        const updated = await this.updateAgent(id, { status });
        if (updated) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ id, error: "Agent not found" });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({ id, error: String(error) });
      }
    }

    return result;
  }

  async bulkDelete(ids: string[], soft: boolean = true): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const id of ids) {
      try {
        const deleted = await this.deleteAgent(id, soft);
        if (deleted) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ id, error: "Agent not found" });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({ id, error: String(error) });
      }
    }

    return result;
  }
}

// Import zod for type inference
import { z } from "zod";

// Singleton instance
export const agentService = new AgentService();
