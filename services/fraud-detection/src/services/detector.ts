import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import {
  FraudPattern,
  FraudPatternType,
  MatchedPattern,
  FraudCheckResult,
  AlertDetail,
  AlertSeverity,
  RiskLevel,
  BlockAction,
  DEFAULT_PATTERNS
} from '../models/Fraud';
import { TransactionCheckRequest, TransactionContext } from '../models/Transaction';
import { PatternMatcher } from './patterns';

export class FraudDetector {
  private logger: winston.Logger;
  private patternMatcher: PatternMatcher;
  private patterns: Map<string, FraudPattern> = new Map();
  private transactionHistory: Map<string, TransactionHistoryRecord[]> = new Map();
  private stats = {
    checksProcessed: 0,
    patternsMatched: 0,
    highRiskDetected: 0,
    lastReset: new Date()
  };

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.patternMatcher = new PatternMatcher(logger);
    this.initializeDefaultPatterns();
  }

  private initializeDefaultPatterns(): void {
    for (const patternDef of DEFAULT_PATTERNS) {
      const pattern: FraudPattern = {
        ...patternDef,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.patterns.set(pattern.id, pattern);
    }

    this.logger.info('Initialized default fraud patterns', {
      count: this.patterns.size
    });
  }

  async check(request: TransactionCheckRequest): Promise<FraudCheckResult> {
    const startTime = Date.now();
    const matchedPatterns: MatchedPattern[] = [];

    this.logger.debug('Starting fraud check', {
      transactionId: request.transactionId,
      customerId: request.customerId
    });

    // Get context for the customer
    const context = this.buildContext(request);

    // Check each enabled pattern
    const enabledPatterns = Array.from(this.patterns.values()).filter(p => p.enabled);

    for (const pattern of enabledPatterns) {
      const matchResult = await this.patternMatcher.match(pattern, context, request);

      if (matchResult.matched) {
        const matchedPattern: MatchedPattern = {
          patternId: pattern.id,
          patternName: pattern.name,
          patternType: pattern.type,
          confidence: matchResult.confidence,
          contributingScore: Math.round(pattern.weight * (matchResult.confidence / 100)),
          details: matchResult.details
        };

        matchedPatterns.push(matchedPattern);
        this.stats.patternsMatched++;

        this.logger.debug('Pattern matched', {
          patternId: pattern.id,
          patternName: pattern.name,
          confidence: matchResult.confidence
        });
      }
    }

    // Calculate total risk score
    const totalScore = matchedPatterns.reduce((sum, p) => sum + p.contributingScore, 0);
    const riskScore = Math.min(100, totalScore);

    // Determine risk level
    const riskLevel = this.getRiskLevel(riskScore);

    // Determine block action
    const blockAction = this.getBlockAction(riskScore, matchedPatterns);

    // Determine if allowed
    const autoBlockThreshold = parseInt(process.env.AUTO_BLOCK_THRESHOLD || '90');
    const allowed = !(blockAction === BlockAction.AUTO_BLOCK || blockAction === BlockAction.BLOCK) ||
      riskScore < autoBlockThreshold;

    // Generate recommendations
    const recommendations = this.generateRecommendations(matchedPatterns, context);

    const processingTimeMs = Date.now() - startTime;

    // Record transaction for future velocity checks
    this.recordTransaction(request, riskScore, riskLevel);

    // Update stats
    this.stats.checksProcessed++;
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      this.stats.highRiskDetected++;
    }

    const result: FraudCheckResult = {
      transactionId: request.transactionId,
      allowed,
      riskScore,
      riskLevel,
      blockAction,
      matchedPatterns,
      recommendations,
      processingTimeMs,
      timestamp: new Date()
    };

    this.logger.info('Fraud check completed', {
      transactionId: request.transactionId,
      riskScore,
      riskLevel,
      matchedPatternsCount: matchedPatterns.length,
      processingTimeMs
    });

    return result;
  }

  private buildContext(request: TransactionCheckRequest): TransactionContext {
    // Get recent transactions for velocity
    const recentTxs = this.getRecentTransactions(request.customerId);

    // Calculate velocity metrics
    const oneHourAgo = Date.now() - 3600000;
    const recentOneHour = recentTxs.filter(tx =>
      tx.timestamp.getTime() > oneHourAgo
    );

    const fiveMinutesAgo = Date.now() - 300000;
    const recentFiveMin = recentTxs.filter(tx =>
      tx.timestamp.getTime() > fiveMinutesAgo
    );

    const oneMinuteAgo = Date.now() - 60000;
    const recentOneMin = recentTxs.filter(tx =>
      tx.timestamp.getTime() > oneMinuteAgo
    );

    // Calculate average amount
    const amounts = recentTxs.map(tx => tx.amount);
    const avgAmount = amounts.length > 0
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length
      : request.amount;

    // Calculate standard deviation for amount anomaly
    const stdDev = this.calculateStdDev(amounts);

    // Get known devices
    const knownDevices = new Set<string>();
    for (const tx of recentTxs) {
      if (tx.deviceId) knownDevices.add(tx.deviceId);
    }

    // Get usual locations
    const usualLocations = new Set<string>();
    for (const tx of recentTxs) {
      if (tx.location) usualLocations.add(tx.location);
    }

    return {
      transactionCount: recentTxs.length,
      timeWindow: Date.now() - (recentTxs[0]?.timestamp.getTime() || Date.now()),
      velocity: recentOneHour.length,
      amountDeviation: stdDev > 0 ? Math.abs(request.amount - avgAmount) / stdDev : 0,
      absoluteAmount: request.amount,
      amountRatio: avgAmount > 0 ? request.amount / avgAmount : 1,
      recentTransactionCount: recentOneHour.length,
      recentTransactionCount5min: recentFiveMin.length,
      recentTransactionCount1min: recentOneMin.length,
      knownDevice: request.metadata.deviceId ? knownDevices.has(request.metadata.deviceId) : true,
      usualLocationMatch: request.metadata.location?.country
        ? usualLocations.has(request.metadata.location.country)
        : true,
      hour: new Date().getHours(),
      avgAmount,
      stdDevAmount: stdDev
    };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 75) return RiskLevel.CRITICAL;
    if (score >= 50) return RiskLevel.HIGH;
    if (score >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private getBlockAction(score: number, matchedPatterns: MatchedPattern[]): BlockAction {
    const autoBlockEnabled = process.env.AUTO_BLOCK_ENABLED === 'true';
    const autoBlockThreshold = parseInt(process.env.AUTO_BLOCK_THRESHOLD || '90');

    // Check for network fraud pattern - always block
    const hasNetworkFraud = matchedPatterns.some(
      p => p.patternType === FraudPatternType.NETWORK
    );
    if (hasNetworkFraud) return BlockAction.BLOCK;

    // Auto-block if above threshold
    if (autoBlockEnabled && score >= autoBlockThreshold) {
      return BlockAction.AUTO_BLOCK;
    }

    // Flag for review based on score
    if (score >= 75) return BlockAction.REVIEW;
    if (score >= 50) return BlockAction.FLAG;

    return BlockAction.NONE;
  }

  private generateRecommendations(
    matchedPatterns: MatchedPattern[],
    context: Record<string, unknown>
  ): string[] {
    const recommendations: string[] = [];

    for (const pattern of matchedPatterns) {
      switch (pattern.patternType) {
        case FraudPatternType.VELOCITY:
          recommendations.push('Consider implementing additional verification for rapid transactions');
          break;
        case FraudPatternType.AMOUNT_ANOMALY:
          recommendations.push('Verify transaction amount with customer');
          break;
        case FraudPatternType.GEO_ANOMALY:
          recommendations.push('Confirm customer location via secondary channel');
          break;
        case FraudPatternType.DEVICE_FINGERPRINT:
          recommendations.push('Send OTP to registered device');
          break;
        case FraudPatternType.NETWORK:
          recommendations.push('Immediately freeze account pending investigation');
          break;
        case FraudPatternType.TIME_BASED:
          recommendations.push('Schedule verification call during business hours');
          break;
        default:
          recommendations.push(`Manual review recommended for ${pattern.patternName}`);
      }
    }

    if (matchedPatterns.length === 0) {
      recommendations.push('Transaction appears normal - no additional action required');
    }

    return recommendations;
  }

  private recordTransaction(
    request: TransactionCheckRequest,
    riskScore: number,
    riskLevel: RiskLevel
  ): void {
    const record: TransactionHistoryRecord = {
      transactionId: request.transactionId,
      customerId: request.customerId,
      merchantId: request.merchantId,
      amount: request.amount,
      timestamp: new Date(),
      riskScore,
      riskLevel,
      deviceId: request.metadata.deviceId,
      location: request.metadata.location?.country
    };

    const history = this.transactionHistory.get(request.customerId) || [];
    history.push(record);

    // Keep only last 1000 transactions
    const trimmed = history.slice(-1000);
    this.transactionHistory.set(request.customerId, trimmed);
  }

  private getRecentTransactions(customerId: string): TransactionHistoryRecord[] {
    return this.transactionHistory.get(customerId) || [];
  }

  getHistory(customerId: string, limit: number = 50): TransactionHistoryRecord[] {
    const history = this.transactionHistory.get(customerId) || [];
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getPatterns(): FraudPattern[] {
    return Array.from(this.patterns.values());
  }

  addPattern(pattern: FraudPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  updatePattern(id: string, updates: Partial<FraudPattern>): void {
    const pattern = this.patterns.get(id);
    if (pattern) {
      this.patterns.set(id, { ...pattern, ...updates, updatedAt: new Date() });
    }
  }

  removePattern(id: string): boolean {
    return this.patterns.delete(id);
  }

  getStatus(): { enabled: boolean; patternCount: number } {
    return {
      enabled: true,
      patternCount: Array.from(this.patterns.values()).filter(p => p.enabled).length
    };
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      checksProcessed: 0,
      patternsMatched: 0,
      highRiskDetected: 0,
      lastReset: new Date()
    };
  }
}

interface TransactionHistoryRecord {
  transactionId: string;
  customerId: string;
  merchantId: string;
  amount: number;
  timestamp: Date;
  riskScore: number;
  riskLevel: RiskLevel;
  deviceId?: string;
  location?: string;
}

// Context type for pattern matching
interface TransactionContext {
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
