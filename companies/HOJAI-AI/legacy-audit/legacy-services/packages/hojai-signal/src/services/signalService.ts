import mongoose, { Schema } from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { Event, ValidatedSignal, Identity, DeduplicationConfig, Anomaly, SignalQuality, ValidationAction } from '../types/index.js';

// Models
const ValidatedSignalSchema = new Schema({
  originalEventId: String,
  tenantId: { type: String, required: true, index: true },
  quality: String,
  confidence: Number,
  validationActions: [String],
  issues: [{
    type: String,
    severity: String,
    message: String,
    field: String,
    corrected: Schema.Types.Mixed
  }],
  normalizedEvent: Schema.Types.Mixed,
  canonicalTimestamp: Date,
  canonicalUserId: String,
  resolvedIdentity: {
    primaryId: String,
    linkedIds: [String],
    confidence: Number
  },
  isDuplicate: Boolean,
  duplicateOf: String,
  processedAt: Date,
  processingDurationMs: Number
}, { timestamps: true });

ValidatedSignalSchema.index({ tenantId: 1, quality: 1 });
ValidatedSignalSchema.index({ canonicalUserId: 1, createdAt: -1 });

const IdentitySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  primaryId: { type: String, required: true },
  identifiers: {
    email: [String],
    phone: [String],
    deviceId: [String],
    sessionId: [String]
  },
  resolution: {
    method: String,
    confidence: Number,
    firstSeen: Date,
    lastSeen: Date,
    linkCount: Number
  },
  graphLinks: [{
    identityId: String,
    relationship: String,
    strength: Number,
    verified: Boolean
  }],
  status: { type: String, enum: ['active', 'merged', 'archived', 'flagged'], default: 'active' }
}, { timestamps: true });

IdentitySchema.index({ tenantId: 1, primaryId: 1 }, { unique: true });
IdentitySchema.index({ tenantId: 1, 'identifiers.email': 1 });
IdentitySchema.index({ tenantId: 1, 'identifiers.phone': 1 });

const AnomalySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  type: String,
  severity: String,
  description: String,
  affectedEvents: [String],
  eventCount: Number,
  userId: String,
  sessionId: String,
  details: Schema.Types.Mixed,
  expectedValue: Schema.Types.Mixed,
  actualValue: Schema.Types.Mixed,
  deviation: Number,
  status: { type: String, enum: ['detected', 'investigating', 'resolved', 'false_positive', 'blocked'], default: 'detected' },
  resolvedAt: Date,
  resolution: String
}, { timestamps: true });

AnomalySchema.index({ tenantId: 1, severity: 1, status: 1 });

export const ValidatedSignalModel = mongoose.model('ValidatedSignal', ValidatedSignalSchema);
export const IdentityModel = mongoose.model('Identity', IdentitySchema);
export const AnomalyModel = mongoose.model('Anomaly', AnomalySchema);

// ============================================================================
// SIGNAL VALIDATION SERVICE
// ============================================================================

export class SignalService {
  private redis: Redis;
  private readonly DEDUP_PREFIX = 'dedup:';
  private readonly IDENTITY_PREFIX = 'identity:';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Validate and process incoming event
   */
  async processEvent(tenantId: string, event: Event): Promise<ValidatedSignal> {
    const startTime = Date.now();
    const issues: any[] = [];
    const actions: ValidationAction[] = [];
    let quality: SignalQuality = SignalQuality.EXCELLENT;
    let confidence = 1.0;

    // 1. Schema validation
    const schemaResult = this.validateSchema(event);
    if (!schemaResult.valid) {
      issues.push(...schemaResult.issues);
      actions.push(ValidationAction.NORMALIZE);
      quality = SignalQuality.POOR;
      confidence *= 0.5;
    }

    // 2. Timestamp normalization
    const canonicalTimestamp = this.normalizeTimestamp(event.timestamp);
    if (canonicalTimestamp > new Date()) {
      issues.push({ type: 'future_timestamp', severity: 'medium', message: 'Timestamp in future', field: 'timestamp' });
      actions.push(ValidationAction.FLAG);
      quality = SignalQuality.FAIR;
      confidence *= 0.7;
    }

    // 3. Deduplication check
    const dedupResult = await this.checkDuplicate(tenantId, event);
    if (dedupResult.isDuplicate) {
      actions.push(ValidationAction.REJECT);
      return this.createValidatedSignal(event, tenantId, {
        quality: SignalQuality.EXCELLENT,
        confidence: 1.0,
        validationActions: [ValidationAction.REJECT],
        issues: [],
        isDuplicate: true,
        duplicateOf: dedupResult.duplicateOf,
        processingDurationMs: Date.now() - startTime,
        canonicalTimestamp
      });
    }

    // 4. Identity resolution
    const identity = await this.resolveIdentity(tenantId, event);

    // 5. Anomaly detection
    const anomalies = await this.detectAnomalies(tenantId, event);
    if (anomalies.length > 0) {
      issues.push(...anomalies.map(a => ({ type: 'anomaly', severity: a.severity as any, message: a.description })));
      actions.push(ValidationAction.FLAG);
      if (quality !== SignalQuality.EXCELLENT) quality = SignalQuality.GOOD;
    }

    // 6. Normalize event
    const normalizedEvent = this.normalizeEvent(event);

    // Calculate final quality
    quality = this.calculateQuality(issues);
    confidence = this.calculateConfidence(issues);

    return this.createValidatedSignal(event, tenantId, {
      quality,
      confidence,
      validationActions: actions.length > 0 ? actions : [ValidationAction.ACCEPT],
      issues,
      isDuplicate: false,
      processingDurationMs: Date.now() - startTime,
      canonicalTimestamp,
      canonicalUserId: identity?.primaryId,
      resolvedIdentity: identity
    });
  }

  /**
   * Validate event schema
   */
  private validateSchema(event: Event): { valid: boolean; issues: any[] } {
    const issues: any[] = [];

    if (!event.type) {
      issues.push({ type: 'missing_required', severity: 'high', message: 'Missing required field: type', field: 'type' });
    }

    if (!event.tenantId) {
      issues.push({ type: 'missing_required', severity: 'high', message: 'Missing required field: tenantId', field: 'tenantId' });
    }

    if (!event.timestamp) {
      issues.push({ type: 'missing_required', severity: 'high', message: 'Missing required field: timestamp', field: 'timestamp' });
    }

    // Type validation
    if (event.timestamp && isNaN(Date.parse(event.timestamp))) {
      issues.push({ type: 'invalid_format', severity: 'high', message: 'Invalid timestamp format', field: 'timestamp' });
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Normalize timestamp to canonical format
   */
  private normalizeTimestamp(timestamp: string): Date {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  /**
   * Check for duplicate events
   */
  private async checkDuplicate(tenantId: string, event: Event): Promise<{ isDuplicate: boolean; duplicateOf?: string }> {
    const dedupKey = `${this.DEDUP_PREFIX}${tenantId}:${event.type}:${event.userId || 'anon'}:${event.sessionId || 'nosession'}`;

    const existing = await this.redis.get(dedupKey);
    if (existing) {
      return { isDuplicate: true, duplicateOf: existing };
    }

    // Set with 5-minute TTL
    await this.redis.setex(dedupKey, 300, event.id || uuid());
    return { isDuplicate: false };
  }

  /**
   * Resolve identity from multiple identifiers
   */
  async resolveIdentity(tenantId: string, event: Event): Promise<Identity['resolvedIdentity'] | undefined> {
    if (!event.userId && !event.deviceId) return undefined;

    // Try to find existing identity
    const identity = await IdentityModel.findOne({
      tenantId,
      $or: [
        { primaryId: event.userId },
        { primaryId: event.deviceId },
        { 'identifiers.deviceId': event.deviceId }
      ]
    });

    if (identity) {
      // Update last seen
      identity.resolution.lastSeen = new Date();
      identity.resolution.linkCount += 1;
      await identity.save();

      return {
        primaryId: identity.primaryId,
        linkedIds: [
          ...(identity.identifiers.email || []),
          ...(identity.identifiers.phone || []),
          ...(identity.identifiers.deviceId || [])
        ],
        confidence: identity.resolution.confidence
      };
    }

    // Create new identity
    const newIdentity = await IdentityModel.create({
      tenantId,
      primaryId: event.userId || event.deviceId || uuid(),
      identifiers: {
        deviceId: event.deviceId ? [event.deviceId] : [],
        sessionId: event.sessionId ? [event.sessionId] : []
      },
      resolution: {
        method: 'exact',
        confidence: 0.9,
        firstSeen: new Date(),
        lastSeen: new Date(),
        linkCount: 1
      },
      status: 'active'
    });

    return {
      primaryId: newIdentity.primaryId,
      confidence: 0.9
    };
  }

  /**
   * Detect anomalies in event stream
   */
  private async detectAnomalies(tenantId: string, event: Event): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Velocity check: count events per user in last minute
    if (event.userId) {
      const velocityKey = `velocity:${tenantId}:${event.userId}`;
      const count = await this.redis.incr(velocityKey);
      await this.redis.expire(velocityKey, 60); // 1 minute window

      if (count > 100) {
        anomalies.push({
          id: uuid(),
          tenantId,
          type: 'velocity_spike',
          severity: 'high',
          description: `User ${event.userId} sent ${count} events in 1 minute`,
          affectedEvents: [event.id],
          eventCount: count,
          userId: event.userId,
          details: { count, windowSeconds: 60 },
          status: 'detected'
        } as any);
      }
    }

    return anomalies;
  }

  /**
   * Normalize event to canonical format
   */
  private normalizeEvent(event: Event): Event {
    return {
      ...event,
      id: event.id || uuid(),
      timestamp: this.normalizeTimestamp(event.timestamp).toISOString(),
      userId: event.userId?.toLowerCase().trim() || undefined
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(issues: any[]): SignalQuality {
    if (issues.length === 0) return SignalQuality.EXCELLENT;
    const highSeverity = issues.filter(i => i.severity === 'high').length;
    const mediumSeverity = issues.filter(i => i.severity === 'medium').length;

    if (highSeverity > 0) return SignalQuality.INVALID;
    if (mediumSeverity > 0) return SignalQuality.POOR;
    return SignalQuality.FAIR;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(issues: any[]): number {
    let confidence = 1.0;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high': confidence *= 0.3; break;
        case 'medium': confidence *= 0.6; break;
        case 'low': confidence *= 0.9; break;
      }
    }
    return Math.max(confidence, 0);
  }

  /**
   * Create validated signal document
   */
  private async createValidatedSignal(
    event: Event,
    tenantId: string,
    result: any
  ): Promise<ValidatedSignal> {
    const doc = await ValidatedSignalModel.create({
      originalEventId: event.id,
      tenantId,
      quality: result.quality,
      confidence: result.confidence,
      validationActions: result.validationActions,
      issues: result.issues,
      normalizedEvent: result.normalizedEvent || event,
      canonicalTimestamp: result.canonicalTimestamp,
      canonicalUserId: result.canonicalUserId,
      resolvedIdentity: result.resolvedIdentity,
      isDuplicate: result.isDuplicate,
      duplicateOf: result.duplicateOf,
      processedAt: new Date(),
      processingDurationMs: result.processingDurationMs
    });

    return doc.toObject() as ValidatedSignal;
  }

  /**
   * Get quality metrics for tenant
   */
  async getQualityMetrics(tenantId: string, period: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    const periodMs = period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
    const since = new Date(Date.now() - periodMs);

    const signals = await ValidatedSignalModel.aggregate([
      { $match: { tenantId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$quality',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = signals.reduce((sum, s) => sum + s.count, 0);
    const distribution: any = { excellent: 0, good: 0, fair: 0, poor: 0, invalid: 0 };

    for (const s of signals) {
      distribution[s._id] = s.count;
    }

    return {
      totalEvents: total,
      distribution,
      duplicateRate: await this.getDuplicateRate(tenantId, since),
      avgProcessingMs: await this.getAvgProcessingTime(tenantId, since),
      period
    };
  }

  private async getDuplicateRate(tenantId: string, since: Date): Promise<number> {
    const total = await ValidatedSignalModel.countDocuments({ tenantId, createdAt: { $gte: since } });
    const duplicates = await ValidatedSignalModel.countDocuments({ tenantId, createdAt: { $gte: since }, isDuplicate: true });
    return total > 0 ? duplicates / total : 0;
  }

  private async getAvgProcessingTime(tenantId: string, since: Date): Promise<number> {
    const result = await ValidatedSignalModel.aggregate([
      { $match: { tenantId, createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$processingDurationMs' } } }
    ]);
    return result[0]?.avg || 0;
  }
}

export const signalService = new SignalService();
