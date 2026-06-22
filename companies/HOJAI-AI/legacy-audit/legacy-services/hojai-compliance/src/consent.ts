/**
 * Consent Management Module
 *
 * Provides comprehensive consent tracking and management for GDPR,
 * CCPA, and other privacy regulations.
 *
 * Features:
 * - Granular consent tracking
 * - Consent versioning
 * - Withdrawal handling
 * - Proof of consent storage
 * - Preference center
 *
 * @module hojai-compliance/consent
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * Consent types
 */
export enum ConsentType {
  /** Essential cookies and functionality */
  ESSENTIAL = 'essential',
  /** Analytics and performance tracking */
  ANALYTICS = 'analytics',
  /** Marketing and advertising */
  MARKETING = 'marketing',
  /** Personalization of experience */
  PERSONALIZATION = 'personalization',
  /** Data sharing with third parties */
  DATA_SHARING = 'data_sharing',
  /** AI model training with user data */
  AI_TRAINING = 'ai_training',
  /** Profile linking across services */
  PROFILE_LINKING = 'profile_linking',
  /** Location-based services */
  LOCATION = 'location',
  /** Communication and notifications */
  COMMUNICATIONS = 'communications',
}

/**
 * Consent method
 */
export enum ConsentMethod {
  /** Explicit checkbox or similar active consent */
  EXPLICIT = 'explicit',
  /** Implicit through continued use */
  IMPLICIT = 'implicit',
  /** Consent via banner acceptance */
  BANNER = 'banner',
  /** Consent via granular preference center */
  PREFERENCE_CENTER = 'preference_center',
  /** Verbal or written consent */
  VERBAL = 'verbal',
  /** Consent via wet or electronic signature */
  SIGNED = 'signed',
}

/**
 * Individual consent record
 */
export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date;
  withdrawnAt?: Date;
  method: ConsentMethod;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  purpose?: string;
  description?: string;
  legalBasis?: string;
  proof?: ConsentProof;
}

/**
 * Proof of consent (e.g., document hash)
 */
export interface ConsentProof {
  type: 'hash' | 'signature' | 'certificate' | 'audit_id';
  value: string;
  timestamp: Date;
  provider?: string;
}

/**
 * Consent request
 */
export interface ConsentRequest {
  userId: string;
  consents: Array<{
    type: ConsentType;
    granted: boolean;
    purpose?: string;
  }>;
  method: ConsentMethod;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * User consent profile
 */
export interface UserConsentProfile {
  userId: string;
  consents: ConsentRecord[];
  lastUpdated: Date;
  lastMethod: ConsentMethod;
  privacyPolicyVersion?: string;
  termsVersion?: string;
}

/**
 * Consent change log entry
 */
export interface ConsentChangeLog {
  id: string;
  userId: string;
  consentType: ConsentType;
  previousValue: boolean;
  newValue: boolean;
  method: ConsentMethod;
  timestamp: Date;
  reason?: string;
  ipAddress?: string;
}

/**
 * Consent template for a consent type
 */
export interface ConsentTemplate {
  type: ConsentType;
  title: string;
  description: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: string;
  thirdParties?: string[];
  version: string;
  required: boolean;
  defaultValue: boolean;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for granting or withdrawing consent
 */
export const ConsentRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  consents: z.array(z.object({
    type: z.nativeEnum(ConsentType),
    granted: z.boolean(),
    purpose: z.string().optional(),
  })).min(1, 'At least one consent is required'),
  method: z.nativeEnum(ConsentMethod).default(ConsentMethod.EXPLICIT),
  version: z.string().min(1, 'Consent version is required'),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

/**
 * Schema for bulk consent update
 */
export const BulkConsentSchema = z.object({
  userId: z.string().min(1),
  actions: z.array(z.object({
    type: z.nativeEnum(ConsentType),
    granted: z.boolean(),
    reason: z.string().optional(),
  })),
  method: z.nativeEnum(ConsentMethod),
  version: z.string(),
});

/**
 * Schema for consent preference
 */
export const ConsentPreferenceSchema = z.object({
  userId: z.string().min(1),
  preferences: z.record(z.nativeEnum(ConsentType), z.boolean()),
  privacyPolicyAccepted: z.boolean(),
  termsAccepted: z.boolean(),
  marketingOptIn: z.boolean().optional(),
});

/**
 * Schema for consent proof verification
 */
export const ConsentProofSchema = z.object({
  userId: z.string().min(1),
  consentType: z.nativeEnum(ConsentType),
  proofType: z.enum(['hash', 'signature', 'certificate', 'audit_id']),
  proofValue: z.string().min(1),
});

// ============================================================================
// Consent Templates
// ============================================================================

/**
 * Default consent templates
 */
const DEFAULT_CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    type: ConsentType.ESSENTIAL,
    title: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off.',
    purpose: 'Basic functionality, security, and session management',
    legalBasis: 'Legitimate interests',
    retentionPeriod: 'Session duration',
    required: true,
    defaultValue: true,
  },
  {
    type: ConsentType.ANALYTICS,
    title: 'Analytics',
    description: 'Help us understand how visitors interact with our website.',
    purpose: 'Improve our services and user experience',
    legalBasis: 'Consent',
    retentionPeriod: '26 months',
    required: false,
    defaultValue: false,
  },
  {
    type: ConsentType.MARKETING,
    title: 'Marketing',
    description: 'Used to deliver personalized advertisements.',
    purpose: 'Relevant advertising and marketing communications',
    legalBasis: 'Consent',
    retentionPeriod: '12 months',
    required: false,
    defaultValue: false,
  },
  {
    type: ConsentType.PERSONALIZATION,
    title: 'Personalization',
    description: 'Allow us to remember your preferences and provide a personalized experience.',
    purpose: 'Tailored content and recommendations',
    legalBasis: 'Consent',
    retentionPeriod: '12 months',
    required: false,
    defaultValue: false,
  },
  {
    type: ConsentType.DATA_SHARING,
    title: 'Data Sharing',
    description: 'Allow sharing of your data with trusted partners.',
    purpose: 'Partner integrations and services',
    legalBasis: 'Consent',
    retentionPeriod: 'Until withdrawn',
    required: false,
    defaultValue: false,
  },
  {
    type: ConsentType.AI_TRAINING,
    title: 'AI Training',
    description: 'Allow your conversations and data to be used for improving AI models.',
    purpose: 'AI model improvement and research',
    legalBasis: 'Consent',
    retentionPeriod: 'Until withdrawn',
    required: false,
    defaultValue: false,
  },
  {
    type: ConsentType.COMMUNICATIONS,
    title: 'Communications',
    description: 'Allow us to send you updates, newsletters, and promotional content.',
    purpose: 'Stay informed about our products and services',
    legalBasis: 'Consent',
    retentionPeriod: 'Until withdrawn',
    required: false,
    defaultValue: false,
  },
];

// ============================================================================
// Consent Service
// ============================================================================

/**
 * Configuration for consent service
 */
export interface ConsentServiceConfig {
  /** Custom consent templates */
  templates?: ConsentTemplate[];
  /** Default consent version */
  defaultVersion?: string;
  /** Proof retention period in days */
  proofRetentionDays?: number;
  /** Enable consent change logging */
  logChanges?: boolean;
  /** Require proof for consent */
  requireProof?: boolean;
}

/**
 * Default consent service configuration
 */
const DEFAULT_CONFIG: Required<ConsentServiceConfig> = {
  templates: DEFAULT_CONSENT_TEMPLATES,
  defaultVersion: '1.0',
  proofRetentionDays: 2555, // 7 years
  logChanges: true,
  requireProof: true,
};

/**
 * Consent Service
 *
 * Manages user consent preferences with full audit trail.
 *
 * @example
 * ```typescript
 * const consentService = new ConsentService();
 *
 * // Grant consent
 * await consentService.grantConsent({
 *   userId: 'user-123',
 *   consents: [{ type: ConsentType.MARKETING, granted: true }],
 *   method: ConsentMethod.EXPLICIT,
 *   version: '1.0',
 * });
 *
 * // Check consent status
 * const profile = await consentService.getUserConsentProfile('user-123');
 * const canSendMarketing = profile.consents.find(
 *   c => c.consentType === ConsentType.MARKETING && c.granted
 * );
 *
 * // Withdraw consent
 * await consentService.withdrawConsent('user-123', ConsentType.MARKETING);
 * ```
 */
export class ConsentService {
  private config: Required<ConsentServiceConfig>;
  private consents: Map<string, ConsentRecord> = new Map();
  private changeLogs: ConsentChangeLog[] = [];

  constructor(config: ConsentServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ConsentServiceConfig>> {
    return { ...this.config };
  }

  /**
   * Get all consent templates
   */
  getTemplates(): ConsentTemplate[] {
    return [...this.config.templates];
  }

  /**
   * Get template for a specific consent type
   */
  getTemplate(type: ConsentType): ConsentTemplate | undefined {
    return this.config.templates.find((t) => t.type === type);
  }

  /**
   * Process consent request (grant or withdraw)
   */
  async processConsent(
    validatedRequest: z.infer<typeof ConsentRequestSchema>
  ): Promise<ConsentRecord[]> {
    const records: ConsentRecord[] = [];

    for (const consent of validatedRequest.consents) {
      const existingConsent = await this.getConsentRecord(
        validatedRequest.userId,
        consent.type
      );

      const record: ConsentRecord = {
        id: uuidv4(),
        userId: validatedRequest.userId,
        consentType: consent.type,
        granted: consent.granted,
        grantedAt: new Date(),
        withdrawnAt: consent.granted ? undefined : new Date(),
        method: validatedRequest.method,
        version: validatedRequest.version,
        ipAddress: validatedRequest.ipAddress,
        userAgent: validatedRequest.userAgent,
        purpose: consent.purpose || this.getTemplate(consent.type)?.purpose,
        description: this.getTemplate(consent.type)?.description,
        legalBasis: this.getTemplate(consent.type)?.legalBasis,
        proof: this.config.requireProof ? this.generateConsentProof(validatedRequest) : undefined,
      };

      this.consents.set(record.id, record);

      // Log change if consent value changed
      if (existingConsent && existingConsent.granted !== consent.granted) {
        await this.logConsentChange({
          userId: validatedRequest.userId,
          consentType: consent.type,
          previousValue: existingConsent.granted,
          newValue: consent.granted,
          method: validatedRequest.method,
        });
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Grant consent for a specific type
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    method: ConsentMethod = ConsentMethod.EXPLICIT,
    metadata?: {
      purpose?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: uuidv4(),
      userId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      method,
      version: this.config.defaultVersion,
      purpose: metadata?.purpose || this.getTemplate(consentType)?.purpose,
      legalBasis: this.getTemplate(consentType)?.legalBasis,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      proof: this.config.requireProof ? this.generateConsentProof({ userId, consentType, method }) : undefined,
    };

    this.consents.set(record.id, record);

    return record;
  }

  /**
   * Withdraw consent for a specific type
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    metadata?: {
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<ConsentRecord> {
    // Find existing consent
    const existingRecord = await this.getConsentRecord(userId, consentType);

    const record: ConsentRecord = {
      id: uuidv4(),
      userId,
      consentType,
      granted: false,
      grantedAt: existingRecord?.grantedAt || new Date(),
      withdrawnAt: new Date(),
      method: ConsentMethod.EXPLICIT,
      version: this.config.defaultVersion,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      proof: this.config.requireProof ? this.generateConsentProof({ userId, consentType, method: ConsentMethod.EXPLICIT }) : undefined,
    };

    this.consents.set(record.id, record);

    // Log withdrawal
    if (existingRecord) {
      await this.logConsentChange({
        userId,
        consentType,
        previousValue: existingRecord.granted,
        newValue: false,
        method: ConsentMethod.EXPLICIT,
        reason: metadata?.reason,
      });
    }

    return record;
  }

  /**
   * Get the latest consent record for a user and type
   */
  async getConsentRecord(
    userId: string,
    consentType: ConsentType
  ): Promise<ConsentRecord | null> {
    const records = Array.from(this.consents.values())
      .filter((c) => c.userId === userId && c.consentType === consentType)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());

    return records[0] || null;
  }

  /**
   * Get full consent profile for a user
   */
  async getUserConsentProfile(userId: string): Promise<UserConsentProfile> {
    const records = Array.from(this.consents.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());

    // Get latest record for each consent type
    const latestByType = new Map<ConsentType, ConsentRecord>();
    for (const record of records) {
      if (!latestByType.has(record.consentType)) {
        latestByType.set(record.consentType, record);
      }
    }

    return {
      userId,
      consents: Array.from(latestByType.values()),
      lastUpdated: records[0]?.grantedAt || new Date(),
      lastMethod: records[0]?.method || ConsentMethod.IMPLICIT,
    };
  }

  /**
   * Check if user has given consent for a type
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const record = await this.getConsentRecord(userId, consentType);

    // Check template for required consent
    const template = this.getTemplate(consentType);
    if (template?.required) {
      return true;
    }

    return record?.granted ?? false;
  }

  /**
   * Get consent status for all types
   */
  async getConsentStatus(userId: string): Promise<Map<ConsentType, boolean>> {
    const profile = await this.getUserConsentProfile(userId);
    const status = new Map<ConsentType, boolean>();

    for (const template of this.config.templates) {
      const record = profile.consents.find((c) => c.consentType === template.type);
      status.set(
        template.type,
        record?.granted ?? template.defaultValue
      );
    }

    return status;
  }

  /**
   * Process bulk consent update
   */
  async bulkUpdateConsent(
    validatedRequest: z.infer<typeof BulkConsentSchema>
  ): Promise<ConsentRecord[]> {
    const records: ConsentRecord[] = [];

    for (const action of validatedRequest.actions) {
      const record = action.granted
        ? await this.grantConsent(validatedRequest.userId, action.type, validatedRequest.method)
        : await this.withdrawConsent(validatedRequest.userId, action.type, { reason: action.reason });

      records.push(record);
    }

    return records;
  }

  /**
   * Log consent change
   */
  private async logConsentChange(params: {
    userId: string;
    consentType: ConsentType;
    previousValue: boolean;
    newValue: boolean;
    method: ConsentMethod;
    reason?: string;
    ipAddress?: string;
  }): Promise<void> {
    if (!this.config.logChanges) return;

    const logEntry: ConsentChangeLog = {
      id: uuidv4(),
      ...params,
      timestamp: new Date(),
    };

    this.changeLogs.push(logEntry);

    // In production, this would be sent to audit log service
    console.log(`[CONSENT] ${params.previousValue ? 'GRANTED' : 'WITHDRAWN'} → ${params.newValue ? 'GRANTED' : 'WITHDRAWN'}`, {
      userId: params.userId,
      consentType: params.consentType,
      method: params.method,
    });
  }

  /**
   * Query consent change logs
   */
  async queryChangeLogs(filters: {
    userId?: string;
    consentType?: ConsentType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ConsentChangeLog[]> {
    let results = [...this.changeLogs];

    if (filters.userId) {
      results = results.filter((l) => l.userId === filters.userId);
    }
    if (filters.consentType) {
      results = results.filter((l) => l.consentType === filters.consentType);
    }
    if (filters.startDate) {
      results = results.filter((l) => l.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((l) => l.timestamp <= filters.endDate!);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Generate proof of consent
   */
  private generateConsentProof(params: {
    userId: string;
    consentType: ConsentType;
    method: ConsentMethod;
  }): ConsentProof {
    const data = JSON.stringify({
      ...params,
      timestamp: new Date().toISOString(),
    });

    // Simple hash for proof - use crypto.subtle.digest in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return {
      type: 'hash',
      value: `proof-${Math.abs(hash).toString(16).padStart(16, '0')}`,
      timestamp: new Date(),
      provider: 'hojai-consent',
    };
  }

  /**
   * Verify consent proof
   */
  async verifyConsentProof(
    validatedProof: z.infer<typeof ConsentProofSchema>
  ): Promise<{ valid: boolean; record?: ConsentRecord }> {
    const records = Array.from(this.consents.values())
      .filter(
        (c) =>
          c.userId === validatedProof.userId &&
          c.consentType === validatedProof.consentType &&
          c.proof?.type === validatedProof.proofType
      )
      .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());

    const record = records[0];

    if (!record || !record.proof) {
      return { valid: false };
    }

    return {
      valid: record.proof.value === validatedProof.proofValue,
      record,
    };
  }

  /**
   * Export consent history for a user
   */
  async exportConsentHistory(userId: string): Promise<{
    userId: string;
    exportedAt: Date;
    consents: ConsentRecord[];
    changeLogs: ConsentChangeLog[];
    templates: ConsentTemplate[];
  }> {
    const records = Array.from(this.consents.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => a.grantedAt.getTime() - b.grantedAt.getTime());

    const logs = await this.queryChangeLogs({ userId });

    return {
      userId,
      exportedAt: new Date(),
      consents: records,
      changeLogs: logs,
      templates: this.config.templates,
    };
  }
}

/**
 * Create consent validators
 */
export function createConsentValidators() {
  return {
    processConsent: (data: unknown) => ConsentRequestSchema.parse(data),
    bulkUpdate: (data: unknown) => BulkConsentSchema.parse(data),
    verifyProof: (data: unknown) => ConsentProofSchema.parse(data),
  };
}

/**
 * Get all consent types
 */
export function getConsentTypes(): ConsentType[] {
  return Object.values(ConsentType);
}

/**
 * Get required consent types
 */
export function getRequiredConsents(): ConsentTemplate[] {
  return DEFAULT_CONSENT_TEMPLATES.filter((t) => t.required);
}

export default ConsentService;
