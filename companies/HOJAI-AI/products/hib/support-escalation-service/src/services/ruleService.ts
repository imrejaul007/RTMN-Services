/**
 * Rule Service - Business logic for escalation rules
 */

import { v4 as uuidv4 } from 'uuid';
import { Rule, IRule, RuleConditionType, RuleActionType } from '../models/Rule';
import logger from '../utils/logger';

export interface CreateRuleInput {
  name: string;
  description?: string;
  conditions: Array<{
    type: RuleConditionType;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number | boolean;
  }>;
  conditionLogic?: 'AND' | 'OR';
  actions: Array<{
    type: RuleActionType;
    value: string;
  }>;
  escalationLevel: string;
  targetTeam?: string;
  targetUser?: string;
  cooldownMinutes?: number;
}

export class RuleService {
  /**
   * Create a new escalation rule
   */
  async createRule(input: CreateRuleInput): Promise<IRule> {
    const ruleData: Partial<IRule> = {
      ruleId: `RUL-${uuidv4().slice(0, 8).toUpperCase()}`,
      name: input.name,
      description: input.description || '',
      isActive: true,
      priority: 0,
      conditions: input.conditions,
      conditionLogic: input.conditionLogic || 'AND',
      actions: input.actions,
      escalationLevel: input.escalationLevel,
      targetTeam: input.targetTeam,
      targetUser: input.targetUser,
      cooldownMinutes: input.cooldownMinutes || 60,
      triggerCount: 0,
    };

    const rule = new Rule(ruleData);
    await rule.save();

    logger.info('Rule created', { ruleId: rule.ruleId, name: input.name });
    return rule;
  }

  /**
   * Get rule by ID
   */
  async getRuleById(ruleId: string): Promise<IRule | null> {
    return Rule.findOne({ ruleId }).exec();
  }

  /**
   * Get all rules
   */
  async getRules(includeInactive = false): Promise<IRule[]> {
    const query: Record<string, unknown> = {};
    if (!includeInactive) query.isActive = true;
    return Rule.find(query).sort({ priority: -1, createdAt: -1 }).exec();
  }

  /**
   * Update rule
   */
  async updateRule(ruleId: string, updates: Partial<IRule>): Promise<IRule | null> {
    const updated = await Rule.findOneAndUpdate(
      { ruleId },
      { $set: updates },
      { new: true }
    ).exec();

    if (updated) {
      logger.info('Rule updated', { ruleId, updates: Object.keys(updates) });
    }
    return updated;
  }

  /**
   * Delete rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = await Rule.findOneAndDelete({ ruleId }).exec();
    if (deleted) {
      logger.info('Rule deleted', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId: string): Promise<IRule | null> {
    const rule = await Rule.findOne({ ruleId }).exec();
    if (!rule) return null;

    rule.isActive = !rule.isActive;
    await rule.save();

    logger.info('Rule toggled', { ruleId, isActive: rule.isActive });
    return rule;
  }

  /**
   * Update rule priorities
   */
  async updatePriorities(priorities: Array<{ ruleId: string; priority: number }>): Promise<void> {
    const bulkOps = priorities.map(item => ({
      updateOne: {
        filter: { ruleId: item.ruleId },
        update: { $set: { priority: item.priority } },
      },
    }));

    await Rule.bulkWrite(bulkOps);
    logger.info('Rule priorities updated', { count: priorities.length });
  }

  /**
   * Get rules by condition type
   */
  async getRulesByConditionType(conditionType: RuleConditionType): Promise<IRule[]> {
    return Rule.find({
      isActive: true,
      'conditions.type': conditionType,
    }).sort({ priority: -1 }).exec();
  }

  /**
   * Test rule against ticket data (dry run)
   */
  async testRule(
    ruleId: string,
    ticketData: Record<string, unknown>
  ): Promise<{ matches: boolean; evaluatedConditions: Array<{ condition: string; result: boolean }> }> {
    const rule = await Rule.findOne({ ruleId }).exec();
    if (!rule) {
      return { matches: false, evaluatedConditions: [] };
    }

    const evaluatedConditions = rule.conditions.map(condition => {
      const result = this.evaluateCondition(condition, ticketData);
      return {
        condition: `${condition.type} ${condition.operator} ${condition.value}`,
        result,
      };
    });

    const matches = rule.conditionLogic === 'AND'
      ? evaluatedConditions.every(c => c.result)
      : evaluatedConditions.some(c => c.result);

    return { matches, evaluatedConditions };
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: { type: string; operator: string; value: unknown },
    ticketData: Record<string, unknown>
  ): boolean {
    const value = ticketData[condition.type];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }
}

export const ruleService = new RuleService();
export default ruleService;