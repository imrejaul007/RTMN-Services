// Rule Engine - Forward and Backward Chaining

export interface Rule {
  id: string;
  name: string;
  antecedent: Condition[];
  consequent: Action[];
  priority?: number;
  enabled?: boolean;
}

export interface Condition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'exists' | 'notExists';
  value: any;
}

export interface Action {
  type: 'assert' | 'retract' | 'notify' | 'execute';
  attribute?: string;
  value?: any;
  service?: string;
}

export interface Fact {
  id: string;
  attribute: string;
  value: any;
  confidence?: number;
  source?: string;
  timestamp: Date;
}

// Forward chaining: data → conclusions
export function forwardChain(rules: Rule[], facts: Fact[]): { newFacts: Fact[], actions: Action[] } {
  const newFacts: Fact[] = [];
  const actions: Action[] = [];
  const firedRules = new Set<string>();

  let changed = true;
  while (changed) {
    changed = false;

    for (const rule of rules) {
      if (!rule.enabled || firedRules.has(rule.id)) continue;

      if (evaluateConditions(rule.antecedent, facts)) {
        firedRules.add(rule.id);
        changed = true;

        for (const action of rule.consequent) {
          if (action.type === 'assert' && action.attribute) {
            newFacts.push({
              id: `derived-${rule.id}-${Date.now()}`,
              attribute: action.attribute,
              value: action.value,
              confidence: 1.0,
              source: `rule:${rule.name}`,
              timestamp: new Date()
            });
          } else {
            actions.push(action);
          }
        }
      }
    }
  }

  return { newFacts, actions };
}

// Backward chaining: goal → subgoals
export function backwardChain(rules: Rule[], goal: Fact, facts: Fact[]): {
  success: boolean;
  path: { rule: Rule; facts: Fact[] }[]
} {
  const path: { rule: Rule; facts: Fact[] }[] = [];

  function prove(goalAttr: string, goalValue: any): boolean {
    // Check if fact exists
    const existingFact = facts.find(f => f.attribute === goalAttr && f.value === goalValue);
    if (existingFact) return true;

    // Find rules that can derive this goal
    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Check if rule consequent matches goal
      const matchingConsequent = rule.consequent.find(
        c => c.type === 'assert' && c.attribute === goalAttr
      );
      if (!matchingConsequent) continue;

      // Try to prove all antecedents
      const antecedentFacts: Fact[] = [];
      let allProven = true;

      for (const condition of rule.antecedent) {
        const fact = facts.find(f =>
          f.attribute === condition.attribute &&
          evaluateOperator(f.value, condition.operator, condition.value)
        );
        if (fact) {
          antecedentFacts.push(fact);
        } else {
          // Try to derive the antecedent
          if (!prove(condition.attribute, condition.value)) {
            allProven = false;
            break;
          }
        }
      }

      if (allProven) {
        path.push({ rule, facts: antecedentFacts });
        return true;
      }
    }

    return false;
  }

  const success = prove(goal.attribute, goal.value);
  return { success, path };
}

function evaluateConditions(conditions: Condition[], facts: Fact[]): boolean {
  return conditions.every(condition => {
    const fact = facts.find(f => f.attribute === condition.attribute);
    if (!fact) {
      return condition.operator === 'notExists';
    }

    if (condition.operator === 'exists') return true;

    return evaluateOperator(fact.value, condition.operator, condition.value);
  });
}

function evaluateOperator(value: any, operator: Condition['operator'], target: any): boolean {
  switch (operator) {
    case 'eq': return value === target;
    case 'ne': return value !== target;
    case 'gt': return value > target;
    case 'gte': return value >= target;
    case 'lt': return value < target;
    case 'lte': return value <= target;
    case 'contains': return String(value).includes(String(target));
    case 'exists': return value !== undefined && value !== null;
    case 'notExists': return value === undefined || value === null;
    default: return false;
  }
}
