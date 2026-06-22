/**
 * HOJAI Compliance - Enterprise Compliance Framework
 *
 * Provides compliance features including GDPR, HIPAA, SOC2 controls,
 * and consent management for enterprise deployments.
 *
 * @module @hojai/compliance
 * @version 1.0.0
 */

import { z } from 'zod';

// Re-export schemas
export * from './gdpr';
export * from './hipaa';
export * from './consent';
export * from './soc2';
export * from './ccpa';
export * from './pipl';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Data categories for compliance
 */
export enum DataCategory {
  PERSONAL = 'personal',
  SENSITIVE = 'sensitive',
  HEALTH = 'health',
  FINANCIAL = 'financial',
  EDUCATIONAL = 'educational',
  BIOMETRIC = 'biometric',
  GENETIC = 'genetic',
  CHILDREN = 'children',
}

/**
 * Compliance frameworks supported
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOC2 = 'soc2',
  CCPA = 'ccpa',
  PIPL = 'pipl',
}

/**
 * Processing basis for data
 */
export enum ProcessingBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string;
  actorId?: string;
  actorType: 'user' | 'system' | 'admin';
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  complianceFramework?: ComplianceFramework;
}

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  /** Enable GDPR compliance */
  gdprEnabled?: boolean;
  /** Enable HIPAA compliance */
  hipaaEnabled?: boolean;
  /** Enable SOC2 controls */
  soc2Enabled?: boolean;
  /** Data retention period in days */
  retentionDays?: number;
  /** Encryption at rest enabled */
  encryptionAtRest?: boolean;
  /** Encryption in transit enabled */
  encryptionInTransit?: boolean;
  /** Audit log retention in days */
  auditLogRetentionDays?: number;
  /** List of authorized data processors */
  authorizedProcessors?: string[];
  /** DPO contact email */
  dpoEmail?: string;
  /** Privacy officer contact email */
  privacyOfficerEmail?: string;
}

/**
 * Default compliance configuration
 */
const DEFAULT_CONFIG: Required<ComplianceConfig> = {
  gdprEnabled: true,
  hipaaEnabled: false,
  soc2Enabled: false,
  retentionDays: 365,
  encryptionAtRest: true,
  encryptionInTransit: true,
  auditLogRetentionDays: 2555, // 7 years
  authorizedProcessors: [],
  dpoEmail: 'dpo@hojai.ai',
  privacyOfficerEmail: 'privacy@hojai.ai',
};

/**
 * HOJAI Compliance Manager
 *
 * Central manager for all compliance operations.
 *
 * @example
 * ```typescript
 * import { ComplianceManager } from '@hojai/compliance';
 *
 * const compliance = new ComplianceManager({
 *   gdprEnabled: true,
 *   hipaaEnabled: true,
 *   retentionDays: 365,
 * });
 *
 * // Check if user can be deleted
 * const canDelete = await compliance.canDeleteUser(userId);
 *
 * // Delete user data
 * if (canDelete.allowed) {
 *   await compliance.deleteUserData(userId, { cascade: true });
 * }
 * ```
 */
export class ComplianceManager {
  private config: Required<ComplianceConfig>;
  private auditLogs: AuditLogEntry[] = [];

  constructor(config: ComplianceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ComplianceConfig>> {
    return { ...this.config };
  }

  /**
   * Check if a compliance framework is enabled
   */
  isFrameworkEnabled(framework: ComplianceFramework): boolean {
    switch (framework) {
      case ComplianceFramework.GDPR:
        return this.config.gdprEnabled;
      case ComplianceFramework.HIPAA:
        return this.config.hipaaEnabled;
      case ComplianceFramework.SOC2:
        return this.config.soc2Enabled;
      default:
        return false;
    }
  }

  /**
   * Record an audit log entry
   */
  async logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.auditLogs.push(fullEntry);

    // In production, this would be sent to a secure audit log service
    console.log(`[AUDIT] ${fullEntry.timestamp.toISOString()} - ${fullEntry.action}`, {
      id: fullEntry.id,
      actorId: fullEntry.actorId,
      resource: fullEntry.resource,
      resourceId: fullEntry.resourceId,
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    userId?: string;
    actorId?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let results = [...this.auditLogs];

    if (filters.startDate) {
      results = results.filter((e) => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((e) => e.timestamp <= filters.endDate!);
    }
    if (filters.action) {
      results = results.filter((e) => e.action === filters.action);
    }
    if (filters.userId) {
      results = results.filter(
        (e) => e.userId === filters.userId || e.actorId === filters.userId
      );
    }
    if (filters.actorId) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get compliance report for a user
   */
  async getUserComplianceReport(userId: string): Promise<{
    gdpr: {
      consentGiven: boolean;
      dataExported: boolean;
      deletionRequested: boolean;
      deletionCompleted: boolean;
    };
    hipaa?: {
      phiAccessLog: number;
      authorizationOnFile: boolean;
    };
    dataRetention: {
      dataStored: string[];
      retentionExpiresAt?: Date;
    };
  }> {
    // In production, this would query actual data stores
    return {
      gdpr: {
        consentGiven: true,
        dataExported: false,
        deletionRequested: false,
        deletionCompleted: false,
      },
      ...(this.config.hipaaEnabled && {
        hipaa: {
          phiAccessLog: 0,
          authorizationOnFile: false,
        },
      }),
      dataRetention: {
        dataStored: ['profile', 'conversations', 'memory'],
        retentionExpiresAt: new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      },
    };
  }

  /**
   * Check if data processing is permitted
   */
  async checkProcessingPermitted(params: {
    userId: string;
    dataCategory: DataCategory;
    purpose: string;
    basis: ProcessingBasis;
  }): Promise<{
    permitted: boolean;
    reason?: string;
    requiresConsent?: boolean;
  }> {
    // Check if framework is enabled
    if (params.dataCategory === DataCategory.HEALTH && !this.config.hipaaEnabled) {
      return {
        permitted: false,
        reason: 'HIPAA framework not enabled for health data processing',
      };
    }

    // Check consent requirements
    if (params.basis === ProcessingBasis.CONSENT) {
      // In production, check actual consent records
      return {
        permitted: true,
        requiresConsent: true,
      };
    }

    return { permitted: true };
  }

  /**
   * Generate compliance documentation
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    frameworks: ComplianceFramework[];
    metrics: {
      totalDataSubjects: number;
      consentWithdrawals: number;
      deletionRequests: number;
      dataBreaches: number;
      accessRequests: number;
    };
    auditLogCount: number;
    generatedAt: Date;
  }> {
    const logs = await this.queryAuditLogs({ startDate, endDate });

    const frameworks: ComplianceFramework[] = [];
    if (this.config.gdprEnabled) frameworks.push(ComplianceFramework.GDPR);
    if (this.config.hipaaEnabled) frameworks.push(ComplianceFramework.HIPAA);
    if (this.config.soc2Enabled) frameworks.push(ComplianceFramework.SOC2);

    return {
      period: { start: startDate, end: endDate },
      frameworks,
      metrics: {
        totalDataSubjects: 0, // Would be calculated from actual data
        consentWithdrawals: logs.filter((l) => l.action === 'CONSENT_WITHDRAWN').length,
        deletionRequests: logs.filter((l) => l.action === 'DATA_DELETION_REQUESTED').length,
        dataBreaches: logs.filter((l) => l.action === 'DATA_BREACH').length,
        accessRequests: logs.filter((l) => l.action === 'DATA_ACCESS_REQUESTED').length,
      },
      auditLogCount: logs.length,
      generatedAt: new Date(),
    };
  }
}

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for data access request
 */
export const DataAccessRequestSchema = z.object({
  userId: z.string().min(1),
  requestType: z.enum(['access', 'portability', 'rectification', 'erasure', 'restriction']),
  requestedAt: z.date().default(() => new Date()),
  reason: z.string().optional(),
});

/**
 * Schema for consent record
 */
export const ConsentRecordSchema = z.object({
  userId: z.string().min(1),
  consentType: z.string().min(1),
  granted: z.boolean(),
  grantedAt: z.date(),
  withdrawnAt: z.date().optional(),
  method: z.enum(['explicit', 'implicit', 'checkbox', 'banner']),
  version: z.string().optional(),
});

/**
 * Schema for deletion request
 */
export const DeletionRequestSchema = z.object({
  userId: z.string().min(1),
  cascade: z.boolean().default(true),
  reason: z.string().optional(),
  requestedAt: z.date().default(() => new Date()),
  legalBasis: z.enum(['user_request', 'retention_expired', 'legal_obligation']).default('user_request'),
});

/**
 * Schema for audit log entry
 */
export const AuditLogEntrySchema = z.object({
  action: z.string().min(1),
  actorType: z.enum(['user', 'system', 'admin']),
  userId: z.string().optional(),
  actorId: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  complianceFramework: z.nativeEnum(ComplianceFramework).optional(),
});

/**
 * Schema for data portability export
 */
export const DataPortabilitySchema = z.object({
  userId: z.string().min(1),
  format: z.enum(['json', 'csv', 'jsonld']).default('json'),
  includeTypes: z.array(z.string()).default(['profile', 'conversations', 'memory']),
  includeDeleted: z.boolean().default(false),
});

/**
 * Schema for privacy impact assessment
 */
export const PrivacyImpactAssessmentSchema = z.object({
  projectName: z.string().min(1),
  description: z.string().min(1),
  dataTypes: z.array(z.nativeEnum(DataCategory)),
  dataSubjects: z.number().min(1),
  processingPurpose: z.string().min(1),
  legalBasis: z.nativeEnum(ProcessingBasis),
  dataTransfers: z.boolean(),
  processors: z.array(z.string()),
  risks: z.array(z.object({
    description: z.string(),
    likelihood: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
  })),
  mitigations: z.array(z.string()),
  assessedAt: z.date().default(() => new Date()),
  assessor: z.string(),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize data for logging (remove PII)
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'ssn', 'creditCard'];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Check if a string contains potential PII
 */
export function containsPII(text: string): boolean {
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{9}\b/, // Passport
    /\b[A-Z]{2}\d{7}\b/, // National ID
    /\b\d{16}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{10,}\b/, // Phone number
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Generate a data processing agreement (DPA) summary
 */
export function generateDPASummary(config: ComplianceConfig): {
  controller: string;
  processor: string;
  subject: string;
  duration: string;
  dataCategories: DataCategory[];
  processingActivities: string[];
  safeguards: string[];
} {
  return {
    controller: 'HOJAI AI',
    processor: config.authorizedProcessors?.join(', ') || 'None specified',
    subject: 'AI Services Data Processing',
    duration: `${config.retentionDays || 365} days`,
    dataCategories: [DataCategory.PERSONAL, DataCategory.SENSITIVE],
    processingActivities: [
      'AI model inference',
      'Conversation storage',
      'Memory and context management',
      'Analytics and improvement',
    ],
    safeguards: [
      config.encryptionAtRest ? 'Encryption at rest' : 'No encryption at rest',
      config.encryptionInTransit ? 'Encryption in transit (TLS)' : 'No encryption in transit',
      `Audit log retention: ${config.auditLogRetentionDays || 2555} days`,
    ],
  };
}

export default ComplianceManager;


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-compliance',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
