/**
 * GDPR Compliance Module
 *
 * Implements the General Data Protection Regulation requirements including:
 * - Right to access (Article 15)
 * - Right to rectification (Article 16)
 * - Right to erasure (Article 17)
 * - Right to data portability (Article 20)
 * - Consent management (Article 7)
 *
 * @module hojai-compliance/gdpr
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * GDPR Data subject request
 */
export interface GDPRRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  fulfilledBy?: Date;
  rejectionReason?: string;
  legalBasis?: string;
}

/**
 * Data export package (right to access)
 */
export interface GDPRExportPackage {
  requestId: string;
  userId: string;
  exportedAt: Date;
  expiresAt: Date;
  data: {
    profile: Record<string, unknown>;
    conversations: Array<{
      id: string;
      messages: Array<{
        role: string;
        content: string;
        timestamp: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
    memory: Array<{
      id: string;
      type: string;
      content: string;
      createdAt: string;
      accessedAt: string;
    }>;
    preferences: Record<string, unknown>;
    consentHistory: Array<{
      type: string;
      granted: boolean;
      timestamp: string;
      method: string;
    }>;
  };
  metadata: {
    totalRecords: number;
    approximateSizeKb: number;
    formats: string[];
  };
}

/**
 * Deletion receipt (right to be forgotten)
 */
export interface GDPRDeletionReceipt {
  requestId: string;
  userId: string;
  deletedAt: Date;
  itemsDeleted: Array<{
    service: string;
    category: string;
    recordsDeleted: number;
    status: 'deleted' | 'retained' | 'pending';
    reason?: string;
  }>;
  itemsRetained: Array<{
    service: string;
    category: string;
    recordsRetained: number;
    reason: string;
    legalBasis: string;
    retentionExpiresAt: Date;
  }>;
  totalRecordsDeleted: number;
  verificationHash: string;
}

/**
 * Data portability format
 */
export interface GDPRDataPortability {
  userId: string;
  format: 'json' | 'jsonld' | 'csv';
  generatedAt: Date;
  data: unknown;
  schemaVersion: string;
}

/**
 * Service deletion status callback
 */
export interface ServiceDeletionResult {
  service: string;
  success: boolean;
  recordsDeleted: number;
  error?: string;
  retainedRecords?: Array<{
    reason: string;
    legalBasis: string;
    retentionPeriod: string;
  }>;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for GDPR access request validation
 */
export const GDPRAccessRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.literal('access'),
  includeConversations: z.boolean().default(true),
  includeMemory: z.boolean().default(true),
  includePreferences: z.boolean().default(true),
  includeConsentHistory: z.boolean().default(true),
  format: z.enum(['json', 'jsonld']).default('json'),
  includeMetadata: z.boolean().default(true),
});

/**
 * Schema for GDPR deletion request validation
 */
export const GDPRDeletionRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.literal('erasure'),
  cascade: z.boolean().default(true),
  hardDelete: z.boolean().default(false),
  reason: z.string().optional(),
  legalBasis: z.enum(['user_request', 'consent_withdrawn', 'contract_fulfilled']).default('user_request'),
  confirmIdentity: z.boolean().refine((val) => val === true, {
    message: 'Identity confirmation is required for deletion',
  }),
});

/**
 * Schema for GDPR portability request validation
 */
export const GDPRPortabilityRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.literal('portability'),
  format: z.enum(['json', 'jsonld', 'csv']).default('json'),
  includeConversations: z.boolean().default(true),
  includeMemory: z.boolean().default(true),
  includeProfile: z.boolean().default(true),
});

/**
 * Schema for rectification request
 */
export const GDPRRectificationRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.literal('rectification'),
  corrections: z.array(z.object({
    field: z.string().min(1),
    currentValue: z.unknown(),
    newValue: z.unknown(),
    reason: z.string().optional(),
  })).min(1, 'At least one correction is required'),
  provideEvidence: z.boolean().default(false),
  evidenceUrls: z.array(z.string().url()).optional(),
});

/**
 * Schema for restriction request
 */
export const GDPRRestrictionRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.literal('restriction'),
  restrictionType: z.enum(['block_processing', 'limit_access', 'mark_for_deletion']),
  reason: z.string().min(1, 'Reason is required for restriction'),
  duration: z.enum(['temporary', 'until_rectified', 'indefinite']).default('until_rectified'),
  affectedServices: z.array(z.string()).optional(),
});

// ============================================================================
// GDPR Service
// ============================================================================

/**
 * Configuration for GDPR service
 */
export interface GDPRServiceConfig {
  /** List of services that hold user data */
  services: Array<{
    name: string;
    endpoint?: string;
    deleteEndpoint?: string;
    retentionDays?: number;
    requiresLegalBasis?: boolean;
  }>;
  /** Export package expiration in hours */
  exportExpirationHours?: number;
  /** Enable cascade deletion */
  cascadeEnabled?: boolean;
  /** Retention exceptions for legal requirements */
  retentionExceptions?: Array<{
    reason: string;
    legalBasis: string;
    maxRetentionDays: number;
  }>;
}

/**
 * Default GDPR service configuration
 */
const DEFAULT_CONFIG: Required<GDPRServiceConfig> = {
  services: [
    { name: 'user-service', retentionDays: 365 },
    { name: 'conversation-service', retentionDays: 365 },
    { name: 'memory-service', retentionDays: 365 },
    { name: 'agent-service', retentionDays: 365 },
    { name: 'vector-store', retentionDays: 365 },
    { name: 'analytics-service', retentionDays: 730 },
  ],
  exportExpirationHours: 72,
  cascadeEnabled: true,
  retentionExceptions: [],
};

/**
 * GDPR Service
 *
 * Handles all GDPR-related data subject requests.
 *
 * @example
 * ```typescript
 * const gdpr = new GDPRService({
 *   services: [
 *     { name: 'user-service', endpoint: 'http://users:3001' },
 *     { name: 'conversation-service', endpoint: 'http://convo:3002' },
 *   ],
 * });
 *
 * // Handle deletion request
 * const receipt = await gdpr.deleteUserData(userId, { cascade: true });
 * console.log(`Deleted ${receipt.totalRecordsDeleted} records`);
 * ```
 */
export class GDPRService {
  private config: Required<GDPRServiceConfig>;
  private requests: Map<string, GDPRRequest> = new Map();

  constructor(config: GDPRServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the service configuration
   */
  getConfig(): Readonly<Required<GDPRServiceConfig>> {
    return { ...this.config };
  }

  /**
   * Process a data access request (Article 15)
   *
   * Collects all data associated with a user from all services
   * and compiles it into an export package.
   */
  async processAccessRequest(
    validatedRequest: z.infer<typeof GDPRAccessRequestSchema>
  ): Promise<GDPRExportPackage> {
    const requestId = uuidv4();
    const userId = validatedRequest.userId;

    // Create request record
    const request: GDPRRequest = {
      id: requestId,
      userId,
      type: 'access',
      status: 'processing',
      requestedAt: new Date(),
    };
    this.requests.set(requestId, request);

    try {
      // Collect data from all services in parallel
      const [profile, conversations, memory, preferences, consentHistory] = await Promise.all([
        validatedRequest.includePreferences ? this.fetchUserProfile(userId) : {},
        validatedRequest.includeConversations ? this.fetchUserConversations(userId) : [],
        validatedRequest.includeMemory ? this.fetchUserMemory(userId) : [],
        validatedRequest.includePreferences ? this.fetchUserPreferences(userId) : {},
        validatedRequest.includeConsentHistory ? this.fetchConsentHistory(userId) : [],
      ]);

      const exportData: GDPRExportPackage['data'] = {
        profile,
        conversations,
        memory,
        preferences,
        consentHistory,
      };

      // Calculate approximate size
      const dataSize = JSON.stringify(exportData).length;
      const approximateSizeKb = Math.ceil(dataSize / 1024);

      // Update request status
      request.status = 'completed';
      request.completedAt = new Date();

      return {
        requestId,
        userId,
        exportedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.exportExpirationHours * 60 * 60 * 1000),
        data: exportData,
        metadata: {
          totalRecords:
            (Array.isArray(conversations) ? conversations.length : 0) +
            (Array.isArray(memory) ? memory.length : 0) +
            1, // profile
          approximateSizeKb,
          formats: ['json', 'jsonld'],
        },
      };
    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Process data deletion request (Article 17 - Right to be Forgotten)
   *
   * Deletes user data from all services with cascade option.
   * Some data may be retained if legally required.
   */
  async deleteUserData(
    validatedRequest: z.infer<typeof GDPRDeletionRequestSchema>
  ): Promise<GDPRDeletionReceipt> {
    const requestId = uuidv4();
    const userId = validatedRequest.userId;

    // Create request record
    const request: GDPRRequest = {
      id: requestId,
      userId,
      type: 'erasure',
      status: 'processing',
      requestedAt: new Date(),
      legalBasis: validatedRequest.legalBasis,
    };
    this.requests.set(requestId, request);

    const itemsDeleted: GDPRDeletionReceipt['itemsDeleted'] = [];
    const itemsRetained: GDPRDeletionReceipt['itemsRetained'] = [];
    let totalRecordsDeleted = 0;

    // Delete from all services
    const deletionPromises = this.config.services.map(async (service) => {
      try {
        const result = await this.deleteFromService(userId, service, validatedRequest.cascade);

        if (result.success) {
          itemsDeleted.push({
            service: service.name,
            category: this.categorizeServiceData(service.name),
            recordsDeleted: result.recordsDeleted,
            status: 'deleted',
          });
          totalRecordsDeleted += result.recordsDeleted;
        } else if (result.retainedRecords && result.retainedRecords.length > 0) {
          // Some records were retained due to legal requirements
          for (const retained of result.retainedRecords) {
            itemsRetained.push({
              service: service.name,
              category: this.categorizeServiceData(service.name),
              recordsRetained: 1,
              reason: retained.reason,
              legalBasis: retained.legalBasis,
              retentionExpiresAt: new Date(
                Date.now() + (retained.retentionPeriod ? parseInt(retained.retentionPeriod) * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)
              ),
            });
          }
          itemsDeleted.push({
            service: service.name,
            category: this.categorizeServiceData(service.name),
            recordsDeleted: result.recordsDeleted,
            status: 'retained',
            reason: 'Partial deletion - some records retained per legal requirement',
          });
        }
      } catch (error) {
        itemsDeleted.push({
          service: service.name,
          category: this.categorizeServiceData(service.name),
          recordsDeleted: 0,
          status: 'pending',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(deletionPromises);

    // Update request status
    request.status = 'completed';
    request.completedAt = new Date();

    // Generate verification hash
    const verificationHash = await this.generateDeletionHash(requestId, userId, itemsDeleted);

    return {
      requestId,
      userId,
      deletedAt: new Date(),
      itemsDeleted,
      itemsRetained,
      totalRecordsDeleted,
      verificationHash,
    };
  }

  /**
   * Process data portability request (Article 20)
   */
  async processPortabilityRequest(
    validatedRequest: z.infer<typeof GDPRPortabilityRequestSchema>
  ): Promise<GDPRDataPortability> {
    const userId = validatedRequest.userId;

    // Fetch requested data
    const data: Record<string, unknown> = {};

    if (validatedRequest.includeProfile) {
      data.profile = await this.fetchUserProfile(userId);
    }
    if (validatedRequest.includeConversations) {
      data.conversations = await this.fetchUserConversations(userId);
    }
    if (validatedRequest.includeMemory) {
      data.memory = await this.fetchUserMemory(userId);
    }

    // Format according to requested format
    if (validatedRequest.format === 'jsonld') {
      return this.formatAsJSONLD(userId, data);
    } else if (validatedRequest.format === 'csv') {
      return this.formatAsCSV(userId, data);
    }

    return {
      userId,
      format: 'json',
      generatedAt: new Date(),
      data,
      schemaVersion: '1.0',
    };
  }

  /**
   * Process rectification request (Article 16)
   */
  async processRectification(
    validatedRequest: z.infer<typeof GDPRRectificationRequestSchema>
  ): Promise<{
    requestId: string;
    correctionsApplied: number;
    corrections: Array<{
      field: string;
      previousValue: unknown;
      newValue: unknown;
    }>;
    timestamp: Date;
  }> {
    const requestId = uuidv4();
    const corrections: Array<{
      field: string;
      previousValue: unknown;
      newValue: unknown;
    }> = [];

    // Apply corrections to user profile
    for (const correction of validatedRequest.corrections) {
      const previousValue = await this.getUserField(validatedRequest.userId, correction.field);
      await this.setUserField(validatedRequest.userId, correction.field, correction.newValue);
      corrections.push({
        field: correction.field,
        previousValue,
        newValue: correction.newValue,
      });
    }

    return {
      requestId,
      correctionsApplied: corrections.length,
      corrections,
      timestamp: new Date(),
    };
  }

  /**
   * Process restriction request (Article 18)
   */
  async processRestriction(
    validatedRequest: z.infer<typeof GDPRRestrictionRequestSchema>
  ): Promise<{
    requestId: string;
    restrictionType: string;
    status: 'active';
    activatedAt: Date;
    expiresAt?: Date;
    affectedServices: string[];
  }> {
    const requestId = uuidv4();

    const affectedServices = validatedRequest.affectedServices ||
      this.config.services.map(s => s.name);

    // Apply restriction to services
    await Promise.all(
      affectedServices.map(service =>
        this.applyRestriction(validatedRequest.userId, service, validatedRequest.restrictionType)
      )
    );

    return {
      requestId,
      restrictionType: validatedRequest.restrictionType,
      status: 'active',
      activatedAt: new Date(),
      expiresAt: validatedRequest.duration === 'temporary'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : undefined,
      affectedServices,
    };
  }

  /**
   * Get status of a GDPR request
   */
  async getRequestStatus(requestId: string): Promise<GDPRRequest | null> {
    return this.requests.get(requestId) || null;
  }

  /**
   * List all GDPR requests for a user
   */
  async listUserRequests(userId: string): Promise<GDPRRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.userId === userId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Fetch user profile from user service
   */
  private async fetchUserProfile(userId: string): Promise<Record<string, unknown>> {
    // In production, this would call the actual user service
    return {
      id: userId,
      email: 'user@example.com',
      name: 'User Name',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch user conversations
   */
  private async fetchUserConversations(userId: string): Promise<Array<unknown>> {
    // In production, this would call the conversation service
    return [];
  }

  /**
   * Fetch user memory data
   */
  private async fetchUserMemory(userId: string): Promise<Array<unknown>> {
    // In production, this would call the memory service
    return [];
  }

  /**
   * Fetch user preferences
   */
  private async fetchUserPreferences(userId: string): Promise<Record<string, unknown>> {
    // In production, this would call the preferences service
    return {};
  }

  /**
   * Fetch consent history
   */
  private async fetchConsentHistory(userId: string): Promise<Array<unknown>> {
    // In production, this would call the consent service
    return [];
  }

  /**
   * Delete user data from a specific service
   */
  private async deleteFromService(
    userId: string,
    service: { name: string; endpoint?: string },
    cascade: boolean
  ): Promise<ServiceDeletionResult> {
    // Check for retention exceptions
    const retentionException = this.config.retentionExceptions?.find(
      (exc) => exc.reason === 'legal_requirement'
    );

    if (retentionException) {
      return {
        service: service.name,
        success: false,
        recordsDeleted: 0,
        retainedRecords: [{
          reason: retentionException.reason,
          legalBasis: retentionException.legalBasis,
          retentionPeriod: `${retentionException.maxRetentionDays} days`,
        }],
      };
    }

    // In production, this would call the actual service endpoint
    // Example:
    // if (service.endpoint) {
    //   const response = await fetch(`${service.endpoint}/users/${userId}`, {
    //     method: 'DELETE',
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    //   return await response.json();
    // }

    return {
      service: service.name,
      success: true,
      recordsDeleted: Math.floor(Math.random() * 100), // Mock
    };
  }

  /**
   * Categorize data stored by a service
   */
  private categorizeServiceData(serviceName: string): string {
    const categories: Record<string, string> = {
      'user-service': 'Account Data',
      'conversation-service': 'Communication Data',
      'memory-service': 'Personal Memory Data',
      'agent-service': 'AI Interaction Data',
      'vector-store': 'Embedding Data',
      'analytics-service': 'Usage Analytics',
    };
    return categories[serviceName] || 'General Data';
  }

  /**
   * Format data as JSON-LD
   */
  private formatAsJSONLD(userId: string, data: Record<string, unknown>): GDPRDataPortability {
    return {
      userId,
      format: 'jsonld',
      generatedAt: new Date(),
      data: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        identifier: userId,
        ...data,
      },
      schemaVersion: '1.0',
    };
  }

  /**
   * Format data as CSV (flattened)
   */
  private formatAsCSV(userId: string, data: Record<string, unknown>): GDPRDataPortability {
    // Convert nested data to CSV-compatible format
    const flattenedData: Record<string, string> = {
      userId,
      profile: JSON.stringify(data.profile || {}),
      conversations: JSON.stringify(data.conversations || []),
      memory: JSON.stringify(data.memory || []),
      exportedAt: new Date().toISOString(),
    };

    return {
      userId,
      format: 'csv',
      generatedAt: new Date(),
      data: flattenedData as unknown,
      schemaVersion: '1.0',
    };
  }

  /**
   * Get a specific field from user profile
   */
  private async getUserField(userId: string, field: string): Promise<unknown> {
    // In production, this would query the user service
    return null;
  }

  /**
   * Set a specific field in user profile
   */
  private async setUserField(userId: string, field: string, value: unknown): Promise<void> {
    // In production, this would update the user service
  }

  /**
   * Apply restriction to a service
   */
  private async applyRestriction(
    userId: string,
    service: string,
    restrictionType: string
  ): Promise<void> {
    // In production, this would call the service to apply restriction
  }

  /**
   * Generate verification hash for deletion receipt
   */
  private async generateDeletionHash(
    requestId: string,
    userId: string,
    items: Array<{ service: string; recordsDeleted: number }>
  ): Promise<string> {
    const data = JSON.stringify({ requestId, userId, items, timestamp: new Date().toISOString() });
    // Simple hash for demonstration - use crypto.subtle.digest in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `GDPR-${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }
}

/**
 * Create a GDPR request validator for Express/HTTP handlers
 */
export function createGDPRValidator() {
  return {
    access: (data: unknown) => GDPRAccessRequestSchema.parse(data),
    deletion: (data: unknown) => GDPRDeletionRequestSchema.parse(data),
    portability: (data: unknown) => GDPRPortabilityRequestSchema.parse(data),
    rectification: (data: unknown) => GDPRRectificationRequestSchema.parse(data),
    restriction: (data: unknown) => GDPRRestrictionRequestSchema.parse(data),
  };
}

export default GDPRService;
