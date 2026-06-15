// ============================================================================
// Strategy Model
// ============================================================================

import { Strategy, StrategyStatus } from '../types';

export class StrategyModel {
  private strategies: Map<string, Strategy> = new Map();

  upsert(strategy: Strategy): Strategy {
    this.strategies.set(strategy.id, strategy);
    return strategy;
  }

  findById(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  findAll(filters?: { status?: StrategyStatus; owner?: string }): Strategy[] {
    let results = Array.from(this.strategies.values());
    if (filters?.status) results = results.filter(s => s.status === filters.status);
    if (filters?.owner) results = results.filter(s => s.owner === filters.owner);
    return results;
  }

  delete(id: string): boolean {
    return this.strategies.delete(id);
  }

  count(): number {
    return this.strategies.size;
  }
}

export const strategyModel = new StrategyModel();
export default strategyModel;
