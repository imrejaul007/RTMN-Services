import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertSummary,
  CreateAlertRequest,
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Alerting Service - Alert Generation and Management
// ============================================================================

export class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private metricsCallback?: (tenantId: string) => Promise<any>;

  /**
   * Initialize the alerting service with metrics callback
   */
  async initialize(metricsCallback: (tenantId: string) => Promise<any>): Promise<void> {
    this.metricsCallback = metricsCallback;

    // Start background monitoring
    setInterval(() => this.checkThresholds(), 60000); // Check every minute

    logger.info('Alerting service initialized');
  }

  /**
   * Get all alerts for a tenant
   */
  async getAlerts(
    tenantId: string,
    options?: {
      status?: string;
      severity?: string;
      limit?: number;
    }
  ): Promise<Alert[]> {
    const { status, severity, limit = 100 } = options || {};

    let alerts = Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    return alerts.slice(0, limit);
  }

  /**
   * Get alert summary
   */
  async getSummary(tenantId: string): Promise<AlertSummary> {
    const alerts = Array.from(this.alerts.values()).filter(a => a.tenantId === tenantId);

    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.INFO]: 0,
    };

    let active = 0;
    const criticalAlerts: Alert[] = [];

    for (const alert of alerts) {
      bySeverity[alert.severity]++;
      if (alert.status === AlertStatus.ACTIVE) {
        active++;
        if (alert.severity === AlertSeverity.CRITICAL) {
          criticalAlerts.push(alert);
        }
      }
    }

    criticalAlerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    return {
      total: alerts.length,
      active,
      bySeverity,
      criticalAlerts: criticalAlerts.slice(0, 10),
    };
  }

  /**
   * Get a specific alert
   */
  async getAlert(tenantId: string, alertId: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (alert && alert.tenantId === tenantId) {
      return alert;
    }
    return null;
  }

  /**
   * Create a new alert
   */
  async createAlert(tenantId: string, data: CreateAlertRequest): Promise<Alert> {
    const alert: Alert = {
      id: uuidv4(),
      tenantId,
      title: data.title,
      message: data.message,
      severity: data.severity,
      status: AlertStatus.ACTIVE,
      source: data.source,
      category: data.category,
      metricId: data.metricId,
      threshold: data.threshold,
      triggeredAt: new Date(),
      metadata: data.metadata,
    };

    this.alerts.set(alert.id, alert);

    logger.info('Alert created', {
      tenantId,
      alertId: alert.id,
      severity: alert.severity,
    });

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(tenantId: string, alertId: string, userId?: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      return null;
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    logger.info('Alert acknowledged', { tenantId, alertId, userId });

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(tenantId: string, alertId: string, userId?: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      return null;
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;

    logger.info('Alert resolved', { tenantId, alertId, userId });

    return alert;
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(tenantId: string, alertId: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      return null;
    }

    alert.status = AlertStatus.DISMISSED;

    logger.info('Alert dismissed', { tenantId, alertId });

    return alert;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(tenantId: string, alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      return false;
    }

    this.alerts.delete(alertId);
    logger.info('Alert deleted', { tenantId, alertId });

    return true;
  }

  /**
   * Get active alerts count
   */
  async getActiveCount(tenantId: string): Promise<number> {
    return Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId && a.status === AlertStatus.ACTIVE)
      .length;
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts(tenantId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(a =>
        a.tenantId === tenantId &&
        a.status === AlertStatus.ACTIVE &&
        a.severity === AlertSeverity.CRITICAL
      )
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Check metric thresholds and generate alerts
   */
  private async checkThresholds(): Promise<void> {
    if (!this.metricsCallback) return;

    try {
      // Get all unique tenant IDs
      const tenantIds = new Set(Array.from(this.alerts.values()).map(a => a.tenantId));

      for (const tenantId of tenantIds) {
        const metrics = await this.metricsCallback(tenantId);

        for (const metric of metrics) {
          // Check if metric has thresholds defined
          if (metric.threshold) {
            if (metric.value >= metric.threshold.critical) {
              await this.createAlert(tenantId, {
                title: `Critical: ${metric.name}`,
                message: `${metric.name} has reached critical level: ${metric.value}${metric.unit || ''}`,
                severity: AlertSeverity.CRITICAL,
                source: 'metrics-monitor',
                category: metric.category,
                metricId: metric.id,
                threshold: {
                  configured: metric.threshold.critical,
                  actual: metric.value,
                },
              });
            } else if (metric.value >= metric.threshold.warning) {
              await this.createAlert(tenantId, {
                title: `Warning: ${metric.name}`,
                message: `${metric.name} has reached warning level: ${metric.value}${metric.unit || ''}`,
                severity: AlertSeverity.HIGH,
                source: 'metrics-monitor',
                category: metric.category,
                metricId: metric.id,
                threshold: {
                  configured: metric.threshold.warning,
                  actual: metric.value,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error checking metric thresholds', { error });
    }
  }

  /**
   * Generate alerts from risk assessment
   */
  async generateRiskAlerts(tenantId: string, risks: any[]): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const risk of risks) {
      if (risk.level === 'critical' || risk.level === 'high') {
        const alert = await this.createAlert(tenantId, {
          title: `Risk Alert: ${risk.title}`,
          message: risk.description,
          severity: risk.level === 'critical' ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
          source: 'risk-assessment',
          category: 'risk',
          metadata: { riskId: risk.id },
        });
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Generate alerts from opportunity changes
   */
  async generateOpportunityAlerts(tenantId: string, opportunities: any[]): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // High-value opportunities
    const highValue = opportunities.filter(o =>
      o.estimatedValue && o.estimatedValue > 1000000 && o.probability > 70
    );

    for (const opp of highValue) {
      const alert = await this.createAlert(tenantId, {
        title: `High-Value Opportunity: ${opp.title}`,
        message: `${opp.title} has an estimated value of $${opp.estimatedValue.toLocaleString()} with ${opp.probability}% probability.`,
        severity: AlertSeverity.INFO,
        source: 'opportunity-monitor',
        category: 'opportunity',
        metadata: { opportunityId: opp.id },
      });
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Auto-resolve stale alerts
   */
  async autoResolveStaleAlerts(tenantId: string, maxAgeHours: number = 72): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let resolved = 0;

    for (const alert of this.alerts.values()) {
      if (
        alert.tenantId === tenantId &&
        alert.status === AlertStatus.ACKNOWLEDGED &&
        alert.acknowledgedAt &&
        alert.acknowledgedAt < cutoff
      ) {
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = new Date();
        alert.resolvedBy = 'system';
        resolved++;
      }
    }

    if (resolved > 0) {
      logger.info('Auto-resolved stale alerts', { tenantId, count: resolved });
    }

    return resolved;
  }
}
