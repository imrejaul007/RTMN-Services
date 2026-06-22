import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import winston from 'winston';
import {
  AlertConfig,
  AlertEvent,
  AlertConfigSchema,
  CircuitBreaker,
  ServiceHealth,
  ServiceCategory,
  WS_EVENT_TYPE,
  WSEvent
} from '../types';

/**
 * Alert Manager Service
 * Handles alert creation, notification delivery, and alert lifecycle
 */
export class AlertManager {
  private logger: winston.Logger;
  private configs: Map<string, AlertConfig> = new Map();
  private alerts: Map<string, AlertEvent[]> = new Map();
  private wsEmitter?: (event: WSEvent) => void;

  // Alert deduplication window (5 minutes)
  private readonly DEDUP_WINDOW_MS = 5 * 60 * 1000;
  private recentAlerts: Map<string, Date> = new Map();

  // Alert counters for rate limiting
  private alertCounts: Map<string, number> = new Map();
  private alertCountResetInterval?: NodeJS.Timeout;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.initializeDefaultConfigs();
    this.startAlertCountReset();
  }

  /**
   * Set WebSocket emitter for real-time updates
   */
  setWsEmitter(emitter: (event: WSEvent) => void): void {
    this.wsEmitter = emitter;
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfig: AlertConfig = {
      id: 'default',
      enabled: true,
      channels: {
        email: false,
        slack: process.env.ALERT_SLACK_WEBHOOK_URL ? true : false,
        webhook: process.env.ALERT_WEBHOOK_URL ? true : false
      },
      thresholds: {
        failureRatePercent: 50,
        responseTimeMs: 5000,
        consecutiveFailures: 5
      },
      services: [], // Empty means all services
      severity: 'medium'
    };
    this.configs.set('default', defaultConfig);

    // Category-specific configs
    const criticalConfig: AlertConfig = {
      id: 'critical',
      enabled: true,
      channels: {
        email: true,
        slack: true,
        webhook: true
      },
      thresholds: {
        failureRatePercent: 70,
        responseTimeMs: 10000,
        consecutiveFailures: 10
      },
      services: [], // Apply to all
      severity: 'critical'
    };
    this.configs.set('critical', criticalConfig);
  }

  /**
   * Start alert count reset interval (hourly)
   */
  private startAlertCountReset(): void {
    this.alertCountResetInterval = setInterval(() => {
      this.alertCounts.clear();
      this.logger.debug('Alert counts reset');
    }, 60 * 60 * 1000); // Reset every hour
  }

  /**
   * Configure alert settings
   */
  configureAlert(configId: string, config: Partial<AlertConfig>): AlertConfig | null {
    try {
      const existingConfig = this.configs.get(configId);
      const mergedConfig = existingConfig
        ? { ...existingConfig, ...config, id: configId }
        : { ...config, id: configId };

      const validated = AlertConfigSchema.parse(mergedConfig);
      this.configs.set(configId, validated);
      this.logger.info(`Alert config updated: ${configId}`);
      return validated;
    } catch (error) {
      this.logger.error(`Failed to configure alert ${configId}:`, error);
      return null;
    }
  }

  /**
   * Get alert configuration
   */
  getConfig(configId: string): AlertConfig | undefined {
    return this.configs.get(configId);
  }

  /**
   * Get all alert configurations
   */
  getAllConfigs(): AlertConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Delete alert configuration
   */
  deleteConfig(configId: string): boolean {
    if (configId === 'default') {
      return false; // Cannot delete default config
    }
    return this.configs.delete(configId);
  }

  /**
   * Check if alert should be sent (deduplication and rate limiting)
   */
  private shouldSendAlert(serviceName: string, alertType: string): boolean {
    const key = `${serviceName}:${alertType}`;
    const now = new Date();

    // Check deduplication window
    const lastAlert = this.recentAlerts.get(key);
    if (lastAlert && now.getTime() - lastAlert.getTime() < this.DEDUP_WINDOW_MS) {
      this.logger.debug(`Alert suppressed (dedup): ${key}`);
      return false;
    }

    // Check rate limiting
    const count = this.alertCounts.get(key) || 0;
    if (count >= 10) {
      this.logger.debug(`Alert suppressed (rate limit): ${key}`);
      return false;
    }

    // Update tracking
    this.recentAlerts.set(key, now);
    this.alertCounts.set(key, count + 1);

    return true;
  }

  /**
   * Create and process an alert
   */
  async createAlert(
    serviceName: string,
    category: ServiceCategory,
    type: AlertEvent['type'],
    severity: AlertEvent['severity'],
    message: string,
    details: AlertEvent['details']
  ): Promise<AlertEvent | null> {
    if (!this.shouldSendAlert(serviceName, type)) {
      return null;
    }

    const alert: AlertEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      serviceName,
      category,
      type,
      severity,
      message,
      details,
      acknowledged: false
    };

    // Store alert
    const alerts = this.alerts.get(serviceName) || [];
    alerts.unshift(alert);

    // Keep only last 500 alerts per service
    if (alerts.length > 500) {
      alerts.pop();
    }
    this.alerts.set(serviceName, alerts);

    this.logger.warn(`Alert created: ${serviceName} - ${type} - ${severity}`);

    // Emit via WebSocket
    if (this.wsEmitter) {
      this.wsEmitter({
        type: WS_EVENT_TYPE.ALERT_CREATED,
        payload: alert,
        timestamp: new Date()
      });
    }

    // Send notifications
    await this.sendNotifications(alert);

    return alert;
  }

  /**
   * Create alert from circuit state change
   */
  async alertCircuitStateChange(circuit: CircuitBreaker, newState: string): Promise<void> {
    let type: AlertEvent['type'];
    let severity: AlertEvent['severity'];
    let message: string;

    switch (newState) {
      case 'open':
        type = 'circuit_open';
        severity = circuit.category === ServiceCategory.RABTUL ? 'critical' : 'high';
        message = `Circuit breaker OPEN for ${circuit.serviceName} after ${circuit.failureCount} consecutive failures`;
        break;
      case 'half_open':
        type = 'circuit_half_open';
        severity = 'medium';
        message = `Circuit breaker testing recovery for ${circuit.serviceName}`;
        break;
      case 'close':
        type = 'circuit_close';
        severity = 'low';
        message = `Circuit breaker CLOSED for ${circuit.serviceName} - service recovered`;
        break;
      default:
        return;
    }

    await this.createAlert(
      circuit.serviceName,
      circuit.category,
      type,
      severity,
      message,
      {
        circuitState: circuit.state,
        consecutiveFailures: circuit.failureCount
      }
    );
  }

  /**
   * Create alert from high failure rate
   */
  async alertHighFailureRate(
    serviceName: string,
    category: ServiceCategory,
    failureRate: number
  ): Promise<void> {
    await this.createAlert(
      serviceName,
      category,
      'high_failure_rate',
      failureRate > 70 ? 'critical' : 'high',
      `High failure rate detected for ${serviceName}: ${failureRate.toFixed(2)}%`,
      { failureRate }
    );
  }

  /**
   * Create alert from slow response
   */
  async alertSlowResponse(
    serviceName: string,
    category: ServiceCategory,
    responseTime: number,
    threshold: number
  ): Promise<void> {
    await this.createAlert(
      serviceName,
      category,
      'slow_response',
      'medium',
      `Slow response from ${serviceName}: ${responseTime}ms (threshold: ${threshold}ms)`,
      { responseTime }
    );
  }

  /**
   * Create alert from service being down
   */
  async alertServiceDown(
    serviceName: string,
    category: ServiceCategory,
    consecutiveFailures: number
  ): Promise<void> {
    await this.createAlert(
      serviceName,
      category,
      'service_down',
      'critical',
      `Service DOWN: ${serviceName} - ${consecutiveFailures} consecutive health check failures`,
      { consecutiveFailures }
    );
  }

  /**
   * Send notifications via configured channels
   */
  private async sendNotifications(alert: AlertEvent): Promise<void> {
    const sendPromises: Promise<void>[] = [];

    // Check all configs and send if matches
    for (const config of this.configs.values()) {
      if (!config.enabled) continue;
      if (!this.matchesConfig(alert, config)) continue;

      if (config.channels.webhook && process.env.ALERT_WEBHOOK_URL) {
        sendPromises.push(this.sendWebhook(alert));
      }

      if (config.channels.slack && process.env.ALERT_SLACK_WEBHOOK_URL) {
        sendPromises.push(this.sendSlack(alert));
      }

      if (config.channels.email && process.env.ALERT_EMAIL_TO) {
        sendPromises.push(this.sendEmail(alert));
      }
    }

    await Promise.allSettled(sendPromises);
  }

  /**
   * Check if alert matches config
   */
  private matchesConfig(alert: AlertEvent, config: AlertConfig): boolean {
    // Check severity
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    if (severityOrder[alert.severity] < severityOrder[config.severity]) {
      return false;
    }

    // Check if service is in excluded list
    if (config.services && config.services.length > 0) {
      return config.services.includes(alert.serviceName);
    }

    return true;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(alert: AlertEvent): Promise<void> {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (!webhookUrl) return;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-ID': alert.id,
          'X-Alert-Type': alert.type
        },
        body: JSON.stringify({
          alert: {
            id: alert.id,
            timestamp: alert.timestamp.toISOString(),
            serviceName: alert.serviceName,
            category: alert.category,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            details: alert.details
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      this.logger.info(`Webhook sent for alert ${alert.id}`);
    } catch (error) {
      this.logger.error('Failed to send webhook:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(alert: AlertEvent): Promise<void> {
    try {
      const webhookUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const colorMap: Record<string, string> = {
        low: '#36a64f',
        medium: '#ffcc00',
        high: '#ff6600',
        critical: '#ff0000'
      };

      const emojiMap: Record<string, string> = {
        low: ':information_source:',
        medium: ':warning:',
        high: ':exclamation:',
        critical: ':rotating_light:'
      };

      const payload = {
        attachments: [
          {
            color: colorMap[alert.severity],
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `${emojiMap[alert.severity]} ${alert.severity.toUpperCase()}: ${alert.type.replace(/_/g, ' ')}`,
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Service:*\n${alert.serviceName}` },
                  { type: 'mrkdwn', text: `*Category:*\n${alert.category}` }
                ]
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Message:*\n${alert.message}`
                }
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `Alert ID: \`${alert.id}\` | Time: ${alert.timestamp.toISOString()}`
                  }
                ]
              }
            ]
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }

      this.logger.info(`Slack notification sent for alert ${alert.id}`);
    } catch (error) {
      this.logger.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(alert: AlertEvent): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    this.logger.info(`Email notification prepared for alert ${alert.id}:`, {
      to: process.env.ALERT_EMAIL_TO,
      subject: `[${alert.severity.toUpperCase()}] REZ Alert: ${alert.type.replace(/_/g, ' ')} - ${alert.serviceName}`
    });
  }

  /**
   * Get all alerts for a service
   */
  getAlerts(serviceName?: string, limit: number = 100): AlertEvent[] {
    if (serviceName) {
      const alerts = this.alerts.get(serviceName) || [];
      return alerts.slice(0, limit);
    }

    // Return all alerts sorted by timestamp
    const allAlerts: AlertEvent[] = [];
    for (const alerts of this.alerts.values()) {
      allAlerts.push(...alerts);
    }
    return allAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(limit: number = 50): AlertEvent[] {
    const allAlerts = this.getAlerts(undefined, 1000);
    return allAlerts.filter(a => !a.acknowledged).slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();

        // Emit via WebSocket
        if (this.wsEmitter) {
          this.wsEmitter({
            type: WS_EVENT_TYPE.ALERT_ACKNOWLEDGED,
            payload: alert,
            timestamp: new Date()
          });
        }

        return true;
      }
    }
    return false;
  }

  /**
   * Acknowledge all alerts for a service
   */
  acknowledgeAllAlerts(serviceName: string, acknowledgedBy: string): number {
    const alerts = this.alerts.get(serviceName);
    if (!alerts) return 0;

    let count = 0;
    for (const alert of alerts) {
      if (!alert.acknowledged) {
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        count++;
      }
    }

    if (count > 0 && this.wsEmitter) {
      this.wsEmitter({
        type: WS_EVENT_TYPE.ALERT_ACKNOWLEDGED,
        payload: { serviceName, count, acknowledgedBy },
        timestamp: new Date()
      });
    }

    return count;
  }

  /**
   * Delete old alerts (cleanup)
   */
  deleteOldAlerts(olderThanHours: number = 168): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [serviceName, alerts] of this.alerts.entries()) {
      const filtered = alerts.filter(a => a.timestamp > cutoff);
      if (filtered.length === 0) {
        this.alerts.delete(serviceName);
        deletedCount += alerts.length;
      } else {
        const removed = alerts.length - filtered.length;
        deletedCount += removed;
        this.alerts.set(serviceName, filtered);
      }
    }

    this.logger.info(`Deleted ${deletedCount} old alerts`);
    return deletedCount;
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    totalAlerts: number;
    unacknowledgedAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    alertsByCategory: Record<string, number>;
  } {
    let totalAlerts = 0;
    let unacknowledgedAlerts = 0;
    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const alertsByCategory: Record<string, number> = {};

    for (const alerts of this.alerts.values()) {
      for (const alert of alerts) {
        totalAlerts++;
        if (!alert.acknowledged) unacknowledgedAlerts++;

        alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
        alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
        alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1;
      }
    }

    return { totalAlerts, unacknowledgedAlerts, alertsBySeverity, alertsByType, alertsByCategory };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.alertCountResetInterval) {
      clearInterval(this.alertCountResetInterval);
    }
  }
}
