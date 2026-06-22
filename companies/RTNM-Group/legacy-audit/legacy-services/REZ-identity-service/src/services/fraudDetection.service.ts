/**
 * Fraud Detection Service
 *
 * Detect and manage fraud indicators
 */

import { v4 as uuidv4 } from 'uuid';
import { FraudProfile, IFraudProfile, FraudEvent, IFraudEvent, FraudRiskLevel, FraudIndicator } from '../models/fraudDetection.model';
import { Identity } from '../models/identity.model';
import { logger } from '../utils/logger';

export interface FraudCheckInput {
  clusterId: string;
  action: string;
  amount?: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}

export interface FraudCheckResult {
  clusterId: string;
  riskLevel: FraudRiskLevel;
  riskScore: number;
  pass: boolean;
  indicators: FraudIndicator[];
  recommendations: string[];
  requiresReview: boolean;
}

export interface VelocityCheck {
  transactions: number;
  timeWindowMinutes: number;
  threshold: number;
}

export class FraudDetectionService {

  // Velocity thresholds
  private readonly VELOCITY_CHECKS: VelocityCheck[] = [
    { transactions: 5, timeWindowMinutes: 5, threshold: 5 },
    { transactions: 20, timeWindowMinutes: 60, threshold: 20 },
    { transactions: 100, timeWindowMinutes: 1440, threshold: 100 },
  ];

  // Country risk scores
  private readonly COUNTRY_RISK: Record<string, number> = {
    'IN': 0,    // India - baseline
    'US': 0,
    'UK': 0,
    'HIGH_RISK': 40,  // Countries flagged
    'UNKNOWN': 20,
  };

  async initialize(): Promise<void> {
    logger.info('Fraud Detection Service initialized');
  }

  /**
   * Check for fraud on an action
   */
  async checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
    const { clusterId, action, amount, deviceFingerprint, ipAddress, location, metadata } = input;

    const indicators: FraudIndicator[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // Get or create fraud profile
    let profile = await FraudProfile.findOne({ clusterId });
    if (!profile) {
      profile = await FraudProfile.create({
        clusterId,
        riskLevel: FraudRiskLevel.NONE,
        riskScore: 0,
        indicators: [],
        activeFlags: [],
        events: [],
        totalFlags: 0,
        criticalFlags: 0,
        status: 'active',
      });
    }

    // 1. Check account age
    const identity = await Identity.findOne({ clusterId });
    if (identity) {
      const accountAge = (Date.now() - identity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (accountAge < 1) {
        indicators.push(FraudIndicator.BOT_BEHAVIOR);
        riskScore += 30;
        recommendations.push('Account less than 24 hours old');
      } else if (accountAge < 7) {
        riskScore += 10;
      }
    }

    // 2. Check location
    if (location?.country) {
      const countryRisk = this.COUNTRY_RISK[location.country] ?? this.COUNTRY_RISK.UNKNOWN;
      if (countryRisk > 0) {
        indicators.push(FraudIndicator.UNUSUAL_LOCATION);
        riskScore += countryRisk;
        recommendations.push(`Transaction from high-risk country: ${location.country}`);
      }
    }

    // 3. Check for proxy/VPN (simplified)
    if (ipAddress && this.isSuspiciousIP(ipAddress)) {
      indicators.push(FraudIndicator.PROXY_VPN_USAGE);
      riskScore += 15;
      recommendations.push('Suspicious IP address detected');
    }

    // 4. Check transaction velocity
    const velocityCheck = await this.checkVelocity(clusterId);
    if (velocityCheck.exceeded) {
      indicators.push(FraudIndicator.VELOCITY_ANOMALY);
      riskScore += 25;
      recommendations.push(`High transaction velocity: ${velocityCheck.count} in last ${velocityCheck.window} minutes`);
    }

    // 5. Check for multiple accounts from same device
    if (deviceFingerprint) {
      const accountsOnDevice = await Identity.countDocuments({
        'metadata.traits.deviceId': deviceFingerprint
      });
      if (accountsOnDevice > 3) {
        indicators.push(FraudIndicator.MULTIPLE_ACCOUNTS);
        riskScore += 30;
        recommendations.push(`Multiple accounts on same device: ${accountsOnDevice}`);
      }
    }

    // 6. Check amount thresholds
    if (amount && amount > 50000) {
      riskScore += 10;
      recommendations.push('High transaction amount: ₹' + amount);
    }

    // 7. Update profile
    profile.riskScore = Math.min(100, riskScore);
    profile.indicators = [...new Set([...profile.indicators, ...indicators])];
    profile.riskLevel = profile.calculateRiskLevel();

    if (indicators.length > 0) {
      profile.lastFlagAt = new Date();
      profile.totalFlags += indicators.length;
    }

    await profile.save();

    // Determine pass/fail
    const pass = riskScore < 40;
    const requiresReview = riskScore >= 60 || profile.riskLevel === FraudRiskLevel.HIGH || profile.riskLevel === FraudRiskLevel.CRITICAL;

    return {
      clusterId,
      riskLevel: profile.riskLevel,
      riskScore,
      pass,
      indicators,
      recommendations,
      requiresReview,
    };
  }

  /**
   * Flag a fraud event
   */
  async flagFraudEvent(
    clusterId: string,
    indicator: FraudIndicator,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    source: string
  ): Promise<IFraudEvent> {
    const event = await FraudEvent.create({
      eventId: uuidv4(),
      clusterId,
      indicator,
      severity,
      details,
      source,
    });

    // Update profile
    const profile = await FraudProfile.findOne({ clusterId });
    if (profile) {
      await profile.addFraudEvent(event.eventId, indicator, severity);

      if (severity === 'critical') {
        profile.criticalFlags += 1;
        await profile.save();
      }
    }

    logger.warn('Fraud event flagged', {
      clusterId,
      indicator,
      severity,
      source
    });

    return event;
  }

  /**
   * Get fraud profile
   */
  async getFraudProfile(clusterId: string): Promise<IFraudProfile | null> {
    return FraudProfile.findOne({ clusterId });
  }

  /**
   * Get fraud events
   */
  async getFraudEvents(clusterId: string, limit = 50): Promise<IFraudEvent[]> {
    return FraudEvent.find({ clusterId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Resolve fraud event
   */
  async resolveFraudEvent(
    eventId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<IFraudEvent | null> {
    const event = await FraudEvent.findOneAndUpdate(
      { eventId, resolved: false },
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
      { new: true }
    );

    if (event) {
      // Recalculate profile risk
      await this.recalculateRiskScore(event.clusterId);
    }

    return event;
  }

  /**
   * Clear fraud profile (after manual review)
   */
  async clearFraudProfile(clusterId: string, reviewedBy: string): Promise<void> {
    await FraudProfile.findOneAndUpdate(
      { clusterId },
      {
        status: 'cleared',
        riskScore: 0,
        riskLevel: FraudRiskLevel.NONE,
        indicators: [],
        activeFlags: [],
        totalFlags: 0,
        criticalFlags: 0,
        lastReviewAt: new Date(),
        reviewedBy,
      }
    );

    // Mark all events as resolved
    await FraudEvent.updateMany(
      { clusterId, resolved: false },
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution: 'Profile cleared after review',
      }
    );

    logger.info('Fraud profile cleared', { clusterId, reviewedBy });
  }

  /**
   * Confirm fraud
   */
  async confirmFraud(clusterId: string, reviewedBy: string): Promise<void> {
    await FraudProfile.findOneAndUpdate(
      { clusterId },
      {
        status: 'confirmed_fraud',
        lastReviewAt: new Date(),
        reviewedBy,
      }
    );

    logger.warn('Fraud confirmed', { clusterId, reviewedBy });
  }

  /**
   * Check transaction velocity
   */
  private async checkVelocity(clusterId: string): Promise<{
    exceeded: boolean;
    count: number;
    window: number;
  }> {
    // Simplified velocity check
    // In production, use Redis for real-time counting
    const recentEvents = await FraudEvent.countDocuments({
      clusterId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    for (const check of this.VELOCITY_CHECKS) {
      const windowStart = new Date(Date.now() - check.timeWindowMinutes * 60 * 1000);
      const count = await FraudEvent.countDocuments({
        clusterId,
        createdAt: { $gte: windowStart }
      });

      if (count >= check.threshold) {
        return { exceeded: true, count, window: check.timeWindowMinutes };
      }
    }

    return { exceeded: false, count: recentEvents, window: 60 };
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIP(ip: string): boolean {
    // Simplified check - in production use IP intelligence service
    const suspiciousPatterns = [
      /^10\./,           // Private
      /^192\.168\./,     // Private
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private
    ];

    // Check for known proxy patterns (simplified)
    if (ip.startsWith('127.')) return true;

    return false;
  }

  /**
   * Recalculate risk score from events
   */
  private async recalculateRiskScore(clusterId: string): Promise<void> {
    const profile = await FraudProfile.findOne({ clusterId });
    if (!profile) return;

    const unresolvedEvents = await FraudEvent.find({
      clusterId,
      resolved: false
    });

    let riskScore = 0;
    const indicators = new Set<FraudIndicator>();

    for (const event of unresolvedEvents) {
      riskScore += this.getEventRiskScore(event.indicator);
      indicators.add(event.indicator);
    }

    profile.riskScore = Math.min(100, riskScore);
    profile.indicators = Array.from(indicators);
    profile.riskLevel = profile.calculateRiskLevel();
    profile.criticalFlags = unresolvedEvents.filter(e => e.severity === 'critical').length;

    await profile.save();
  }

  private getEventRiskScore(indicator: FraudIndicator): number {
    const scores: Record<FraudIndicator, number> = {
      [FraudIndicator.SANCTIONS_MATCH]: 100,
      [FraudIndicator.IDENTITY_MISMATCH]: 80,
      [FraudIndicator.CHARGEBACK_HISTORY]: 60,
      [FraudIndicator.BOT_BEHAVIOR]: 50,
      [FraudIndicator.RAPID_TRANSACTIONS]: 40,
      [FraudIndicator.VELOCITY_ANOMALY]: 40,
      [FraudIndicator.MULTIPLE_ACCOUNTS]: 50,
      [FraudIndicator.UNUSUAL_LOCATION]: 30,
      [FraudIndicator.DEVICE_MISMATCH]: 30,
      [FraudIndicator.PROXY_VPN_USAGE]: 30,
      [FraudIndicator.PATTERN_ANOMALY]: 20,
      [FraudIndicator.PHANTOM_ACCOUNTS]: 40,
    };
    return scores[indicator] || 20;
  }
}
