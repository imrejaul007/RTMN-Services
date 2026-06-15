// ============================================================================
// Objective Service - CRUD for objectives with progress tracking
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Objective, ObjectiveStatus, Priority, KeyResult } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateObjectiveInput {
  strategyId: string;
  pillarId: string;
  title: string;
  description: string;
  priority: Priority;
  owner: string;
  tags?: string[];
  startDate?: Date;
  dueDate?: Date;
  keyResults?: Array<{
    description: string;
    metric: string;
    targetValue: number;
    unit: string;
    dueDate: Date;
  }>;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: ObjectiveStatus;
  owner?: string;
  tags?: string[];
  dueDate?: Date;
  sutarGoalId?: string;
}

export class ObjectiveService {
  private objectives: Map<string, Objective> = new Map();

  create(input: CreateObjectiveInput): Objective {
    if (!input.title || input.title.length < 3) {
      throw new ValidationError('Title must be at least 3 characters');
    }
    if (!input.owner) {
      throw new ValidationError('Owner is required');
    }

    const now = new Date();
    const krs: KeyResult[] = (input.keyResults || []).map(kr => ({
      id: uuidv4(),
      objectiveId: '',
      description: kr.description,
      metric: kr.metric,
      targetValue: kr.targetValue,
      currentValue: 0,
      unit: kr.unit,
      progress: 0,
      dueDate: kr.dueDate,
      status: 'on-track',
    }));

    const objective: Objective = {
      id: uuidv4(),
      strategyId: input.strategyId,
      pillarId: input.pillarId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'on-track',
      progress: 0,
      owner: input.owner,
      keyResults: krs,
      parentObjectiveId: undefined,
      tags: input.tags || [],
      startDate: input.startDate || now,
      dueDate: input.dueDate || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
    objective.keyResults.forEach(kr => (kr.objectiveId = objective.id));

    this.objectives.set(objective.id, objective);
    logger.info(`[ObjectiveService] Created objective ${objective.id}: ${objective.title}`);
    return objective;
  }

  getById(id: string): Objective {
    const obj = this.objectives.get(id);
    if (!obj) throw new NotFoundError(`Objective ${id}`);
    return obj;
  }

  getAll(filters?: { strategyId?: string; owner?: string; status?: ObjectiveStatus }): Objective[] {
    let results = Array.from(this.objectives.values());
    if (filters?.strategyId) results = results.filter(o => o.strategyId === filters.strategyId);
    if (filters?.owner) results = results.filter(o => o.owner === filters.owner);
    if (filters?.status) results = results.filter(o => o.status === filters.status);
    return results;
  }

  update(id: string, input: UpdateObjectiveInput): Objective {
    const obj = this.getById(id);
    if (input.title) obj.title = input.title;
    if (input.description !== undefined) obj.description = input.description;
    if (input.priority) obj.priority = input.priority;
    if (input.status) obj.status = input.status;
    if (input.owner) obj.owner = input.owner;
    if (input.tags) obj.tags = input.tags;
    if (input.dueDate) obj.dueDate = input.dueDate;
    if (input.sutarGoalId) obj.sutarGoalId = input.sutarGoalId;
    obj.updatedAt = new Date();

    logger.info(`[ObjectiveService] Updated objective ${id}`);
    return obj;
  }

  updateProgress(id: string, keyResultId: string, currentValue: number): Objective {
    const obj = this.getById(id);
    const kr = obj.keyResults.find(k => k.id === keyResultId);
    if (!kr) throw new NotFoundError(`Key result ${keyResultId}`);

    kr.currentValue = currentValue;
    kr.progress = Math.min(100, Math.max(0, (currentValue / kr.targetValue) * 100));

    const totalProgress = obj.keyResults.reduce((sum, k) => sum + k.progress, 0);
    obj.progress = obj.keyResults.length > 0 ? totalProgress / obj.keyResults.length : 0;

    if (obj.progress >= 100) obj.status = 'completed';
    else if (obj.progress < 30) obj.status = 'off-track';
    else if (obj.progress < 60) obj.status = 'at-risk';
    else obj.status = 'on-track';

    obj.updatedAt = new Date();
    return obj;
  }

  delete(id: string): boolean {
    const existed = this.objectives.delete(id);
    if (existed) logger.info(`[ObjectiveService] Deleted objective ${id}`);
    return existed;
  }

  /**
   * Get progress summary statistics
   */
  getProgressSummary(): { total: number; onTrack: number; atRisk: number; offTrack: number; completed: number; avgProgress: number } {
    const all = Array.from(this.objectives.values());
    const total = all.length;
    if (total === 0) return { total: 0, onTrack: 0, atRisk: 0, offTrack: 0, completed: 0, avgProgress: 0 };
    const onTrack = all.filter(o => o.status === 'on-track').length;
    const atRisk = all.filter(o => o.status === 'at-risk').length;
    const offTrack = all.filter(o => o.status === 'off-track').length;
    const completed = all.filter(o => o.status === 'completed').length;
    const avgProgress = all.reduce((sum, o) => sum + o.progress, 0) / total;
    return { total, onTrack, atRisk, offTrack, completed, avgProgress };
  }
}

export const objectiveService = new ObjectiveService();
export default objectiveService;
