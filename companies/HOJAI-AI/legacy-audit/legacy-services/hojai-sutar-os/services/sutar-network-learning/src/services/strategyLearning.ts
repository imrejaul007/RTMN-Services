// ============================================================================
// SUTAR Network Learning - Strategy Learning Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Strategy,
  StrategyCondition,
  Pattern,
  LearningData,
  PatternType
} from './types';

interface StrategyOutcome {
  strategyId: string;
  timestamp: string;
  context: Record<string, any>;
  success: boolean;
  reward: number;
  duration: number;
}

interface StrategyPerformance {
  totalExecutions: number;
  successfulExecutions: number;
  averageReward: number;
  averageDuration: number;
  lastExecuted: string;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

interface StrategyEvolution {
  id: string;
  parentStrategyId: string;
  childStrategyId: string;
  mutation: string;
  reason: string;
  parentPerformance: number;
  childPerformance: number;
  timestamp: string;
}

class StrategyLearningService {
  private strategies: Map<string, Strategy> = new Map();
  private outcomes: Map<string, StrategyOutcome[]> = new Map();
  private evolutions: StrategyEvolution[] = [];
  private strategyTemplates: Map<string, StrategyTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    this.strategyTemplates.set('aggressive', {
      name: 'Aggressive Growth',
      description: 'High-risk, high-reward strategy',
      conditions: [
        { field: 'riskTolerance', operator: 'gte', value: 0.7 },
        { field: 'marketCondition', operator: 'eq', value: 'bullish' }
      ],
      actions: ['leverage', 'expand', 'accelerate'],
      expectedOutcome: 'success',
      riskLevel: 'high'
    });

    this.strategyTemplates.set('conservative', {
      name: 'Conservative',
      description: 'Low-risk, steady returns strategy',
      conditions: [
        { field: 'riskTolerance', operator: 'lte', value: 0.3 },
        { field: 'marketCondition', operator: 'eq', value: 'volatile' }
      ],
      actions: ['hold', 'monitor', 'reduce'],
      expectedOutcome: 'neutral',
      riskLevel: 'low'
    });

    this.strategyTemplates.set('balanced', {
      name: 'Balanced',
      description: 'Moderate risk, balanced approach',
      conditions: [
        { field: 'riskTolerance', operator: 'gte', value: 0.4 },
        { field: 'riskTolerance', operator: 'lte', value: 0.6 }
      ],
      actions: ['maintain', 'adjust', 'evaluate'],
      expectedOutcome: 'success',
      riskLevel: 'medium'
    });
  }

  // Create a new strategy from patterns
  createStrategy(params: {
    name: string;
    description?: string;
    patterns: Pattern[];
    context?: Record<string, any>;
    tags?: string[];
  }): Strategy {
    const strategyId = `strategy-${uuidv4()}`;

    const actions = this.extractActionsFromPatterns(params.patterns);
    const conditions = this.extractConditionsFromPatterns(params.patterns, params.context);

    const strategy: Strategy = {
      id: strategyId,
      name: params.name,
      description: params.description || `Strategy derived from ${params.patterns.length} patterns`,
      actions,
      conditions,
      expectedOutcome: this.determineExpectedOutcome(params.patterns),
      successRate: this.calculateInitialSuccessRate(params.patterns),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'experimental',
      tags: params.tags || [],
      metadata: {
        sourcePatterns: params.patterns.map(p => p.id),
        confidence: this.calculateStrategyConfidence(params.patterns)
      }
    };

    this.strategies.set(strategyId, strategy);
    this.outcomes.set(strategyId, []);

    console.log(`[STRATEGY] Created strategy: ${strategy.name} (${strategyId})`);
    return strategy;
  }

  // Extract actions from patterns
  private extractActionsFromPatterns(patterns: Pattern[]): string[] {
    const actions = new Set<string>();
    patterns.forEach(p => {
      p.triggers.forEach(t => {
        if (!t.includes(':')) {
          actions.add(t);
        }
      });
    });
    return Array.from(actions);
  }

  // Extract conditions from patterns
  private extractConditionsFromPatterns(patterns: Pattern[], context?: Record<string, any>): StrategyCondition[] {
    const conditions: StrategyCondition[] = [];

    patterns.forEach(p => {
      p.triggers.forEach(t => {
        if (t.includes(':')) {
          const [field, value] = t.split(':');
          conditions.push({
            field,
            operator: 'eq',
            value: this.parseValue(value)
          });
        }
      });
    });

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        conditions.push({
          field: key,
          operator: this.inferOperator(value),
          value
        });
      });
    }

    return conditions;
  }

  // Parse value to appropriate type
  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  // Infer operator from value type
  private inferOperator(value: any): StrategyCondition['operator'] {
    if (typeof value === 'number') return 'gte';
    if (typeof value === 'string') return 'contains';
    return 'eq';
  }

  // Determine expected outcome from patterns
  private determineExpectedOutcome(patterns: Pattern[]): PatternType {
    const successRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    if (successRate > 70) return 'success';
    if (successRate < 30) return 'failure';
    return 'neutral';
  }

  // Calculate initial success rate
  private calculateInitialSuccessRate(patterns: Pattern[]): number {
    if (patterns.length === 0) return 50;
    return patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
  }

  // Calculate strategy confidence
  private calculateStrategyConfidence(patterns: Pattern[]): number {
    if (patterns.length === 0) return 0;
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const consistencyBonus = patterns.every(p => p.type === patterns[0].type) ? 0.1 : 0;
    return Math.min(1, avgConfidence + consistencyBonus);
  }

  // Record strategy outcome
  recordOutcome(strategyId: string, outcome: Omit<StrategyOutcome, 'strategyId'>): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const fullOutcome: StrategyOutcome = {
      ...outcome,
      strategyId
    };

    this.outcomes.get(strategyId)!.push(fullOutcome);
    strategy.usageCount++;
    strategy.updatedAt = new Date().toISOString();

    this.updateStrategySuccessRate(strategyId);
    this.checkForEvolution(strategyId);
  }

  // Update strategy success rate based on outcomes
  private updateStrategySuccessRate(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    const outcomes = this.outcomes.get(strategyId) || [];
    if (outcomes.length === 0) return;

    const successes = outcomes.filter(o => o.success).length;
    const newRate = (successes / outcomes.length) * 100;

    strategy.successRate = (strategy.successRate * 0.7) + (newRate * 0.3);

    if (strategy.successRate > 80 && strategy.status === 'experimental') {
      strategy.status = 'active';
    } else if (strategy.successRate < 30 && outcomes.length > 10) {
      strategy.status = 'archived';
    }
  }

  // Check if strategy should evolve
  private checkForEvolution(strategyId: string): void {
    const outcomes = this.outcomes.get(strategyId) || [];
    if (outcomes.length < 20) return;

    const recentOutcomes = outcomes.slice(-10);
    const olderOutcomes = outcomes.slice(-20, -10);

    if (recentOutcomes.length < 5 || olderOutcomes.length < 5) return;

    const recentSuccessRate = recentOutcomes.filter(o => o.success).length / recentOutcomes.length;
    const olderSuccessRate = olderOutcomes.filter(o => o.success).length / olderOutcomes.length;

    if (recentSuccessRate < olderSuccessRate - 0.2) {
      this.evolveStrategy(strategyId, 'performance_decline');
    }
  }

  // Evolve strategy based on performance
  evolveStrategy(strategyId: string, reason: string): Strategy | null {
    const parentStrategy = this.strategies.get(strategyId);
    if (!parentStrategy) return null;

    const evolvedStrategy = this.createStrategy({
      name: `${parentStrategy.name} (evolved)`,
      description: `Evolved from ${parentStrategy.name} due to ${reason}`,
      patterns: [],
      tags: [...parentStrategy.tags, 'evolved']
    });

    evolvedStrategy.actions = this.mutateActions(parentStrategy.actions);
    evolvedStrategy.conditions = this.mutateConditions(parentStrategy.conditions);

    const evolution: StrategyEvolution = {
      id: `evolution-${uuidv4()}`,
      parentStrategyId: strategyId,
      childStrategyId: evolvedStrategy.id,
      mutation: this.describeMutation(parentStrategy, evolvedStrategy),
      reason,
      parentPerformance: parentStrategy.successRate,
      childPerformance: evolvedStrategy.successRate,
      timestamp: new Date().toISOString()
    };

    this.evolutions.push(evolution);

    console.log(`[STRATEGY] Evolved strategy: ${strategyId} -> ${evolvedStrategy.id}`);
    return evolvedStrategy;
  }

  // Mutate actions for evolution
  private mutateActions(actions: string[]): string[] {
    const mutations = ['optimize', 'combine', 'sequence', 'parallel'];
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];

    switch (mutation) {
      case 'optimize':
        return actions.map(a => `optimized_${a}`);
      case 'combine':
        return [actions.slice(0, Math.ceil(actions.length / 2)).join('_')];
      case 'sequence':
        return [...actions, 'monitor', 'adjust'];
      case 'parallel':
        return actions.map(a => `concurrent_${a}`);
      default:
        return actions;
    }
  }

  // Mutate conditions for evolution
  private mutateConditions(conditions: StrategyCondition[]): StrategyCondition[] {
    return conditions.map(c => {
      if (c.operator === 'eq' && typeof c.value === 'number') {
        return {
          ...c,
          operator: 'gte' as const,
          value: c.value * 0.9
        };
      }
      return c;
    });
  }

  // Describe mutation
  private describeMutation(parent: Strategy, child: Strategy): string {
    const changes: string[] = [];

    if (parent.actions.length !== child.actions.length) {
      changes.push(`actions changed from ${parent.actions.length} to ${child.actions.length}`);
    }

    if (JSON.stringify(parent.conditions) !== JSON.stringify(child.conditions)) {
      changes.push('conditions modified');
    }

    return changes.join(', ') || 'no significant changes';
  }

  // Check if strategy matches context
  matchesContext(strategyId: string, context: Record<string, any>): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    return strategy.conditions.every(condition => {
      const value = context[condition.field];
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  // Evaluate condition
  private evaluateCondition(value: any, operator: StrategyCondition['operator'], expected: any): boolean {
    switch (operator) {
      case 'eq': return value === expected;
      case 'ne': return value !== expected;
      case 'gt': return value > expected;
      case 'lt': return value < expected;
      case 'gte': return value >= expected;
      case 'lte': return value <= expected;
      case 'contains': return String(value).includes(String(expected));
      default: return false;
    }
  }

  // Get strategy performance
  getStrategyPerformance(strategyId: string): StrategyPerformance | null {
    const strategy = this.strategies.get(strategyId);
    const outcomes = this.outcomes.get(strategyId) || [];

    if (!strategy || outcomes.length === 0) {
      return null;
    }

    const successes = outcomes.filter(o => o.success);
    const rewards = outcomes.map(o => o.reward);
    const durations = outcomes.map(o => o.duration);

    const recentOutcomes = outcomes.slice(-10);
    const olderOutcomes = outcomes.slice(-20, -10);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentOutcomes.length >= 5 && olderOutcomes.length >= 5) {
      const recentRate = successes.filter(o => recentOutcomes.includes(o)).length / recentOutcomes.length;
      const olderRate = successes.filter(o => olderOutcomes.includes(o)).length / olderOutcomes.length;
      if (recentRate > olderRate + 0.1) trend = 'improving';
      else if (recentRate < olderRate - 0.1) trend = 'declining';
    }

    return {
      totalExecutions: outcomes.length,
      successfulExecutions: successes.length,
      averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      lastExecuted: outcomes[outcomes.length - 1].timestamp,
      trend,
      confidence: Math.min(1, outcomes.length / 50)
    };
  }

  // Get all strategies
  getStrategies(filters?: {
    status?: Strategy['status'];
    minSuccessRate?: number;
    tags?: string[];
  }): Strategy[] {
    let result = Array.from(this.strategies.values());

    if (filters?.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters?.minSuccessRate !== undefined) {
      result = result.filter(s => s.successRate >= filters.minSuccessRate!);
    }
    if (filters?.tags && filters.tags.length > 0) {
      result = result.filter(s => filters.tags!.some(t => s.tags.includes(t)));
    }

    return result.sort((a, b) => b.successRate - a.successRate);
  }

  // Get strategy by ID
  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  // Apply strategy to context
  applyStrategy(strategyId: string, context: Record<string, any>): {
    strategy: Strategy;
    applicable: boolean;
    reason?: string;
    recommendedActions: string[];
  } {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const applicable = this.matchesContext(strategyId, context);
    const reason = applicable ? undefined : this.getNonMatchReason(strategy, context);

    return {
      strategy,
      applicable,
      reason,
      recommendedActions: applicable ? strategy.actions : []
    };
  }

  // Get reason why strategy doesn't match
  private getNonMatchReason(strategy: Strategy, context: Record<string, any>): string {
    for (const condition of strategy.conditions) {
      const value = context[condition.field];
      if (value === undefined) {
        return `Missing required context field: ${condition.field}`;
      }
      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return `${condition.field}=${value} does not satisfy ${condition.operator} ${condition.value}`;
      }
    }
    return 'Unknown reason';
  }

  // Get strategy templates
  getTemplates(): StrategyTemplate[] {
    return Array.from(this.strategyTemplates.values());
  }

  // Create strategy from template
  createFromTemplate(templateName: string, context: Record<string, any>): Strategy {
    const template = this.strategyTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return this.createStrategy({
      name: template.name,
      description: template.description,
      patterns: [],
      context,
      tags: [templateName, 'from_template']
    });
  }

  // Archive strategy
  archiveStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.status = 'archived';
      strategy.updatedAt = new Date().toISOString();
    }
  }

  // Get evolutions
  getEvolutions(): StrategyEvolution[] {
    return [...this.evolutions];
  }

  // Get strategy outcomes
  getStrategyOutcomes(strategyId: string): StrategyOutcome[] {
    return this.outcomes.get(strategyId) || [];
  }

  // Export strategy for sharing
  exportStrategy(strategyId: string): ExportableStrategy | null {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    return {
      ...strategy,
      outcomes: this.outcomes.get(strategyId) || []
    };
  }

  // Clear all data
  clearData(): void {
    this.strategies.clear();
    this.outcomes.clear();
    this.evolutions = [];
  }
}

interface StrategyTemplate {
  name: string;
  description: string;
  conditions: StrategyCondition[];
  actions: string[];
  expectedOutcome: PatternType;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ExportableStrategy extends Strategy {
  outcomes: StrategyOutcome[];
}

export const strategyLearningService = new StrategyLearningService();
export default strategyLearningService;
