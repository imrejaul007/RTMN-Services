import { v4 as uuidv4 } from 'uuid';

export type RuleOperator =
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'gt'      // greater than
  | 'lt'      // less than
  | 'gte'     // greater than or equal
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'nin'     // not in array
  | 'contains' // string contains
  | 'regex'   // regex match
  | 'startsWith'
  | 'endsWith'
  | 'semverEq'
  | 'semverGt'
  | 'semverLt';

export interface RuleCondition {
  attribute: string;
  operator: RuleOperator;
  value: string | number | boolean | string[] | number[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  serve: {
    variant?: string;
    percentage?: number;
  };
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class RuleModel {
  private static rules = new Map<string, Rule>();

  /**
   * Create a new targeting rule
   */
  static create(data: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Rule {
    const now = new Date().toISOString();

    const rule: Rule = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    // Validate conditions
    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    // Validate operators
    for (const condition of rule.conditions) {
      if (!this.isValidOperator(condition.operator)) {
        throw new Error(`Invalid operator: ${condition.operator}`);
      }
    }

    // Set default priority if not provided
    if (rule.priority === undefined) {
      rule.priority = this.getNextPriority();
    }

    RuleModel.rules.set(rule.id, rule);
    return rule;
  }

  /**
   * Validate operator
   */
  private static isValidOperator(operator: string): boolean {
    const validOperators: RuleOperator[] = [
      'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
      'in', 'nin', 'contains', 'regex',
      'startsWith', 'endsWith',
      'semverEq', 'semverGt', 'semverLt'
    ];
    return validOperators.includes(operator as RuleOperator);
  }

  /**
   * Get next available priority
   */
  private static getNextPriority(): number {
    const priorities = Array.from(this.rules.values()).map(r => r.priority);
    return priorities.length > 0 ? Math.max(...priorities) + 1 : 1;
  }

  /**
   * Find rule by ID
   */
  static findById(id: string): Rule | undefined {
    return RuleModel.rules.get(id);
  }

  /**
   * Get all rules
   */
  static findAll(filters?: {
    isActive?: boolean;
    sortBy?: 'priority' | 'createdAt';
  }): Rule[] {
    let result = Array.from(RuleModel.rules.values());

    if (filters?.isActive !== undefined) {
      result = result.filter(r => r.isActive === filters.isActive);
    }

    if (filters?.sortBy === 'priority') {
      result.sort((a, b) => a.priority - b.priority);
    } else {
      result.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }

  /**
   * Update a rule
   */
  static update(id: string, data: Partial<Rule>): Rule | null {
    const rule = RuleModel.rules.get(id);
    if (!rule) {
      return null;
    }

    // Validate operators if being updated
    if (data.conditions) {
      for (const condition of data.conditions) {
        if (!this.isValidOperator(condition.operator)) {
          throw new Error(`Invalid operator: ${condition.operator}`);
        }
      }
    }

    const updatedRule: Rule = {
      ...rule,
      ...data,
      id: rule.id,
      createdAt: rule.createdAt,
      updatedAt: new Date().toISOString()
    };

    RuleModel.rules.set(id, updatedRule);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  static delete(id: string): boolean {
    return RuleModel.rules.delete(id);
  }

  /**
   * Evaluate a rule against context
   */
  static evaluate(rule: Rule, context: Record<string, string | number | boolean | string[]>): boolean {
    if (!rule.isActive) {
      return false;
    }

    const results: boolean[] = [];

    for (const condition of rule.conditions) {
      const attributeValue = context[condition.attribute];
      const result = this.evaluateCondition(condition, attributeValue);
      results.push(result);
    }

    if (rule.conditionLogic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: RuleCondition,
    attributeValue: string | number | boolean | string[] | undefined
  ): boolean {
    const { operator, value } = condition;

    // Handle undefined/null attribute values
    if (attributeValue === undefined || attributeValue === null) {
      return operator === 'neq' || operator === 'nin';
    }

    switch (operator) {
      case 'eq':
        return attributeValue === value;

      case 'neq':
        return attributeValue !== value;

      case 'gt':
        if (typeof attributeValue === 'number' && typeof value === 'number') {
          return attributeValue > value;
        }
        return false;

      case 'lt':
        if (typeof attributeValue === 'number' && typeof value === 'number') {
          return attributeValue < value;
        }
        return false;

      case 'gte':
        if (typeof attributeValue === 'number' && typeof value === 'number') {
          return attributeValue >= value;
        }
        return false;

      case 'lte':
        if (typeof attributeValue === 'number' && typeof value === 'number') {
          return attributeValue <= value;
        }
        return false;

      case 'in':
        if (Array.isArray(value)) {
          return value.includes(attributeValue as string | number);
        }
        return false;

      case 'nin':
        if (Array.isArray(value)) {
          return !value.includes(attributeValue as string | number);
        }
        return true;

      case 'contains':
        if (typeof attributeValue === 'string' && typeof value === 'string') {
          return attributeValue.includes(value);
        }
        return false;

      case 'regex':
        if (typeof attributeValue === 'string' && typeof value === 'string') {
          try {
            const regex = new RegExp(value);
            return regex.test(attributeValue);
          } catch {
            return false;
          }
        }
        return false;

      case 'startsWith':
        if (typeof attributeValue === 'string' && typeof value === 'string') {
          return attributeValue.startsWith(value);
        }
        return false;

      case 'endsWith':
        if (typeof attributeValue === 'string' && typeof value === 'string') {
          return attributeValue.endsWith(value);
        }
        return false;

      case 'semverEq':
      case 'semverGt':
      case 'semverLt':
        return this.compareSemver(attributeValue, value, operator.replace('semver', ''));

      default:
        return false;
    }
  }

  /**
   * Compare semantic version strings
   */
  private static compareSemver(
    version1: string | number | boolean | string[],
    version2: string | number | boolean | string[],
    operator: string
  ): boolean {
    if (typeof version1 !== 'string' || typeof version2 !== 'string') {
      return false;
    }

    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);

    const [v1, v2] = [parse(version1), parse(version2)];

    for (let i = 0; i < 3; i++) {
      const diff = (v1[i] || 0) - (v2[i] || 0);
      if (diff !== 0) {
        if (operator === 'gt') return diff > 0;
        if (operator === 'lt') return diff < 0;
        return false;
      }
    }

    return operator === 'eq';
  }

  /**
   * Get rule statistics
   */
  static getStats(): {
    total: number;
    active: number;
    inactive: number;
    byLogic: Record<string, number>;
  } {
    const allRules = Array.from(RuleModel.rules.values());

    return {
      total: allRules.length,
      active: allRules.filter(r => r.isActive).length,
      inactive: allRules.filter(r => !r.isActive).length,
      byLogic: {
        AND: allRules.filter(r => r.conditionLogic === 'AND').length,
        OR: allRules.filter(r => r.conditionLogic === 'OR').length
      }
    };
  }
}
