// ============================================================================
// Strategy Engine - Core strategy decomposition logic
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Strategy, StrategicPillar, Objective, KeyResult } from '../types';
import { logger } from '../utils/logger';

/**
 * StrategyEngine transforms high-level business objectives into executable plans.
 * Hierarchy: Vision → Mission → Strategic Pillars → Objectives → Key Results
 */
export class StrategyEngine {
  private strategies: Map<string, Strategy> = new Map();
  private pillars: Map<string, StrategicPillar> = new Map();
  private objectives: Map<string, Objective> = new Map();

  /**
   * Create a complete strategy with pillars and objectives
   */
  createStrategy(input: {
    name: string;
    vision: string;
    mission: string;
    description: string;
    owner: string;
    horizon: Strategy['horizon'];
    startDate: Date;
    endDate: Date;
    pillars: Array<{ name: string; description: string; theme: string; owner: string }>;
    objectives: Array<{
      pillarName: string;
      title: string;
      description: string;
      priority: Objective['priority'];
      owner: string;
      keyResults: Array<{ description: string; metric: string; targetValue: number; unit: string; dueDate: Date }>;
    }>;
  }): { strategy: Strategy; pillars: StrategicPillar[]; objectives: Objective[] } {
    const strategyId = uuidv4();
    const now = new Date();

    // Create pillars
    const createdPillars: StrategicPillar[] = input.pillars.map(p => {
      const pillar: StrategicPillar = {
        id: uuidv4(),
        name: p.name,
        description: p.description,
        theme: p.theme,
        owner: p.owner,
        createdAt: now,
        updatedAt: now,
      };
      this.pillars.set(pillar.id, pillar);
      return pillar;
    });

    // Create strategy
    const strategy: Strategy = {
      id: strategyId,
      name: input.name,
      vision: input.vision,
      mission: input.mission,
      description: input.description,
      pillars: createdPillars.map(p => p.id),
      horizon: input.horizon,
      status: 'draft',
      owner: input.owner,
      startDate: input.startDate,
      endDate: input.endDate,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    this.strategies.set(strategyId, strategy);

    // Create objectives mapped to pillars
    const createdObjectives: Objective[] = input.objectives.map(obj => {
      const pillar = createdPillars.find(p => p.name === obj.pillarName);
      if (!pillar) {
        throw new Error(`Pillar ${obj.pillarName} not found for objective ${obj.title}`);
      }
      return this.createObjective({
        strategyId,
        pillarId: pillar.id,
        title: obj.title,
        description: obj.description,
        priority: obj.priority,
        owner: obj.owner,
        keyResults: obj.keyResults,
      });
    });

    return { strategy, pillars: createdPillars, objectives: createdObjectives };
  }

  /**
   * Create a single objective with key results
   */
  createObjective(input: {
    strategyId: string;
    pillarId: string;
    title: string;
    description: string;
    priority: Objective['priority'];
    owner: string;
    keyResults: Array<{ description: string; metric: string; targetValue: number; unit: string; dueDate: Date }>;
  }): Objective {
    const strategy = this.strategies.get(input.strategyId);
    if (!strategy) throw new Error(`Strategy ${input.strategyId} not found`);

    const now = new Date();
    const krs: KeyResult[] = input.keyResults.map(kr => ({
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
      tags: [],
      startDate: now,
      dueDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      createdAt: now,
      updatedAt: now,
    };

    // Link KRs back to objective
    objective.keyResults.forEach(kr => (kr.objectiveId = objective.id));

    this.objectives.set(objective.id, objective);
    logger.info(`[StrategyEngine] Created objective ${objective.id} - ${objective.title}`);
    return objective;
  }

  /**
   * Update key result progress
   */
  updateKeyResultProgress(objectiveId: string, keyResultId: string, currentValue: number): Objective {
    const objective = this.objectives.get(objectiveId);
    if (!objective) throw new Error(`Objective ${objectiveId} not found`);

    const kr = objective.keyResults.find(k => k.id === keyResultId);
    if (!kr) throw new Error(`Key result ${keyResultId} not found`);

    kr.currentValue = currentValue;
    kr.progress = Math.min(100, Math.max(0, (currentValue / kr.targetValue) * 100));

    // Recalculate objective progress as average of KRs
    const totalProgress = objective.keyResults.reduce((sum, k) => sum + k.progress, 0);
    objective.progress = totalProgress / objective.keyResults.length;
    objective.status = this.determineStatus(objective.progress, kr.dueDate);
    objective.updatedAt = new Date();

    return objective;
  }

  /**
   * Determine objective status based on progress and dates
   */
  private determineStatus(progress: number, dueDate: Date): Objective['status'] {
    if (progress >= 100) return 'completed';
    const now = new Date();
    const total = dueDate.getTime() - now.getTime();
    const expectedProgress = total > 0 ? Math.min(100, ((now.getTime() - (dueDate.getTime() - 90 * 24 * 60 * 60 * 1000)) / total) * 100) : 0;
    if (progress < expectedProgress * 0.5) return 'off-track';
    if (progress < expectedProgress * 0.8) return 'at-risk';
    return 'on-track';
  }

  getStrategy(id: string): Strategy | undefined { return this.strategies.get(id); }
  getAllStrategies(): Strategy[] { return Array.from(this.strategies.values()); }
  getPillar(id: string): StrategicPillar | undefined { return this.pillars.get(id); }
  getObjective(id: string): Objective | undefined { return this.objectives.get(id); }
  getObjectivesByStrategy(strategyId: string): Objective[] {
    return Array.from(this.objectives.values()).filter(o => o.strategyId === strategyId);
  }
}

export const strategyEngine = new StrategyEngine();
export default strategyEngine;
