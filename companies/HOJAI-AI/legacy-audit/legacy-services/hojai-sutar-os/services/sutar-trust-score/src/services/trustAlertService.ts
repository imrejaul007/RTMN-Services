// Trust Alert Service - Manage trust score change alerts

import { v4 as uuidv4 } from "uuid";
import {
  TrustAlert,
  TrustAlertEvent,
  AlertType,
  AlertSeverity,
  TrustScore,
  TrustLevel,
  TrustFactorType,
  PaginationParams,
  PaginatedResponse
} from "../types";

/**
 * Alert threshold defaults
 */
const ALERT_THRESHOLDS = {
  scoreDrop: 10,        // Alert when score drops by 10+
  scoreRise: 15,        // Alert when score rises by 15+
  levelChange: true,    // Alert on any level change
  badgeChange: true     // Alert on badge changes
};

/**
 * In-memory alert storage
 */
const alertStore: Map<string, TrustAlert[]> = new Map();
const alertEventStore: Map<string, TrustAlertEvent[]> = new Map();

/**
 * Alert subscribers for webhooks
 */
const webhookSubscribers: Map<string, (event: TrustAlertEvent) => Promise<void>> = new Map();

/**
 * Trust Alert Service class
 */
export class TrustAlertService {
  /**
   * Create an alert for an entity
   */
  createAlert(
    entityId: string,
    type: AlertType,
    severity: AlertSeverity,
    threshold?: number,
    notificationChannels: ("EMAIL" | "WEBHOOK" | "IN_APP")[] = ["IN_APP"],
    webhookUrl?: string,
    email?: string
  ): TrustAlert {
    const alerts = alertStore.get(entityId) || [];

    // Check for existing alert of same type
    const existingAlert = alerts.find(a => a.type === type);
    if (existingAlert) {
      // Update existing alert
      existingAlert.enabled = true;
      existingAlert.threshold = threshold ?? existingAlert.threshold;
      existingAlert.notificationChannels = notificationChannels;
      existingAlert.webhookUrl = webhookUrl ?? existingAlert.webhookUrl;
      existingAlert.email = email ?? existingAlert.email;
      return existingAlert;
    }

    const alert: TrustAlert = {
      id: uuidv4(),
      entityId,
      type,
      severity,
      threshold,
      enabled: true,
      createdAt: new Date().toISOString(),
      notificationChannels,
      webhookUrl,
      email
    };

    alerts.push(alert);
    alertStore.set(entityId, alerts);

    return alert;
  }

  /**
   * Get all alerts for an entity
   */
  getAlerts(entityId: string): TrustAlert[] {
    return alertStore.get(entityId) || [];
  }

  /**
   * Get enabled alerts for an entity
   */
  getEnabledAlerts(entityId: string): TrustAlert[] {
    return this.getAlerts(entityId).filter(a => a.enabled);
  }

  /**
   * Get a specific alert
   */
  getAlert(entityId: string, alertId: string): TrustAlert | null {
    const alerts = alertStore.get(entityId) || [];
    return alerts.find(a => a.id === alertId) || null;
  }

  /**
   * Update an alert
   */
  updateAlert(
    entityId: string,
    alertId: string,
    updates: Partial<Pick<TrustAlert, "threshold" | "enabled" | "notificationChannels" | "webhookUrl" | "email">>
  ): TrustAlert | null {
    const alerts = alertStore.get(entityId) || [];
    const index = alerts.findIndex(a => a.id === alertId);

    if (index === -1) return null;

    const updatedAlert = { ...alerts[index], ...updates };
    alerts[index] = updatedAlert;
    alertStore.set(entityId, alerts);

    return updatedAlert;
  }

  /**
   * Delete an alert
   */
  deleteAlert(entityId: string, alertId: string): boolean {
    const alerts = alertStore.get(entityId) || [];
    const index = alerts.findIndex(a => a.id === alertId);

    if (index === -1) return false;

    alerts.splice(index, 1);
    alertStore.set(entityId, alerts);
    return true;
  }

  /**
   * Enable an alert
   */
  enableAlert(entityId: string, alertId: string): TrustAlert | null {
    return this.updateAlert(entityId, alertId, { enabled: true });
  }

  /**
   * Disable an alert
   */
  disableAlert(entityId: string, alertId: string): TrustAlert | null {
    return this.updateAlert(entityId, alertId, { enabled: false });
  }

  /**
   * Check alerts for trust score changes and trigger events
   */
  checkAndTriggerAlerts(
    entityId: string,
    newScore: TrustScore,
    previousScore?: TrustScore
  ): TrustAlertEvent[] {
    const events: TrustAlertEvent[] = [];
    const enabledAlerts = this.getEnabledAlerts(entityId);

    for (const alert of enabledAlerts) {
      const event = this.evaluateAlert(alert, newScore, previousScore);
      if (event) {
        events.push(event);
        this.recordAlertEvent(entityId, event);
        this.sendNotifications(event);
      }
    }

    return events;
  }

  /**
   * Evaluate an alert against current scores
   */
  private evaluateAlert(
    alert: TrustAlert,
    newScore: TrustScore,
    previousScore?: TrustScore
  ): TrustAlertEvent | null {
    const now = new Date().toISOString();

    switch (alert.type) {
      case AlertType.TRUST_SCORE_DROP:
        if (previousScore && newScore.score < previousScore.score) {
          const drop = previousScore.score - newScore.score;
          const threshold = alert.threshold || ALERT_THRESHOLDS.scoreDrop;
          if (drop >= threshold) {
            return this.createAlertEvent(alert, newScore, previousScore.score, now);
          }
        }
        break;

      case AlertType.TRUST_SCORE_RISE:
        if (previousScore && newScore.score > previousScore.score) {
          const rise = newScore.score - previousScore.score;
          const threshold = alert.threshold || ALERT_THRESHOLDS.scoreRise;
          if (rise >= threshold) {
            return this.createAlertEvent(alert, newScore, previousScore.score, now);
          }
        }
        break;

      case AlertType.LEVEL_CHANGE:
        if (previousScore && newScore.level !== previousScore.level) {
          return {
            id: uuidv4(),
            alertId: alert.id,
            entityId: alert.entityId,
            type: alert.type,
            severity: alert.severity,
            message: `Trust level changed from ${previousScore.level} to ${newScore.level}`,
            previousValue: previousScore.score,
            newValue: newScore.score,
            triggeredAt: now,
            acknowledged: false
          };
        }
        break;

      case AlertType.THRESHOLD_BREACH:
        if (alert.threshold !== undefined) {
          const breached = newScore.score <= alert.threshold;
          if (breached) {
            return {
              id: uuidv4(),
              alertId: alert.id,
              entityId: alert.entityId,
              type: alert.type,
              severity: alert.severity,
              message: `Trust score dropped below threshold: ${newScore.score} <= ${alert.threshold}`,
              previousValue: previousScore?.score,
              newValue: newScore.score,
              triggeredAt: now,
              acknowledged: false
            };
          }
        }
        break;

      case AlertType.SUSPICIOUS_ACTIVITY:
        // Check for suspicious patterns
        const suspiciousFactors = newScore.factors.filter(f =>
          f.evidence.some(e => e.type === "SUSPICIOUS_ACTIVITY")
        );
        if (suspiciousFactors.length > 0) {
          return {
            id: uuidv4(),
            alertId: alert.id,
            entityId: alert.entityId,
            type: alert.type,
            severity: AlertSeverity.CRITICAL,
            message: `Suspicious activity detected in factors: ${suspiciousFactors.map(f => f.type).join(", ")}`,
            triggeredAt: now,
            acknowledged: false
          };
        }
        break;
    }

    return null;
  }

  /**
   * Create alert event
   */
  private createAlertEvent(
    alert: TrustAlert,
    newScore: TrustScore,
    previousScore: number,
    timestamp: string
  ): TrustAlertEvent {
    const change = newScore.score - previousScore;
    const isIncrease = change > 0;

    return {
      id: uuidv4(),
      alertId: alert.id,
      entityId: alert.entityId,
      type: alert.type,
      severity: alert.severity,
      message: `Trust score ${isIncrease ? "increased" : "decreased"} by ${Math.abs(change)} points (${previousScore} -> ${newScore.score})`,
      previousValue: previousScore,
      newValue: newScore.score,
      triggeredAt: timestamp,
      acknowledged: false
    };
  }

  /**
   * Record an alert event
   */
  private recordAlertEvent(entityId: string, event: TrustAlertEvent): void {
    const events = alertEventStore.get(entityId) || [];
    events.unshift(event);
    alertEventStore.set(entityId, events);

    // Update alert's last triggered time
    const alerts = alertStore.get(entityId) || [];
    const alert = alerts.find(a => a.id === event.alertId);
    if (alert) {
      alert.lastTriggered = event.triggeredAt;
    }
  }

  /**
   * Get alert events for an entity
   */
  getAlertEvents(entityId: string, pagination?: PaginationParams): TrustAlertEvent[] {
    const events = alertEventStore.get(entityId) || [];

    if (!pagination) {
      return events;
    }

    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;

    return events.slice(start, end);
  }

  /**
   * Get paginated alert events
   */
  getPaginatedAlertEvents(
    entityId: string,
    pagination: PaginationParams
  ): PaginatedResponse<TrustAlertEvent> {
    const events = alertEventStore.get(entityId) || [];
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const items = events.slice(start, end);

    return {
      items,
      total: events.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(events.length / pagination.limit),
      hasMore: end < events.length
    };
  }

  /**
   * Acknowledge an alert event
   */
  acknowledgeEvent(entityId: string, eventId: string): TrustAlertEvent | null {
    const events = alertEventStore.get(entityId) || [];
    const event = events.find(e => e.id === eventId);

    if (!event) return null;

    event.acknowledged = true;
    event.acknowledgedAt = new Date().toISOString();
    alertEventStore.set(entityId, events);

    return event;
  }

  /**
   * Acknowledge all events for an entity
   */
  acknowledgeAllEvents(entityId: string): number {
    const events = alertEventStore.get(entityId) || [];
    let count = 0;

    for (const event of events) {
      if (!event.acknowledged) {
        event.acknowledged = true;
        event.acknowledgedAt = new Date().toISOString();
        count++;
      }
    }

    alertEventStore.set(entityId, events);
    return count;
  }

  /**
   * Get unacknowledged events
   */
  getUnacknowledgedEvents(entityId: string): TrustAlertEvent[] {
    return (alertEventStore.get(entityId) || []).filter(e => !e.acknowledged);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(entityId: string, severity: AlertSeverity): TrustAlertEvent[] {
    return (alertEventStore.get(entityId) || []).filter(e => e.severity === severity);
  }

  /**
   * Get events by type
   */
  getEventsByType(entityId: string, type: AlertType): TrustAlertEvent[] {
    return (alertEventStore.get(entityId) || []).filter(e => e.type === type);
  }

  /**
   * Send notifications for an alert event
   */
  private async sendNotifications(event: TrustAlertEvent): Promise<void> {
    const alerts = alertStore.get(event.entityId) || [];
    const alert = alerts.find(a => a.id === event.alertId);

    if (!alert) return;

    for (const channel of alert.notificationChannels) {
      switch (channel) {
        case "WEBHOOK":
          if (alert.webhookUrl) {
            await this.sendWebhookNotification(alert.webhookUrl, event);
          }
          break;
        case "EMAIL":
          if (alert.email) {
            await this.sendEmailNotification(alert.email, event);
          }
          break;
        case "IN_APP":
          // In-app notifications are stored in the event store
          break;
      }
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(url: string, event: TrustAlertEvent): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP request
      console.log(`[ALERT_WEBHOOK] Sending to ${url}:`, JSON.stringify(event));
      // await fetch(url, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      console.error(`[ALERT_WEBHOOK] Failed to send to ${url}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, event: TrustAlertEvent): Promise<void> {
    // In a real implementation, this would send an email
    console.log(`[ALERT_EMAIL] Sending to ${email}:`, event.message);
    // await emailService.send({
    //   to: email,
    //   subject: `Trust Alert: ${event.type}`,
    //   body: event.message
    // });
  }

  /**
   * Register webhook subscriber
   */
  registerWebhookSubscriber(id: string, callback: (event: TrustAlertEvent) => Promise<void>): void {
    webhookSubscribers.set(id, callback);
  }

  /**
   * Unregister webhook subscriber
   */
  unregisterWebhookSubscriber(id: string): boolean {
    return webhookSubscribers.delete(id);
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(entityId: string): {
    totalAlerts: number;
    enabledAlerts: number;
    totalEvents: number;
    unacknowledgedEvents: number;
    eventsBySeverity: Record<AlertSeverity, number>;
    eventsByType: Record<AlertType, number>;
  } {
    const alerts = this.getAlerts(entityId);
    const events = alertEventStore.get(entityId) || [];

    const eventsBySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0
    };

    const eventsByType: Record<AlertType, number> = {
      [AlertType.TRUST_SCORE_DROP]: 0,
      [AlertType.TRUST_SCORE_RISE]: 0,
      [AlertType.LEVEL_CHANGE]: 0,
      [AlertType.NEW_BADGE_EARNED]: 0,
      [AlertType.BADGE_REVOKED]: 0,
      [AlertType.SUSPICIOUS_ACTIVITY]: 0,
      [AlertType.THRESHOLD_BREACH]: 0
    };

    for (const event of events) {
      eventsBySeverity[event.severity]++;
      eventsByType[event.type]++;
    }

    return {
      totalAlerts: alerts.length,
      enabledAlerts: alerts.filter(a => a.enabled).length,
      totalEvents: events.length,
      unacknowledgedEvents: events.filter(e => !e.acknowledged).length,
      eventsBySeverity,
      eventsByType
    };
  }

  /**
   * Delete all alerts for an entity
   */
  deleteAllAlerts(entityId: string): boolean {
    alertStore.delete(entityId);
    alertEventStore.delete(entityId);
    return true;
  }

  /**
   * Export alerts
   */
  exportAlerts(entityId: string): string {
    return JSON.stringify({
      alerts: this.getAlerts(entityId),
      events: alertEventStore.get(entityId) || []
    }, null, 2);
  }

  /**
   * Get all alert types with descriptions
   */
  getAlertTypes(): Array<{ type: AlertType; description: string; defaultThreshold?: number }> {
    return [
      { type: AlertType.TRUST_SCORE_DROP, description: "Alert when trust score drops significantly", defaultThreshold: ALERT_THRESHOLDS.scoreDrop },
      { type: AlertType.TRUST_SCORE_RISE, description: "Alert when trust score increases significantly", defaultThreshold: ALERT_THRESHOLDS.scoreRise },
      { type: AlertType.LEVEL_CHANGE, description: "Alert when trust level changes" },
      { type: AlertType.NEW_BADGE_EARNED, description: "Alert when a new badge is earned" },
      { type: AlertType.BADGE_REVOKED, description: "Alert when a badge is revoked" },
      { type: AlertType.SUSPICIOUS_ACTIVITY, description: "Alert when suspicious activity is detected" },
      { type: AlertType.THRESHOLD_BREACH, description: "Alert when score breaches a specific threshold" }
    ];
  }
}

export default TrustAlertService;