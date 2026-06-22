/**
 * Background Sync Jobs
 *
 * Periodic data synchronization from all sources
 */

import { DATA_SOURCES } from '../models/knowledgeGraph.js';
import { dataAggregatorService } from './dataSourceClients.js';

// ==================== SYNC JOB TYPES ====================

interface SyncJob {
  id: string;
  source: string;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastRun?: string;
  nextRun?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  error?: string;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  duration: number;
}

// ==================== SYNC JOB MANAGER ====================

export class SyncJobManager {
  private jobs: Map<string, SyncJob> = new Map();
  private running = false;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeJobs();
  }

  /**
   * Initialize sync jobs for all data sources
   */
  private initializeJobs(): void {
    for (const [sourceId, config] of Object.entries(DATA_SOURCES)) {
      const job: SyncJob = {
        id: `sync-${sourceId}`,
        source: sourceId,
        frequency: config.syncFrequency,
        status: 'pending',
        recordsProcessed: 0
      };

      this.jobs.set(sourceId, job);
      console.log(`SyncJob: Initialized ${sourceId} (${config.syncFrequency})`);
    }
  }

  /**
   * Start all sync jobs
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    console.log('Starting sync job manager...');

    for (const [sourceId, job] of this.jobs.entries()) {
      this.scheduleJob(sourceId, job);
    }
  }

  /**
   * Stop all sync jobs
   */
  stop(): void {
    this.running = false;

    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }

    this.intervals.clear();
    console.log('Sync job manager stopped');
  }

  /**
   * Schedule a job based on its frequency
   */
  private scheduleJob(sourceId: string, job: SyncJob): void {
    let intervalMs: number;

    switch (job.frequency) {
      case 'realtime':
        intervalMs = 60000;
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 24 * 60 * 60 * 1000;
    }

    // Run immediately on start for initial sync
    this.runJob(sourceId);

    // Then schedule recurring
    const interval = setInterval(() => {
      if (this.running) {
        this.runJob(sourceId);
      }
    }, intervalMs);

    this.intervals.set(sourceId, interval);
  }

  /**
   * Run a sync job
   */
  async runJob(sourceId: string): Promise<SyncResult> {
    const job = this.jobs.get(sourceId);
    if (!job) {
      return { success: false, recordsProcessed: 0, errors: ['Job not found'], duration: 0 };
    }

    if (job.status === 'running') {
      console.log(`SyncJob: ${sourceId} already running, skipping`);
      return { success: false, recordsProcessed: 0, errors: ['Job already running'], duration: 0 };
    }

    const startTime = Date.now();
    job.status = 'running';

    console.log(`SyncJob: Starting ${sourceId}`);

    try {
      const result = await this.syncSource(sourceId);

      job.status = 'completed';
      job.lastRun = new Date().toISOString();
      job.recordsProcessed = result.recordsProcessed;
      job.error = undefined;

      console.log(`SyncJob: Completed ${sourceId} - ${result.recordsProcessed} records in ${Date.now() - startTime}ms`);

      return {
        success: true,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.lastRun = new Date().toISOString();

      console.error(`SyncJob: Failed ${sourceId}`, error);

      return {
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sync data from a specific source
   */
  private async syncSource(sourceId: string): Promise<{ recordsProcessed: number; errors: string[] }> {
    const errors: string[] = [];
    let recordsProcessed = 0;

    try {
      const identitiesToSync = this.getIdentitiesForSync(sourceId);

      for (const identity of identitiesToSync) {
        try {
          const data = await dataAggregatorService.getDataFromSource(
            sourceId,
            identity.phone,
            identity.email
          );

          if (data) {
            await this.updateLocalData(identity.id, sourceId, data);
            recordsProcessed++;
          }
        } catch (error: any) {
          errors.push(`Failed to sync ${identity.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`Source sync failed: ${error.message}`);
    }

    return { recordsProcessed, errors };
  }

  /**
   * Get identities that need syncing for a source
   */
  private getIdentitiesForSync(sourceId: string): Array<{ id: string; phone?: string; email?: string }> {
    return [
      { id: 'id_001', phone: '+919876543210', email: 'rahul@example.com' },
      { id: 'id_002', phone: '+919988776655', email: 'priya@example.com' }
    ];
  }

  /**
   * Update local data storage
   */
  private async updateLocalData(identityId: string, sourceId: string, data: any): Promise<void> {
    console.log(`SyncJob: Updated ${identityId} from ${sourceId}`);
  }

  /**
   * Get job status
   */
  getJobStatus(sourceId?: string): SyncJob | SyncJob[] {
    if (sourceId) {
      return this.jobs.get(sourceId) as SyncJob;
    }
    return Array.from(this.jobs.values());
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    totalJobs: number;
    running: number;
    completed: number;
    failed: number;
    pending: number;
    totalRecordsProcessed: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      totalJobs: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      totalRecordsProcessed: jobs.reduce((sum, j) => sum + j.recordsProcessed, 0)
    };
  }

  /**
   * Force run a specific job
   */
  async forceRun(sourceId: string): Promise<SyncResult> {
    return this.runJob(sourceId);
  }

  /**
   * Run full sync for all sources
   */
  async runFullSync(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    for (const sourceId of this.jobs.keys()) {
      results.set(sourceId, await this.runJob(sourceId));
    }

    return results;
  }
}

// ==================== DATA QUALITY TRACKER ====================

export class DataQualityTracker {
  /**
   * Calculate completeness score for an identity
   */
  calculateCompleteness(identity: any): number {
    let filledFields = 0;
    let totalFields = 0;

    const coreFields = ['primaryPhone', 'primaryEmail'];
    for (const field of coreFields) {
      totalFields++;
      if (identity[field]) filledFields++;
    }

    const profileTypes = ['customer', 'merchant', 'vendor', 'employee'];
    for (const type of profileTypes) {
      if (identity[type]) {
        filledFields += 10;
        totalFields += 10;
      } else {
        totalFields += 10;
      }
    }

    totalFields += 5;
    if (identity.socialProfiles?.length > 0) {
      filledFields += Math.min(identity.socialProfiles.length, 5);
    }

    const activityFields = ['totalTransactions', 'totalSpent', 'lastActivity'];
    for (const field of activityFields) {
      totalFields++;
      if (identity.activity?.[field]) filledFields++;
    }

    return Math.round((filledFields / totalFields) * 100);
  }

  /**
   * Calculate freshness score
   */
  calculateFreshness(lastUpdated?: string): 'fresh' | 'stale' | 'unknown' {
    if (!lastUpdated) return 'unknown';

    const last = new Date(lastUpdated).getTime();
    const now = Date.now();
    const hoursSince = (now - last) / (1000 * 60 * 60);

    if (hoursSince < 24) return 'fresh';
    if (hoursSince < 168) return 'stale';
    return 'unknown';
  }

  /**
   * Generate quality report
   */
  generateQualityReport(identities: any[]): {
    overallCompleteness: number;
    overallFreshness: { fresh: number; stale: number; unknown: number };
    bySource: Record<string, { completeness: number; freshness: 'fresh' | 'stale' | 'unknown' }>;
    recommendations: string[];
  } {
    let totalCompleteness = 0;
    const freshnessCounts = { fresh: 0, stale: 0, unknown: 0 };
    const bySource: Record<string, { completeness: number; freshness: 'fresh' | 'stale' | 'unknown' }> = {};

    for (const identity of identities) {
      totalCompleteness += this.calculateCompleteness(identity);

      const freshness = this.calculateFreshness(identity.updatedAt);
      freshnessCounts[freshness]++;
    }

    const recommendations: string[] = [];

    if (identities.length > 0) {
      const avgCompleteness = totalCompleteness / identities.length;

      if (avgCompleteness < 50) {
        recommendations.push('Overall data completeness is below 50%. Consider implementing more data collection touchpoints.');
      }

      if (freshnessCounts.stale > freshnessCounts.fresh) {
        recommendations.push('More than half of identities have stale data. Schedule more frequent syncs.');
      }
    }

    return {
      overallCompleteness: Math.round(totalCompleteness / (identities.length || 1)),
      overallFreshness: freshnessCounts,
      bySource,
      recommendations
    };
  }
}

// ==================== EXPORTS ====================

export const syncJobManager = new SyncJobManager();
export const dataQualityTracker = new DataQualityTracker();
