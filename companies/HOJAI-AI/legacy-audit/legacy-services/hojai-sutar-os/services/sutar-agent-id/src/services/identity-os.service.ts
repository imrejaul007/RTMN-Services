/**
 * SUTAR Agent ID Service - Identity OS Integration Service
 * Integration with Identity OS (port 4147)
 */

import { Agent, IdentityIntegration, IdentityEvent, AgentStatus } from "../types/index.js";

export interface IdentityOSConfig {
  url: string;
  apiKey?: string;
  syncInterval: number;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  agentsSynced: number;
  errors: string[];
}

export interface IdentityOSAgent {
  id: string;
  agentId: string;
  name: string;
  type: string;
  status: string;
  metadata: Record<string, unknown>;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IdentityOSResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class IdentityOSService {
  private config: IdentityOSConfig;
  private integration: IdentityIntegration;
  private syncQueue: Array<{ agent: Agent; action: "create" | "update" | "delete" }> = [];
  private isSyncing: boolean = false;
  private lastSyncAttempt?: string;
  private syncStats = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncDuration: 0,
  };

  constructor() {
    this.config = {
      url: process.env.IDENTITY_OS_URL || "http://localhost:4147",
      apiKey: process.env.IDENTITY_OS_API_KEY,
      syncInterval: parseInt(process.env.IDENTITY_OS_SYNC_INTERVAL || "30000"),
      enabled: process.env.IDENTITY_OS_ENABLED !== "false",
      timeout: parseInt(process.env.IDENTITY_OS_TIMEOUT || "10000"),
      retryAttempts: parseInt(process.env.IDENTITY_OS_RETRY_ATTEMPTS || "3"),
      retryDelay: parseInt(process.env.IDENTITY_OS_RETRY_DELAY || "1000"),
    };

    this.integration = {
      serviceName: "identity-os",
      serviceUrl: this.config.url,
      enabled: this.config.enabled,
      status: "disconnected",
    };

    if (this.config.enabled) {
      this.startSyncTimer();
      this.performHealthCheck();
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  getConfig(): IdentityOSConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<IdentityOSConfig>): void {
    this.config = { ...this.config, ...updates };
    this.integration.enabled = this.config.enabled;
    this.integration.serviceUrl = this.config.url;
    console.log(`[IdentityOSService] Configuration updated`);
  }

  getIntegrationStatus(): IdentityIntegration {
    return { ...this.integration };
  }

  // ============================================================================
  // Agent Sync Operations
  // ============================================================================

  async syncAgent(agent: Agent, action: "create" | "update" | "delete"): Promise<boolean> {
    if (!this.config.enabled) {
      console.log(`[IdentityOSService] Sync skipped - integration disabled`);
      return false;
    }

    // Add to sync queue
    this.syncQueue.push({ agent, action });

    // Process queue if not already syncing
    if (!this.isSyncing) {
      setTimeout(() => this.processSyncQueue(), 0);
    }

    return true;
  }

  async syncAllAgents(agents: Agent[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      agentsSynced: 0,
      errors: [],
    };

    for (const agent of agents) {
      try {
        await this.syncAgentToIdentityOS(agent, "update");
        result.agentsSynced++;
      } catch (error) {
        result.errors.push(`Failed to sync agent ${agent.agentId}: ${String(error)}`);
      }
    }

    result.success = result.errors.length === 0;
    this.syncStats.lastSyncDuration = Date.now() - startTime;
    this.syncStats.totalSyncs++;

    if (result.success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }

    return result;
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncAttempt = new Date().toISOString();

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift();
      if (!item) continue;

      try {
        await this.syncAgentToIdentityOS(item.agent, item.action);
      } catch (error) {
        console.error(`[IdentityOSService] Failed to sync agent ${item.agent.agentId}:`, error);
        // Re-add to queue for retry
        this.syncQueue.push(item);
      }

      // Small delay between syncs to avoid overwhelming Identity OS
      await this.delay(100);
    }

    this.isSyncing = false;
  }

  private async syncAgentToIdentityOS(
    agent: Agent,
    action: "create" | "update" | "delete"
  ): Promise<void> {
    const endpoint = `${this.config.url}/api/v1/agents`;
    const payload = this.transformAgentForIdentityOS(agent);

    let url = endpoint;
    let method = "POST";

    if (action === "update") {
      url = `${endpoint}/${agent.id}`;
      method = "PUT";
    } else if (action === "delete") {
      url = `${endpoint}/${agent.id}`;
      method = "DELETE";
    }

    try {
      const response = await this.makeRequest(url, {
        method,
        body: action !== "delete" ? JSON.stringify(payload) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[IdentityOSService] Synced agent ${agent.agentId} (${action})`);
    } catch (error) {
      console.error(`[IdentityOSService] Sync error for ${agent.agentId}:`, error);
      this.integration.status = "error";
      this.integration.error = String(error);
      throw error;
    }
  }

  private transformAgentForIdentityOS(agent: Agent): IdentityOSAgent {
    return {
      id: agent.id,
      agentId: agent.agentId,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      metadata: {
        ...agent.metadata,
        verificationStatus: agent.verification.status,
      },
      capabilities: agent.capabilities,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  // ============================================================================
  // Identity OS API Operations
  // ============================================================================

  async fetchAgentFromIdentityOS(agentId: string): Promise<IdentityOSAgent | null> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/agents/${agentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: IdentityOSResponse<IdentityOSAgent> = await response.json();
      return data.data || null;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to fetch agent from Identity OS:`, error);
      return null;
    }
  }

  async registerWithIdentityOS(agent: Agent): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/agents/register`,
        {
          method: "POST",
          body: JSON.stringify(this.transformAgentForIdentityOS(agent)),
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to register with Identity OS:`, error);
      return false;
    }
  }

  async updateInIdentityOS(agent: Agent): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/agents/${agent.id}`,
        {
          method: "PUT",
          body: JSON.stringify(this.transformAgentForIdentityOS(agent)),
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to update in Identity OS:`, error);
      return false;
    }
  }

  async deleteFromIdentityOS(agentId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/agents/${agentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to delete from Identity OS:`, error);
      return false;
    }
  }

  // ============================================================================
  // Health Check and Connectivity
  // ============================================================================

  async performHealthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/health`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        this.integration.status = "connected";
        this.integration.lastSync = new Date().toISOString();
        this.integration.error = undefined;
        console.log(`[IdentityOSService] Health check passed - Identity OS connected`);
        return true;
      } else {
        this.integration.status = "error";
        this.integration.error = `Health check failed: HTTP ${response.status}`;
        console.warn(`[IdentityOSService] Health check failed: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.integration.status = "disconnected";
      this.integration.error = String(error);
      console.warn(`[IdentityOSService] Health check failed:`, error);
      return false;
    }
  }

  async getIdentityOSInfo(): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/info`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to get Identity OS info:`, error);
      return null;
    }
  }

  // ============================================================================
  // Sync Statistics
  // ============================================================================

  getSyncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    successRate: number;
    lastSyncDuration: number;
    queueSize: number;
    lastSyncAttempt?: string;
  } {
    return {
      totalSyncs: this.syncStats.totalSyncs,
      successfulSyncs: this.syncStats.successfulSyncs,
      failedSyncs: this.syncStats.failedSyncs,
      successRate: this.syncStats.totalSyncs > 0
        ? (this.syncStats.successfulSyncs / this.syncStats.totalSyncs) * 100
        : 0,
      lastSyncDuration: this.syncStats.lastSyncDuration,
      queueSize: this.syncQueue.length,
      lastSyncAttempt: this.lastSyncAttempt,
    };
  }

  // ============================================================================
  // Event Bus Integration
  // ============================================================================

  async publishEvent(event: IdentityEvent): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/event`,
        {
          method: "POST",
          body: JSON.stringify({
            type: event.type,
            data: {
              agentId: event.agentId,
              ...event.data,
            },
          }),
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to publish event:`, error);
      return false;
    }
  }

  async subscribeToEvents(eventTypes: string[]): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await this.makeRequest(
        `${this.config.url}/api/v1/subscribe`,
        {
          method: "POST",
          body: JSON.stringify({ eventTypes }),
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`[IdentityOSService] Failed to subscribe to events:`, error);
      return false;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async makeRequest(
    url: string,
    options: {
      method: string;
      body?: string;
      headers: Record<string, string>;
    }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startSyncTimer(): void {
    setInterval(async () => {
      if (this.syncQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<boolean> {
    this.config.enabled = true;
    this.integration.enabled = true;

    const healthy = await this.performHealthCheck();

    if (healthy) {
      this.startSyncTimer();
    }

    return healthy;
  }

  async disconnect(): Promise<void> {
    this.config.enabled = false;
    this.integration.enabled = false;
    this.integration.status = "disconnected";
    this.syncQueue = [];
    console.log(`[IdentityOSService] Disconnected from Identity OS`);
  }

  async reconnect(): Promise<boolean> {
    await this.disconnect();
    return this.connect();
  }
}

// Singleton instance
export const identityOSService = new IdentityOSService();
