/**
 * HOJAI Alerting - Enterprise Alerting System
 *
 * Provides comprehensive alerting and notification capabilities including
 * configurable rules, multiple notification channels, and cooldown management.
 *
 * @module @hojai/alerting
 * @version 1.0.0
 */

// Re-export modules
export * from './notifiers/slack';
export * from './notifiers/email';

// ============================================================================
// Types
// ============================================================================

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * Alert condition types
 */
export enum AlertConditionType {
  THRESHOLD = 'threshold',
  ANOMALY = 'anomaly',
  STATUS = 'status',
  COMPOSITE = 'composite',
}

/**
 * Metric operators for conditions
 */
export enum MetricOperator {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  EQ = '==',
  NEQ = '!=',
  ANOMALY = 'anomaly',
}

/**
 * Notification channel types
 */
export enum NotificationChannel {
  SLACK = 'slack',
  EMAIL = 'email',
  PAGERDUTY = 'pagerduty',
  WEBHOOK = 'webhook',
  SMS = 'sms',
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  channelConfig: Record<NotificationChannel, ChannelConfig>;
  cooldownMinutes: number;
  evaluationWindowMinutes: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert condition definition
 */
export interface AlertCondition {
  type: AlertConditionType;
  metric: string;
  operator: MetricOperator;
  value: number;
  windowMinutes: number;
  /** For composite conditions */
  conditions?: AlertCondition[];
  logicalOperator?: 'and' | 'or';
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  enabled: boolean;
  channelId?: string;
  recipients?: string[];
  template?: string;
  severityOverride?: AlertSeverity;
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  description?: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'firing' | 'resolved' | 'acknowledged' | 'snoozed';
  metrics: Record<string, number>;
  metadata?: Record<string, unknown>;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  snoozedUntil?: Date;
}

/**
 * Alert summary for dashboards
 */
export interface AlertSummary {
  total: number;
  firing: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<AlertSeverity, number>;
  byRule: Record<string, number>;
}

/**
 * Metric data point
 */
export interface MetricPoint {
  timestamp: Date;
  value: number;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  /** Global enable/disable */
  enabled?: boolean;
  /** Default cooldown in minutes */
  defaultCooldownMinutes?: number;
  /** Default evaluation window */
  defaultEvaluationWindow?: number;
  /** Maximum alerts per rule per hour */
  maxAlertsPerHour?: number;
  /** Enable alert deduplication */
  deduplicationEnabled?: boolean;
  /** Deduplication window in minutes */
  deduplicationWindow?: number;
  /** Retention period for resolved alerts */
  alertRetentionDays?: number;
}

/**
 * Default alerting configuration
 */
const DEFAULT_CONFIG: Required<AlertingConfig> = {
  enabled: true,
  defaultCooldownMinutes: 15,
  defaultEvaluationWindow: 5,
  maxAlertsPerHour: 100,
  deduplicationEnabled: true,
  deduplicationWindow: 5,
  alertRetentionDays: 90,
};

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for creating an alert rule
 */
export const AlertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  condition: z.object({
    type: z.nativeEnum(AlertConditionType),
    metric: z.string().min(1),
    operator: z.nativeEnum(MetricOperator),
    value: z.number(),
    windowMinutes: z.number().positive().default(5),
    conditions: z.array(z.any()).optional(),
    logicalOperator: z.enum(['and', 'or']).optional(),
  }),
  severity: z.nativeEnum(AlertSeverity).default(AlertSeverity.WARNING),
  channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
  channelConfig: z.record(z.nativeEnum(NotificationChannel), z.object({
    enabled: z.boolean(),
    channelId: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    template: z.string().optional(),
    severityOverride: z.nativeEnum(AlertSeverity).optional(),
  })).optional(),
  cooldownMinutes: z.number().min(0).default(15),
  evaluationWindowMinutes: z.number().positive().default(5),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for alert acknowledgment
 */
export const AlertAckSchema = z.object({
  alertId: z.string().min(1),
  acknowledgedBy: z.string().min(1),
  note: z.string().optional(),
});

/**
 * Schema for snooze request
 */
export const SnoozeSchema = z.object({
  alertId: z.string().min(1),
  snoozeUntil: z.date(),
  reason: z.string().optional(),
});

// ============================================================================
// Alert Manager
// ============================================================================

/**
 * Alert Manager
 *
 * Central manager for alert rules and alert lifecycle.
 *
 * @example
 * ```typescript
 * const alertManager = new AlertManager();
 *
 * // Create an alert rule
 * const rule = await alertManager.createRule({
 *   name: 'High Error Rate',
 *   condition: {
 *     type: AlertConditionType.THRESHOLD,
 *     metric: 'error_rate',
 *     operator: MetricOperator.GT,
 *     value: 5,
 *     windowMinutes: 5,
 *   },
 *   severity: AlertSeverity.CRITICAL,
 *   channels: [NotificationChannel.SLACK, NotificationChannel.EMAIL],
 * });
 *
 * // Evaluate and get firing alerts
 * const alerts = await alertManager.evaluate(metrics);
 *
 * // Acknowledge an alert
 * await alertManager.acknowledge('alert-123', 'user-456');
 * ```
 */
export class AlertManager {
  private config: Required<AlertingConfig>;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private recentAlerts: Map<string, Date> = new Map();
  private alertCounts: Map<string, number> = new Map();
  private notifiers: Map<NotificationChannel, Notifier> = new Map();

  constructor(config: AlertingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<AlertingConfig>> {
    return { ...this.config };
  }

  /**
   * Register a notifier for a channel
   */
  registerNotifier(channel: NotificationChannel, notifier: Notifier): void {
    this.notifiers.set(channel, notifier);
  }

  /**
   * Create a new alert rule
   */
  async createRule(
    validatedData: z.infer<typeof AlertRuleSchema>
  ): Promise<AlertRule> {
    const rule: AlertRule = {
      id: crypto.randomUUID(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  /**
   * Get a rule by ID
   */
  async getRule(ruleId: string): Promise<AlertRule | null> {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get all rules
   */
  async getAllRules(enabled?: boolean): Promise<AlertRule[]> {
    const rules = Array.from(this.rules.values());
    if (enabled !== undefined) {
      return rules.filter((r) => r.enabled === enabled);
    }
    return rules;
  }

  /**
   * Update a rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<AlertRule>
  ): Promise<AlertRule | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      id: ruleId,
      createdAt: rule.createdAt,
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  async setRuleEnabled(ruleId: string, enabled: boolean): Promise<boolean> {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    rule.updatedAt = new Date();
    return true;
  }

  /**
   * Evaluate all rules against current metrics
   */
  async evaluate(metrics: Record<string, number>): Promise<Alert[]> {
    const firingAlerts: Alert[] = [];
    const now = new Date();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.recentAlerts.get(rule.id);
      if (lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      // Check rate limit
      const alertCount = this.alertCounts.get(rule.id) || 0;
      if (alertCount >= this.config.maxAlertsPerHour) {
        continue;
      }

      // Evaluate condition
      const triggered = await this.evaluateCondition(rule.condition, metrics);

      if (triggered) {
        // Check for deduplication
        if (this.config.deduplicationEnabled) {
          const existingAlert = this.findRecentAlert(rule.id);
          if (existingAlert) {
            // Update existing alert instead of creating new one
            existingAlert.metrics = { ...metrics };
            this.alerts.set(existingAlert.id, existingAlert);
            continue;
          }
        }

        const alert = await this.createAlert(rule, metrics);
        firingAlerts.push(alert);
        this.recentAlerts.set(rule.id, now);

        // Update rate limit counter
        this.alertCounts.set(rule.id, alertCount + 1);

        // Send notifications
        await this.notify(alert, rule);
      }
    }

    return firingAlerts;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    metrics: Record<string, number>
  ): Promise<boolean> {
    const value = metrics[condition.metric];

    if (value === undefined) {
      return false;
    }

    switch (condition.type) {
      case AlertConditionType.THRESHOLD:
        return this.compareValues(value, condition.operator, condition.value);

      case AlertConditionType.ANOMALY:
        return this.detectAnomaly(condition.metric, value, condition.value);

      case AlertConditionType.STATUS:
        return value === condition.value;

      case AlertConditionType.COMPOSITE:
        if (!condition.conditions || !condition.logicalOperator) {
          return false;
        }
        if (condition.logicalOperator === 'and') {
          return condition.conditions.every((c) =>
            this.evaluateConditionSync(c, metrics)
          );
        } else {
          return condition.conditions.some((c) =>
            this.evaluateConditionSync(c, metrics)
          );
        }

      default:
        return false;
    }
  }

  /**
   * Synchronous condition evaluation for composite rules
   */
  private evaluateConditionSync(
    condition: AlertCondition,
    metrics: Record<string, number>
  ): boolean {
    const value = metrics[condition.metric];
    if (value === undefined) return false;
    return this.compareValues(value, condition.operator, condition.value);
  }

  /**
   * Compare values with operator
   */
  private compareValues(
    value: number,
    operator: MetricOperator,
    threshold: number
  ): boolean {
    switch (operator) {
      case MetricOperator.GT:
        return value > threshold;
      case MetricOperator.GTE:
        return value >= threshold;
      case MetricOperator.LT:
        return value < threshold;
      case MetricOperator.LTE:
        return value <= threshold;
      case MetricOperator.EQ:
        return value === threshold;
      case MetricOperator.NEQ:
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Detect anomaly using simple z-score
   */
  private async detectAnomaly(
    metric: string,
    value: number,
    threshold: number
  ): Promise<boolean> {
    // In production, this would use a real anomaly detection algorithm
    // using historical data from a metrics store
    // For now, use a simple standard deviation approach
    const history: MetricPoint[] = []; // Would come from metrics store

    if (history.length < 10) {
      // Not enough data for anomaly detection
      return false;
    }

    const mean = history.reduce((sum, p) => sum + p.value, 0) / history.length;
    const variance =
      history.reduce((sum, p) => sum + Math.pow(p.value - mean, 2), 0) /
      history.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return false;

    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > threshold;
  }

  /**
   * Create an alert instance
   */
  private async createAlert(rule: AlertRule, metrics: Record<string, number>): Promise<Alert> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.formatMessage(rule, metrics),
      description: rule.description,
      triggeredAt: new Date(),
      status: 'firing',
      metrics: { ...metrics },
      metadata: rule.metadata,
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Format alert message
   */
  private formatMessage(rule: AlertRule, metrics: Record<string, number>): string {
    const metricValue = metrics[rule.condition.metric];
    return `${rule.name}: ${rule.condition.metric} is ${metricValue} (${rule.condition.operator} ${rule.condition.value})`;
  }

  /**
   * Find recent alert for deduplication
   */
  private findRecentAlert(ruleId: string): Alert | undefined {
    const cutoff = new Date(Date.now() - this.config.deduplicationWindow * 60 * 1000);

    for (const alert of this.alerts.values()) {
      if (alert.ruleId === ruleId && alert.triggeredAt >= cutoff && alert.status === 'firing') {
        return alert;
      }
    }

    return undefined;
  }

  /**
   * Send notifications for an alert
   */
  private async notify(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      const notifier = this.notifiers.get(channel);
      if (!notifier) continue;

      const config = rule.channelConfig?.[channel];
      if (config && !config.enabled) continue;

      try {
        await notifier.send({
          alert,
          rule,
          channelConfig: config,
        });
      } catch (error) {
        console.error(`Failed to send notification via ${channel}:`, error);
      }
    }
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<Alert | null> {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get all alerts with filters
   */
  async getAlerts(filters?: {
    status?: Alert['status'];
    severity?: AlertSeverity;
    ruleId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Alert[]> {
    let results = Array.from(this.alerts.values());

    if (filters?.status) {
      results = results.filter((a) => a.status === filters.status);
    }
    if (filters?.severity) {
      results = results.filter((a) => a.severity === filters.severity);
    }
    if (filters?.ruleId) {
      results = results.filter((a) => a.ruleId === filters.ruleId);
    }
    if (filters?.startDate) {
      results = results.filter((a) => a.triggeredAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((a) => a.triggeredAt <= filters.endDate!);
    }

    results.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get firing alerts
   */
  async getFiringAlerts(): Promise<Alert[]> {
    return this.getAlerts({ status: 'firing' });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledge(
    alertId: string,
    acknowledgedBy: string,
    note?: string
  ): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolve(alertId: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Snooze an alert
   */
  async snooze(alertId: string, snoozeUntil: Date): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'snoozed';
    alert.snoozedUntil = snoozeUntil;

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Get alert summary
   */
  async getSummary(): Promise<AlertSummary> {
    const alerts = Array.from(this.alerts.values());

    return {
      total: alerts.length,
      firing: alerts.filter((a) => a.status === 'firing').length,
      acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      bySeverity: {
        [AlertSeverity.INFO]: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
        [AlertSeverity.WARNING]: alerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
        [AlertSeverity.CRITICAL]: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
        [AlertSeverity.EMERGENCY]: alerts.filter((a) => a.severity === AlertSeverity.EMERGENCY).length,
      },
      byRule: alerts.reduce((acc, a) => {
        acc[a.ruleId] = (acc[a.ruleId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Clean up old alerts
   */
  async cleanup(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000
    );

    let cleaned = 0;
    for (const [id, alert] of this.alerts.entries()) {
      if (
        (alert.resolvedAt && alert.resolvedAt < cutoff) ||
        (alert.triggeredAt < cutoff && alert.status === 'resolved')
      ) {
        this.alerts.delete(id);
        cleaned++;
      }
    }

    // Reset hourly counters at midnight
    const now = new Date();
    if (now.getHours() === 0) {
      this.alertCounts.clear();
    }

    return cleaned;
  }
}

/**
 * Notifier interface
 */
export interface Notifier {
  send(params: {
    alert: Alert;
    rule: AlertRule;
    channelConfig?: ChannelConfig;
  }): Promise<void>;
}

/**
 * Create alert validators
 */
export function createAlertValidators() {
  return {
    createRule: (data: unknown) => AlertRuleSchema.parse(data),
    acknowledge: (data: unknown) => AlertAckSchema.parse(data),
    snooze: (data: unknown) => SnoozeSchema.parse(data),
  };
}

/**
 * Severity emoji mapping
 */
export const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'info',
  [AlertSeverity.WARNING]: 'warning',
  [AlertSeverity.CRITICAL]: 'red_circle',
  [AlertSeverity.EMERGENCY]: 'rotating_light',
};

export default AlertManager;


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-alerting',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
