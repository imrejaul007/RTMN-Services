import { Flag, EvaluationContext, TargetingRule } from '../index';

export interface TargetingMatch {
  matched: boolean;
  ruleId?: string;
  variantKey?: string;
  reason?: string;
}

export class TargetingService {
  /**
   * Determine which variant a user should receive
   */
  determineVariant(flag: Flag, context: EvaluationContext): string {
    if (!flag.variants || Object.keys(flag.variants).length === 0) {
      return 'default';
    }

    // First, check if any targeting rules match and specify a variant
    for (const rule of flag.targetingRules) {
      if (this.matchesRule(rule, context)) {
        // In a full implementation, rules would specify which variant to serve
        // For now, return the first variant that matches the rule priority
        return this.selectVariantForRule(flag, rule);
      }
    }

    // Fall back to percentage-based variant selection
    return this.selectVariantByPercentage(flag, context);
  }

  /**
   * Check if context matches a targeting rule
   */
  matchesRule(rule: TargetingRule, context: EvaluationContext): boolean {
    const attributes = {
      ...context.attributes,
      userId: context.userId,
      anonymousId: context.anonymousId
    };

    const attributeValue = attributes[rule.attribute];

    if (attributeValue === undefined) {
      return false;
    }

    return this.evaluateCondition(rule, attributeValue);
  }

  /**
   * Evaluate a targeting condition
   */
  private evaluateCondition(
    rule: TargetingRule,
    attributeValue: string | number | boolean | string[] | undefined
  ): boolean {
    if (attributeValue === undefined) {
      return false;
    }

    const { operator, value } = rule;

    switch (operator) {
      case 'eq':
        return attributeValue === value;

      case 'neq':
        return attributeValue !== value;

      case 'gt':
        return typeof attributeValue === 'number' && typeof value === 'number'
          ? attributeValue > value
          : false;

      case 'lt':
        return typeof attributeValue === 'number' && typeof value === 'number'
          ? attributeValue < value
          : false;

      case 'gte':
        return typeof attributeValue === 'number' && typeof value === 'number'
          ? attributeValue >= value
          : false;

      case 'lte':
        return typeof attributeValue === 'number' && typeof value === 'number'
          ? attributeValue <= value
          : false;

      case 'in':
        return Array.isArray(value)
          ? value.includes(attributeValue as string | number)
          : false;

      case 'nin':
        return Array.isArray(value)
          ? !value.includes(attributeValue as string | number)
          : true;

      case 'contains':
        return typeof attributeValue === 'string' && typeof value === 'string'
          ? attributeValue.includes(value)
          : false;

      case 'regex':
        if (typeof attributeValue === 'string' && typeof value === 'string') {
          try {
            return new RegExp(value).test(attributeValue);
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
   * Select variant based on rule match
   */
  private selectVariantForRule(flag: Flag, rule: TargetingRule): string {
    // In a full implementation, rules would have a 'serve.variant' property
    // For now, return the first variant
    const variants = Object.keys(flag.variants || {});
    return variants.length > 0 ? variants[0] : 'default';
  }

  /**
   * Select variant using consistent percentage-based bucketing
   */
  private selectVariantByPercentage(flag: Flag, context: EvaluationContext): string {
    const variants = Object.keys(flag.variants || {});

    if (variants.length === 0) {
      return 'default';
    }

    if (variants.length === 1) {
      return variants[0];
    }

    // Use consistent hashing to determine variant
    const userId = context.userId || context.anonymousId || 'anonymous';
    const hash = this.hashString(`${userId}:${flag.id}`);
    const bucket = hash % 100;

    // Distribute variants evenly
    const variantIndex = Math.floor((bucket / 100) * variants.length);
    return variants[Math.min(variantIndex, variants.length - 1)];
  }

  /**
   * Consistent string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Check if user is in target segment
   */
  isInSegment(
    context: EvaluationContext,
    segmentDefinition: {
      attribute: string;
      operator: string;
      value: string | number | string[];
    }
  ): boolean {
    const attributes = {
      ...context.attributes,
      userId: context.userId,
      anonymousId: context.anonymousId
    };

    const attributeValue = attributes[segmentDefinition.attribute];

    const rule: TargetingRule = {
      id: 'segment-check',
      attribute: segmentDefinition.attribute,
      operator: segmentDefinition.operator as TargetingRule['operator'],
      value: segmentDefinition.value
    };

    return this.matchesRule(rule, context);
  }

  /**
   * Get segment match percentage
   */
  getSegmentSize(
    segmentDefinition: {
      attribute: string;
      operator: string;
      value: string | number | string[];
    },
    totalUsers: number,
    sampleUsers: Array<{ userId: string; attributes: Record<string, string | number | boolean> }>
  ): number {
    let matchCount = 0;

    for (const user of sampleUsers) {
      const context: EvaluationContext = {
        userId: user.userId,
        attributes: user.attributes,
        environment: 'production'
      };

      if (this.isInSegment(context, segmentDefinition)) {
        matchCount++;
      }
    }

    return sampleUsers.length > 0
      ? parseFloat(((matchCount / sampleUsers.length) * 100).toFixed(2))
      : 0;
  }

  /**
   * Preview flag targeting for sample users
   */
  previewTargeting(
    flag: Flag,
    sampleUsers: Array<{ userId: string; attributes: Record<string, string | number | boolean> }>
  ): Array<{
    userId: string;
    inTargeting: boolean;
    variant: string;
    matchedRule?: string;
  }> {
    return sampleUsers.map(user => {
      const context: EvaluationContext = {
        userId: user.userId,
        attributes: user.attributes,
        environment: 'production'
      };

      let matchedRule: string | undefined;
      let inTargeting = false;

      for (const rule of flag.targetingRules) {
        if (this.matchesRule(rule, context)) {
          inTargeting = true;
          matchedRule = rule.id;
          break;
        }
      }

      const variant = this.determineVariant(flag, context);

      return {
        userId: user.userId,
        inTargeting,
        variant,
        matchedRule
      };
    });
  }
}
