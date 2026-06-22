import mongoose, { Schema } from 'mongoose';
import Redis from 'ioredis';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import {
  TenantType,
  DataSensitivity,
  BridgeConfig,
  CrossAppIdentity,
  BridgeEvent,
  IntelligenceShare,
  AudienceSync,
  PrivilegedAccess
} from '../types/index.js';

// ============================================================================
// MODELS
// ============================================================================

const BridgeConfigSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  tenantType: { type: String, enum: Object.values(TenantType), required: true },
  rezEnabled: { type: Boolean, default: false },
  rezTenantId: String,
  crossAppDataEnabled: { type: Boolean, default: false },
  shareEventsToRez: { type: Boolean, default: false },
  receiveEventsFromRez: { type: Boolean, default: false },
  sharePredictions: { type: Boolean, default: false },
  shareBehavioralSignals: { type: Boolean, default: false },
  shareAudienceSegments: { type: Boolean, default: false },
  shareTrustScores: { type: Boolean, default: false },
  receiveTrustScores: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const CrossAppIdentitySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  rezUserId: { type: String, required: true },
  rezUnifiedId: String,
  appIds: { type: Map, of: String },
  linkMethod: { type: String, enum: ['exact', 'fuzzy', 'probabilistic', 'manual'] },
  linkConfidence: { type: Number, min: 0, max: 1 },
  lastActivity: { type: Map, of: String }
}, { timestamps: true });

CrossAppIdentitySchema.index({ tenantId: 1, rezUserId: 1 }, { unique: true });

const BridgeEventSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  tenantType: { type: String, enum: Object.values(TenantType), required: true },
  source: { type: String, enum: ['hojai', 'rez_intelligence', 'rez_ecosystem'], required: true },
  sourceService: { type: String, required: true },
  sourceApp: String,
  event: {
    type: String,
    category: String,
    data: { type: Map, of: Schema.Types.Mixed },
    timestamp: String
  },
  routeTo: [String],
  routingStatus: { type: String, enum: ['pending', 'forwarded', 'filtered', 'failed'], default: 'pending' },
  sensitivity: { type: String, enum: Object.values(DataSensitivity), default: DataSensitivity.INTERNAL },
  piiFields: [String],
  processedAt: Date,
  error: String
}, { timestamps: true });

BridgeEventSchema.index({ tenantId: 1, routingStatus: 1 });
BridgeEventSchema.index({ tenantId: 1, source: 1, createdAt: -1 });

const IntelligenceShareSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  direction: { type: String, enum: ['hojai_to_rez', 'rez_to_hojai'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  data: { type: Map, of: Schema.Types.Mixed },
  confidence: { type: Number, min: 0, max: 1 },
  source: { type: String, required: true },
  model: String
}, { timestamps: true });

IntelligenceShareSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

const AudienceSyncSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  audienceId: { type: String, required: true },
  audienceName: { type: String, required: true },
  audienceType: { type: String, required: true },
  userCount: { type: Number, default: 0 },
  userSample: [String],
  syncEnabled: { type: Boolean, default: false },
  syncFrequency: { type: String, enum: ['realtime', 'hourly', 'daily', 'weekly'], default: 'daily' },
  lastSyncedAt: Date,
  syncStatus: { type: String, enum: ['pending', 'syncing', 'synced', 'failed'], default: 'pending' }
}, { timestamps: true });

const PrivilegedAccessSchema = new Schema({
  tenantId: { type: String, required: true, unique: true },
  tenantType: { type: String, enum: [TenantType.REZ_ECOSYSTEM], required: true },
  accessScope: {
    crossAppIdentity: { type: Boolean, default: true },
    behavioralSignals: { type: Boolean, default: true },
    mobilityPatterns: { type: Boolean, default: true },
    commerceHistory: { type: Boolean, default: true },
    loyaltyData: { type: Boolean, default: true },
    predictionModels: { type: Boolean, default: true }
  },
  rezAccess: {
    crossAppSegments: { type: Boolean, default: true },
    ecosystemTrends: { type: Boolean, default: true },
    unifiedProfiles: { type: Boolean, default: true }
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const BridgeConfigModel = mongoose.model('BridgeConfig', BridgeConfigSchema);
export const CrossAppIdentityModel = mongoose.model('CrossAppIdentity', CrossAppIdentitySchema);
export const BridgeEventModel = mongoose.model('BridgeEvent', BridgeEventSchema);
export const IntelligenceShareModel = mongoose.model('IntelligenceShare', IntelligenceShareSchema);
export const AudienceSyncModel = mongoose.model('AudienceSync', AudienceSyncSchema);
export const PrivilegedAccessModel = mongoose.model('PrivilegedAccess', PrivilegedAccessSchema);

// ============================================================================
// BRIDGE SERVICE
// ============================================================================

export class BridgeService {
  private redis: Redis;

  // REZ endpoints
  private readonly REZ_EVENT_BUS_URL = process.env.REZ_EVENT_BUS_URL || 'http://localhost:4025';
  private readonly REZ_INTELLIGENCE_URL = process.env.REZ_INTELLIGENCE_URL || 'http://localhost:4018';
  private readonly REZ_IDENTITY_URL = process.env.REZ_IDENTITY_URL || 'http://localhost:4060';
  private readonly INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'rez-internal-token';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Get bridge configuration for tenant
   */
  async getBridgeConfig(tenantId: string): Promise<BridgeConfig | null> {
    const config = await BridgeConfigModel.findOne({ tenantId, active: true });
    return config ? config.toObject() as BridgeConfig : null;
  }

  /**
   * Configure bridge for tenant
   */
  async configureBridge(config: Omit<BridgeConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<BridgeConfig> {
    const doc = await BridgeConfigModel.findOneAndUpdate(
      { tenantId: config.tenantId },
      config,
      { upsert: true, new: true }
    );
    return doc.toObject() as BridgeConfig;
  }

  /**
   * Process and route event through bridge
   */
  async processBridgeEvent(params: {
    tenantId: string;
    event: { type: string; category: string; data: Record<string, unknown>; timestamp: string };
    sourceService: string;
    sourceApp?: string;
  }): Promise<{ routed: boolean; routes: string[] }> {
    const { tenantId, event, sourceService, sourceApp } = params;

    // Get bridge config
    const config = await this.getBridgeConfig(tenantId);
    if (!config) {
      return { routed: false, routes: [] };
    }

    const routes: string[] = [];
    const tenantType = config.tenantType;

    // Determine sensitivity
    const sensitivity = this.determineSensitivity(event);

    // Create bridge event record
    const bridgeEvent = new BridgeEventModel({
      tenantId,
      tenantType,
      source: 'hojai',
      sourceService,
      sourceApp,
      event,
      sensitivity,
      routingStatus: 'pending'
    });

    // Route based on config and tenant type
    if (tenantType === TenantType.REZ_ECOSYSTEM || tenantType === TenantType.RABTUL_SAAS) {
      // Privileged tenants - full bidirectional sharing
      if (config.shareEventsToRez) {
        await this.forwardToRez(event, sourceService, sourceApp);
        routes.push('rez_intelligence');
      }
      routes.push('hojai'); // Always process locally
    } else {
      // External tenants - only local processing
      routes.push('hojai');
    }

    // Update bridge event
    bridgeEvent.routeTo = routes;
    bridgeEvent.routingStatus = 'forwarded';
    bridgeEvent.processedAt = new Date();
    await bridgeEvent.save();

    return { routed: routes.length > 1, routes };
  }

  /**
   * Forward event to REZ Event Bus
   */
  private async forwardToRez(event: any, sourceService: string, sourceApp?: string): Promise<void> {
    try {
      await axios.post(
        `${this.REZ_EVENT_BUS_URL}/api/events`,
        {
          type: event.type,
          category: event.category,
          userId: event.data?.userId,
          source: sourceService,
          sourceApp: sourceApp || 'hojai',
          data: this.sanitizeForRez(event.data),
          timestamp: event.timestamp
        },
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Source': 'hojai',
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('[Bridge] Failed to forward to REZ:', error);
      throw error;
    }
  }

  /**
   * Subscribe to REZ events (for privileged tenants)
   */
  async subscribeToRezEvents(tenantId: string, callback: (event: any) => Promise<void>): Promise<void> {
    // In production, this would connect to REZ Event Bus subscription
    // For now, we'll poll or use WebSocket
    console.log(`[Bridge] ${tenantId} subscribed to REZ events`);
  }

  /**
   * Link cross-app identity
   */
  async linkCrossAppIdentity(params: {
    tenantId: string;
    hojaiUserId: string;
    rezUserId: string;
    appIds?: Record<string, string>;
  }): Promise<CrossAppIdentity> {
    const { tenantId, hojaiUserId, rezUserId, appIds } = params;

    const identity = await CrossAppIdentityModel.findOneAndUpdate(
      { tenantId, rezUserId },
      {
        tenantId,
        rezUserId,
        appIds: { ...appIds, 'hojai': hojaiUserId },
        linkMethod: 'manual',
        linkConfidence: 1.0,
        lastActivity: { 'hojai': new Date().toISOString() }
      },
      { upsert: true, new: true }
    );

    return identity.toObject() as CrossAppIdentity;
  }

  /**
   * Get unified profile across apps (REZ-only)
   */
  async getUnifiedProfile(params: {
    tenantId: string;
    entityId: string;
    entityType: 'user' | 'merchant';
  }): Promise<any | null> {
    const { tenantId, entityId, entityType } = params;

    // Check if tenant has privileged access
    const privileged = await PrivilegedAccessModel.findOne({ tenantId, active: true });
    if (!privileged) {
      throw new Error('Privileged access required for unified profiles');
    }

    try {
      // Fetch from REZ Unified Identity
      const response = await axios.get(
        `${this.REZ_IDENTITY_URL}/api/unified/${entityType}/${entityId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Tenant-ID': tenantId
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('[Bridge] Failed to get unified profile:', error);
      return null;
    }
  }

  /**
   * Share intelligence (prediction, segment, etc.)
   */
  async shareIntelligence(params: {
    tenantId: string;
    type: string;
    direction: 'hojai_to_rez' | 'rez_to_hojai';
    entityType: string;
    entityId: string;
    data: Record<string, unknown>;
    confidence: number;
    source: string;
  }): Promise<IntelligenceShare> {
    const share = await IntelligenceShareModel.create({
      tenantId: params.tenantId,
      ...params,
      id: uuid()
    });

    // If sharing to REZ, forward
    if (params.direction === 'hojai_to_rez') {
      await this.forwardIntelligenceToRez(params);
    }

    return share.toObject() as IntelligenceShare;
  }

  private async forwardIntelligenceToRez(params: any): Promise<void> {
    try {
      await axios.post(
        `${this.REZ_INTELLIGENCE_URL}/api/intelligence/share`,
        {
          type: params.type,
          entityType: params.entityType,
          entityId: params.entityId,
          data: params.data,
          confidence: params.confidence,
          source: `hojai:${params.source}`
        },
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Source': 'hojai'
          }
        }
      );
    } catch (error) {
      console.error('[Bridge] Failed to share intelligence:', error);
    }
  }

  /**
   * Sync audience segments
   */
  async syncAudience(params: {
    tenantId: string;
    audienceId: string;
    users: string[];
    direction: 'hojai_to_rez' | 'rez_to_hojai';
  }): Promise<void> {
    const { tenantId, audienceId, users, direction } = params;

    if (direction === 'hojai_to_rez') {
      await axios.post(
        `${this.REZ_INTELLIGENCE_URL}/api/audiences/${audienceId}/sync`,
        { users },
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Source': 'hojai'
          }
        }
      );
    }
  }

  /**
   * Get behavioral signals from REZ (privileged)
   */
  async getBehavioralSignals(tenantId: string, userId: string): Promise<any | null> {
    const privileged = await PrivilegedAccessModel.findOne({ tenantId, active: true });
    if (!privileged?.accessScope.behavioralSignals) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE_URL}/api/signals/user/${userId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Tenant-ID': tenantId
          }
        }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cross-app touchpoints for attribution
   */
  async getCrossAppTouchpoints(tenantId: string, sessionId: string): Promise<any[]> {
    const privileged = await PrivilegedAccessModel.findOne({ tenantId, active: true });
    if (!privileged) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.REZ_INTELLIGENCE_URL}/api/attribution/touchpoints/${sessionId}`,
        {
          headers: {
            'X-Internal-Token': this.INTERNAL_TOKEN,
            'X-Tenant-ID': tenantId
          }
        }
      );
      return response.data.touchpoints || [];
    } catch (error) {
      return [];
    }
  }

  // Helper methods
  private determineSensitivity(event: any): DataSensitivity {
    const piiFields = ['email', 'phone', 'name', 'address', 'location', 'ip'];
    const eventData = event.data || {};

    const foundPii = piiFields.filter(field => eventData[field]);
    if (foundPii.length > 0) {
      return DataSensitivity.CONFIDENTIAL;
    }

    return DataSensitivity.INTERNAL;
  }

  private sanitizeForRez(data: any): any {
    // Remove sensitive fields before sharing to REZ
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    return sanitized;
  }
}

export const bridgeService = new BridgeService();
