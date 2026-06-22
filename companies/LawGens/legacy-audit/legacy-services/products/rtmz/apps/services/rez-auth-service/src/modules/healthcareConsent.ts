/**
 * Healthcare Consent Module for RABTUL Auth Service
 * Provides granular healthcare privacy consent management
 * Version: 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface HealthcareConsent {
  userId: string;
  recordSharing: ConsentSetting;
  aiAnalysis: ConsentSetting;
  researchParticipation: ConsentSetting;
  thirdPartySharing: ThirdPartyConsent;
  emergencyAccess: EmergencyAccessConsent;
  dataPortability: DataPortabilitySettings;
  lastUpdated: Date;
  version: number;
}

export interface ConsentSetting {
  enabled: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  scope?: ConsentScope;
}

export interface ConsentScope {
  startDate?: Date;
  endDate?: Date;
  purpose?: string[];
  providers?: string[];
}

export interface ThirdPartyConsent {
  enabled: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  allowedProviders: string[];
  restrictedCategories: string[];
  expiryDate?: Date;
}

export interface EmergencyAccessConsent {
  enabled: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  maxDurationMinutes: number;
  autoRevokeAfterAccess: boolean;
  accessLog: EmergencyAccessLogEntry[];
}

export interface EmergencyAccessLogEntry {
  accessedAt: Date;
  providerId: string;
  providerName: string;
  reason: string;
  duration: number;
  recordsAccessed: string[];
}

export interface DataPortabilitySettings {
  exportEnabled: boolean;
  exportFormats: ExportFormat[];
  lastExportDate?: Date;
  autoDeleteEnabled: boolean;
  retentionDays: number;
}

export type ExportFormat = 'json' | 'pdf' | 'csv';

export interface ConsentAuditLog {
  id: string;
  userId: string;
  action: ConsentAction;
  category: string;
  previousValue: unknown;
  newValue: unknown;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type ConsentAction =
  | 'grant'
  | 'revoke'
  | 'update_scope'
  | 'emergency_access'
  | 'export_request'
  | 'delete_request';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const ConsentScopeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  purpose: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
});

export const ThirdPartyConsentSchema = z.object({
  enabled: z.boolean(),
  grantedAt: z.date().optional(),
  revokedAt: z.date().optional(),
  allowedProviders: z.array(z.string()),
  restrictedCategories: z.array(z.string()),
  expiryDate: z.date().optional(),
});

export const EmergencyAccessConsentSchema = z.object({
  enabled: z.boolean(),
  grantedAt: z.date().optional(),
  revokedAt: z.date().optional(),
  maxDurationMinutes: z.number().min(5).max(1440),
  autoRevokeAfterAccess: z.boolean(),
  accessLog: z.array(z.object({
    accessedAt: z.date(),
    providerId: z.string(),
    providerName: z.string(),
    reason: z.string(),
    duration: z.number(),
    recordsAccessed: z.array(z.string()),
  })).optional(),
});

export const DataPortabilitySettingsSchema = z.object({
  exportEnabled: z.boolean(),
  exportFormats: z.array(z.enum(['json', 'pdf', 'csv'])),
  lastExportDate: z.date().optional(),
  autoDeleteEnabled: z.boolean(),
  retentionDays: z.number().min(30).max(3650),
});

export const HealthcareConsentSchema = z.object({
  userId: z.string().min(1),
  recordSharing: z.object({
    enabled: z.boolean(),
    grantedAt: z.date().optional(),
    revokedAt: z.date().optional(),
    scope: ConsentScopeSchema.optional(),
  }),
  aiAnalysis: z.object({
    enabled: z.boolean(),
    grantedAt: z.date().optional(),
    revokedAt: z.date().optional(),
    scope: ConsentScopeSchema.optional(),
  }),
  researchParticipation: z.object({
    enabled: z.boolean(),
    grantedAt: z.date().optional(),
    revokedAt: z.date().optional(),
    scope: ConsentScopeSchema.optional(),
  }),
  thirdPartySharing: ThirdPartyConsentSchema,
  emergencyAccess: EmergencyAccessConsentSchema,
  dataPortability: DataPortabilitySettingsSchema,
  lastUpdated: z.date(),
  version: z.number().min(1),
});

// ============================================================================
// Mock Data Store (for development)
// ============================================================================

const mockConsentStore: Map<string, HealthcareConsent> = new Map();
const mockAuditLog: ConsentAuditLog[] = [];

// ============================================================================
// Service Class
// ============================================================================

export class HealthcareConsentService {
  private readonly DEFAULT_RETENTION_DAYS = 365;
  private readonly DEFAULT_EMERGENCY_DURATION_MINUTES = 60;

  /**
   * Initialize default consent for a new user
   */
  async initializeConsent(userId: string): Promise<HealthcareConsent> {
    const consent: HealthcareConsent = {
      userId,
      recordSharing: {
        enabled: false,
        scope: {
          purpose: ['treatment', 'care_coordination'],
          providers: [],
        },
      },
      aiAnalysis: {
        enabled: false,
        scope: {
          purpose: ['diagnostic_assistance', 'treatment_recommendations'],
        },
      },
      researchParticipation: {
        enabled: false,
        scope: {
          purpose: ['medical_research', 'clinical_trials'],
        },
      },
      thirdPartySharing: {
        enabled: false,
        allowedProviders: [],
        restrictedCategories: [],
        expiryDate: undefined,
      },
      emergencyAccess: {
        enabled: true, // Default enabled for healthcare
        maxDurationMinutes: this.DEFAULT_EMERGENCY_DURATION_MINUTES,
        autoRevokeAfterAccess: true,
        accessLog: [],
      },
      dataPortability: {
        exportEnabled: true,
        exportFormats: ['json', 'pdf'],
        autoDeleteEnabled: false,
        retentionDays: this.DEFAULT_RETENTION_DAYS,
      },
      lastUpdated: new Date(),
      version: 1,
    };

    mockConsentStore.set(userId, consent);
    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'grant',
      category: 'initialization',
      previousValue: null,
      newValue: consent,
      timestamp: new Date(),
    });

    return consent;
  }

  /**
   * Grant a specific consent type
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    scope?: ConsentScope
  ): Promise<HealthcareConsent> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    const previousValue = { ...consent[consentType] };
    const now = new Date();

    (consent[consentType] as ConsentSetting) = {
      enabled: true,
      grantedAt: now,
      revokedAt: undefined,
      scope: scope || consent[consentType].scope,
    };

    consent.lastUpdated = now;
    consent.version += 1;

    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'grant',
      category: consentType,
      previousValue,
      newValue: consent[consentType],
      timestamp: now,
    });

    return consent;
  }

  /**
   * Revoke a specific consent type
   */
  async revokeConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<HealthcareConsent> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    const previousValue = { ...consent[consentType] };
    const now = new Date();

    (consent[consentType] as ConsentSetting) = {
      ...(consent[consentType] as ConsentSetting),
      enabled: false,
      revokedAt: now,
    };

    // Add revocation reason to scope if provided
    const setting = consent[consentType] as ConsentSetting;
    if (reason && setting.scope) {
      setting.scope.purpose = setting.scope.purpose?.map(p =>
        p.startsWith('revoked:') ? p : `revoked: ${reason}`
      );
    }

    consent.lastUpdated = now;
    consent.version += 1;

    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'revoke',
      category: consentType,
      previousValue,
      newValue: consent[consentType],
      timestamp: now,
    });

    return consent;
  }

  /**
   * Get current consent status for a user
   */
  async getConsentStatus(userId: string): Promise<HealthcareConsentStatusSummary> {
    const consent = await this.getConsent(userId);

    if (!consent) {
      return {
        userId,
        hasAnyConsent: false,
        consents: {
          recordSharing: false,
          aiAnalysis: false,
          researchParticipation: false,
          thirdPartySharing: false,
          emergencyAccess: true, // Always available
        },
        lastUpdated: undefined,
      };
    }

    return {
      userId,
      hasAnyConsent:
        consent.recordSharing.enabled ||
        consent.aiAnalysis.enabled ||
        consent.researchParticipation.enabled ||
        consent.thirdPartySharing.enabled,
      consents: {
        recordSharing: consent.recordSharing.enabled,
        aiAnalysis: consent.aiAnalysis.enabled,
        researchParticipation: consent.researchParticipation.enabled,
        thirdPartySharing: consent.thirdPartySharing.enabled,
        emergencyAccess: consent.emergencyAccess.enabled,
      },
      lastUpdated: consent.lastUpdated,
    };
  }

  /**
   * Update consent scope
   */
  async updateConsentScope(
    userId: string,
    consentType: ConsentType,
    newScope: ConsentScope
  ): Promise<HealthcareConsent> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    const setting = consent[consentType] as ConsentSetting;
    const previousScope = { ...setting.scope };

    setting.scope = newScope;
    consent.lastUpdated = new Date();
    consent.version += 1;

    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'update_scope',
      category: consentType,
      previousValue: previousScope,
      newValue: newScope,
      timestamp: new Date(),
    });

    return consent;
  }

  /**
   * Grant emergency access (for healthcare providers)
   */
  async grantEmergencyAccess(
    userId: string,
    providerId: string,
    providerName: string,
    reason: string,
    durationMinutes?: number
  ): Promise<EmergencyAccessResult> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    if (!consent.emergencyAccess.enabled) {
      throw new ConsentError('EMERGENCY_ACCESS_DENIED', 'Emergency access is not enabled');
    }

    const duration = durationMinutes || consent.emergencyAccess.maxDurationMinutes;
    const now = new Date();

    const accessEntry: EmergencyAccessLogEntry = {
      accessedAt: now,
      providerId,
      providerName,
      reason,
      duration,
      recordsAccessed: [], // Would be populated by actual record access
    };

    consent.emergencyAccess.accessLog.push(accessEntry);
    consent.lastUpdated = now;

    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'emergency_access',
      category: 'emergencyAccess',
      previousValue: null,
      newValue: accessEntry,
      timestamp: now,
    });

    return {
      granted: true,
      expiresAt: new Date(now.getTime() + duration * 60 * 1000),
      accessId: this.generateId(),
      recordsAvailable: [
        'emergency_contacts',
        'allergies',
        'current_medications',
        'chronic_conditions',
        'recent_vitals',
      ],
    };
  }

  /**
   * Export user health data
   */
  async exportHealthData(
    userId: string,
    format: ExportFormat
  ): Promise<ExportResult> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    if (!consent.dataPortability.exportEnabled) {
      throw new ConsentError('EXPORT_DISABLED', 'Data export is not enabled');
    }

    if (!consent.dataPortability.exportFormats.includes(format)) {
      throw new ConsentError(
        'INVALID_FORMAT',
        `Export format ${format} is not available. Available: ${consent.dataPortability.exportFormats.join(', ')}`
      );
    }

    // In production, this would fetch actual health records
    const exportData = {
      userId,
      exportedAt: new Date(),
      format,
      consents: consent,
      // Would include: records, medications, appointments, vitals, etc.
    };

    consent.dataPortability.lastExportDate = new Date();

    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'export_request',
      category: 'dataPortability',
      previousValue: null,
      newValue: { format, timestamp: new Date() },
      timestamp: new Date(),
    });

    return {
      success: true,
      downloadUrl: `/exports/${userId}/${format}/${Date.now()}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      fileSize: 1024, // Mock size in bytes
    };
  }

  /**
   * Request complete data deletion
   */
  async requestDataDeletion(
    userId: string,
    reason?: string
  ): Promise<DeletionRequestResult> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    // Log deletion request
    await this.logAudit({
      id: this.generateId(),
      userId,
      action: 'delete_request',
      category: 'dataPortability',
      previousValue: null,
      newValue: { reason, requestedAt: new Date() },
      timestamp: new Date(),
    });

    // In production, this would trigger actual data deletion workflow
    return {
      requestId: this.generateId(),
      status: 'pending',
      scheduledDeletionDate: new Date(
        Date.now() + consent.dataPortability.retentionDays * 24 * 60 * 60 * 1000
      ),
      cancellationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  /**
   * Add a third-party provider to allowed list
   */
  async addThirdPartyProvider(
    userId: string,
    providerId: string,
    providerName: string,
    categories: string[],
    expiryDays?: number
  ): Promise<HealthcareConsent> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      throw new ConsentError('CONSENT_NOT_FOUND', `Consent record not found for user ${userId}`);
    }

    if (!consent.thirdPartySharing.enabled) {
      throw new ConsentError(
        'THIRD_PARTY_DISABLED',
        'Third-party sharing is not enabled. Please enable it first.'
      );
    }

    const now = new Date();
    consent.thirdPartySharing.allowedProviders.push(providerId);
    consent.thirdPartySharing.grantedAt = now;

    if (expiryDays) {
      consent.thirdPartySharing.expiryDate = new Date(
        now.getTime() + expiryDays * 24 * 60 * 60 * 1000
      );
    }

    // Remove from restricted if present
    consent.thirdPartySharing.restrictedCategories = consent.thirdPartySharing.restrictedCategories.filter(
      c => !categories.includes(c)
    );

    consent.lastUpdated = now;
    consent.version += 1;

    return consent;
  }

  /**
   * Get consent audit log
   */
  async getConsentAuditLog(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ConsentAuditLog[]> {
    return mockAuditLog
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Validate consent for a specific action
   */
  async validateConsent(
    userId: string,
    requiredConsent: ConsentType,
    providerId?: string,
    purpose?: string
  ): Promise<ValidationResult> {
    const consent = await this.getConsent(userId);
    if (!consent) {
      return { valid: false, reason: 'CONSENT_NOT_FOUND' };
    }

    const setting = consent[requiredConsent] as ConsentSetting;

    if (!setting.enabled) {
      return { valid: false, reason: 'CONSENT_NOT_GRANTED', consentType: requiredConsent };
    }

    // Check scope validity
    if (setting.scope) {
      const now = new Date();

      // Check date range
      if (setting.scope.startDate && setting.scope.startDate > now) {
        return { valid: false, reason: 'CONSENT_NOT_YET_ACTIVE' };
      }

      if (setting.scope.endDate && setting.scope.endDate < now) {
        return { valid: false, reason: 'CONSENT_EXPIRED' };
      }

      // Check purpose
      if (purpose && setting.scope.purpose && !setting.scope.purpose.includes(purpose)) {
        return { valid: false, reason: 'PURPOSE_NOT_AUTHORIZED' };
      }

      // Check provider for third-party
      if (requiredConsent === 'thirdPartySharing' && providerId) {
        const thirdParty = consent.thirdPartySharing;
        if (!thirdParty.allowedProviders.includes(providerId)) {
          return { valid: false, reason: 'PROVIDER_NOT_AUTHORIZED' };
        }
      }
    }

    return { valid: true };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async getConsent(userId: string): Promise<HealthcareConsent | undefined> {
    // Try to get from store
    let consent = mockConsentStore.get(userId);

    // Initialize if not exists (development mode)
    if (!consent) {
      consent = await this.initializeConsent(userId);
    }

    return consent;
  }

  private async logAudit(entry: ConsentAuditLog): Promise<void> {
    mockAuditLog.push(entry);
    // In production, persist to database
  }

  private generateId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export type ConsentType =
  | 'recordSharing'
  | 'aiAnalysis'
  | 'researchParticipation'
  | 'thirdPartySharing'
  | 'emergencyAccess';

export interface HealthcareConsentStatusSummary {
  userId: string;
  hasAnyConsent: boolean;
  consents: {
    recordSharing: boolean;
    aiAnalysis: boolean;
    researchParticipation: boolean;
    thirdPartySharing: boolean;
    emergencyAccess: boolean;
  };
  lastUpdated?: Date;
}

export interface EmergencyAccessResult {
  granted: boolean;
  expiresAt: Date;
  accessId: string;
  recordsAvailable: string[];
}

export interface ExportResult {
  success: boolean;
  downloadUrl: string;
  expiresAt: Date;
  fileSize: number;
}

export interface DeletionRequestResult {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  scheduledDeletionDate: Date;
  cancellationDeadline: Date;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  consentType?: ConsentType;
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class ConsentError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ConsentError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHealthcareConsentService(): HealthcareConsentService {
  return new HealthcareConsentService();
}

// ============================================================================
// Default Export
// ============================================================================

export default HealthcareConsentService;
