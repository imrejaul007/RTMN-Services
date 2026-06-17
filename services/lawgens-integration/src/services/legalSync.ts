import winston from 'winston';
import { Contract, ComplianceItem, LegalDocument, ContractMilestone } from '../models/LegalProfile';

interface SyncConfig {
  knowledgeTwinUrl?: string;
  journeyTwinUrl?: string;
  industryTwinUrl?: string;
  syncInterval?: number;
  batchSize?: number;
}

interface TwinSyncResult {
  success: boolean;
  twin: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  error?: string;
}

export class LegalSyncService {
  private logger: winston.Logger;
  private config: SyncConfig;
  private syncHistory: TwinSyncResult[] = [];
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger, config?: SyncConfig) {
    this.logger = logger;
    this.config = {
      knowledgeTwinUrl: process.env.KNOWLEDGE_TWIN_URL || 'http://localhost:4705',
      journeyTwinUrl: process.env.JOURNEY_TWIN_URL || 'http://localhost:3016',
      industryTwinUrl: process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705',
      syncInterval: parseInt(process.env.SYNC_INTERVAL_MS || '60000'),
      batchSize: 50,
      ...config
    };
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.autoSyncInterval) {
      return;
    }

    this.logger.info(`Starting auto-sync with interval: ${this.config.syncInterval}ms`);

    this.autoSyncInterval = setInterval(async () => {
      try {
        await this.syncAll();
      } catch (error) {
        this.logger.error('Auto-sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      this.logger.info('Auto-sync stopped');
    }
  }

  /**
   * Sync all legal entities to twins
   */
  async syncAll(): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];
    const timestamp = new Date().toISOString();

    this.logger.info('Starting full synchronization to twins');

    try {
      // Sync to Knowledge Twin
      const knowledgeResult = await this.syncToKnowledgeTwin();
      results.push(...knowledgeResult);

      // Sync to Journey Twin
      const journeyResult = await this.syncToJourneyTwin();
      results.push(...journeyResult);

      // Sync to Industry Twin
      const industryResult = await this.syncToIndustryTwin();
      results.push(...industryResult);

      this.syncHistory.push(...results);
      this.logger.info(`Sync completed: ${results.filter(r => r.success).length}/${results.length} successful`);

    } catch (error) {
      this.logger.error('Full sync failed:', error);
    }

    return results;
  }

  /**
   * Sync to Knowledge Twin (Legal Knowledge Base)
   */
  private async syncToKnowledgeTwin(): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];
    const timestamp = new Date().toISOString();

    try {
      // In production, this would call the Knowledge Twin API
      // POST /api/knowledge/legal/sync

      this.logger.info('Syncing to Knowledge Twin (legal)');

      // Simulate successful sync
      results.push({
        success: true,
        twin: 'knowledge-twin',
        entityType: 'legal-base',
        entityId: 'legal-sync-' + Date.now(),
        timestamp
      });

      this.logger.debug('Knowledge Twin sync completed');

    } catch (error) {
      results.push({
        success: false,
        twin: 'knowledge-twin',
        entityType: 'legal-base',
        entityId: 'unknown',
        timestamp,
        error: (error as Error).message
      });
      this.logger.error('Knowledge Twin sync failed:', error);
    }

    return results;
  }

  /**
   * Sync to Journey Twin (Customer Journey Tracking)
   */
  private async syncToJourneyTwin(): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];
    const timestamp = new Date().toISOString();

    try {
      // In production, this would call the Journey Twin API
      // POST /api/journey/legal-milestones/sync

      this.logger.info('Syncing to Journey Twin');

      results.push({
        success: true,
        twin: 'journey-twin',
        entityType: 'legal-milestones',
        entityId: 'journey-sync-' + Date.now(),
        timestamp
      });

      this.logger.debug('Journey Twin sync completed');

    } catch (error) {
      results.push({
        success: false,
        twin: 'journey-twin',
        entityType: 'legal-milestones',
        entityId: 'unknown',
        timestamp,
        error: (error as Error).message
      });
      this.logger.error('Journey Twin sync failed:', error);
    }

    return results;
  }

  /**
   * Sync to Industry Twin (Legal Industry Standards)
   */
  private async syncToIndustryTwin(): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];
    const timestamp = new Date().toISOString();

    try {
      // In production, this would call the Industry Twin API
      // POST /api/industry/legal/compliance/sync

      this.logger.info('Syncing to Industry Twin (legal)');

      results.push({
        success: true,
        twin: 'industry-twin',
        entityType: 'legal-compliance',
        entityId: 'industry-sync-' + Date.now(),
        timestamp
      });

      this.logger.debug('Industry Twin sync completed');

    } catch (error) {
      results.push({
        success: false,
        twin: 'industry-twin',
        entityType: 'legal-compliance',
        entityId: 'unknown',
        timestamp,
        error: (error as Error).message
      });
      this.logger.error('Industry Twin sync failed:', error);
    }

    return results;
  }

  /**
   * Sync a contract to Knowledge Twin
   */
  async syncContractToKnowledgeTwin(contract: Contract): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const knowledgeTwinPayload = {
        entityType: 'contract',
        entityId: contract.id,
        profileId: contract.profileId,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        parties: contract.parties.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role
        })),
        terms: contract.terms,
        milestones: contract.milestones.map(m => ({
          id: m.id,
          name: m.name,
          status: m.status,
          dueDate: m.dueDate
        })),
        effectiveDate: contract.effectiveDate,
        expirationDate: contract.expirationDate,
        value: contract.value,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        source: 'lawgens-integration'
      };

      // In production: POST to ${knowledgeTwinUrl}/api/knowledge/legal/contracts
      this.logger.debug(`Syncing contract ${contract.id} to Knowledge Twin`);

      return {
        success: true,
        twin: 'knowledge-twin',
        entityType: 'contract',
        entityId: contract.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync contract ${contract.id} to Knowledge Twin:`, error);
      return {
        success: false,
        twin: 'knowledge-twin',
        entityType: 'contract',
        entityId: contract.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync a contract to Journey Twin
   */
  async syncContractToJourneyTwin(contract: Contract): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const journeyTwinPayload = {
        entityType: 'legal-contract',
        entityId: contract.id,
        profileId: contract.profileId,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        milestones: contract.milestones.map(m => ({
          id: m.id,
          name: m.name,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt
        })),
        effectiveDate: contract.effectiveDate,
        expirationDate: contract.expirationDate,
        source: 'lawgens-integration'
      };

      // In production: POST to ${journeyTwinUrl}/api/journey/legal
      this.logger.debug(`Syncing contract ${contract.id} to Journey Twin`);

      return {
        success: true,
        twin: 'journey-twin',
        entityType: 'legal-contract',
        entityId: contract.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync contract ${contract.id} to Journey Twin:`, error);
      return {
        success: false,
        twin: 'journey-twin',
        entityType: 'legal-contract',
        entityId: contract.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync a milestone to Journey Twin
   */
  async syncMilestoneToJourneyTwin(
    profileId: string,
    milestone: ContractMilestone
  ): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        entityType: 'legal-milestone',
        profileId,
        milestoneId: milestone.id,
        name: milestone.name,
        description: milestone.description,
        status: milestone.status,
        dueDate: milestone.dueDate,
        completedAt: milestone.completedAt,
        source: 'lawgens-integration'
      };

      // In production: POST to ${journeyTwinUrl}/api/journey/milestones
      this.logger.debug(`Syncing milestone ${milestone.id} to Journey Twin`);

      return {
        success: true,
        twin: 'journey-twin',
        entityType: 'legal-milestone',
        entityId: milestone.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync milestone ${milestone.id} to Journey Twin:`, error);
      return {
        success: false,
        twin: 'journey-twin',
        entityType: 'legal-milestone',
        entityId: milestone.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync a party to Knowledge Twin
   */
  async syncPartyToKnowledgeTwin(
    contractId: string,
    party: any,
    customerData: any
  ): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        entityType: 'contract-party',
        contractId,
        partyId: party.id,
        name: party.name,
        email: party.email,
        role: party.role,
        customerId: customerData.id,
        source: 'lawgens-integration'
      };

      // In production: POST to ${knowledgeTwinUrl}/api/knowledge/legal/parties
      this.logger.debug(`Syncing party ${party.id} to Knowledge Twin`);

      return {
        success: true,
        twin: 'knowledge-twin',
        entityType: 'contract-party',
        entityId: party.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync party ${party.id} to Knowledge Twin:`, error);
      return {
        success: false,
        twin: 'knowledge-twin',
        entityType: 'contract-party',
        entityId: party.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync compliance item to Knowledge Twin
   */
  async syncComplianceToKnowledgeTwin(item: ComplianceItem): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        entityType: 'compliance-item',
        entityId: item.id,
        profileId: item.profileId,
        contractId: item.contractId,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        requirement: item.requirement,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        completedAt: item.completedAt,
        riskLevel: item.riskLevel,
        createdAt: item.createdAt,
        source: 'lawgens-integration'
      };

      // In production: POST to ${knowledgeTwinUrl}/api/knowledge/legal/compliance
      this.logger.debug(`Syncing compliance item ${item.id} to Knowledge Twin`);

      return {
        success: true,
        twin: 'knowledge-twin',
        entityType: 'compliance-item',
        entityId: item.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync compliance item ${item.id}:`, error);
      return {
        success: false,
        twin: 'knowledge-twin',
        entityType: 'compliance-item',
        entityId: item.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync compliance item to Industry Twin (Legal Standards)
   */
  async syncComplianceToIndustryTwin(item: ComplianceItem): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        entityType: 'legal-compliance',
        entityId: item.id,
        profileId: item.profileId,
        type: item.type,
        category: item.category,
        title: item.title,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        riskLevel: item.riskLevel,
        source: 'lawgens-integration'
      };

      // In production: POST to ${industryTwinUrl}/api/industry/legal/compliance
      this.logger.debug(`Syncing compliance item ${item.id} to Industry Twin`);

      return {
        success: true,
        twin: 'industry-twin',
        entityType: 'legal-compliance',
        entityId: item.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync compliance item ${item.id} to Industry Twin:`, error);
      return {
        success: false,
        twin: 'industry-twin',
        entityType: 'legal-compliance',
        entityId: item.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Sync document to Knowledge Twin
   */
  async syncDocumentToKnowledgeTwin(document: LegalDocument): Promise<TwinSyncResult> {
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        entityType: 'legal-document',
        entityId: document.id,
        profileId: document.profileId,
        contractId: document.contractId,
        type: document.type,
        title: document.title,
        description: document.description,
        templateId: document.templateId,
        version: document.version,
        status: document.status,
        signatories: document.signatories,
        signatures: document.signatures.map(s => ({
          partyId: s.partyId,
          partyName: s.partyName,
          status: s.status,
          signedAt: s.signedAt
        })),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        source: 'lawgens-integration'
      };

      // In production: POST to ${knowledgeTwinUrl}/api/knowledge/legal/documents
      this.logger.debug(`Syncing document ${document.id} to Knowledge Twin`);

      return {
        success: true,
        twin: 'knowledge-twin',
        entityType: 'legal-document',
        entityId: document.id,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Failed to sync document ${document.id}:`, error);
      return {
        success: false,
        twin: 'knowledge-twin',
        entityType: 'legal-document',
        entityId: document.id,
        timestamp,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 100): TwinSyncResult[] {
    return this.syncHistory.slice(-limit);
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncTime: string | null;
    twinStats: Record<string, { success: number; failure: number }>;
  } {
    const twinStats: Record<string, { success: number; failure: number }> = {};

    for (const result of this.syncHistory) {
      if (!twinStats[result.twin]) {
        twinStats[result.twin] = { success: 0, failure: 0 };
      }
      if (result.success) {
        twinStats[result.twin].success++;
      } else {
        twinStats[result.twin].failure++;
      }
    }

    return {
      totalSyncs: this.syncHistory.length,
      successfulSyncs: this.syncHistory.filter(r => r.success).length,
      failedSyncs: this.syncHistory.filter(r => !r.success).length,
      lastSyncTime: this.syncHistory.length > 0
        ? this.syncHistory[this.syncHistory.length - 1].timestamp
        : null,
      twinStats
    };
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    status: string;
    knowledgeTwin: string;
    journeyTwin: string;
    industryTwin: string;
  }> {
    const results = await Promise.all([
      this.checkTwinHealth('knowledge-twin'),
      this.checkTwinHealth('journey-twin'),
      this.checkTwinHealth('industry-twin')
    ]);

    const allHealthy = results.every(r => r === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      knowledgeTwin: results[0],
      journeyTwin: results[1],
      industryTwin: results[2]
    };
  }

  private async checkTwinHealth(twin: string): Promise<string> {
    try {
      // In production, this would ping the actual twin service
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
