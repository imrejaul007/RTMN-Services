// ============================================================================
// Objective Model
// ============================================================================

import { Objective, ObjectiveStatus } from '../types';

export class ObjectiveModel {
  private objectives: Map<string, Objective> = new Map();

  upsert(objective: Objective): Objective {
    this.objectives.set(objective.id, objective);
    return objective;
  }

  findById(id: string): Objective | undefined {
    return this.objectives.get(id);
  }

  findAll(filters?: { strategyId?: string; status?: ObjectiveStatus; owner?: string }): Objective[] {
    let results = Array.from(this.objectives.values());
    if (filters?.strategyId) results = results.filter(o => o.strategyId === filters.strategyId);
    if (filters?.status) results = results.filter(o => o.status === filters.status);
    if (filters?.owner) results = results.filter(o => o.owner === filters.owner);
    return results;
  }

  delete(id: string): boolean {
    return this.objectives.delete(id);
  }

  count(): number {
    return this.objectives.size;
  }

  countByStatus(): Record<ObjectiveStatus, number> {
    const counts: Record<ObjectiveStatus, number> = {
      'on-track': 0, 'at-risk': 0, 'off-track': 0, 'completed': 0, 'cancelled': 0,
    };
    this.objectives.forEach(o => { counts[o.status]++; });
    return counts;
  }
}

export const objectiveModel = new ObjectiveModel();
export default objectiveModel;
