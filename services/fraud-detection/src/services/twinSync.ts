import winston from 'winston';
import { FraudPattern, FraudAlert, RiskLevel } from '../models/Fraud';

interface TwinSyncRecord {
  id: string;
  type: 'risk_score' | 'pattern' | 'alert' | 'customer_trust';
  customerId?: string;
  data: Record<string, unknown>;
  syncedAt: Date;
  source: string;
}

interface TrustTwinUpdate {
  customerId: string;
  trustScore: number;
  riskLevel: RiskLevel;
  factors: string[];
  lastUpdated: Date;
}

export class TwinSync {
  private logger: winston.Logger;
  private twinOsUrl: string;
  private syncQueue: TwinSyncRecord[] = [];
  private lastSync: Map<string, Date> = new Map();
  private syncInterval?: NodeJS.Timeout;
  private syncStats = {
    totalSynced: 0,
    failedSyncs: 0,
    lastSyncAt: new Date()
  };

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.twinOsUrl = process.env.TWIN_OS_URL || 'http://localhost:4705';

    // Start sync interval
    this.startSyncInterval();
  }

  private startSyncInterval(): void {
    // Sync every 10 seconds
    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, 10000);
  }

  private async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const batch = this.syncQueue.splice(0, 10); // Process 10 at a time

    for (const record of batch) {
      try {
        await this.syncToTwin(record);
        this.syncStats.totalSynced++;
      } catch (error) {
        this.syncStats.failedSyncs++;
        this.logger.error('Failed to sync to twin', {
          type: record.type,
          id: record.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Re-queue failed syncs
        this.syncQueue.push(record);
      }
    }

    this.syncStats.lastSyncAt = new Date();
  }

  private async syncToTwin(record: TwinSyncRecord): Promise<void> {
    const endpoint = this.getEndpoint(record.type);

    const response = await fetch(`${this.twinOsUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'fraud-detection',
        'X-Sync-ID': record.id
      },
      body: JSON.stringify(record.data)
    });

    if (!response.ok) {
      throw new Error(`Twin sync failed: HTTP ${response.status}`);
    }

    this.logger.debug('Synced to twin', {
      type: record.type,
      id: record.id
    });
  }

  private getEndpoint(type: string): string {
    const endpoints: Record<string, string> = {
      risk_score: '/api/twins/risk-score',
      pattern: '/api/twins/patterns',
      alert: '/api/twins/alerts',
      customer_trust: '/api/twins/trust'
    };
    return endpoints[type] || '/api/twins/sync';
  }

  private queueSync(record: Omit<TwinSyncRecord, 'syncedAt'>): void {
    const fullRecord: TwinSyncRecord = {
      ...record,
      syncedAt: new Date()
    };

    this.syncQueue.push(fullRecord);

    this.logger.debug('Sync queued', {
      type: record.type,
      id: record.id,
      queueLength: this.syncQueue.length
    });
  }

  async syncRiskScore(
    customerId: string,
    riskScore: number,
    context?: {
      transactionId?: string;
      merchantId?: string;
      amount?: number;
    }
  ): Promise<void> {
    // Calculate trust score (inverse of risk)
    const trustScore = Math.max(0, 100 - riskScore);

    // Determine trust level
    let trustLevel: 'trusted' | 'moderate' | 'risky' | 'blocked';
    if (riskScore >= 75) {
      trustLevel = 'blocked';
    } else if (riskScore >= 50) {
      trustLevel = 'risky';
    } else if (riskScore >= 25) {
      trustLevel = 'moderate';
    } else {
      trustLevel = 'trusted';
    }

    const update: TrustTwinUpdate = {
      customerId,
      trustScore,
      riskLevel: this.getRiskLevel(riskScore),
      factors: context ? Object.keys(context) : [],
      lastUpdated: new Date()
    };

    this.queueSync({
      id: `trust_${customerId}_${Date.now()}`,
      type: 'risk_score',
      customerId,
      data: {
        ...update,
        source: 'fraud-detection',
        reason: 'risk_score_update',
        context
      },
      source: 'fraud-detection'
    });

    // Also update customer trust twin if available
    await this.updateCustomerTrustTwin(customerId, trustScore, trustLevel);
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 75) return RiskLevel.CRITICAL;
    if (score >= 50) return RiskLevel.HIGH;
    if (score >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private async updateCustomerTrustTwin(
    customerId: string,
    trustScore: number,
    trustLevel: string
  ): Promise<void> {
    try {
      // Update customer trust twin
      await fetch(`${this.twinOsUrl}/api/twins/customer/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'fraud-detection'
        },
        body: JSON.stringify({
          trustScore,
          trustLevel,
          lastRiskCheck: new Date().toISOString(),
          source: 'fraud-detection'
        })
      });

      this.logger.debug('Customer trust twin updated', {
        customerId,
        trustScore,
        trustLevel
      });
    } catch (error) {
      this.logger.warn('Failed to update customer trust twin', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async syncPatterns(patterns: FraudPattern[]): Promise<void> {
    for (const pattern of patterns) {
      this.queueSync({
        id: `pattern_${pattern.id}`,
        type: 'pattern',
        data: {
          patternId: pattern.id,
          name: pattern.name,
          type: pattern.type,
          enabled: pattern.enabled,
          weight: pattern.weight,
          description: pattern.description,
          conditions: pattern.conditions,
          source: 'fraud-detection',
          updatedAt: pattern.updatedAt.toISOString()
        },
        source: 'fraud-detection'
      });
    }

    this.logger.info('Pattern sync queued', {
      count: patterns.length
    });
  }

  async syncAlert(alert: FraudAlert): Promise<void> {
    this.queueSync({
      id: `alert_${alert.id}`,
      type: 'alert',
      customerId: alert.customerId,
      data: {
        alertId: alert.id,
        transactionId: alert.transactionId,
        patternId: alert.patternId,
        severity: alert.severity,
        status: alert.status,
        riskScore: alert.riskScore,
        riskLevel: alert.riskLevel,
        description: alert.description,
        amount: alert.amount,
        source: 'fraud-detection',
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString()
      },
      source: 'fraud-detection'
    });

    // Update customer risk twin
    await this.syncRiskScore(alert.customerId, alert.riskScore, {
      transactionId: alert.transactionId,
      amount: alert.amount
    });
  }

  async syncAlertResolution(alert: FraudAlert): Promise<void> {
    this.queueSync({
      id: `alert_res_${alert.id}_${Date.now()}`,
      type: 'alert',
      customerId: alert.customerId,
      data: {
        alertId: alert.id,
        transactionId: alert.transactionId,
        status: alert.status,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt?.toISOString(),
        notes: alert.notes,
        source: 'fraud-detection',
        type: 'resolution'
      },
      source: 'fraud-detection'
    });

    // If false positive, potentially restore trust
    if (alert.status === 'false_positive') {
      const adjustedScore = Math.max(0, alert.riskScore - 20);
      await this.syncRiskScore(alert.customerId, adjustedScore, {
        transactionId: alert.transactionId
      });
    }
  }

  async getTrustScore(customerId: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.twinOsUrl}/api/twins/customer/${customerId}/trust-score`,
        {
          method: 'GET',
          headers: {
            'X-Service': 'fraud-detection'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.trustScore;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to get trust score', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async getRiskHistory(customerId: string, limit: number = 10): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.twinOsUrl}/api/twins/customer/${customerId}/risk-history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'X-Service': 'fraud-detection'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.history || [];
      }

      return [];
    } catch (error) {
      this.logger.warn('Failed to get risk history', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async forceSyncNow(): Promise<{ synced: number; failed: number }> {
    const beforeSync = this.syncQueue.length;
    await this.processQueue();
    const afterSync = this.syncQueue.length;

    return {
      synced: beforeSync - afterSync,
      failed: afterSync
    };
  }

  getStatus(): {
    queued: number;
    stats: typeof this.syncStats;
    lastSyncByType: Record<string, Date>;
  } {
    return {
      queued: this.syncQueue.length,
      stats: { ...this.syncStats },
      lastSyncByType: Object.fromEntries(this.lastSync)
    };
  }

  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Force final sync
    await this.forceSyncNow();
  }
}
