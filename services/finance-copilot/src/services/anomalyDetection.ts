/**
 * Anomaly Detection Service
 * Detects suspicious financial transactions and patterns
 */

import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert';
import { AnomalyAlert, Transaction, AnomalySeverity } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class AnomalyDetectionService {
  // Statistical thresholds
  private readonly AMOUNT_Z_SCORE_THRESHOLD = 2.5;
  private readonly VELOCITY_THRESHOLD = 10; // transactions per minute
  private readonly HIGH_AMOUNT_THRESHOLD = 10000;

  /**
   * Detect anomalies in a single transaction
   */
  async detectTransactionAnomaly(transaction: Transaction): Promise<AnomalyAlert | null> {
    logger.info(`Analyzing transaction ${transaction.id} for anomalies`);

    const anomalies: AnomalyAlert[] = [];

    // Check for suspicious amount
    const amountAnomaly = await this.checkSuspiciousAmount(transaction);
    if (amountAnomaly) anomalies.push(amountAnomaly);

    // Check for unusual pattern
    const patternAnomaly = await this.checkUnusualPattern(transaction);
    if (patternAnomaly) anomalies.push(patternAnomaly);

    // Check velocity (simulated - in production would query recent transactions)
    const velocityAnomaly = await this.checkVelocity(transaction);
    if (velocityAnomaly) anomalies.push(velocityAnomaly);

    // Check geographic anomaly (simulated)
    const geoAnomaly = await this.checkGeographicAnomaly(transaction);
    if (geoAnomaly) anomalies.push(geoAnomaly);

    // Return the highest severity anomaly
    if (anomalies.length > 0) {
      const sortedAnomalies = anomalies.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      return sortedAnomalies[0];
    }

    return null;
  }

  /**
   * Check if transaction amount is suspicious
   */
  private async checkSuspiciousAmount(transaction: Transaction): Promise<AnomalyAlert | null> {
    // Simulate statistical analysis
    const categoryAvgAmounts: Record<string, number> = {
      food: 50,
      entertainment: 100,
      shopping: 200,
      utilities: 150,
      salary: 5000,
      transfer: 1000,
    };

    const avgAmount = categoryAvgAmounts[transaction.category] || 500;
    const zScore = Math.abs(transaction.amount - avgAmount) / avgAmount;

    if (zScore > this.AMOUNT_Z_SCORE_THRESHOLD && transaction.amount > this.HIGH_AMOUNT_THRESHOLD) {
      const severity: AnomalySeverity = zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium';

      return {
        id: uuidv4(),
        transactionId: transaction.id,
        type: 'suspicious_amount',
        severity,
        score: Math.min(100, zScore * 25),
        description: `Transaction amount $${transaction.amount} is ${zScore.toFixed(1)} standard deviations from category average $${avgAmount}`,
        detectedAt: new Date(),
        resolved: false,
        metadata: { avgAmount, zScore },
      };
    }

    return null;
  }

  /**
   * Check for unusual transaction patterns
   */
  private async checkUnusualPattern(transaction: Transaction): Promise<AnomalyAlert | null> {
    const hour = new Date(transaction.timestamp).getHours();

    // Unusual hours for certain transaction types
    const unusualHours = {
      expense: [2, 3, 4, 5],
      income: [0, 1, 2, 3, 4, 5],
    };

    const unusualHour = unusualHours[transaction.type]?.includes(hour);
    const highValue = transaction.amount > 5000;

    if (unusualHour && highValue) {
      return {
        id: uuidv4(),
        transactionId: transaction.id,
        type: 'unusual_pattern',
        severity: 'medium',
        score: 65,
        description: `High-value ${transaction.type} transaction at unusual hour (${hour}:00)`,
        detectedAt: new Date(),
        resolved: false,
        metadata: { hour, transactionType: transaction.type },
      };
    }

    return null;
  }

  /**
   * Check transaction velocity (rate of transactions)
   */
  private async checkVelocity(transaction: Transaction): Promise<AnomalyAlert | null> {
    // Simulated velocity check - in production would query DB
    const simulatedVelocity = Math.random() * 15;

    if (simulatedVelocity > this.VELOCITY_THRESHOLD) {
      return {
        id: uuidv4(),
        transactionId: transaction.id,
        type: 'velocity_check',
        severity: 'high',
        score: 80,
        description: `High transaction velocity detected: ${simulatedVelocity.toFixed(1)} transactions/minute`,
        detectedAt: new Date(),
        resolved: false,
        metadata: { velocity: simulatedVelocity },
      };
    }

    return null;
  }

  /**
   * Check for geographic anomalies
   */
  private async checkGeographicAnomaly(transaction: Transaction): Promise<AnomalyAlert | null> {
    // Simulated - would use IP geolocation or transaction location data
    const locations = ['New York', 'Los Angeles', 'London', 'Tokyo', 'Dubai'];
    const isUnusualLocation = Math.random() > 0.9;

    if (isUnusualLocation && transaction.amount > 2000) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      return {
        id: uuidv4(),
        transactionId: transaction.id,
        type: 'geographic_anomaly',
        severity: 'medium',
        score: 70,
        description: `Transaction from unusual location: ${location}`,
        detectedAt: new Date(),
        resolved: false,
        metadata: { location, isUnusual: true },
      };
    }

    return null;
  }

  /**
   * Get all alerts with optional filtering
   */
  async getAlerts(filters: {
    severity?: AnomalySeverity;
    type?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<AnomalyAlert[]> {
    const query: Record<string, unknown> = {};

    if (filters.severity) query.severity = filters.severity;
    if (filters.type) query.type = filters.type;
    if (filters.resolved !== undefined) query.resolved = filters.resolved;
    if (filters.startDate || filters.endDate) {
      query.detectedAt = {};
      if (filters.startDate) query.detectedAt.$gte = filters.startDate;
      if (filters.endDate) query.detectedAt.$lte = filters.endDate;
    }

    const alerts = await Alert.find(query).sort({ detectedAt: -1 }).limit(100);
    return alerts.map(this.mapToAnomalyAlert);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<boolean> {
    const result = await Alert.findByIdAndUpdate(
      alertId,
      {
        resolved: true,
        resolution,
        resolvedAt: new Date(),
      },
      { new: true }
    );
    return !!result;
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    resolvedCount: number;
    avgScore: number;
  }> {
    const alerts = await Alert.find();
    const stats = {
      total: alerts.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      resolvedCount: 0,
      avgScore: 0,
    };

    let totalScore = 0;
    alerts.forEach((alert) => {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      if (alert.resolved) stats.resolvedCount++;
      totalScore += alert.score;
    });

    stats.avgScore = alerts.length > 0 ? totalScore / alerts.length : 0;
    return stats;
  }

  private mapToAnomalyAlert(doc: any): AnomalyAlert {
    return {
      id: doc._id.toString(),
      transactionId: doc.transactionId,
      type: doc.type,
      severity: doc.severity,
      score: doc.score,
      description: doc.description,
      detectedAt: doc.detectedAt,
      resolved: doc.resolved,
      resolution: doc.resolution,
      metadata: doc.metadata,
    };
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
