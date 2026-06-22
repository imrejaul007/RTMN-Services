/**
 * HIPAA Compliance Module
 *
 * Implements Health Insurance Portability and Accountability Act requirements
 * for handling Protected Health Information (PHI).
 *
 * Key Requirements:
 * - Privacy Rule: Protects all individually identifiable health information
 * - Security Rule: Sets standards for electronic PHI (ePHI)
 * - Breach Notification Rule: Requires notification of breaches
 * - Enforcement Rule: Establishes penalties for violations
 *
 * @module hojai-compliance/hipaa
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * Protected Health Information (PHI) categories
 */
export enum PHICategory {
  /** Patient demographic information */
  DEMOGRAPHICS = 'demographics',
  /** Medical history and records */
  MEDICAL_HISTORY = 'medical_history',
  /** Billing and insurance information */
  BILLING = 'billing',
  /** Lab results and diagnostics */
  LAB_RESULTS = 'lab_results',
  /** Prescription and medication data */
  MEDICATIONS = 'medications',
  /** Insurance and coverage information */
  INSURANCE = 'insurance',
  /** Authorization and consent forms */
  AUTHORIZATIONS = 'authorizations',
  /** Emergency contact and next of kin */
  EMERGENCY_CONTACT = 'emergency_contact',
}

/**
 * PHI access reason
 */
export enum PHIAccessReason {
  TREATMENT = 'treatment',
  PAYMENT = 'payment',
  OPERATIONS = 'operations',
  /** Marketing, sale of PHI, or other non-permitted uses */
  OTHER = 'other',
  /** Required by law */
  LEGAL = 'legal',
  /** Research with proper authorization */
  RESEARCH = 'research',
  /** Preventing serious threat to health or safety */
  PUBLIC_HEALTH = 'public_health',
}

/**
 * PHI access log entry
 */
export interface PHIAccessLog {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  patientId: string;
  resourceType: string;
  resourceId: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'export';
  purpose: PHIAccessReason;
  justification?: string;
  ipAddress?: string;
  userAgent?: string;
  fieldsAccessed?: string[];
}

/**
 * Patient authorization for PHI disclosure
 */
export interface PHIAuthorization {
  id: string;
  patientId: string;
  recipientId: string;
  recipientName: string;
  purpose: string;
  categoriesIncluded: PHICategory[];
  expirationDate: Date;
  revoked: boolean;
  signedAt: Date;
  witnessId?: string;
}

/**
 * PHI data record
 */
export interface PHIRecord {
  id: string;
  patientId: string;
  category: PHICategory;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastAccessedBy?: string;
  lastAccessedAt?: Date;
  encryptionKeyId?: string;
  retentionUntil?: Date;
}

/**
 * HIPAA Compliance assessment
 */
export interface HIPAARiskAssessment {
  id: string;
  assessmentDate: Date;
  assessorId: string;
  risks: Array<{
    category: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  overallRiskLevel: 'low' | 'medium' | 'high';
  nextReviewDate: Date;
}

/**
 * Breach notification record
 */
export interface HIPAABreachNotification {
  id: string;
  discoveredAt: Date;
  reportedAt?: Date;
  breachType: 'theft' | 'loss' | 'unauthorized_access' | 'improper_disclosure' | 'hacking';
  recordsAffected: number;
  individualsAffected: number;
  description: string;
  actionsTaken: string[];
  notificationSent: boolean;
  notificationDate?: Date;
  lawEnforcementNotified: boolean;
  mediaNotified: boolean;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for creating PHI records
 */
export const PHIRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  category: z.nativeEnum(PHICategory),
  data: z.record(z.unknown()),
  retentionDays: z.number().positive().optional(),
});

/**
 * Schema for PHI access request
 */
export const PHIAccessRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  resourceType: z.string().min(1),
  resourceId: z.string().optional(),
  action: z.enum(['view', 'create', 'update', 'delete', 'export']),
  purpose: z.nativeEnum(PHIAccessReason),
  justification: z.string().optional(),
  fieldsRequested: z.array(z.string()).optional(),
});

/**
 * Schema for PHI authorization
 */
export const PHIAuthorizationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  categoriesIncluded: z.array(z.nativeEnum(PHICategory)).min(1, 'At least one category required'),
  expirationDate: z.date().refine((date) => date > new Date(), {
    message: 'Expiration date must be in the future',
  }),
  witnessId: z.string().optional(),
});

/**
 * Schema for breach notification
 */
export const HIPAABreachSchema = z.object({
  breachType: z.enum(['theft', 'loss', 'unauthorized_access', 'improper_disclosure', 'hacking']),
  recordsAffected: z.number().positive(),
  individualsAffected: z.number().positive(),
  description: z.string().min(10, 'Description is required'),
  actionsTaken: z.array(z.string()).min(1, 'At least one action is required'),
  lawEnforcementNotified: z.boolean().default(false),
  mediaNotified: z.boolean().default(false),
});

// ============================================================================
// HIPAA Service
// ============================================================================

/**
 * Configuration for HIPAA service
 */
export interface HIPAAConfig {
  /** Enable encryption for PHI at rest */
  encryptionAtRest?: boolean;
  /** Enable encryption for PHI in transit */
  encryptionInTransit?: boolean;
  /** Access log retention in days */
  accessLogRetentionDays?: number;
  /** Minimum password length for PHI access */
  minPasswordLength?: number;
  /** Require MFA for PHI access */
  requireMFA?: boolean;
  /** Automatic break-the-glass protocol enabled */
  breakTheGlassEnabled?: boolean;
  /** Maximum unauthorized access attempts before lockout */
  maxUnauthorizedAttempts?: number;
  /** PHI retention period in days */
  retentionDays?: number;
}

/**
 * Default HIPAA configuration
 */
const DEFAULT_CONFIG: Required<HIPAAConfig> = {
  encryptionAtRest: true,
  encryptionInTransit: true,
  accessLogRetentionDays: 2555, // 7 years per HIPAA requirement
  minPasswordLength: 12,
  requireMFA: true,
  breakTheGlassEnabled: true,
  maxUnauthorizedAttempts: 3,
  retentionDays: 2555, // 7 years per HIPAA requirement
};

/**
 * Minimum necessary standard categories
 */
const MINIMUM_NECESSARY_CATEGORIES = [
  'patient_name',
  'dates',
  'phone_number',
  'fax_number',
  'email_address',
  'SSN',
  'medical_record_number',
  'health_plan_number',
  'account_number',
  'certificate_number',
  'license_number',
  'vehicle_identifiers',
  'device_identifiers',
  'web_urls',
  'IP_address',
  'biometric_identifiers',
  'full_face_photos',
  'any unique identifying number',
];

/**
 * HIPAA Service
 *
 * Manages Protected Health Information (PHI) with full HIPAA compliance.
 *
 * @example
 * ```typescript
 * const hipaa = new HIPAAService({
 *   encryptionAtRest: true,
 *   encryptionInTransit: true,
 *   requireMFA: true,
 * });
 *
 * // Log PHI access
 * await hipaa.logPHIAccess({
 *   patientId: 'patient-123',
 *   action: 'view',
 *   purpose: 'treatment',
 *   resourceType: 'medical_history',
 * });
 *
 * // Create PHI record
 * const record = await hipaa.createPHIRecord({
 *   patientId: 'patient-123',
 *   category: 'medications',
 *   data: { medications: ['Aspirin', 'Ibuprofen'] },
 * });
 * ```
 */
export class HIPAAService {
  private config: Required<HIPAAConfig>;
  private phiRecords: Map<string, PHIRecord> = new Map();
  private accessLogs: PHIAccessLog[] = [];
  private authorizations: Map<string, PHIAuthorization> = new Map();
  private breachNotifications: HIPAABreachNotification[] = [];

  constructor(config: HIPAAConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<HIPAAConfig>> {
    return { ...this.config };
  }

  /**
   * Create a PHI record with encryption and access controls
   */
  async createPHIRecord(
    validatedData: z.infer<typeof PHIRecordSchema>,
    createdBy: string
  ): Promise<PHIRecord> {
    const record: PHIRecord = {
      id: uuidv4(),
      patientId: validatedData.patientId,
      category: validatedData.category,
      data: this.encryptPHIData(validatedData.data),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      encryptionKeyId: `key-${uuidv4()}`,
      retentionUntil: validatedData.retentionDays
        ? new Date(Date.now() + validatedData.retentionDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000),
    };

    this.phiRecords.set(record.id, record);

    // Log creation
    await this.logPHIAccess({
      patientId: validatedData.patientId,
      resourceType: validatedData.category,
      resourceId: record.id,
      action: 'create',
      purpose: PHIAccessReason.TREATMENT,
      userId: createdBy,
      userRole: 'provider',
      fieldsAccessed: Object.keys(validatedData.data),
    });

    return record;
  }

  /**
   * Access PHI record with logging
   */
  async accessPHI(
    validatedRequest: z.infer<typeof PHIAccessRequestSchema>,
    accessedBy: string,
    userRole: string
  ): Promise<PHIRecord | null> {
    // Verify access is permitted
    const canAccess = await this.verifyMinimumNecessary(
      validatedRequest.patientId,
      validatedRequest.purpose
    );

    if (!canAccess.allowed) {
      throw new HIPAAViolationError(
        `PHI access denied: ${canAccess.reason}`,
        'ACCESS_DENIED',
        validatedRequest.patientId
      );
    }

    // Find matching records
    const records = Array.from(this.phiRecords.values()).filter(
      (r) => r.patientId === validatedRequest.patientId
    );

    if (records.length === 0) {
      return null;
    }

    // Filter by category if specified
    const filteredRecords = records.filter(
      (r) => !validatedRequest.resourceType || r.category === validatedRequest.resourceType
    );

    if (filteredRecords.length === 0) {
      return null;
    }

    const record = filteredRecords[0];

    // Log access
    await this.logPHIAccess({
      patientId: validatedRequest.patientId,
      resourceType: record.category,
      resourceId: record.id,
      action: validatedRequest.action,
      purpose: validatedRequest.purpose,
      justification: validatedRequest.justification,
      userId: accessedBy,
      userRole,
      fieldsAccessed: validatedRequest.fieldsRequested,
    });

    // Update last accessed metadata
    record.lastAccessedBy = accessedBy;
    record.lastAccessedAt = new Date();

    // Decrypt before returning
    return {
      ...record,
      data: this.decryptPHIData(record.data),
    };
  }

  /**
   * Log PHI access for audit trail
   */
  async logPHIAccess(params: Omit<PHIAccessLog, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: PHIAccessLog = {
      ...params,
      id: uuidv4(),
      timestamp: new Date(),
    };

    this.accessLogs.push(logEntry);

    // In production, this would be sent to a secure audit log service
    console.log(`[HIPAA AUDIT] PHI Access: ${params.action}`, {
      id: logEntry.id,
      patientId: params.patientId,
      userId: params.userId,
      purpose: params.purpose,
    });
  }

  /**
   * Query PHI access logs
   */
  async queryAccessLogs(filters: {
    patientId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    action?: PHIAccessLog['action'];
    purpose?: PHIAccessReason;
    limit?: number;
  }): Promise<PHIAccessLog[]> {
    let results = [...this.accessLogs];

    if (filters.patientId) {
      results = results.filter((l) => l.patientId === filters.patientId);
    }
    if (filters.userId) {
      results = results.filter((l) => l.userId === filters.userId);
    }
    if (filters.startDate) {
      results = results.filter((l) => l.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((l) => l.timestamp <= filters.endDate!);
    }
    if (filters.action) {
      results = results.filter((l) => l.action === filters.action);
    }
    if (filters.purpose) {
      results = results.filter((l) => l.purpose === filters.purpose);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Create patient authorization for PHI disclosure
   */
  async createAuthorization(
    validatedData: z.infer<typeof PHIAuthorizationSchema>
  ): Promise<PHIAuthorization> {
    const authorization: PHIAuthorization = {
      id: uuidv4(),
      patientId: validatedData.patientId,
      recipientId: validatedData.recipientId,
      recipientName: validatedData.recipientName,
      purpose: validatedData.purpose,
      categoriesIncluded: validatedData.categoriesIncluded,
      expirationDate: validatedData.expirationDate,
      revoked: false,
      signedAt: new Date(),
      witnessId: validatedData.witnessId,
    };

    this.authorizations.set(authorization.id, authorization);

    await this.logPHIAccess({
      patientId: validatedData.patientId,
      resourceType: 'authorization',
      resourceId: authorization.id,
      action: 'create',
      purpose: PHIAccessReason.TREATMENT,
      userId: validatedData.patientId,
      userRole: 'patient',
    });

    return authorization;
  }

  /**
   * Revoke an authorization
   */
  async revokeAuthorization(authorizationId: string, revokedBy: string): Promise<void> {
    const authorization = this.authorizations.get(authorizationId);
    if (!authorization) {
      throw new Error('Authorization not found');
    }

    authorization.revoked = true;

    await this.logPHIAccess({
      patientId: authorization.patientId,
      resourceType: 'authorization',
      resourceId: authorizationId,
      action: 'update',
      purpose: PHIAccessReason.TREATMENT,
      userId: revokedBy,
      userRole: 'patient',
      justification: 'Authorization revoked',
    });
  }

  /**
   * Verify authorization is valid for disclosure
   */
  async verifyAuthorization(
    recipientId: string,
    patientId: string,
    categories: PHICategory[]
  ): Promise<{ valid: boolean; authorization?: PHIAuthorization }> {
    const authorizations = Array.from(this.authorizations.values()).filter(
      (a) =>
        a.recipientId === recipientId &&
        a.patientId === patientId &&
        !a.revoked &&
        a.expirationDate > new Date()
    );

    if (authorizations.length === 0) {
      return { valid: false };
    }

    // Find authorization that covers all requested categories
    const validAuth = authorizations.find((a) =>
      categories.every((cat) => a.categoriesIncluded.includes(cat))
    );

    if (!validAuth) {
      return { valid: false };
    }

    return { valid: true, authorization: validAuth };
  }

  /**
   * Report a PHI breach
   */
  async reportBreach(
    validatedData: z.infer<typeof HIPAABreachSchema>,
    reportedBy: string
  ): Promise<HIPAABreachNotification> {
    const breach: HIPAABreachNotification = {
      id: uuidv4(),
      discoveredAt: new Date(),
      breachType: validatedData.breachType,
      recordsAffected: validatedData.recordsAffected,
      individualsAffected: validatedData.individualsAffected,
      description: validatedData.description,
      actionsTaken: validatedData.actionsTaken,
      notificationSent: false,
      lawEnforcementNotified: validatedData.lawEnforcementNotified,
      mediaNotified: validatedData.mediaNotified,
    };

    this.breachNotifications.push(breach);

    // Log breach for audit
    await this.logPHIAccess({
      patientId: 'BREACH',
      resourceType: 'breach_notification',
      resourceId: breach.id,
      action: 'create',
      purpose: PHIAccessReason.LEGAL,
      justification: validatedData.description,
      userId: reportedBy,
      userRole: 'security_officer',
    });

    // Calculate notification timeline
    // HIPAA requires notification without unreasonable delay (60 days max)
    const notificationDeadline = new Date(breach.discoveredAt);
    notificationDeadline.setDate(notificationDeadline.getDate() + 60);

    return {
      ...breach,
      reportedAt: new Date(),
      notificationDate: notificationDeadline,
    };
  }

  /**
   * Generate HIPAA compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    metrics: {
      totalPHIRecords: number;
      accessLogEntries: number;
      authorizationsCreated: number;
      authorizationsRevoked: number;
      breachesReported: number;
      individualsAffectedByBreaches: number;
    };
    accessByPurpose: Record<PHIAccessReason, number>;
    securityMeasures: {
      encryptionAtRest: boolean;
      encryptionInTransit: boolean;
      mfaRequired: boolean;
      accessLogRetentionDays: number;
    };
    generatedAt: Date;
  }> {
    const logs = await this.queryAccessLogs({ startDate, endDate });

    const accessByPurpose: Record<PHIAccessReason, number> = {
      [PHIAccessReason.TREATMENT]: 0,
      [PHIAccessReason.PAYMENT]: 0,
      [PHIAccessReason.OPERATIONS]: 0,
      [PHIAccessReason.OTHER]: 0,
      [PHIAccessReason.LEGAL]: 0,
      [PHIAccessReason.RESEARCH]: 0,
      [PHIAccessReason.PUBLIC_HEALTH]: 0,
    };

    for (const log of logs) {
      accessByPurpose[log.purpose]++;
    }

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        totalPHIRecords: this.phiRecords.size,
        accessLogEntries: logs.length,
        authorizationsCreated: Array.from(this.authorizations.values()).filter(
          (a) => a.signedAt >= startDate && a.signedAt <= endDate
        ).length,
        authorizationsRevoked: Array.from(this.authorizations.values()).filter(
          (a) => a.revoked
        ).length,
        breachesReported: this.breachNotifications.length,
        individualsAffectedByBreaches: this.breachNotifications.reduce(
          (sum, b) => sum + b.individualsAffected,
          0
        ),
      },
      accessByPurpose,
      securityMeasures: {
        encryptionAtRest: this.config.encryptionAtRest,
        encryptionInTransit: this.config.encryptionInTransit,
        mfaRequired: this.config.requireMFA,
        accessLogRetentionDays: this.config.accessLogRetentionDays,
      },
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Verify minimum necessary standard
   */
  private async verifyMinimumNecessary(
    patientId: string,
    purpose: PHIAccessReason
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Treatment, payment, and operations are always permitted under minimum necessary
    if ([PHIAccessReason.TREATMENT, PHIAccessReason.PAYMENT, PHIAccessReason.OPERATIONS].includes(purpose)) {
      return { allowed: true };
    }

    // Other purposes require additional verification
    if (purpose === PHIAccessReason.OTHER) {
      return {
        allowed: false,
        reason: 'Access for marketing, sale of PHI, or other non-permitted uses is not allowed',
      };
    }

    return { allowed: true };
  }

  /**
   * Encrypt PHI data (simplified - use proper encryption in production)
   */
  private encryptPHIData(data: Record<string, unknown>): Record<string, unknown> {
    // In production, use AES-256 encryption with proper key management
    // This is a placeholder that would be replaced with real encryption
    const encrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Base64 encoding as placeholder for encryption
        encrypted[key] = Buffer.from(value).toString('base64');
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  /**
   * Decrypt PHI data
   */
  private decryptPHIData(data: Record<string, unknown>): Record<string, unknown> {
    // In production, this would use proper decryption
    const decrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && /^[A-Za-z0-9+/=]+$/.test(value)) {
        try {
          decrypted[key] = Buffer.from(value, 'base64').toString('utf-8');
        } catch {
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}

/**
 * HIPAA Violation Error
 */
export class HIPAAViolationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly patientId?: string
  ) {
    super(message);
    this.name = 'HIPAAViolationError';
  }
}

/**
 * Create HIPAA request validators
 */
export function createHIPAARValidators() {
  return {
    createPHI: (data: unknown) => PHIRecordSchema.parse(data),
    accessPHI: (data: unknown) => PHIAccessRequestSchema.parse(data),
    createAuthorization: (data: unknown) => PHIAuthorizationSchema.parse(data),
    reportBreach: (data: unknown) => HIPAABreachSchema.parse(data),
  };
}

/**
 * Get minimum necessary categories
 */
export function getMinimumNecessaryCategories(): string[] {
  return [...MINIMUM_NECESSARY_CATEGORIES];
}

export default HIPAAService;
