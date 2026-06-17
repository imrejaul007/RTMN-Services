import { Flag, EvaluationContext, TargetingRule } from '../index';
import { TargetingService } from './targeting';

export interface EvaluationResult {
  result: boolean | string | number | object;
  reason: string;
  matchedRuleId?: string;
  rolloutPercentage?: number;
  variantKey?: string;
}

export class EvaluationService {
  private targetingService: TargetingService;

  constructor() {
    this.targetingService = new TargetingService();
  }

  /**
   * Evaluate a feature flag for a given context
   */
  evaluate(flag: Flag, context: EvaluationContext): EvaluationResult {
    // Check if flag is disabled
    if (!flag.enabled) {
      return {
        result: flag.defaultValue,
        reason: 'FLAG_DISABLED',
        rolloutPercentage: 0
      };
    }

    // Check rollout date constraints
    const rolloutCheck = this.checkRolloutDates(flag);
    if (!rolloutCheck.isActive) {
      return {
        result: flag.defaultValue,
        reason: rolloutCheck.reason,
        rolloutPercentage: flag.rollouts.percentage
      };
    }

    // Check targeting rules
    for (const rule of flag.targetingRules) {
      if (this.matchesRule(rule, context)) {
        return {
          result: true,
          reason: `RULE_MATCH: ${rule.id}`,
          matchedRuleId: rule.id,
          rolloutPercentage: 100
        };
      }
    }

    // Check percentage rollout
    const inRollout = this.isInRollout(context, flag);
    if (!inRollout) {
      return {
        result: flag.defaultValue,
        reason: 'ROLLOUT_EXCLUDED',
        rolloutPercentage: flag.rollouts.percentage
      };
    }

    // Check for multi-variant flags
    if (flag.variantType !== 'boolean' && flag.variants) {
      const variantKey = this.targetingService.determineVariant(flag, context);
      const variantValue = flag.variants[variantKey] ?? flag.defaultValue;

      return {
        result: variantValue,
        reason: `VARIANT: ${variantKey}`,
        variantKey,
        rolloutPercentage: flag.rollouts.percentage
      };
    }

    // Default: enabled with rollout percentage
    return {
      result: true,
      reason: 'ROLLOUT_MATCH',
      rolloutPercentage: flag.rollouts.percentage
    };
  }

  /**
   * Check if rollout dates are valid
   */
  private checkRolloutDates(flag: Flag): { isActive: boolean; reason: string } {
    const now = new Date();

    if (flag.rollouts.startDate) {
      const startDate = new Date(flag.rollouts.startDate);
      if (now < startDate) {
        return {
          isActive: false,
          reason: 'ROLLOUT_NOT_STARTED'
        };
      }
    }

    if (flag.rollouts.endDate) {
      const endDate = new Date(flag.rollouts.endDate);
      if (now > endDate) {
        return {
          isActive: false,
          reason: 'ROLLOUT_ENDED'
        };
      }
    }

    return { isActive: true, reason: '' };
  }

  /**
   * Check if a targeting rule matches the context
   */
  private matchesRule(rule: TargetingRule, context: EvaluationContext): boolean {
    const attributes = {
      ...context.attributes,
      userId: context.userId,
      anonymousId: context.anonymousId,
      environment: context.environment
    };

    const attributeValue = attributes[rule.attribute];

    if (attributeValue === undefined) {
      return false;
    }

    return this.evaluateCondition(rule, attributeValue);
  }

  /**
   * Evaluate a single targeting condition
   */
  private evaluateCondition(
    rule: TargetingRule,
    attributeValue: string | number | boolean | string[]
  ): boolean {
    const { operator, value } = rule;

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

      default:
        return false;
    }
  }

  /**
   * Determine if user is in the rollout percentage
   * Uses consistent hashing based on userId for stable results
   */
  private isInRollout(context: EvaluationContext, flag: Flag): boolean {
    const percentage = flag.rollouts.percentage;

    if (percentage >= 100) {
      return true;
    }

    if (percentage <= 0) {
      return false;
    }

    // Use userId or anonymousId for consistent bucketing
    const userId = context.userId || context.anonymousId;

    if (!userId) {
      // Random fallback for anonymous users without ID
      return Math.random() * 100 < percentage;
    }

    // Consistent hashing: hash(userId + flagKey) % 100
    const hash = this.hashString(`${userId}:${flag.id}`);
    const bucket = hash % 100;

    return bucket < percentage;
  }

  /**
   * Simple string hash function for consistent bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Evaluate multiple flags efficiently
   */
  evaluateBatch(flags: Flag[], context: EvaluationContext): Record<string, EvaluationResult> {
    const results: Record<string, EvaluationResult> = {};

    for (const flag of flags) {
      results[flag.key] = this.evaluate(flag, context);
    }

    return results;
  }

  /**
   * Precompute evaluation for a batch of users
   */
  evaluateForSegment(
    flag: Flag,
    users: Array<{ userId: string; attributes: Record<string, string | number | boolean> }>
  ): Array<{ userId: string; result: EvaluationResult }> {
    return users.map(user => ({
      userId: user.userId,
      result: this.evaluate(flag, {
        userId: user.userId,
        attributes: user.attributes,
        environment: 'production' // Default environment for batch evaluation
      })
    }));
  }
}
