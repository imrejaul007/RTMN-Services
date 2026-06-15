// Goal Mapper - Maps BOA objectives to SUTAR goals (1:1, 1:N, N:1)
import { v4 as uuidv4 } from 'uuid';
import { StrategicGoal, ExecutionGoal } from '../types';
import { logger } from '../utils/logger';

export interface MappingRule {
  id: string;
  name: string;
  type: '1:1' | '1:N' | 'N:1';
  conditions: Array<{ source: string; operator: string; value: any }>;
  transform: (source: any) => any;
  active: boolean;
}

export class GoalMapper {
  private mappings: Map<string, MappingRule> = new Map();
  private mappingHistory: Array<{ ruleId: string; boaId: string; sutarId: string; at: Date }> = [];

  /**
   * Default 1:1 mapping rule
   */
  private defaultRule(): MappingRule {
    return {
      id: uuidv4(),
      name: 'Default 1:1 mapping',
      type: '1:1',
      conditions: [],
      transform: (boa: any) => ({
        id: uuidv4(),
        title: boa.title,
        description: boa.description,
        priority: this.mapPriority(boa.priority),
        status: this.mapStatus(boa.status),
        owner: boa.owner,
        dueDate: boa.dueDate,
        tags: boa.tags || [],
        metrics: (boa.keyResults || []).map((kr: any) => ({
          name: kr.metric,
          target: kr.targetValue,
          current: kr.currentValue,
          unit: kr.unit,
        })),
      }),
      active: true,
    };
  }

  constructor() {
    const defaultRule = this.defaultRule();
    this.mappings.set(defaultRule.id, defaultRule);
  }

  /**
   * Add a mapping rule
   */
  addMappingRule(rule: Omit<MappingRule, 'id'>): MappingRule {
    const fullRule: MappingRule = { ...rule, id: uuidv4() };
    this.mappings.set(fullRule.id, fullRule);
    logger.info(`[GoalMapper] Added mapping rule: ${fullRule.name} (${fullRule.type})`);
    return fullRule;
  }

  /**
   * Map BOA objective to SUTAR goal using applicable rules
   */
  mapToSutar(boaObjective: any): StrategicGoal | null {
    const rule = this.findApplicableRule(boaObjective);
    if (!rule) {
      logger.warn(`[GoalMapper] No applicable rule for objective ${boaObjective.id}`);
      return null;
    }
    const transformed = rule.transform(boaObjective);
    const sutarGoal: StrategicGoal = {
      id: uuidv4(),
      boaObjectiveId: boaObjective.id,
      title: transformed.title,
      description: transformed.description,
      priority: transformed.priority,
      status: transformed.status,
      progress: boaObjective.progress || 0,
      owner: transformed.owner,
      dueDate: transformed.dueDate,
      tags: transformed.tags,
      metrics: transformed.metrics || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mappingHistory.push({ ruleId: rule.id, boaId: boaObjective.id, sutarId: sutarGoal.id, at: new Date() });
    return sutarGoal;
  }

  /**
   * Map 1:N - one BOA objective to multiple SUTAR goals
   */
  mapOneToMany(boaObjective: any, splitBy: 'keyResult' | 'tag' | 'metric'): StrategicGoal[] {
    const goals: StrategicGoal[] = [];
    if (splitBy === 'keyResult' && boaObjective.keyResults) {
      boaObjective.keyResults.forEach((kr: any) => {
        goals.push({
          id: uuidv4(),
          boaObjectiveId: boaObjective.id,
          title: `${boaObjective.title} - ${kr.description}`,
          description: `SUTAR goal for key result: ${kr.description}`,
          priority: this.mapPriority(boaObjective.priority),
          status: this.mapStatus(kr.status || boaObjective.status),
          progress: kr.progress || 0,
          owner: boaObjective.owner,
          dueDate: kr.dueDate || boaObjective.dueDate,
          tags: [...(boaObjective.tags || []), 'split-by-kr'],
          metrics: [{ name: kr.metric, target: kr.targetValue, current: kr.currentValue, unit: kr.unit }],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    } else if (splitBy === 'tag' && boaObjective.tags) {
      boaObjective.tags.forEach((tag: string) => {
        goals.push({
          id: uuidv4(),
          boaObjectiveId: boaObjective.id,
          title: `${boaObjective.title} [${tag}]`,
          description: boaObjective.description,
          priority: this.mapPriority(boaObjective.priority),
          status: this.mapStatus(boaObjective.status),
          progress: boaObjective.progress || 0,
          owner: boaObjective.owner,
          dueDate: boaObjective.dueDate,
          tags: [tag, 'split-by-tag'],
          metrics: (boaObjective.keyResults || []).map((kr: any) => ({
            name: kr.metric, target: kr.targetValue, current: kr.currentValue, unit: kr.unit,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }
    return goals;
  }

  /**
   * Map N:1 - multiple BOA objectives to single SUTAR goal (aggregation)
   */
  mapManyToOne(boaObjectives: any[], aggregatedTitle: string): StrategicGoal {
    const totalProgress = boaObjectives.reduce((s, o) => s + (o.progress || 0), 0) / boaObjectives.length;
    const allTags = Array.from(new Set(boaObjectives.flatMap(o => o.tags || [])));
    const allKRs = boaObjectives.flatMap(o => o.keyResults || []);
    return {
      id: uuidv4(),
      boaObjectiveId: boaObjectives[0]?.id || '',
      title: aggregatedTitle,
      description: `Aggregated SUTAR goal from ${boaObjectives.length} BOA objectives`,
      priority: this.mapPriority('high'),
      status: this.mapStatus(boaObjectives[0]?.status),
      progress: Math.round(totalProgress),
      owner: boaObjectives[0]?.owner || 'aggregated',
      dueDate: new Date(Math.max(...boaObjectives.map(o => new Date(o.dueDate).getTime()))),
      tags: [...allTags, 'aggregated', `count-${boaObjectives.length}`],
      metrics: allKRs.map((kr: any) => ({ name: kr.metric, target: kr.targetValue, current: kr.currentValue, unit: kr.unit })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private findApplicableRule(boaObjective: any): MappingRule | null {
    const activeRules = Array.from(this.mappings.values()).filter(r => r.active);
    for (const rule of activeRules) {
      if (this.ruleMatches(rule, boaObjective)) return rule;
    }
    return activeRules[0] || null;
  }

  private ruleMatches(rule: MappingRule, objective: any): boolean {
    if (rule.conditions.length === 0) return true;
    return rule.conditions.every(c => {
      const val = this.resolveField(objective, c.source);
      switch (c.operator) {
        case 'eq': return val === c.value;
        case 'neq': return val !== c.value;
        case 'gt': return val > c.value;
        case 'lt': return val < c.value;
        case 'in': return Array.isArray(c.value) && c.value.includes(val);
        case 'contains': return typeof val === 'string' && val.includes(c.value);
        default: return true;
      }
    });
  }

  private resolveField(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  private mapPriority(p: string): 'P0' | 'P1' | 'P2' | 'P3' {
    const map: Record<string, 'P0' | 'P1' | 'P2' | 'P3'> = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3' };
    return map[p] || 'P2';
  }

  private mapStatus(s: string): string {
    const map: Record<string, string> = {
      'on-track': 'active', 'at-risk': 'at_risk', 'off-track': 'blocked',
      'completed': 'completed', 'cancelled': 'cancelled',
    };
    return map[s] || 'active';
  }

  getAllRules(): MappingRule[] { return Array.from(this.mappings.values()); }
  getMappingHistory(): typeof this.mappingHistory { return this.mappingHistory; }
}

export const goalMapper = new GoalMapper();
export default goalMapper;
