// ============================================================================
// Goal Sync Service - Bridge to SUTAR OS GoalOS
// ============================================================================

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Objective, Strategy } from '../types';
import { logger } from '../utils/logger';
import { ServiceUnavailableError } from '../utils/errors';
import { config } from '../config';
import { eventBus } from '../utils/eventBus';

export interface SutarGoal {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  owner: string;
  dueDate: Date;
  parentGoalId?: string;
  tags: string[];
  metadata: Record<string, any>;
  source: 'boa-os';
  boaObjectiveId?: string;
  boaStrategyId?: string;
}

export interface SyncResult {
  objectiveId: string;
  sutarGoalId: string;
  status: 'synced' | 'failed' | 'skipped';
  error?: string;
  syncedAt: Date;
}

export class GoalSyncService {
  private goalOSUrl: string;
  private syncHistory: Map<string, SyncResult[]> = new Map();

  constructor(goalOSUrl: string = config.sutarGoalOSUrl) {
    this.goalOSUrl = goalOSUrl;
  }

  /**
   * Sync a BOA objective to SUTAR GoalOS
   */
  async syncObjective(objective: Objective): Promise<SyncResult> {
    if (objective.sutarGoalId) {
      logger.info(`[GoalSync] Objective ${objective.id} already synced to ${objective.sutarGoalId}`);
      return {
        objectiveId: objective.id,
        sutarGoalId: objective.sutarGoalId,
        status: 'skipped',
        syncedAt: new Date(),
      };
    }

    const sutarGoal: SutarGoal = {
      id: uuidv4(),
      title: `[BOA] ${objective.title}`,
      description: objective.description,
      priority: this.mapPriority(objective.priority),
      status: this.mapStatus(objective.status),
      owner: objective.owner,
      dueDate: objective.dueDate,
      tags: [...objective.tags, 'boa-strategy', `priority-${objective.priority}`],
      metadata: {
        keyResults: objective.keyResults.map(kr => ({
          metric: kr.metric,
          target: kr.targetValue,
          current: kr.currentValue,
          unit: kr.unit,
        })),
        progress: objective.progress,
        sourceLayer: 'BOA-OS',
      },
      source: 'boa-os',
      boaObjectiveId: objective.id,
      boaStrategyId: objective.strategyId,
    };

    try {
      const response = await axios.post(
        `${this.goalOSUrl}/api/v1/goals`,
        sutarGoal,
        { timeout: 5000 }
      );

      const goalId = response.data?.data?.id || sutarGoal.id;
      objective.sutarGoalId = goalId;

      const result: SyncResult = {
        objectiveId: objective.id,
        sutarGoalId: goalId,
        status: 'synced',
        syncedAt: new Date(),
      };

      this.recordSync(objective.id, result);

      await eventBus.publish('boa.objective.synced', {
        objectiveId: objective.id,
        sutarGoalId: goalId,
        progress: objective.progress,
      });

      logger.info(`[GoalSync] Synced objective ${objective.id} -> SUTAR goal ${goalId}`);
      return result;
    } catch (error: any) {
      logger.error(`[GoalSync] Failed to sync objective ${objective.id}: ${error.message}`);
      const result: SyncResult = {
        objectiveId: objective.id,
        sutarGoalId: '',
        status: 'failed',
        error: error.message,
        syncedAt: new Date(),
      };
      this.recordSync(objective.id, result);
      return result;
    }
  }

  /**
   * Sync an entire strategy (all objectives)
   */
  async syncStrategy(strategy: Strategy, objectives: Objective[]): Promise<SyncResult[]> {
    logger.info(`[GoalSync] Syncing strategy ${strategy.id} with ${objectives.length} objectives`);
    const results: SyncResult[] = [];

    for (const objective of objectives) {
      const result = await this.syncObjective(objective);
      results.push(result);
    }

    await eventBus.publish('boa.strategy.synced', {
      strategyId: strategy.id,
      strategyName: strategy.name,
      totalObjectives: objectives.length,
      syncedCount: results.filter(r => r.status === 'synced').length,
      failedCount: results.filter(r => r.status === 'failed').length,
    });

    return results;
  }

  /**
   * Push progress update to SUTAR
   */
  async pushProgressUpdate(objective: Objective): Promise<boolean> {
    if (!objective.sutarGoalId) {
      logger.warn(`[GoalSync] Cannot push progress - objective ${objective.id} not synced`);
      return false;
    }

    try {
      await axios.patch(
        `${this.goalOSUrl}/api/v1/goals/${objective.sutarGoalId}/progress`,
        {
          progress: objective.progress,
          status: this.mapStatus(objective.status),
          metadata: { lastSyncedAt: new Date().toISOString() },
        },
        { timeout: 5000 }
      );

      await eventBus.publish('boa.objective.progress-updated', {
        objectiveId: objective.id,
        sutarGoalId: objective.sutarGoalId,
        progress: objective.progress,
        status: objective.status,
      });

      logger.debug(`[GoalSync] Pushed progress update for ${objective.id}: ${objective.progress}%`);
      return true;
    } catch (error: any) {
      logger.error(`[GoalSync] Failed to push progress: ${error.message}`);
      return false;
    }
  }

  private recordSync(objectiveId: string, result: SyncResult): void {
    if (!this.syncHistory.has(objectiveId)) {
      this.syncHistory.set(objectiveId, []);
    }
    this.syncHistory.get(objectiveId)!.push(result);
  }

  getSyncHistory(objectiveId: string): SyncResult[] {
    return this.syncHistory.get(objectiveId) || [];
  }

  private mapPriority(p: Objective['priority']): string {
    const map: Record<Objective['priority'], string> = {
      low: 'P3', medium: 'P2', high: 'P1', critical: 'P0',
    };
    return map[p];
  }

  private mapStatus(s: Objective['status']): string {
    const map: Record<Objective['status'], string> = {
      'on-track': 'active', 'at-risk': 'at_risk', 'off-track': 'blocked',
      'completed': 'completed', 'cancelled': 'cancelled',
    };
    return map[s];
  }
}

export const goalSyncService = new GoalSyncService();
export default goalSyncService;
