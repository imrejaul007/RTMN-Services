import axios, { AxiosInstance } from 'axios';
import { HojaiProfile, SupportContext } from '../models/HojaiProfile';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export interface CustomerOpsConfig {
  customerOpsUrl: string;
  memoryOsUrl: string;
  goalOsUrl: string;
  decisionEngineUrl: string;
  copilotUrl: string;
  apiKey?: string;
}

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  recordsProcessed: number;
  errors: string[];
}

export class CustomerOpsBridge {
  private customerOps: AxiosInstance;
  private memoryOs: AxiosInstance;
  private goalOs: AxiosInstance;
  private decisionEngine: AxiosInstance;
  private copilot: AxiosInstance;

  constructor(config: CustomerOpsConfig) {
    this.customerOps = axios.create({
      baseURL: config.customerOpsUrl,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });

    this.memoryOs = axios.create({
      baseURL: config.memoryOsUrl,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });

    this.goalOs = axios.create({
      baseURL: config.goalOsUrl,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });

    this.decisionEngine = axios.create({
      baseURL: config.decisionEngineUrl,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });

    this.copilot = axios.create({
      baseURL: config.copilotUrl,
      headers: config.apiKey ? { 'X-API-Key': config.apiKey } : {}
    });
  }

  async syncUserToCustomerTwin(profile: HojaiProfile): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Syncing HOJAI user ${profile.hojaiUserId} to Customer Twin`, {
        tenantId: profile.tenantId,
        profileId: profile.id
      });

      await this.customerOps.post('/api/customer-twin/sync', {
        tenantId: profile.tenantId,
        source: 'hojai',
        sourceId: profile.hojaiUserId,
        trustLevel: profile.trustLevel,
        products: profile.products,
        preferences: profile.preferences,
        metadata: {
          hojaiProfileId: profile.id,
          integratedAt: new Date().toISOString()
        }
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Customer Twin sync failed: ${message}`);
      logger.error(`Customer Twin sync error for ${profile.hojaiUserId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async syncConversationToMemory(
    tenantId: string,
    conversationId: string,
    messages: Array<{ role: string; content: string; timestamp: Date }>
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Syncing conversation ${conversationId} to Memory OS`, { tenantId });

      await this.memoryOs.post('/api/memory/conversations', {
        tenantId,
        conversationId,
        messages,
        source: 'hojai-genie',
        tags: ['genie', 'ai', 'conversation']
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Memory sync failed: ${message}`);
      logger.error(`Memory sync error for conversation ${conversationId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async syncGoalToOutcomeIntelligence(
    tenantId: string,
    goalId: string,
    outcomeId: string,
    progress: number
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Syncing goal ${goalId} to Outcome Intelligence`, { tenantId, progress });

      await this.goalOs.post('/api/goals/sync-outcome', {
        tenantId,
        goalId,
        outcomeId,
        progress,
        source: 'hojai'
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Outcome Intelligence sync failed: ${message}`);
      logger.error(`Outcome Intelligence sync error for goal ${goalId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async syncDecisionToEngine(
    tenantId: string,
    decisionId: string,
    context: Record<string, any>,
    decision: string,
    confidence: number
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Syncing decision ${decisionId} to Decision Engine`, { tenantId, confidence });

      await this.decisionEngine.post('/api/decisions/record', {
        tenantId,
        decisionId,
        context,
        decision,
        confidence,
        source: 'hojai-sutar'
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Decision Engine sync failed: ${message}`);
      logger.error(`Decision Engine sync error for decision ${decisionId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async createSupportContext(context: SupportContext): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Creating support context for customer ${context.customerId}`, {
        tenantId: context.tenantId,
        issueType: context.issueType
      });

      await this.copilot.post('/api/support/context', {
        tenantId: context.tenantId,
        customerId: context.customerId,
        source: 'hojai-copilot',
        issueType: context.issueType,
        priority: context.priority,
        summary: context.summary,
        suggestedActions: context.suggestedActions
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Support Context creation failed: ${message}`);
      logger.error(`Support Context error for customer ${context.customerId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async syncTrustToTrustIntelligence(
    tenantId: string,
    userId: string,
    trustLevel: string,
    verificationData?: Record<string, any>
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      logger.info(`Syncing trust level ${trustLevel} for user ${userId}`, { tenantId });

      await this.customerOps.post('/api/trust/sync', {
        tenantId,
        userId,
        trustLevel,
        source: 'hojai',
        verificationData,
        syncedAt: new Date().toISOString()
      });
      recordsProcessed++;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Trust Intelligence sync failed: ${message}`);
      logger.error(`Trust Intelligence sync error for user ${userId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      recordsProcessed,
      errors
    };
  }

  async getCustomerContext(tenantId: string, customerId: string): Promise<any> {
    try {
      const response = await this.customerOps.get(`/api/customer/${customerId}/context`, {
        params: { tenantId }
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get customer context`, { tenantId, customerId, error: error.message });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {};

    const endpoints = [
      { name: 'customerOps', client: this.customerOps, path: '/health' },
      { name: 'memoryOs', client: this.memoryOs, path: '/health' },
      { name: 'goalOs', client: this.goalOs, path: '/health' },
      { name: 'decisionEngine', client: this.decisionEngine, path: '/health' },
      { name: 'copilot', client: this.copilot, path: '/health' }
    ];

    for (const endpoint of endpoints) {
      try {
        await endpoint.client.get(endpoint.path, { timeout: 3000 });
        services[endpoint.name] = true;
      } catch {
        services[endpoint.name] = false;
      }
    }

    const allHealthy = Object.values(services).every(s => s);
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    };
  }
}

let bridgeInstance: CustomerOpsBridge | null = null;

export function initializeBridge(config: CustomerOpsConfig): CustomerOpsBridge {
  bridgeInstance = new CustomerOpsBridge(config);
  return bridgeInstance;
}

export function getBridge(): CustomerOpsBridge {
  if (!bridgeInstance) {
    throw new Error('CustomerOpsBridge not initialized. Call initializeBridge first.');
  }
  return bridgeInstance;
}
