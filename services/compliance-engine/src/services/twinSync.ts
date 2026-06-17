/**
 * Twin Sync Service
 * Syncs compliance data to Trust Twin service
 */

import { logger } from '../index';

export interface TwinSyncConfig {
  baseUrl: string;
  apiKey?: string;
  syncInterval: number;
  enableAutoSync: boolean;
}

export interface ComplianceTwinData {
  entityId: string;
  entityType: 'user' | 'account' | 'transaction';
  kycStatus?: string;
  amlStatus?: string;
  riskScore?: number;
  riskFactors?: string[];
  lastVerified?: string;
  nextReviewDate?: string;
  complianceFlags?: string[];
  verifiedDocuments?: string[];
  sanctionsScreening?: {
    lastScreened: string;
    status: 'clear' | 'flagged' | 'blocked';
    matchedLists: string[];
  };
  gdprStatus?: {
    consentGiven: boolean;
    lastUpdated: string;
    dataDeletionRequested: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  twinId?: string;
  syncedAt: string;
  errors: string[];
}

export interface TwinState {
  twinId: string;
  entityId: string;
  entityType: string;
  data: ComplianceTwinData;
  lastSync: Date;
  version: number;
}

export class TwinSync {
  private config: TwinSyncConfig;
  private twinStates: Map<string, TwinState>;
  private syncQueue: Array<{ entityId: string; action: 'create' | 'update' | 'delete' }>;
  private twinOsUrl: string;

  constructor(config?: Partial<TwinSyncConfig>) {
    this.twinOsUrl = config?.baseUrl || process.env.TWIN_OS_URL || 'http://localhost:4705';
    this.config = {
      baseUrl: this.twinOsUrl,
      apiKey: config?.apiKey || process.env.TWIN_OS_API_KEY,
      syncInterval: config?.syncInterval || 60000, // 1 minute default
      enableAutoSync: config?.enableAutoSync ?? true
    };

    this.twinStates = new Map();
    this.syncQueue = [];

    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Create or update compliance twin for a user
   */
  async syncComplianceTwin(userId: string, data: ComplianceTwinData): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      errors: []
    };

    try {
      const twinKey = `compliance:${userId}`;
      const existingState = this.twinStates.get(twinKey);

      // Prepare twin data
      const twinData: ComplianceTwinData = {
        entityId: userId,
        entityType: data.entityType || 'user',
        ...data
      };

      if (existingState) {
        // Update existing twin
        const updateResult = await this.updateTwin(existingState.twinId, twinData);
        if (updateResult.success) {
          existingState.data = twinData;
          existingState.lastSync = new Date();
          existingState.version++;
          result.twinId = existingState.twinId;
        } else {
          result.errors.push(...updateResult.errors);
          result.success = false;
        }
      } else {
        // Create new twin
        const createResult = await this.createTwin(twinData);
        if (createResult.success && createResult.twinId) {
          const newState: TwinState = {
            twinId: createResult.twinId,
            entityId: userId,
            entityType: twinData.entityType,
            data: twinData,
            lastSync: new Date(),
            version: 1
          };
          this.twinStates.set(twinKey, newState);
          result.twinId = createResult.twinId;
        } else {
          result.errors.push(...(createResult.errors || []));
          result.success = false;
        }
      }

      logger.info('Synced compliance twin', { userId, twinId: result.twinId, success: result.success });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.success = false;
      logger.error('Failed to sync compliance twin', { userId, error });
    }

    return result;
  }

  /**
   * Sync KYC status to twin
   */
  async syncKYCStatus(userId: string, kycId: string, status: string, riskScore?: number): Promise<SyncResult> {
    return this.syncComplianceTwin(userId, {
      entityId: userId,
      entityType: 'user',
      kycStatus: status,
      riskScore,
      lastVerified: new Date().toISOString()
    });
  }

  /**
   * Sync AML screening results to twin
   */
  async syncAMLStatus(
    userId: string,
    screeningResult: {
      status: 'clear' | 'flagged' | 'blocked';
      riskScore: number;
      matchedLists: string[];
    }
  ): Promise<SyncResult> {
    return this.syncComplianceTwin(userId, {
      entityId: userId,
      entityType: 'user',
      amlStatus: screeningResult.status,
      riskScore: screeningResult.riskScore,
      sanctionsScreening: {
        lastScreened: new Date().toISOString(),
        status: screeningResult.status,
        matchedLists: screeningResult.matchedLists
      }
    });
  }

  /**
   * Sync GDPR compliance status to twin
   */
  async syncGDPRStatus(
    userId: string,
    gdprStatus: {
      consentGiven: boolean;
      dataDeletionRequested?: boolean;
      dataPortabilityRequested?: boolean;
    }
  ): Promise<SyncResult> {
    return this.syncComplianceTwin(userId, {
      entityId: userId,
      entityType: 'user',
      gdprStatus: {
        ...gdprStatus,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  /**
   * Add compliance flag to twin
   */
  async addComplianceFlag(userId: string, flag: string): Promise<SyncResult> {
    const twinKey = `compliance:${userId}`;
    const existingState = this.twinStates.get(twinKey);

    if (!existingState) {
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        errors: ['Twin not found for user']
      };
    }

    const currentFlags = existingState.data.complianceFlags || [];
    if (!currentFlags.includes(flag)) {
      currentFlags.push(flag);
      existingState.data.complianceFlags = currentFlags;
    }

    return this.syncComplianceTwin(userId, existingState.data);
  }

  /**
   * Remove compliance flag from twin
   */
  async removeComplianceFlag(userId: string, flag: string): Promise<SyncResult> {
    const twinKey = `compliance:${userId}`;
    const existingState = this.twinStates.get(twinKey);

    if (!existingState) {
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        errors: ['Twin not found for user']
      };
    }

    const currentFlags = existingState.data.complianceFlags || [];
    existingState.data.complianceFlags = currentFlags.filter(f => f !== flag);

    return this.syncComplianceTwin(userId, existingState.data);
  }

  /**
   * Get compliance twin for an entity
   */
  async getComplianceTwin(entityId: string): Promise<TwinState | null> {
    const twinKey = `compliance:${entityId}`;
    return this.twinStates.get(twinKey) || null;
  }

  /**
   * Delete compliance twin
   */
  async deleteComplianceTwin(entityId: string): Promise<SyncResult> {
    const twinKey = `compliance:${entityId}`;
    const existingState = this.twinStates.get(twinKey);

    if (!existingState) {
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        errors: ['Twin not found']
      };
    }

    try {
      // In production, call TwinOS API to delete
      await this.deleteTwin(existingState.twinId);
      this.twinStates.delete(twinKey);

      logger.info('Deleted compliance twin', { entityId, twinId: existingState.twinId });

      return {
        success: true,
        twinId: existingState.twinId,
        syncedAt: new Date().toISOString(),
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  }

  /**
   * Queue entity for sync
   */
  queueSync(entityId: string, action: 'create' | 'update' | 'delete'): void {
    // Remove existing queue entry for same entity
    this.syncQueue = this.syncQueue.filter(entry => entry.entityId !== entityId);
    this.syncQueue.push({ entityId, action });
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    while (this.syncQueue.length > 0) {
      const entry = this.syncQueue.shift();
      if (!entry) continue;

      const twinKey = `compliance:${entry.entityId}`;
      const existingState = this.twinStates.get(twinKey);

      if (entry.action === 'delete') {
        results.push(await this.deleteComplianceTwin(entry.entityId));
      } else if (existingState) {
        results.push(await this.syncComplianceTwin(entry.entityId, existingState.data));
      }
    }

    return results;
  }

  /**
   * Get all synced compliance twins
   */
  getAllTwins(): TwinState[] {
    return Array.from(this.twinStates.values());
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalTwins: number;
    queueLength: number;
    lastSyncTime: Date | null;
    byEntityType: Record<string, number>;
  } {
    const byEntityType: Record<string, number> = {};
    let lastSyncTime: Date | null = null;

    this.twinStates.forEach(state => {
      byEntityType[state.entityType] = (byEntityType[state.entityType] || 0) + 1;
      if (!lastSyncTime || state.lastSync > lastSyncTime) {
        lastSyncTime = state.lastSync;
      }
    });

    return {
      totalTwins: this.twinStates.size,
      queueLength: this.syncQueue.length,
      lastSyncTime,
      byEntityType
    };
  }

  /**
   * Create twin via TwinOS API
   */
  private async createTwin(data: ComplianceTwinData): Promise<{ success: boolean; twinId?: string; errors?: string[] }> {
    try {
      // In production, call TwinOS API
      logger.debug('Creating twin', { data });
      const twinId = `TWIN-COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return { success: true, twinId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  /**
   * Update twin via TwinOS API
   */
  private async updateTwin(twinId: string, data: ComplianceTwinData): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // In production, call TwinOS API
      logger.debug('Updating twin', { twinId, data });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  /**
   * Delete twin via TwinOS API
   */
  private async deleteTwin(twinId: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // In production, call TwinOS API
      logger.debug('Deleting twin', { twinId });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }

  /**
   * Start auto-sync process
   */
  private startAutoSync(): void {
    setInterval(async () => {
      if (this.syncQueue.length > 0) {
        logger.debug('Processing auto-sync queue', { queueLength: this.syncQueue.length });
        await this.processSyncQueue();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync process
   */
  stopAutoSync(): void {
    // In production, clear the interval
    this.syncQueue = [];
  }
}

export const twinSync = new TwinSync();
