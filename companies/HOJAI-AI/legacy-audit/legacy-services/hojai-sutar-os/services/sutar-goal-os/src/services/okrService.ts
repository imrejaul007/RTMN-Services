// ============================================================================
// SUTAR GoalOS - OKR Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  OKRSet,
  Objective,
  KeyResult,
  KeyResultType,
  OKRStatus,
  Progress,
  CreateOKRRequest,
  UpdateKeyResultRequest,
  UpdateObjectiveRequest,
} from '../types/index.js';
import { OKRStatus as OKRStatusEnum, KeyResultType as KeyResultTypeEnum } from '../types/index.js';

export class OKRService {
  private okrSets: Map<string, OKRSet> = new Map();
  private objectives: Map<string, Objective> = new Map();
  private keyResults: Map<string, KeyResult> = new Map();

  /**
   * Create a new OKR set for a goal
   */
  async create(goalId: string, data: CreateOKRRequest): Promise<OKRSet> {
    const now = new Date().toISOString();
    const objectiveId = uuidv4();

    // Create key results
    const keyResults: KeyResult[] = data.keyResults.map(kr => ({
      id: uuidv4(),
      objectiveId,
      title: kr.title,
      description: kr.description,
      type: kr.type,
      currentValue: 0,
      targetValue: kr.targetValue,
      unit: kr.unit,
      progress: 0,
      status: OKRStatusEnum.DRAFT,
      createdAt: now,
      updatedAt: now,
    }));

    // Create objective
    const objective: Objective = {
      id: objectiveId,
      goalId,
      title: data.objectiveTitle,
      description: data.objectiveDescription,
      quarter: data.quarter,
      year: data.year,
      status: OKRStatusEnum.DRAFT,
      progress: {
        current: 0,
        target: 100,
        percentage: 0,
        trend: 'stable',
        lastUpdated: now,
      },
      keyResults,
      createdAt: now,
      updatedAt: now,
    };

    // Create OKR set
    const okrSet: OKRSet = {
      id: uuidv4(),
      goalId,
      objective,
      keyResults,
      overallProgress: 0,
      status: OKRStatusEnum.DRAFT,
      createdAt: now,
      updatedAt: now,
    };

    // Store all entities
    this.okrSets.set(okrSet.id, okrSet);
    this.objectives.set(objectiveId, objective);
    for (const kr of keyResults) {
      this.keyResults.set(kr.id, kr);
    }

    return okrSet;
  }

  /**
   * Get an OKR set by ID
   */
  async get(okrId: string): Promise<OKRSet | null> {
    return this.okrSets.get(okrId) || null;
  }

  /**
   * Get OKR sets for a goal
   */
  async getByGoal(goalId: string): Promise<OKRSet[]> {
    return Array.from(this.okrSets.values()).filter(okr => okr.goalId === goalId);
  }

  /**
   * Get an objective by ID
   */
  async getObjective(objectiveId: string): Promise<Objective | null> {
    return this.objectives.get(objectiveId) || null;
  }

  /**
   * Get a key result by ID
   */
  async getKeyResult(krId: string): Promise<KeyResult | null> {
    return this.keyResults.get(krId) || null;
  }

  /**
   * Update an objective
   */
  async updateObjective(objectiveId: string, data: UpdateObjectiveRequest): Promise<Objective | null> {
    const objective = this.objectives.get(objectiveId);
    if (!objective) return null;

    const now = new Date().toISOString();

    if (data.title !== undefined) objective.title = data.title;
    if (data.description !== undefined) objective.description = data.description;
    if (data.status !== undefined) objective.status = data.status;
    if (data.quarter !== undefined) objective.quarter = data.quarter;
    if (data.year !== undefined) objective.year = data.year;
    objective.updatedAt = now;

    // Update OKR set
    const okrSet = Array.from(this.okrSets.values()).find(okr => okr.objective.id === objectiveId);
    if (okrSet) {
      okrSet.objective = objective;
      okrSet.updatedAt = now;
    }

    this.objectives.set(objectiveId, objective);
    return objective;
  }

  /**
   * Update a key result
   */
  async updateKeyResult(krId: string, data: UpdateKeyResultRequest): Promise<KeyResult | null> {
    const kr = this.keyResults.get(krId);
    if (!kr) return null;

    const now = new Date().toISOString();

    if (data.title !== undefined) kr.title = data.title;
    if (data.description !== undefined) kr.description = data.description;
    if (data.unit !== undefined) kr.unit = data.unit;
    if (data.status !== undefined) kr.status = data.status;

    if (data.currentValue !== undefined) {
      kr.currentValue = data.currentValue;
      kr.progress = this.calculateKRProgress(kr.type, data.currentValue, data.targetValue || kr.targetValue);
    }

    if (data.targetValue !== undefined) {
      kr.targetValue = data.targetValue;
      kr.progress = this.calculateKRProgress(kr.type, data.currentValue || kr.currentValue, data.targetValue);
    }

    kr.updatedAt = now;

    // Update objective progress
    const objective = this.objectives.get(kr.objectiveId);
    if (objective) {
      this.recalculateObjectiveProgress(objective);
      this.objectives.set(objective.id, objective);

      // Update OKR set
      const okrSet = Array.from(this.okrSets.values()).find(okr => okr.objective.id === objective.id);
      if (okrSet) {
        okrSet.keyResults = objective.keyResults;
        okrSet.overallProgress = objective.progress.percentage;
        okrSet.updatedAt = now;
      }
    }

    this.keyResults.set(krId, kr);
    return kr;
  }

  /**
   * Delete an OKR set
   */
  async delete(okrId: string): Promise<boolean> {
    const okrSet = this.okrSets.get(okrId);
    if (!okrSet) return false;

    // Delete key results
    for (const kr of okrSet.keyResults) {
      this.keyResults.delete(kr.id);
    }

    // Delete objective
    this.objectives.delete(okrSet.objective.id);

    // Delete OKR set
    return this.okrSets.delete(okrId);
  }

  /**
   * Calculate progress for a key result
   */
  private calculateKRProgress(type: KeyResultType, current: number, target: number): number {
    if (target === 0) return current > 0 ? 100 : 0;

    switch (type) {
      case KeyResultTypeEnum.BOOLEAN:
        return current >= 1 ? 100 : 0;

      case KeyResultTypeEnum.PERCENTAGE:
        return Math.min(100, Math.max(0, Math.round(current)));

      case KeyResultTypeEnum.CURRENCY:
      case KeyResultTypeEnum.NUMBER:
      case KeyResultTypeEnum.RATING:
      default:
        return Math.min(100, Math.round((current / target) * 100));
    }
  }

  /**
   * Recalculate objective progress based on key results
   */
  private recalculateObjectiveProgress(objective: Objective): void {
    if (objective.keyResults.length === 0) {
      objective.progress = {
        current: 0,
        target: 100,
        percentage: 0,
        trend: 'stable',
        lastUpdated: new Date().toISOString(),
      };
      return;
    }

    const totalProgress = objective.keyResults.reduce((sum, kr) => sum + kr.progress, 0);
    const avgProgress = totalProgress / objective.keyResults.length;

    objective.progress = {
      current: Math.round(avgProgress),
      target: 100,
      percentage: Math.round(avgProgress),
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get OKR statistics
   */
  getStats(): {
    total: number;
    byStatus: Record<OKRStatus, number>;
    averageProgress: number;
  } {
    const okrSets = Array.from(this.okrSets.values());

    const stats = {
      total: okrSets.length,
      byStatus: {
        [OKRStatusEnum.DRAFT]: 0,
        [OKRStatusEnum.ACTIVE]: 0,
        [OKRStatusEnum.COMPLETED]: 0,
        [OKRStatusEnum.CANCELLED]: 0,
      } as Record<OKRStatus, number>,
      averageProgress: 0,
    };

    for (const okr of okrSets) {
      stats.byStatus[okr.status]++;
    }

    if (okrSets.length > 0) {
      stats.averageProgress = Math.round(
        okrSets.reduce((sum, okr) => sum + okr.overallProgress, 0) / okrSets.length
      );
    }

    return stats;
  }

  /**
   * Check if OKR is achieved (all KRs at 100%)
   */
  isAchieved(okrId: string): boolean {
    const okr = this.okrSets.get(okrId);
    if (!okr) return false;

    return okr.keyResults.every(kr => kr.progress >= 100);
  }

  /**
   * Activate an OKR set
   */
  async activate(okrId: string): Promise<OKRSet | null> {
    const okr = this.okrSets.get(okrId);
    if (!okr) return null;

    const now = new Date().toISOString();
    okr.status = OKRStatusEnum.ACTIVE;
    okr.objective.status = OKRStatusEnum.ACTIVE;

    for (const kr of okr.keyResults) {
      kr.status = OKRStatusEnum.ACTIVE;
      this.keyResults.set(kr.id, kr);
    }

    this.objectives.set(okr.objective.id, okr.objective);
    this.okrSets.set(okrId, okr);

    return okr;
  }

  /**
   * Complete an OKR set
   */
  async complete(okrId: string): Promise<OKRSet | null> {
    const okr = this.okrSets.get(okrId);
    if (!okr) return null;

    const now = new Date().toISOString();
    okr.status = OKRStatusEnum.COMPLETED;
    okr.objective.status = OKRStatusEnum.COMPLETED;

    for (const kr of okr.keyResults) {
      kr.status = OKRStatusEnum.COMPLETED;
      this.keyResults.set(kr.id, kr);
    }

    this.objectives.set(okr.objective.id, okr.objective);
    this.okrSets.set(okrId, okr);

    return okr;
  }
}