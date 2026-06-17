import winston from 'winston';
import {
  FraudPattern,
  FraudPatternType,
  PatternCondition,
  AlertDetail,
  AlertSeverity
} from '../models/Fraud';

interface PatternMatchResult {
  matched: boolean;
  confidence: number;
  details: AlertDetail[];
}

interface TransactionData {
  transactionId: string;
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  type?: string;
  channel?: string;
  metadata?: {
    deviceId?: string;
    deviceFingerprint?: string;
    ip?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    userAgent?: string;
    authenticated?: boolean;
    authMethod?: string;
    sessionId?: string;
    loginAttempts?: number;
    cardPresent?: boolean;
    cvvVerified?: boolean;
    addressVerified?: boolean;
    threeDSecure?: boolean;
    customerTenureDays?: number;
  };
  context?: Record<string, unknown>;
}

interface PatternContext {
  transactionCount: number;
  timeWindow: number;
  velocity: number;
  amountDeviation: number;
  absoluteAmount: number;
  amountRatio: number;
  recentTransactionCount: number;
  recentTransactionCount5min: number;
  recentTransactionCount1min: number;
  knownDevice: boolean;
  usualLocationMatch: boolean;
  hour: number;
  avgAmount: number;
  stdDevAmount: number;
}

export class PatternMatcher {
  private logger: winston.Logger;
  private stats = {
    patternsEvaluated: 0,
    patternsMatched: 0,
    avgMatchConfidence: 0
  };

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  async match(
    pattern: FraudPattern,
    context: PatternContext,
    transaction: TransactionData
  ): Promise<PatternMatchResult> {
    this.stats.patternsEvaluated++;

    const details: AlertDetail[] = [];
    let conditionsMet = 0;
    let totalConfidence = 0;

    for (const condition of pattern.conditions) {
      const result = this.evaluateCondition(condition, context, transaction);

      if (result.matched) {
        conditionsMet++;
        totalConfidence += result.confidence;

        details.push({
          field: condition.field,
          expected: condition.value,
          actual: result.actual,
          severity: result.confidence > 80 ? AlertSeverity.ERROR : AlertSeverity.WARNING,
          message: result.message
        });
      }
    }

    // All conditions must be met for a match
    const allMatched = conditionsMet === pattern.conditions.length;
    const confidence = pattern.conditions.length > 0
      ? Math.round(totalConfidence / pattern.conditions.length)
      : 0;

    if (allMatched) {
      this.stats.patternsMatched++;
      this.logger.debug('Pattern matched', {
        patternId: pattern.id,
        patternName: pattern.name,
        confidence
      });
    }

    return {
      matched: allMatched,
      confidence,
      details
    };
  }

  private evaluateCondition(
    condition: PatternCondition,
    context: PatternContext,
    transaction: TransactionData
  ): {
    matched: boolean;
    confidence: number;
    actual: unknown;
    message: string;
  } {
    // Map condition field to actual value
    const value = this.getFieldValue(condition.field, context, transaction);

    switch (condition.operator) {
      case 'eq':
        return this.evaluateEq(condition.field, value, condition.value);

      case 'neq':
        return this.evaluateNeq(condition.field, value, condition.value);

      case 'gt':
        return this.evaluateGt(condition.field, value, condition.value);

      case 'lt':
        return this.evaluateLt(condition.field, value, condition.value);

      case 'gte':
        return this.evaluateGte(condition.field, value, condition.value);

      case 'lte':
        return this.evaluateLte(condition.field, value, condition.value);

      case 'contains':
        return this.evaluateContains(condition.field, value, condition.value);

      case 'regex':
        return this.evaluateRegex(condition.field, value as string, condition.value as string);

      case 'in':
        return this.evaluateIn(condition.field, value, condition.value as unknown[]);

      case 'between':
        return this.evaluateBetween(condition.field, value, condition.value, condition.secondaryValue);

      default:
        return {
          matched: false,
          confidence: 0,
          actual: value,
          message: `Unknown operator: ${condition.operator}`
        };
    }
  }

  private getFieldValue(
    field: string,
    context: PatternContext,
    transaction: TransactionData
  ): unknown {
    // Context fields
    const contextFields: Record<string, unknown> = {
      transactionCount: context.transactionCount,
      timeWindow: context.timeWindow,
      velocity: context.velocity,
      amountDeviation: context.amountDeviation,
      absoluteAmount: context.absoluteAmount,
      amountRatio: context.amountRatio,
      recentTransactionCount: context.recentTransactionCount,
      recentTransactionCount5min: context.recentTransactionCount5min,
      recentTransactionCount1min: context.recentTransactionCount1min,
      knownDevice: context.knownDevice,
      usualLocationMatch: context.usualLocationMatch,
      hour: context.hour,
      avgAmount: context.avgAmount,
      stdDevAmount: context.stdDevAmount
    };

    if (field in contextFields) {
      return contextFields[field];
    }

    // Transaction fields
    const txFields: Record<string, unknown> = {
      amount: transaction.amount,
      customerId: transaction.customerId,
      merchantId: transaction.merchantId,
      currency: transaction.currency,
      type: transaction.type,
      channel: transaction.channel
    };

    if (field in txFields) {
      return txFields[field];
    }

    // Metadata fields
    if (transaction.metadata) {
      if (field === 'deviceId' || field === 'deviceFingerprint') {
        return transaction.metadata.deviceId;
      }
      if (field === 'ip') {
        return transaction.metadata.ip;
      }
      if (field === 'country') {
        return transaction.metadata.location?.country;
      }
      if (field === 'authenticated') {
        return transaction.metadata.authenticated;
      }
      if (field === 'loginAttempts') {
        return transaction.metadata.loginAttempts;
      }
      if (field === 'cardPresent') {
        return transaction.metadata.cardPresent;
      }
      if (field === 'customerTenureDays') {
        return transaction.metadata.customerTenureDays;
      }
    }

    // Check context object for custom fields
    if (transaction.context && field in transaction.context) {
      return transaction.context[field];
    }

    return undefined;
  }

  private evaluateEq(
    field: string,
    actual: unknown,
    expected: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const matched = actual === expected;
    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} equals ${expected}`
        : `${field} does not equal ${expected} (actual: ${actual})`
    };
  }

  private evaluateNeq(
    field: string,
    actual: unknown,
    notExpected: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const matched = actual !== notExpected;
    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} does not equal ${notExpected}`
        : `${field} equals ${notExpected}`
    };
  }

  private evaluateGt(
    field: string,
    actual: unknown,
    threshold: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualNum = Number(actual);
    const thresholdNum = Number(threshold);
    const matched = !isNaN(actualNum) && !isNaN(thresholdNum) && actualNum > thresholdNum;
    const distance = matched ? (actualNum - thresholdNum) / thresholdNum : 0;

    return {
      matched,
      confidence: matched ? Math.min(100, 50 + distance * 50) : 0,
      actual,
      message: matched
        ? `${field} (${actualNum}) exceeds threshold (${thresholdNum})`
        : `${field} (${actualNum}) does not exceed threshold (${thresholdNum})`
    };
  }

  private evaluateLt(
    field: string,
    actual: unknown,
    threshold: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualNum = Number(actual);
    const thresholdNum = Number(threshold);
    const matched = !isNaN(actualNum) && !isNaN(thresholdNum) && actualNum < thresholdNum;

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} (${actualNum}) is below threshold (${thresholdNum})`
        : `${field} (${actualNum}) is not below threshold (${thresholdNum})`
    };
  }

  private evaluateGte(
    field: string,
    actual: unknown,
    threshold: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualNum = Number(actual);
    const thresholdNum = Number(threshold);
    const matched = !isNaN(actualNum) && !isNaN(thresholdNum) && actualNum >= thresholdNum;

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} (${actualNum}) meets or exceeds threshold (${thresholdNum})`
        : `${field} (${actualNum}) does not meet threshold (${thresholdNum})`
    };
  }

  private evaluateLte(
    field: string,
    actual: unknown,
    threshold: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualNum = Number(actual);
    const thresholdNum = Number(threshold);
    const matched = !isNaN(actualNum) && !isNaN(thresholdNum) && actualNum <= thresholdNum;

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} (${actualNum}) is at or below threshold (${thresholdNum})`
        : `${field} (${actualNum}) exceeds threshold (${thresholdNum})`
    };
  }

  private evaluateContains(
    field: string,
    actual: unknown,
    search: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualStr = String(actual || '').toLowerCase();
    const searchStr = String(search || '').toLowerCase();
    const matched = actualStr.includes(searchStr);

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} contains "${search}"`
        : `${field} does not contain "${search}"`
    };
  }

  private evaluateRegex(
    field: string,
    actual: string,
    pattern: string
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    try {
      const regex = new RegExp(pattern, 'i');
      const matched = regex.test(actual || '');

      return {
        matched,
        confidence: matched ? 100 : 0,
        actual,
        message: matched
          ? `${field} matches pattern ${pattern}`
          : `${field} does not match pattern ${pattern}`
      };
    } catch {
      return {
        matched: false,
        confidence: 0,
        actual,
        message: `Invalid regex pattern: ${pattern}`
      };
    }
  }

  private evaluateIn(
    field: string,
    actual: unknown,
    values: unknown[]
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const matched = values.includes(actual);

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} is in allowed values`
        : `${field} is not in allowed values`
    };
  }

  private evaluateBetween(
    field: string,
    actual: unknown,
    min: unknown,
    max: unknown
  ): { matched: boolean; confidence: number; actual: unknown; message: string } {
    const actualNum = Number(actual);
    const minNum = Number(min);
    const maxNum = Number(max);

    if (isNaN(actualNum) || isNaN(minNum) || isNaN(maxNum)) {
      return {
        matched: false,
        confidence: 0,
        actual,
        message: `Invalid values for between check`
      };
    }

    const matched = actualNum >= minNum && actualNum <= maxNum;

    return {
      matched,
      confidence: matched ? 100 : 0,
      actual,
      message: matched
        ? `${field} (${actualNum}) is between ${minNum} and ${maxNum}`
        : `${field} (${actualNum}) is not between ${minNum} and ${maxNum}`
    };
  }

  getStatus(): { enabled: boolean; patternsEvaluated: number } {
    return {
      enabled: true,
      patternsEvaluated: this.stats.patternsEvaluated
    };
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      patternsEvaluated: 0,
      patternsMatched: 0,
      avgMatchConfidence: 0
    };
  }
}
