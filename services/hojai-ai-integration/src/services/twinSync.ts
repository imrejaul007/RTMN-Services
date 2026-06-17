import axios, { AxiosInstance } from 'axios';
import { HojaiProfile, ConversationMemory, GoalMapping, DecisionRecord } from '../models/HojaiProfile';
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

export interface TwinSyncConfig {
  agentTwinUrl: string;
  buyerTwinUrl: string;
  areaTwinUrl: string;
  referralTwinUrl: string;
  dealTwinUrl: string;
  propertyTwinUrl: string;
  eventBusUrl: string;
  apiKey?: string;
}

export interface TwinSyncResult {
  success: boolean;
  twinId?: string;
  twinType: string;
  syncedAt: Date;
  errors: string[];
}

export interface TwinData {
  type: 'agent' | 'buyer' | 'area' | 'referral' | 'deal' | 'property';
  tenantId: string;
  sourceId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class TwinSync {
  private agentTwin: AxiosInstance;
  private buyerTwin: AxiosInstance;
  private areaTwin: AxiosInstance;
  private referralTwin: AxiosInstance;
  private dealTwin: AxiosInstance;
  private propertyTwin: AxiosInstance;
  private eventBus: AxiosInstance;

  constructor(config: TwinSyncConfig) {
    const headers = config.apiKey ? { 'X-API-Key': config.apiKey } : {};

    this.agentTwin = axios.create({
      baseURL: config.agentTwinUrl,
      headers
    });

    this.buyerTwin = axios.create({
      baseURL: config.buyerTwinUrl,
      headers
    });

    this.areaTwin = axios.create({
      baseURL: config.areaTwinUrl,
      headers
    });

    this.referralTwin = axios.create({
      baseURL: config.referralTwinUrl,
      headers
    });

    this.dealTwin = axios.create({
      baseURL: config.dealTwinUrl,
      headers
    });

    this.propertyTwin = axios.create({
      baseURL: config.propertyTwinUrl,
      headers
    });

    this.eventBus = axios.create({
      baseURL: config.eventBusUrl,
      headers
    });
  }

  async syncProfileToAgentTwin(profile: HojaiProfile): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing HOJAI profile ${profile.id} to Agent Twin`, {
        tenantId: profile.tenantId,
        hojaiUserId: profile.hojaiUserId
      });

      const response = await this.agentTwin.post('/api/agent-twin/sync', {
        tenantId: profile.tenantId,
        sourceId: profile.hojaiUserId,
        source: 'hojai',
        profile: {
          userId: profile.hojaiUserId,
          products: profile.products,
          trustLevel: profile.trustLevel,
          integrations: profile.integrations.map(i => ({
            product: i.product,
            status: i.status,
            externalId: i.externalId
          })),
          preferences: profile.preferences
        },
        metadata: {
          hojaiProfileId: profile.id,
          integratedAt: new Date().toISOString(),
          trustVerified: profile.trustLevel !== 'unverified'
        }
      });

      twinId = response.data?.twinId;
      logger.info(`Agent Twin synced successfully`, { twinId });

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Agent Twin sync failed: ${message}`);
      logger.error(`Agent Twin sync error for profile ${profile.id}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'agent',
      syncedAt: new Date(),
      errors
    };
  }

  async syncProfileToBuyerTwin(profile: HojaiProfile, buyerData: Record<string, any>): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing HOJAI profile ${profile.id} to Buyer Twin`, {
        tenantId: profile.tenantId,
        hojaiUserId: profile.hojaiUserId
      });

      const response = await this.buyerTwin.post('/api/buyer-twin/sync', {
        tenantId: profile.tenantId,
        sourceId: profile.hojaiUserId,
        source: 'hojai',
        buyerData: {
          ...buyerData,
          aiProducts: profile.products,
          trustLevel: profile.trustLevel
        },
        metadata: {
          hojaiProfileId: profile.id,
          integratedAt: new Date().toISOString()
        }
      });

      twinId = response.data?.twinId;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Buyer Twin sync failed: ${message}`);
      logger.error(`Buyer Twin sync error for profile ${profile.id}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'buyer',
      syncedAt: new Date(),
      errors
    };
  }

  async syncConversationToAreaTwin(
    tenantId: string,
    conversation: ConversationMemory,
    areaData?: Record<string, any>
  ): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing conversation ${conversation.id} to Area Twin`, { tenantId });

      const response = await this.areaTwin.post('/api/area-twin/sync-conversation', {
        tenantId,
        conversationId: conversation.id,
        source: 'hojai-genie',
        areaData: {
          messageCount: conversation.messages.length,
          lastActivity: conversation.updatedAt.toISOString(),
          context: conversation.context,
          ...areaData
        },
        metadata: {
          syncedAt: new Date().toISOString()
        }
      });

      twinId = response.data?.twinId;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Area Twin conversation sync failed: ${message}`);
      logger.error(`Area Twin sync error for conversation ${conversation.id}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'area',
      syncedAt: new Date(),
      errors
    };
  }

  async syncGoalToTwin(mapping: GoalMapping): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing goal mapping ${mapping.id}`, {
        tenantId: mapping.tenantId,
        goalId: mapping.goalId,
        progress: mapping.progress
      });

      const twinType = mapping.linkedTwinId?.startsWith('AT-') ? 'agent' :
                       mapping.linkedTwinId?.startsWith('BT-') ? 'buyer' : 'deal';

      const twinClient = twinType === 'agent' ? this.agentTwin :
                         twinType === 'buyer' ? this.buyerTwin : this.dealTwin;

      const response = await twinClient.post('/api/twin/goals/sync', {
        tenantId: mapping.tenantId,
        twinId: mapping.linkedTwinId,
        goalData: {
          goalId: mapping.goalId,
          outcomeId: mapping.outcomeId,
          status: mapping.status,
          progress: mapping.progress,
          milestones: mapping.milestones
        },
        metadata: {
          syncedAt: new Date().toISOString(),
          source: 'hojai-goals'
        }
      });

      twinId = response.data?.twinId;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Goal Twin sync failed: ${message}`);
      logger.error(`Goal Twin sync error for mapping ${mapping.id}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'goal-linked',
      syncedAt: new Date(),
      errors
    };
  }

  async syncDecisionToDealTwin(record: DecisionRecord): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing decision ${record.id} to Deal Twin`, {
        tenantId: record.tenantId,
        decisionId: record.decisionId
      });

      const response = await this.dealTwin.post('/api/deal-twin/decisions/sync', {
        tenantId: record.tenantId,
        decisionData: {
          decisionId: record.decisionId,
          context: record.context,
          decision: record.decision,
          outcome: record.outcome,
          confidence: record.confidence,
          agentId: record.agentId
        },
        metadata: {
          syncedAt: new Date().toISOString(),
          source: 'hojai-sutar'
        }
      });

      twinId = response.data?.twinId;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Deal Twin decision sync failed: ${message}`);
      logger.error(`Deal Twin sync error for decision ${record.id}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'deal',
      syncedAt: new Date(),
      errors
    };
  }

  async syncReferralActivity(
    tenantId: string,
    referralId: string,
    activity: Record<string, any>
  ): Promise<TwinSyncResult> {
    const errors: string[] = [];
    let twinId: string | undefined;

    try {
      logger.info(`Syncing referral activity to Referral Twin`, { tenantId, referralId });

      const response = await this.referralTwin.post('/api/referral-twin/activity', {
        tenantId,
        referralId,
        activity: {
          ...activity,
          source: 'hojai'
        },
        metadata: {
          syncedAt: new Date().toISOString()
        }
      });

      twinId = response.data?.twinId;

    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      errors.push(`Referral Twin sync failed: ${message}`);
      logger.error(`Referral Twin sync error for referral ${referralId}`, { error: message });
    }

    return {
      success: errors.length === 0,
      twinId,
      twinType: 'referral',
      syncedAt: new Date(),
      errors
    };
  }

  async publishTwinSyncEvent(twinData: TwinData): Promise<void> {
    try {
      await this.eventBus.post('/api/events/publish', {
        eventType: 'twin.sync.completed',
        tenantId: twinData.tenantId,
        payload: {
          twinType: twinData.type,
          sourceId: twinData.sourceId,
          data: twinData.data,
          metadata: twinData.metadata
        },
        timestamp: new Date().toISOString()
      });
      logger.info(`Published twin sync event`, { twinType: twinData.type, sourceId: twinData.sourceId });
    } catch (error: any) {
      logger.error(`Failed to publish twin sync event`, { error: error.message });
    }
  }

  async getTwinStatus(tenantId: string, twinId: string, twinType: string): Promise<any> {
    try {
      const client = twinType === 'agent' ? this.agentTwin :
                     twinType === 'buyer' ? this.buyerTwin :
                     twinType === 'area' ? this.areaTwin :
                     twinType === 'referral' ? this.referralTwin :
                     twinType === 'deal' ? this.dealTwin : this.propertyTwin;

      const response = await client.get(`/api/twin/${twinId}/status`, {
        params: { tenantId }
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get twin status`, { twinId, twinType, error: error.message });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; twins: Record<string, boolean> }> {
    const twins: Record<string, boolean> = {};

    const twinClients = [
      { name: 'agentTwin', client: this.agentTwin },
      { name: 'buyerTwin', client: this.buyerTwin },
      { name: 'areaTwin', client: this.areaTwin },
      { name: 'referralTwin', client: this.referralTwin },
      { name: 'dealTwin', client: this.dealTwin },
      { name: 'propertyTwin', client: this.propertyTwin }
    ];

    for (const twin of twinClients) {
      try {
        await twin.client.get('/health', { timeout: 3000 });
        twins[twin.name] = true;
      } catch {
        twins[twin.name] = false;
      }
    }

    const allHealthy = Object.values(twins).every(s => s);
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      twins
    };
  }
}

let twinSyncInstance: TwinSync | null = null;

export function initializeTwinSync(config: TwinSyncConfig): TwinSync {
  twinSyncInstance = new TwinSync(config);
  return twinSyncInstance;
}

export function getTwinSync(): TwinSync {
  if (!twinSyncInstance) {
    throw new Error('TwinSync not initialized. Call initializeTwinSync first.');
  }
  return twinSyncInstance;
}
