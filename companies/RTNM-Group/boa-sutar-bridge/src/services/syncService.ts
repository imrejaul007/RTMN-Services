// Core Sync Service - BOA to SUTAR bidirectional synchronization
import { v4 as uuidv4 } from 'uuid';
import { BridgeSync, SyncStatus, SyncConflict } from '../types';
import { logger } from '../utils/logger';
import { boaClient } from './boaClient';
import { sutarClient } from './sutarClient';
import { eventBus } from '../utils/eventBus';

export class SyncService {
  private syncs: Map<string, BridgeSync> = new Map();
  private objectiveToSync: Map<string, string> = new Map(); // boaObjectiveId -> syncId

  /**
   * Sync a BOA objective to SUTAR
   */
  async syncObjectiveToSutar(boaObjectiveId: string, options?: { force?: boolean }): Promise<BridgeSync> {
    const boaObjective = await boaClient.getObjective(boaObjectiveId);
    if (!boaObjective) throw new Error(`BOA objective ${boaObjectiveId} not found`);

    let sync = this.getSyncByObjective(boaObjectiveId);

    if (sync && !options?.force && sync.status === 'completed') {
      logger.info(`[SyncService] Objective ${boaObjectiveId} already synced (sync ${sync.id})`);
      return sync;
    }

    if (!sync) {
      sync = {
        id: uuidv4(),
        boaObjectiveId,
        sutarGoalId: '',
        direction: 'boa-to-sutar',
        status: 'in-progress',
        lastSyncedAt: new Date(),
        syncCount: 0,
        conflicts: [],
        metadata: {},
      };
      this.syncs.set(sync.id, sync);
      this.objectiveToSync.set(boaObjectiveId, sync.id);
    }

    sync.status = 'in-progress';
    sync.lastSyncedAt = new Date();

    try {
      // Create SUTAR goal from BOA objective
      const sutarGoal = {
        id: uuidv4(),
        title: `[BOA-Bridge] ${boaObjective.title}`,
        description: boaObjective.description,
        priority: this.mapPriority(boaObjective.priority),
        status: this.mapStatus(boaObjective.status),
        owner: boaObjective.owner,
        dueDate: boaObjective.dueDate,
        tags: [...(boaObjective.tags || []), 'boa-bridge', `strategy-${boaObjective.strategyId}`],
        metadata: {
          boaObjectiveId,
          boaStrategyId: boaObjective.strategyId,
          keyResults: boaObjective.keyResults || [],
          progress: boaObjective.progress,
          sourceLayer: 'BOA-OS',
          bridgeVersion: '1.0.0',
        },
        source: 'boa-bridge',
      };

      let sutarGoalData;
      if (sync.sutarGoalId) {
        sutarGoalData = await sutarClient.updateGoalProgress(sync.sutarGoalId, boaObjective.progress, this.mapStatus(boaObjective.status));
        sutarGoalData = await sutarClient.getGoal(sync.sutarGoalId);
      } else {
        sutarGoalData = await sutarClient.createGoal(sutarGoal);
      }

      if (sutarGoalData) {
        sync.sutarGoalId = sutarGoalData.id || sync.sutarGoalId;
        sync.status = 'completed';
        sync.syncCount++;
        sync.lastSyncedAt = new Date();

        await eventBus.publish('bridge.sync.completed', {
          syncId: sync.id,
          boaObjectiveId,
          sutarGoalId: sync.sutarGoalId,
          progress: boaObjective.progress,
        });

        logger.info(`[SyncService] Synced objective ${boaObjectiveId} -> SUTAR goal ${sync.sutarGoalId}`);
      } else {
        sync.status = 'failed';
        await eventBus.publish('bridge.sync.failed', { syncId: sync.id, boaObjectiveId, error: 'No SUTAR data returned' });
      }
    } catch (error: any) {
      sync.status = 'failed';
      sync.metadata.error = error.message;
      logger.error(`[SyncService] Sync failed for ${boaObjectiveId}: ${error.message}`);
      await eventBus.publish('bridge.sync.failed', { syncId: sync.id, boaObjectiveId, error: error.message });
    }

    return sync;
  }

  /**
   * Push progress update from BOA to SUTAR
   */
  async pushProgressUpdate(boaObjectiveId: string, progress: number, status: string): Promise<boolean> {
    const sync = this.getSyncByObjective(boaObjectiveId);
    if (!sync || !sync.sutarGoalId) {
      logger.warn(`[SyncService] Cannot push progress - ${boaObjectiveId} not synced yet`);
      return false;
    }

    const success = await sutarClient.updateGoalProgress(sync.sutarGoalId, progress, this.mapStatus(status as any));
    if (success) {
      sync.syncCount++;
      sync.lastSyncedAt = new Date();
      await eventBus.publish('bridge.progress.updated', { boaObjectiveId, sutarGoalId: sync.sutarGoalId, progress, status });
    }
    return success;
  }

  /**
   * Pull updates from SUTAR back to BOA
   */
  async pullFromSutar(sutarGoalId: string): Promise<any> {
    const sutarGoal = await sutarClient.getGoal(sutarGoalId);
    if (!sutarGoal) return null;

    const sync = Array.from(this.syncs.values()).find(s => s.sutarGoalId === sutarGoalId);
    if (!sync) {
      logger.warn(`[SyncService] No sync record found for SUTAR goal ${sutarGoalId}`);
      return null;
    }

    await eventBus.publish('bridge.pull.completed', {
      syncId: sync.id,
      boaObjectiveId: sync.boaObjectiveId,
      sutarGoalId,
      sutarData: sutarGoal,
    });

    return sutarGoal;
  }

  /**
   * Detect conflict between BOA and SUTAR
   */
  detectConflict(boaData: any, sutarData: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const fieldsToCompare = ['title', 'description', 'priority', 'status', 'owner', 'dueDate', 'progress'];
    for (const field of fieldsToCompare) {
      if (JSON.stringify(boaData[field]) !== JSON.stringify(sutarData[field])) {
        conflicts.push({
          id: uuidv4(),
          field,
          boaValue: boaData[field],
          sutarValue: sutarData[field],
          detectedAt: new Date(),
          resolution: 'pending',
        });
      }
    }
    return conflicts;
  }

  /**
   * Get sync by objective ID
   */
  getSyncByObjective(boaObjectiveId: string): BridgeSync | undefined {
    const syncId = this.objectiveToSync.get(boaObjectiveId);
    return syncId ? this.syncs.get(syncId) : undefined;
  }

  /**
   * Get sync by SUTAR goal ID
   */
  getSyncBySutarGoal(sutarGoalId: string): BridgeSync | undefined {
    return Array.from(this.syncs.values()).find(s => s.sutarGoalId === sutarGoalId);
  }

  /**
   * Get all syncs
   */
  getAllSyncs(filters?: { status?: SyncStatus }): BridgeSync[] {
    let results = Array.from(this.syncs.values());
    if (filters?.status) results = results.filter(s => s.status === filters.status);
    return results;
  }

  /**
   * Get sync statistics
   */
  getStats(): { total: number; completed: number; failed: number; inProgress: number; conflicts: number } {
    const all = Array.from(this.syncs.values());
    return {
      total: all.length,
      completed: all.filter(s => s.status === 'completed').length,
      failed: all.filter(s => s.status === 'failed').length,
      inProgress: all.filter(s => s.status === 'in-progress').length,
      conflicts: all.reduce((sum, s) => sum + s.conflicts.length, 0),
    };
  }

  private mapPriority(p: string): string {
    const map: Record<string, string> = { low: 'P3', medium: 'P2', high: 'P1', critical: 'P0' };
    return map[p] || 'P2';
  }

  private mapStatus(s: string): string {
    const map: Record<string, string> = {
      'on-track': 'active', 'at-risk': 'at_risk', 'off-track': 'blocked',
      'completed': 'completed', 'cancelled': 'cancelled',
    };
    return map[s] || 'active';
  }
}

export const syncService = new SyncService();
export default syncService;
