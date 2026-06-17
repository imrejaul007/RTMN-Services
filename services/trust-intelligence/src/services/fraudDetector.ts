import { v4 as uuidv4 } from 'uuid';
import { RiskFlagModel, IRiskFlag } from '../models/Flag';
import { TrustScoreModel } from '../models/TrustScore';
import {
  EntityType,
  RiskFlagType,
  FlagSeverity,
  CreateFlagRequest,
  RiskFlagResponse,
  FraudPattern,
  FraudCondition,
  FraudAction,
} from '../types';
import logger from '../utils/logger';

interface TransactionData {
  entityId: string;
  entityType: EntityType;
  amount: number;
  currency?: string;
  timestamp: Date;
  location?: { lat: number; lng: number };
  ipAddress?: string;
  deviceId?: string;
  paymentMethod?: string;
  merchantId?: string;
  velocity?: number;
}

export class FraudDetector {
  // Velocity thresholds (transactions per minute)
  private velocityThresholds = {
    customer: 5,
    merchant: 20,
    agent: 15,
    vendor: 10,
    partner: 10,
    device: 3,
  };

  // Amount thresholds
  private amountThresholds = {
    low: 100,
    medium: 500,
    high: 1000,
    veryHigh: 5000,
  };

  // Known suspicious patterns
  private knownPatterns: Partial<FraudPattern>[] = [
    {
      name: 'Rapid Transaction Velocity',
      type: 'velocity',
      conditions: [{ field: 'velocity', operator: 'gt', value: 10 }],
      severity: 'high',
      action: { type: 'flag', value: 30 },
    },
    {
      name: 'High Value Transaction',
      type: 'amount',
      conditions: [{ field: 'amount', operator: 'gt', value: 5000 }],
      severity: 'medium',
      action: { type: 'review' },
    },
    {
      name: 'Geo Jump',
      type: 'geo',
      conditions: [{ field: 'geoDistance', operator: 'gt', value: 500 }],
      severity: 'high',
      action: { type: 'flag', value: 20 },
    },
  ];

  /**
   * Analyze a transaction for fraud indicators
   */
  async analyzeTransaction(
    transaction: TransactionData,
    tenantId: string = 'default'
  ): Promise<FraudAnalysisResult> {
    const result: FraudAnalysisResult = {
      isSuspicious: false,
      riskScore: 0,
      flags: [],
      recommendations: [],
    };

    // Check velocity
    const velocityCheck = await this.checkVelocity(transaction, tenantId);
    result.flags.push(...velocityCheck.flags);
    result.riskScore += velocityCheck.riskAddition;

    // Check amount
    const amountCheck = await this.checkAmount(transaction);
    result.flags.push(...amountCheck.flags);
    result.riskScore += amountCheck.riskAddition;

    // Check device consistency
    const deviceCheck = await this.checkDeviceConsistency(transaction, tenantId);
    result.flags.push(...deviceCheck.flags);
    result.riskScore += deviceCheck.riskAddition;

    // Check geo anomalies
    const geoCheck = await this.checkGeoAnomaly(transaction, tenantId);
    result.flags.push(...geoCheck.flags);
    result.riskScore += geoCheck.riskAddition;

    // Check linked entities
    const linkedCheck = await this.checkLinkedEntities(transaction, tenantId);
    result.flags.push(...linkedCheck.flags);
    result.riskScore += linkedCheck.riskAddition;

    // Check historical patterns
    const patternCheck = await this.checkPatterns(transaction);
    result.flags.push(...patternCheck.flags);
    result.riskScore += patternCheck.riskAddition;

    // Determine overall suspicion
    result.isSuspicious = result.riskScore >= 70 || result.flags.length >= 3;

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    // Apply automatic actions based on risk
    if (result.isSuspicious) {
      await this.applyAutomaticActions(transaction, result, tenantId);
    }

    return result;
  }

  /**
   * Check transaction velocity
   */
  private async checkVelocity(
    transaction: TransactionData,
    tenantId: string
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;

    const threshold = this.velocityThresholds[transaction.entityType] || 5;
    const velocity = transaction.velocity || 0;

    if (velocity > threshold * 2) {
      flags.push('velocity_exceeded:critical');
      riskAddition += 40;
    } else if (velocity > threshold) {
      flags.push('velocity_exceeded:high');
      riskAddition += 25;
    } else if (velocity > threshold * 0.5) {
      flags.push('velocity_exceeded:medium');
      riskAddition += 10;
    }

    return { flags, riskAddition };
  }

  /**
   * Check transaction amount
   */
  private async checkAmount(
    transaction: TransactionData
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;
    const amount = transaction.amount;

    if (amount > this.amountThresholds.veryHigh) {
      flags.push('suspicious_transaction:high');
      riskAddition += 20;
    } else if (amount > this.amountThresholds.high) {
      flags.push('suspicious_transaction:medium');
      riskAddition += 10;
    }

    // Check if amount is round number (potential fraud indicator)
    if (amount % 100 === 0 && amount > 1000) {
      riskAddition += 5;
    }

    return { flags, riskAddition };
  }

  /**
   * Check device consistency
   */
  private async checkDeviceConsistency(
    transaction: TransactionData,
    tenantId: string
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;

    if (!transaction.deviceId) {
      return { flags, riskAddition };
    }

    // Check for known fraudulent devices
    const existingFlag = await RiskFlagModel.findOne({
      entityId: transaction.deviceId,
      entityType: 'device',
      tenantId,
      status: 'active',
      type: { $in: ['device_mismatch', 'fraud_report'] },
    });

    if (existingFlag) {
      flags.push('device_mismatch:critical');
      riskAddition += 50;
    }

    // Check for new device on high-value transaction
    if (transaction.amount > this.amountThresholds.high) {
      const trustScore = await TrustScoreModel.findOne({
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        tenantId,
      });

      if (trustScore && trustScore.score < 70) {
        flags.push('device_mismatch:medium');
        riskAddition += 15;
      }
    }

    return { flags, riskAddition };
  }

  /**
   * Check for geo anomalies
   */
  private async checkGeoAnomaly(
    transaction: TransactionData,
    tenantId: string
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;

    if (!transaction.location) {
      return { flags, riskAddition };
    }

    // Get last known location from trust score metadata
    const trustScore = await TrustScoreModel.findOne({
      entityId: transaction.entityId,
      entityType: transaction.entityType,
      tenantId,
    });

    if (trustScore && trustScore.metadata?.lastLocation) {
      const lastLocation = trustScore.metadata.lastLocation as { lat: number; lng: number };
      const distance = this.calculateDistance(
        lastLocation.lat,
        lastLocation.lng,
        transaction.location.lat,
        transaction.location.lng
      );

      // Distance in km
      if (distance > 1000) {
        flags.push('geo_anomaly:critical');
        riskAddition += 40;
      } else if (distance > 500) {
        flags.push('geo_anomaly:high');
        riskAddition += 25;
      }
    }

    return { flags, riskAddition };
  }

  /**
   * Check linked entities for risk
   */
  private async checkLinkedEntities(
    transaction: TransactionData,
    tenantId: string
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;

    const trustScore = await TrustScoreModel.findOne({
      entityId: transaction.entityId,
      entityType: transaction.entityType,
      tenantId,
    });

    if (trustScore && trustScore.linkedEntities.length > 0) {
      for (const linked of trustScore.linkedEntities) {
        const linkedFlag = await RiskFlagModel.findActiveForEntity(
          linked.entityId,
          tenantId
        );

        if (linkedFlag.length > 0) {
          flags.push('link_to_flagged:high');
          riskAddition += 15;
          break;
        }
      }
    }

    return { flags, riskAddition };
  }

  /**
   * Check against known fraud patterns
   */
  private async checkPatterns(
    transaction: TransactionData
  ): Promise<{ flags: string[]; riskAddition: number }> {
    const flags: string[] = [];
    let riskAddition = 0;

    for (const pattern of this.knownPatterns) {
      const matches = await this.matchesPattern(transaction, pattern.conditions || []);
      if (matches) {
        riskAddition += pattern.action?.value || 10;
        if (pattern.action?.type === 'flag') {
          flags.push(`unusual_pattern:${pattern.severity}`);
        }
      }
    }

    return { flags, riskAddition };
  }

  /**
   * Check if transaction matches pattern conditions
   */
  private async matchesPattern(
    transaction: TransactionData,
    conditions: FraudCondition[]
  ): Promise<boolean> {
    for (const condition of conditions) {
      const value = (transaction as any)[condition.field];

      switch (condition.operator) {
        case 'eq':
          if (value !== condition.value) return false;
          break;
        case 'ne':
          if (value === condition.value) return false;
          break;
        case 'gt':
          if (value <= condition.value) return false;
          break;
        case 'lt':
          if (value >= condition.value) return false;
          break;
        case 'gte':
          if (value < condition.value) return false;
          break;
        case 'lte':
          if (value > condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(String(condition.value))) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
        case 'between':
          if (!Array.isArray(condition.value) || value < condition.value[0] || value > condition.value[1]) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Apply automatic actions based on fraud analysis
   */
  private async applyAutomaticActions(
    transaction: TransactionData,
    result: FraudAnalysisResult,
    tenantId: string
  ): Promise<void> {
    // Create risk flags for each detected issue
    for (const flag of result.flags) {
      const [type, severity] = flag.split(':') as [RiskFlagType, FlagSeverity];

      const existingFlag = await RiskFlagModel.findOne({
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        tenantId,
        type,
        status: 'active',
      });

      if (!existingFlag) {
        await this.createRiskFlag({
          entityId: transaction.entityId,
          entityType: transaction.entityType,
          type,
          severity,
          description: `Fraud detection: ${type.replace(/_/g, ' ')} detected`,
          evidence: [
            {
              type: 'transaction_analysis',
              data: {
                amount: transaction.amount,
                velocity: transaction.velocity,
                timestamp: transaction.timestamp,
              },
              timestamp: new Date(),
              source: 'fraud_detector',
            },
          ],
          tenantId,
        });
      }
    }

    // High risk = update trust score
    if (result.riskScore >= 70) {
      await this.updateTrustScoreForFraud(transaction, result.riskScore, tenantId);
    }
  }

  /**
   * Create a risk flag
   */
  async createRiskFlag(request: CreateFlagRequest): Promise<IRiskFlag> {
    const { entityId, entityType, type, severity, description, evidence, tenantId = 'default' } = request;

    // Check for duplicate active flag
    const existing = await RiskFlagModel.findOne({
      entityId,
      entityType,
      tenantId,
      type,
      status: 'active',
    });

    if (existing) {
      // Add evidence to existing flag
      for (const e of evidence) {
        existing.addEvidence(e);
      }
      existing.updatedAt = new Date();
      await existing.save();
      return existing;
    }

    const flag = new RiskFlagModel({
      entityId,
      entityType,
      tenantId,
      type,
      severity,
      status: 'active',
      score: severity === 'critical' ? 75 : severity === 'high' ? 50 : severity === 'medium' ? 25 : 10,
      description,
      evidence,
    });

    await flag.save();

    logger.warn(`Risk flag created: ${type} (${severity}) for ${entityType}:${entityId}`, {
      flagId: flag._id,
    });

    return flag;
  }

  /**
   * Get risk flags for an entity
   */
  async getEntityFlags(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<RiskFlagResponse[]> {
    const flags = await RiskFlagModel.findActiveForEntity(entityId, tenantId);

    return flags.map((f) => ({
      id: f._id!.toString(),
      entityId: f.entityId,
      type: f.type,
      severity: f.severity,
      status: f.status,
      description: f.description,
      score: f.score,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Resolve a risk flag
   */
  async resolveFlag(
    flagId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<IRiskFlag | null> {
    const flag = await RiskFlagModel.findById(flagId);
    if (!flag) return null;

    flag.resolve(resolvedBy, resolution);
    await flag.save();

    // Recalculate trust score
    await this.recalculateTrustScore(flag.entityId, flag.entityType, flag.tenantId);

    return flag;
  }

  /**
   * Dismiss a risk flag
   */
  async dismissFlag(flagId: string, dismissedBy: string): Promise<IRiskFlag | null> {
    const flag = await RiskFlagModel.findById(flagId);
    if (!flag) return null;

    flag.dismiss(dismissedBy);
    await flag.save();

    return flag;
  }

  /**
   * Escalate a risk flag
   */
  async escalateFlag(
    flagId: string,
    escalateTo: string
  ): Promise<IRiskFlag | null> {
    const flag = await RiskFlagModel.findById(flagId);
    if (!flag) return null;

    flag.escalate(escalateTo);
    await flag.save();

    return flag;
  }

  /**
   * Update trust score due to fraud detection
   */
  private async updateTrustScoreForFraud(
    transaction: TransactionData,
    riskScore: number,
    tenantId: string
  ): Promise<void> {
    const trustScore = await TrustScoreModel.findOne({
      entityId: transaction.entityId,
      entityType: transaction.entityType,
      tenantId,
    });

    if (!trustScore) return;

    // Reduce risk indicators
    const reduction = Math.min(riskScore * 0.5, 30);
    trustScore.factors.riskIndicators = Math.max(
      0,
      trustScore.factors.riskIndicators - reduction
    );

    // Add penalty
    trustScore.breakdown.penalties -= reduction;

    await trustScore.save();
  }

  /**
   * Recalculate trust score after flag resolution
   */
  private async recalculateTrustScore(
    entityId: string,
    entityType: EntityType,
    tenantId: string
  ): Promise<void> {
    const trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) return;

    // Get active flags count
    const activeFlags = await RiskFlagModel.findActiveForEntity(entityId, tenantId);

    // Recalculate risk indicators
    trustScore.factors.riskIndicators = activeFlags.length === 0 ? 100 : 100 - activeFlags.length * 10;

    await trustScore.save();
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(result: FraudAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (result.riskScore >= 70) {
      recommendations.push('BLOCK_TRANSACTION');
      recommendations.push('REQUIRE_MANUAL_REVIEW');
    } else if (result.riskScore >= 50) {
      recommendations.push('REQUIRE_ADDITIONAL_VERIFICATION');
      recommendations.push('LIMIT_TRANSACTION_AMOUNT');
    } else if (result.riskScore >= 30) {
      recommendations.push('ENHANCED_MONITORING');
    }

    if (result.flags.some((f) => f.includes('geo_anomaly'))) {
      recommendations.push('VERIFY_LOCATION');
    }

    if (result.flags.some((f) => f.includes('velocity'))) {
      recommendations.push('RATE_LIMIT_TRANSACTIONS');
    }

    return recommendations;
  }
}

export interface FraudAnalysisResult {
  isSuspicious: boolean;
  riskScore: number;
  flags: string[];
  recommendations: string[];
}

export const fraudDetector = new FraudDetector();
export default fraudDetector;
