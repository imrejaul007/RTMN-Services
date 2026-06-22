import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import {
  Consent,
  ConsentType,
  ConsentStatus,
  ConsentSource,
  DataRightType,
  DataRightStatus,
  DataRightRequest,
  RetentionPolicy,
  RetentionPolicyDoc,
  DataCategory,
  DataCategoryDoc,
  PolicyRule,
  ComplianceAudit
} from '../types/index.js';

// ============================================================================
// MODELS
// ============================================================================

const ConsentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(ConsentType), required: true },
  source: { type: String, enum: Object.values(ConsentSource), required: true },
  status: { type: String, enum: Object.values(ConsentStatus), default: ConsentStatus.PENDING },
  version: { type: String, required: true },
  description: { type: String },
  dataCategories: [String],
  scope: {
    scope: { type: String, enum: ['global', 'tenant', 'service', 'specific'], default: 'global' },
    services: [String],
    dataTypes: [String]
  },
  purpose: { type: String },
  purposeDescription: { type: String },
  validFrom: Date,
  validUntil: Date,
  canWithdraw: { type: Boolean, default: true },
  withdrawalMethod: String,
  grantedAt: Date,
  grantedIP: String,
  grantedUserAgent: String,
  withdrawnAt: Date
}, { timestamps: true });

ConsentSchema.index({ tenantId: 1, userId: 1, type: 1 }, { unique: true });

export const ConsentModel = mongoose.model('Consent', ConsentSchema);

// ============================================================================
// DATA RIGHTS MODEL
// ============================================================================

const DataRightSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(DataRightType), required: true },
  status: { type: String, enum: Object.values(DataRightStatus), default: DataRightStatus.PENDING },
  description: { type: String },
  requestedData: [String],
  reason: String,
  cascadeDelete: { type: Boolean, default: false },
  retentionOverride: { type: Boolean, default: false },
  objectionTo: String,
  assignedTo: String,
  dueDate: Date,
  responseData: { type: Map, of: Schema.Types.Mixed },
  responseAt: Date,
  responseBy: String,
  fulfilledAt: Date,
  fulfillmentMethod: String
}, { timestamps: true });

DataRightSchema.index({ tenantId: 1, userId: 1, status: 1 });

export const DataRightModel = mongoose.model('DataRight', DataRightSchema);

// ============================================================================
// RETENTION POLICY MODEL
// ============================================================================

const RetentionPolicySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  dataCategory: { type: String, required: true },
  policy: { type: String, enum: Object.values(RetentionPolicy), required: true },
  retentionDays: Number,
  trigger: String,
  expiryAction: { type: String, enum: ['delete', 'anonymize', 'restrict', 'archive', 'review'] },
  legalBasis: String,
  legalBasisArticle: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

RetentionPolicySchema.index({ tenantId: 1, dataCategory: 1 });

export const RetentionPolicyModel = mongoose.model('RetentionPolicy', RetentionPolicySchema);

// ============================================================================
// DATA CATEGORY MODEL
// ============================================================================

const DataCategorySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  category: { type: String, enum: Object.values(DataCategory), required: true },
  sensitivityLevel: { type: Number, min: 1, max: 5, default: 1 },
  legalClassification: { type: String, enum: ['public', 'personal', 'sensitive', 'special'] },
  requiredProtections: [String],
  sharingRules: {
    canShareWithProcessors: { type: Boolean, default: true },
    canShareWithThirdParties: { type: Boolean, default: false },
    requiresConsent: { type: Boolean, default: true },
    requiresLegalBasis: { type: Boolean, default: true }
  }
}, { timestamps: true });

export const DataCategoryModel = mongoose.model('DataCategory', DataCategorySchema);

// ============================================================================
// POLICY RULES MODEL
// ============================================================================

const PolicyRuleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  priority: { type: Number, default: 0 },
  conditions: {
    dataCategory: [String],
    consentStatus: [String],
    userSegment: [String],
    processingType: [String]
  },
  action: { type: String, enum: ['allow', 'deny', 'require_consent', 'require_review', 'restrict', 'mask', 'anonymize'] },
  enforcement: {
    immediate: { type: Boolean, default: true },
    gracePeriodDays: { type: Number, default: 0 },
    notificationRequired: { type: Boolean, default: false }
  },
  canOverride: { type: Boolean, default: false },
  overrideRoles: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

PolicyRuleSchema.index({ tenantId: 1, priority: -1 });

export const PolicyRuleModel = mongoose.model('PolicyRule', PolicyRuleSchema);

// ============================================================================
// COMPLIANCE AUDIT MODEL
// ============================================================================

const ComplianceAuditSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: String,
  event: { type: String, required: true },
  category: { type: String, enum: ['consent', 'data_right', 'retention', 'breach', 'transfer', 'security'], required: true },
  dataCategories: [String],
  action: { type: String, required: true },
  result: { type: String, enum: ['success', 'failure', 'partial'] },
  legalBasis: String,
  gdprArticle: String,
  ip: String,
  userAgent: String,
  requestId: String,
  processedBy: String,
  processingPurpose: String
}, { timestamps: true });

ComplianceAuditSchema.index({ tenantId: 1, createdAt: -1 });
ComplianceAuditSchema.index({ userId: 1, createdAt: -1 });

export const ComplianceAuditModel = mongoose.model('ComplianceAudit', ComplianceAuditSchema);

// ============================================================================
// POLICY SERVICE
// ============================================================================

export class PolicyService {
  /**
   * Check if processing is allowed
   */
  async canProcess(params: {
    tenantId: string;
    userId: string;
    dataCategories: DataCategory[];
    purpose: string;
    processingType: string;
  }): Promise<{ allowed: boolean; reason?: string; requiresConsent?: ConsentType[] }> {
    const { tenantId, userId, dataCategories, purpose, processingType } = params;

    // Check consent status
    const consents = await ConsentModel.find({
      tenantId,
      userId,
      status: ConsentStatus.GRANTED,
      validUntil: { $gt: new Date() }
    });

    // Check policy rules
    const rules = await PolicyRuleModel.find({
      tenantId,
      active: true
    }).sort({ priority: -1 });

    // Default allow
    let allowed = true;
    let reason: string | undefined;
    let requiresConsent: ConsentType[] | undefined;

    for (const rule of rules) {
      const conditions = rule.conditions;

      // Check if this rule applies
      const categoryMatch = !conditions.dataCategory?.length ||
        conditions.dataCategory.some(c => dataCategories.includes(c as DataCategory));

      if (!categoryMatch) continue;

      // Rule applies
      if (rule.action === 'deny') {
        allowed = false;
        reason = `Policy ${rule.name} denies this processing`;
        break;
      }

      if (rule.action === 'require_consent') {
        allowed = false;
        requiresConsent = [ConsentType.AI_PROCESSING];
        reason = `Consent required for this processing`;
      }
    }

    // Log the check
    await this.logAudit({
      tenantId,
      userId,
      event: 'policy_check',
      category: 'consent',
      dataCategories: dataCategories.map(c => c),
      action: `Check: ${purpose}/${processingType}`,
      result: allowed ? 'success' : 'failure',
      processingPurpose: purpose
    });

    return { allowed, reason, requiresConsent };
  }

  /**
   * Grant consent
   */
  async grantConsent(params: {
    tenantId: string;
    userId: string;
    type: ConsentType;
    purpose: string;
    dataCategories: string[];
    ip?: string;
    userAgent?: string;
  }): Promise<Consent> {
    const { tenantId, userId, type, purpose, dataCategories, ip, userAgent } = params;

    // Check existing consent
    const existing = await ConsentModel.findOne({ tenantId, userId, type });
    if (existing) {
      existing.status = ConsentStatus.GRANTED;
      existing.grantedAt = new Date();
      existing.grantedIP = ip;
      existing.grantedUserAgent = userAgent;
      existing.validFrom = new Date();
      existing.purpose = purpose;
      existing.dataCategories = dataCategories;
      await existing.save();
      return existing.toObject() as Consent;
    }

    // Create new consent
    const consent = new ConsentModel({
      tenantId,
      userId,
      type,
      source: ConsentSource.EXPLICIT,
      status: ConsentStatus.GRANTED,
      version: '1.0',
      purpose,
      purposeDescription: `Consent for ${purpose}`,
      dataCategories,
      validFrom: new Date(),
      grantedAt: new Date(),
      grantedIP: ip,
      grantedUserAgent: userAgent
    });

    await consent.save();

    await this.logAudit({
      tenantId,
      userId,
      event: 'consent_granted',
      category: 'consent',
      dataCategories,
      action: `Grant consent: ${type}`,
      result: 'success'
    });

    return consent.toObject() as Consent;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(params: {
    tenantId: string;
    userId: string;
    type: ConsentType;
  }): Promise<void> {
    const { tenantId, userId, type } = params;

    const consent = await ConsentModel.findOne({ tenantId, userId, type });
    if (!consent) throw new Error('Consent not found');

    consent.status = ConsentStatus.WITHDRAWN;
    consent.withdrawnAt = new Date();
    await consent.save();

    await this.logAudit({
      tenantId,
      userId,
      event: 'consent_withdrawn',
      category: 'consent',
      action: `Withdraw: ${type}`,
      result: 'success'
    });
  }

  /**
   * Check retention and trigger cleanup
   */
  async checkRetention(tenantId: string, dataCategory: DataCategory): Promise<{
    action: 'delete' | 'anonymize' | 'restrict' | 'archive' | 'review';
    reason: string;
  }> {
    const policy = await RetentionPolicyModel.findOne({
      tenantId,
      dataCategory,
      active: true
    });

    if (!policy) {
      // Default: review
      return { action: 'review', reason: 'No policy defined' };
    }

    return {
      action: policy.expiryAction,
      reason: `${policy.policy}: ${policy.name}`
    };
  }

  /**
   * Handle data right request
   */
  async handleDataRightRequest(params: {
    tenantId: string;
    userId: string;
    type: DataRightType;
    description: string;
  }): Promise<DataRightRequest> {
    const { tenantId, userId, type, description } = params;

    // GDPR requires response within 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const request = new DataRightModel({
      tenantId,
      userId,
      type,
      status: DataRightStatus.PENDING,
      description,
      dueDate
    });

    await request.save();

    await this.logAudit({
      tenantId,
      userId,
      event: 'data_right_request',
      category: 'data_right',
      action: `Request: ${type}`,
      result: 'success'
    });

    return request.toObject() as DataRightRequest;
  }

  /**
   * Fulfill data right request (e.g., GDPR erasure)
   */
  async fulfillDataRight(params: {
    tenantId: string;
    requestId: string;
    action: 'delete' | 'correction' | 'download' | 'restriction';
    data?: Record<string, unknown>;
  }): Promise<void> {
    const request = await DataRightModel.findById(params.requestId);
    if (!request) throw new Error('Request not found');

    // Mark as fulfilled
    request.status = DataRightStatus.FULFILLED;
    request.fulfilledAt = new Date();
    request.fulfillmentMethod = params.action;
    request.responseData = params.data || {};
    request.responseAt = new Date();
    await request.save();

    await this.logAudit({
      tenantId: request.tenantId,
      userId: request.userId,
      event: 'data_right_fulfilled',
      category: 'data_right',
      action: `Fulfill: ${request.type}`,
      result: 'success'
    });
  }

  /**
   * Get user consent summary
   */
  async getConsentSummary(tenantId: string, userId: string): Promise<{
    total: number;
    granted: number;
    denied: number;
    pending: number;
    consents: Consent[];
  }> {
    const consents = await ConsentModel.find({ tenantId, userId });
    const summary = {
      total: consents.length,
      granted: consents.filter(c => c.status === ConsentStatus.GRANTED).length,
      denied: consents.filter(c => c.status === ConsentStatus.DENIED).length,
      pending: consents.filter(c => c.status === ConsentStatus.PENDING).length,
      consents: consents.map(c => c.toObject() as Consent)
    };
    return summary;
  }

  /**
   * Log compliance audit
   */
  async logAudit(params: {
    tenantId: string;
    userId?: string;
    event: string;
    category: string;
    dataCategories?: string[];
    action: string;
    result: 'success' | 'failure' | 'partial';
    legalBasis?: string;
    gdprArticle?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    processingPurpose?: string;
  }): Promise<void> {
    await ComplianceAuditModel.create({
      ...params,
      id: uuid()
    });
  }

  /**
   * Export audit logs (for compliance reporting)
   */
  async exportAuditLogs(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    category?: string;
  }): Promise<ComplianceAudit[]> {
    const filter: Record<string, unknown> = {
      tenantId: params.tenantId,
      createdAt: { $gte: params.startDate, $lte: params.endDate }
    };
    if (params.category) filter.category = params.category;

    const logs = await ComplianceAuditModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000);

    return logs.map(l => l.toObject() as ComplianceAudit);
  }
}

export const policyService = new PolicyService();
