import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

/**
 * TrustSync - Synchronizes trust scores and risk data with Trust Intelligence
 *
 * This service connects RABTUL payment profiles to the Trust Intelligence layer,
 * enabling real-time risk assessment and trust scoring for customers.
 */
export interface TrustScoreUpdate {
  corpid: string;
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{
    name: string;
    contribution: number;
    description: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  fraudFlags: string[];
}

export interface TrustEvent {
  type: 'payment_failed' | 'payment_succeeded' | 'kyc_updated' | 'wallet_frozen' |
        'large_transaction' | 'suspicious_activity' | 'refund_requested';
  corpid: string;
  timestamp: Date;
  data?: Record<string, any>;
}

export class TrustSync {
  private logger: winston.Logger;
  private trustIntelligenceClient: AxiosInstance;
  private healthy: boolean = true;
  private lastSyncTime: Date | null = null;
  private eventBuffer: TrustEvent[] = [];
  private scoreCache: Map<string, TrustScoreUpdate> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger) {
    this.logger = logger;

    const trustUrl = process.env.TRUST_INTELLIGENCE_URL || 'http://localhost:4703';

    this.trustIntelligenceClient = axios.create({
      baseURL: trustUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds

    this.logger.info('TrustSync initialized', { trustUrl });
  }

  /**
   * Update trust score in Trust Intelligence
   */
  async updateTrustScore(update: TrustScoreUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug('Updating trust score', {
        corpid: update.corpid,
        score: update.score
      });

      await this.trustIntelligenceClient.post('/api/trust/score', {
        ...update,
        source: 'rabtul-payment',
        updatedAt: new Date().toISOString()
      });

      // Update cache
      this.scoreCache.set(update.corpid, update);

      this.healthy = true;
      this.lastSyncTime = new Date();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to update trust score', {
        corpid: update.corpid,
        error: error.message
      });

      // Cache the update for later sync
      this.scoreCache.set(update.corpid, update);

      return { success: false, error: error.message };
    }
  }

  /**
   * Record a trust-related event
   */
  recordEvent(event: TrustEvent): void {
    this.eventBuffer.push({
      ...event,
      timestamp: new Date()
    });

    this.logger.debug('Trust event recorded', {
      type: event.type,
      corpid: event.corpid,
      bufferSize: this.eventBuffer.length
    });

    // Immediate flush for critical events
    if (['suspicious_activity', 'wallet_frozen', 'large_transaction'].includes(event.type)) {
      this.flushEvents();
    }
  }

  /**
   * Flush buffered events to Trust Intelligence
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.trustIntelligenceClient.post('/api/trust/events/batch', {
        events: eventsToFlush,
        source: 'rabtul-payment',
        flushedAt: new Date().toISOString()
      });

      this.logger.info('Trust events flushed', { count: eventsToFlush.length });
    } catch (error: any) {
      this.logger.error('Failed to flush trust events', {
        error: error.message,
        count: eventsToFlush.length
      });

      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Get trust score for a corpid
   */
  async getTrustScore(corpid: string): Promise<TrustScoreUpdate | null> {
    // Check cache first
    const cached = this.scoreCache.get(corpid);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.trustIntelligenceClient.get(`/api/trust/score/${corpid}`);
      const score = response.data;

      this.scoreCache.set(corpid, score);

      return score;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error('Failed to get trust score', {
        corpid,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Assess transaction risk
   */
  async assessTransactionRisk(data: {
    corpid: string;
    amount: number;
    type: 'payment' | 'withdrawal' | 'transfer';
    destination?: string;
  }): Promise<{
    allowed: boolean;
    riskScore: number;
    flags: string[];
    recommendations: string[];
  }> {
    try {
      this.logger.debug('Assessing transaction risk', {
        corpid: data.corpid,
        amount: data.amount
      });

      const response = await this.trustIntelligenceClient.post('/api/trust/assess', {
        ...data,
        source: 'rabtul-payment',
        assessedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to assess transaction risk', {
        corpid: data.corpid,
        error: error.message
      });

      // Default to high risk on error
      return {
        allowed: false,
        riskScore: 100,
        flags: ['risk_assessment_unavailable'],
        recommendations: ['manual_review_required']
      };
    }
  }

  /**
   * Report fraud event
   */
  async reportFraud(data: {
    corpid: string;
    type: string;
    details: Record<string, any>;
    amount?: number;
  }): Promise<{ success: boolean; fraudId?: string }> {
    try {
      const response = await this.trustIntelligenceClient.post('/api/trust/fraud/report', {
        ...data,
        source: 'rabtul-payment',
        reportedAt: new Date().toISOString()
      });

      // Record fraud event
      this.recordEvent({
        type: 'suspicious_activity',
        corpid: data.corpid,
        timestamp: new Date(),
        data: { fraudType: data.type, details: data.details }
      });

      return {
        success: true,
        fraudId: response.data.id
      };
    } catch (error: any) {
      this.logger.error('Failed to report fraud', {
        corpid: data.corpid,
        error: error.message
      });

      return { success: false };
    }
  }

  /**
   * Calculate trust score from payment profile
   */
  calculateTrustScore(data: {
    kycStatus: string;
    walletStatus: string;
    walletBalance: number;
    paymentRiskLevel: string;
    transactionCount: number;
    failedTransactionRate: number;
  }): TrustScoreUpdate {
    let score = 50;
    const factors: TrustScoreUpdate['factors'] = [];
    const fraudFlags: string[] = [];
    let riskLevel: TrustScoreUpdate['riskLevel'] = 'medium';

    // KYC factor
    if (data.kycStatus === 'verified') {
      score += 25;
      factors.push({
        name: 'kyc_verified',
        contribution: 25,
        description: 'KYC verification completed'
      });
    } else if (data.kycStatus === 'pending') {
      score -= 10;
      factors.push({
        name: 'kyc_pending',
        contribution: -10,
        description: 'KYC verification pending'
      });
    }

    // Wallet status
    if (data.walletStatus === 'active') {
      score += 10;
      factors.push({
        name: 'wallet_active',
        contribution: 10,
        description: 'Wallet is active'
      });
    } else if (data.walletStatus === 'frozen') {
      score -= 30;
      riskLevel = 'high';
      fraudFlags.push('wallet_frozen');
    }

    // Wallet balance
    if (data.walletBalance > 10000) {
      score += 5;
      factors.push({
        name: 'wallet_balance_high',
        contribution: 5,
        description: 'High wallet balance'
      });
    }

    // Payment risk level
    if (data.paymentRiskLevel === 'low') {
      score += 15;
      factors.push({
        name: 'payment_risk_low',
        contribution: 15,
        description: 'Low payment risk profile'
      });
    } else if (data.paymentRiskLevel === 'high') {
      score -= 25;
      riskLevel = 'high';
      fraudFlags.push('high_payment_risk');
    }

    // Transaction history
    if (data.transactionCount > 100) {
      score += 5;
      factors.push({
        name: 'high_transaction_volume',
        contribution: 5,
        description: 'Established transaction history'
      });
    }

    // Failed transaction rate
    if (data.failedTransactionRate > 0.2) {
      score -= 20;
      riskLevel = 'high';
      fraudFlags.push('high_failure_rate');
      factors.push({
        name: 'high_failure_rate',
        contribution: -20,
        description: 'High transaction failure rate'
      });
    } else if (data.failedTransactionRate < 0.05) {
      score += 5;
      factors.push({
        name: 'low_failure_rate',
        contribution: 5,
        description: 'Low transaction failure rate'
      });
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let level: TrustScoreUpdate['level'];
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else level = 'poor';

    return {
      corpid: '', // Will be set by caller
      score,
      level,
      factors,
      riskLevel,
      fraudFlags
    };
  }

  /**
   * Get sync status
   */
  getStatus(): {
    healthy: boolean;
    lastSyncTime: Date | null;
    cachedScores: number;
    bufferedEvents: number;
  } {
    return {
      healthy: this.healthy,
      lastSyncTime: this.lastSyncTime,
      cachedScores: this.scoreCache.size,
      bufferedEvents: this.eventBuffer.length
    };
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.healthy && this.eventBuffer.length < 1000;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Final flush
    this.flushEvents();
  }
}
