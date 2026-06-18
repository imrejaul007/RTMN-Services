/**
 * Synchronizer Service - Core sync engine for bidirectional data synchronization
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SyncSource,
  SyncDirection,
  SyncStatus,
  SyncEvent,
  SyncRecord,
  SyncBatch,
  SyncQueue,
  SyncQueueItem,
  SyncStats,
  SyncSourceStats,
  generateChecksum
} from '../models/Sync';
import { ConflictResolver } from './conflictResolver';
import { AuditLog } from './auditLog';

interface SyncTargetConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
  priority: number;
}

interface SyncState {
  isRunning: boolean;
  isPaused: boolean;
  lastSyncAt: Date | null;
  eventQueue: SyncEvent[];
  syncIntervals: Map<string, NodeJS.Timeout>;
}

export class Synchronizer {
  private logger: any;
  private auditLog: AuditLog;
  private conflictResolver: ConflictResolver;
  private state: SyncState;
  private stats: SyncStats;
  private targets: Map<SyncSource, SyncTargetConfig>;
  private eventHandlers: Map<string, (event: SyncEvent) => Promise<void>>;
  private syncIntervalMs: number;

  constructor(auditLog: AuditLog, conflictResolver: ConflictResolver, logger: any) {
    this.auditLog = auditLog;
    this.conflictResolver = conflictResolver;
    this.logger = logger;

    this.state = {
      isRunning: false,
      isPaused: false,
      lastSyncAt: null,
      eventQueue: [],
      syncIntervals: new Map()
    };

    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      recordsProcessed: 0,
      lastSyncAt: null,
      averageSyncDuration: 0,
      bySource: {
        salesmind: { inbound: 0, outbound: 0, bidirectional: 0, lastSyncAt: null, recordsProcessed: 0, conflicts: 0 },
        salesos: { inbound: 0, outbound: 0, bidirectional: 0, lastSyncAt: null, recordsProcessed: 0, conflicts: 0 },
        customerops: { inbound: 0, outbound: 0, bidirectional: 0, lastSyncAt: null, recordsProcessed: 0, conflicts: 0 },
        brandpulse: { inbound: 0, outbound: 0, bidirectional: 0, lastSyncAt: null, recordsProcessed: 0, conflicts: 0 }
      }
    };

    this.targets = new Map();
    this.eventHandlers = new Map();
    this.syncIntervalMs = parseInt(process.env.SYNC_INTERVAL_MS || '30000');

    this.initializeTargets();
  }

  private initializeTargets(): void {
    // SalesMind
    this.targets.set('salesmind', {
      url: process.env.SALESMIND_API_URL || 'http://localhost:4250',
      apiKey: process.env.SALESMIND_API_KEY || '',
      enabled: true,
      priority: 1
    });

    // Sales OS
    this.targets.set('salesos', {
      url: process.env.SALESOS_API_URL || 'http://localhost:5055',
      apiKey: process.env.SALESOS_API_KEY || '',
      enabled: true,
      priority: 2
    });

    // Customer Ops
    this.targets.set('customerops', {
      url: process.env.CUSTOMEROPS_API_URL || 'http://localhost:4780',
      apiKey: process.env.CUSTOMEROPS_API_KEY || '',
      enabled: true,
      priority: 3
    });

    // BrandPulse
    this.targets.set('brandpulse', {
      url: process.env.BRANDPULSE_API_URL || 'http://localhost:5057',
      apiKey: process.env.BRANDPULSE_API_KEY || '',
      enabled: true,
      priority: 4
    });
  }

  /**
   * Initialize the synchronizer
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Synchronizer');
    this.state.isRunning = true;

    // Start periodic sync
    this.startPeriodicSync();

    // Start event processing
    this.startEventProcessing();

    this.logger.info('Synchronizer initialized', {
      targets: Array.from(this.targets.keys()),
      syncIntervalMs: this.syncIntervalMs
    });
  }

  /**
   * Stop the synchronizer
   */
  stop(): void {
    this.logger.info('Stopping Synchronizer');
    this.state.isRunning = false;

    // Clear all intervals
    for (const [key, interval] of this.state.syncIntervals) {
      clearInterval(interval);
    }
    this.state.syncIntervals.clear();

    this.logger.info('Synchronizer stopped');
  }

  /**
   * Pause synchronization
   */
  pauseSync(): void {
    this.state.isPaused = true;
    this.logger.info('Synchronization paused');
  }

  /**
   * Resume synchronization
   */
  resumeSync(): void {
    this.state.isPaused = false;
    this.logger.info('Synchronization resumed');
  }

  /**
   * Get synchronizer status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    lastSyncAt: Date | null;
    queueLength: number;
    stats: SyncStats;
  } {
    return {
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      lastSyncAt: this.state.lastSyncAt,
      queueLength: this.state.eventQueue.length,
      stats: this.stats
    };
  }

  /**
   * Queue an event for synchronization
   */
  async queueEvent(event: SyncEvent): Promise<void> {
    this.state.eventQueue.push(event);
    this.logger.debug('Event queued', {
      eventId: event.id,
      type: event.type,
      source: event.source,
      target: event.target
    });

    // Process immediately if not paused
    if (!this.state.isPaused && this.state.isRunning) {
      await this.processEvent(event);
    }
  }

  /**
   * Register an event handler
   */
  on(eventType: string, handler: (event: SyncEvent) => Promise<void>): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Trigger sync from a specific source to targets
   */
  async triggerSync(source: SyncSource, targets: SyncSource[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const target of targets) {
      try {
        const result = await this.sync(source, target);
        results[target] = { success: true, ...result };
      } catch (error: any) {
        this.logger.error(`Sync failed: ${source} -> ${target}`, { error: error.message });
        results[target] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Sync data from source to target
   */
  async syncFromSource(source: SyncSource, targets: SyncSource[]): Promise<Record<string, any>> {
    return this.triggerSync(source, targets);
  }

  /**
   * Perform sync between two sources
   */
  private async sync(source: SyncSource, target: SyncSource): Promise<{
    recordsProcessed: number;
    conflicts: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let conflicts = 0;

    const targetConfig = this.targets.get(target);
    if (!targetConfig || !targetConfig.enabled) {
      throw new Error(`Target ${target} not configured or disabled`);
    }

    this.logger.info(`Starting sync: ${source} -> ${target}`);

    // Get data from source
    const sourceData = await this.fetchFromSource(source);

    // Process and sync each record
    for (const record of sourceData) {
      try {
        const result = await this.syncRecord(source, target, record);
        recordsProcessed++;

        if (result.conflict) {
          conflicts++;
          this.stats.conflictsDetected++;
          this.stats.bySource[source].conflicts++;
        }

        this.stats.recordsProcessed++;
        this.stats.bySource[source].recordsProcessed++;
      } catch (error: any) {
        this.logger.error('Error syncing record', {
          source,
          target,
          recordId: record.id,
          error: error.message
        });
      }
    }

    // Update stats
    this.stats.successfulSyncs++;
    this.stats.lastSyncAt = new Date();
    this.stats.bySource[source].lastSyncAt = new Date();
    this.stats.bySource[source].outbound++;

    const duration = Date.now() - startTime;

    // Calculate average sync duration
    this.stats.averageSyncDuration =
      (this.stats.averageSyncDuration * (this.stats.totalSyncs - 1) + duration) /
      this.stats.totalSyncs;

    this.logger.info(`Sync completed: ${source} -> ${target}`, {
      recordsProcessed,
      conflicts,
      duration: `${duration}ms`
    });

    // Audit log
    await this.auditLog.log({
      action: 'sync.completed',
      source,
      target,
      entityType: 'batch',
      entityId: 'batch',
      details: { recordsProcessed, conflicts, duration },
      status: 'success',
      duration
    });

    return { recordsProcessed, conflicts, duration };
  }

  /**
   * Fetch data from a source
   */
  private async fetchFromSource(source: SyncSource): Promise<any[]> {
    const config = this.targets.get(source);
    if (!config) {
      throw new Error(`Source ${source} not configured`);
    }

    try {
      const response = await fetch(`${config.url}/api/sync/entities`, {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from ${source}: ${response.status}`);
      }

      const data = await response.json();
      return data.entities || data;
    } catch (error: any) {
      this.logger.error(`Error fetching from ${source}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Sync a single record
   */
  private async syncRecord(
    source: SyncSource,
    target: SyncSource,
    record: any
  ): Promise<{ success: boolean; conflict: boolean }> {
    const targetConfig = this.targets.get(target);
    if (!targetConfig) {
      throw new Error(`Target ${target} not configured`);
    }

    // Check for existing record in target
    let existingRecord = null;
    try {
      const response = await fetch(`${targetConfig.url}/api/${record.entityType}/${record.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(targetConfig.apiKey && { 'Authorization': `Bearer ${targetConfig.apiKey}` })
        }
      });

      if (response.ok) {
        existingRecord = await response.json();
      }
    } catch (error) {
      // Record doesn't exist, will be created
    }

    // Check for conflicts
    let conflict = false;
    let resolvedData = record.data;

    if (existingRecord) {
      const sourceChecksum = generateChecksum(record.data);
      const targetChecksum = generateChecksum(existingRecord);

      if (sourceChecksum !== targetChecksum) {
        conflict = true;
        this.logger.warn('Conflict detected', {
          source,
          target,
          entityId: record.id,
          sourceChecksum,
          targetChecksum
        });

        // Resolve conflict
        const resolution = await this.conflictResolver.resolve(
          record.data,
          existingRecord,
          { source, target, entityType: record.entityType, entityId: record.id }
        );
        resolvedData = resolution.resolvedData;
      }
    }

    // Push to target
    const method = existingRecord ? 'PUT' : 'POST';
    const url = existingRecord
      ? `${targetConfig.url}/api/${record.entityType}/${record.id}`
      : `${targetConfig.url}/api/${record.entityType}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(targetConfig.apiKey && { 'Authorization': `Bearer ${targetConfig.apiKey}` })
      },
      body: JSON.stringify(resolvedData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync to ${target}: ${response.status}`);
    }

    return { success: true, conflict };
  }

  /**
   * Process a single event
   */
  private async processEvent(event: SyncEvent): Promise<void> {
    this.logger.debug('Processing event', {
      eventId: event.id,
      type: event.type,
      source: event.source
    });

    // Emit to handlers
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      try {
        await handler(event);
      } catch (error: any) {
        this.logger.error('Error in event handler', {
          eventId: event.id,
          error: error.message
        });
      }
    }

    // Remove from queue
    const index = this.state.eventQueue.findIndex(e => e.id === event.id);
    if (index > -1) {
      this.state.eventQueue.splice(index, 1);
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    const interval = setInterval(async () => {
      if (this.state.isPaused || !this.state.isRunning) {
        return;
      }

      // Sync all sources to all targets
      const sources: SyncSource[] = ['salesmind', 'salesos', 'customerops', 'brandpulse'];
      const targets: SyncSource[] = ['salesmind', 'salesos', 'customerops', 'brandpulse'];

      for (const source of sources) {
        for (const target of targets) {
          if (source !== target) {
            try {
              await this.sync(source, target);
            } catch (error: any) {
              this.logger.error('Periodic sync failed', { source, target, error: error.message });
            }
          }
        }
      }

      this.state.lastSyncAt = new Date();
    }, this.syncIntervalMs);

    this.state.syncIntervals.set('periodic', interval);
    this.logger.info(`Periodic sync started (interval: ${this.syncIntervalMs}ms)`);
  }

  /**
   * Start event processing
   */
  private startEventProcessing(): void {
    const processInterval = setInterval(async () => {
      if (this.state.isPaused || !this.state.isRunning) {
        return;
      }

      // Process queued events
      while (this.state.eventQueue.length > 0) {
        const event = this.state.eventQueue[0];
        await this.processEvent(event);
      }
    }, 1000);

    this.state.syncIntervals.set('eventProcessor', processInterval);
    this.logger.info('Event processor started');
  }

  /**
   * Get sync queue status
   */
  getQueueStatus(): { length: number; events: SyncEvent[] } {
    return {
      length: this.state.eventQueue.length,
      events: [...this.state.eventQueue]
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.state.eventQueue = [];
    this.logger.info('Sync queue cleared');
  }
}
