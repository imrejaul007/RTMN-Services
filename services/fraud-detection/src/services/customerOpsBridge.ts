import winston from 'winston';
import { FraudAlert } from '../models/Fraud';

interface HighRiskNotification {
  customerId: string;
  transactionId: string;
  riskScore: number;
  amount: number;
  reason: string;
}

interface ServiceRegistration {
  name: string;
  url: string;
  capabilities: string[];
}

export class CustomerOpsBridge {
  private logger: winston.Logger;
  private baseUrl: string;
  private eventBusUrl: string;
  private registeredServices: Map<string, ServiceRegistration> = new Map();
  private notificationQueue: Notification[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.baseUrl = process.env.CUSTOMER_OPS_URL || 'http://localhost:4399';
    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

    // Start flush interval for queued notifications
    this.startFlushInterval();
  }

  private startFlushInterval(): void {
    // Flush notifications every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushQueue();
    }, 5000);
  }

  private async flushQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const toFlush = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of toFlush) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        this.logger.error('Failed to send notification', {
          type: notification.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Re-queue failed notifications
        this.notificationQueue.push(notification);
      }
    }
  }

  private async sendNotification(notification: Notification): Promise<void> {
    const endpoint = this.getEndpoint(notification.type);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'fraud-detection',
          'X-Notification-ID': notification.id
        },
        body: JSON.stringify(notification.payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.debug('Notification sent', {
        type: notification.type,
        id: notification.id
      });
    } catch (error) {
      this.logger.error('Failed to send notification', {
        type: notification.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private getEndpoint(type: NotificationType): string {
    const endpoints: Record<NotificationType, string> = {
      [NotificationType.HIGH_RISK]: '/api/customer-operations/high-risk',
      [NotificationType.ALERT]: '/api/customer-operations/alerts',
      [NotificationType.RESOLUTION]: '/api/customer-operations/resolution',
      [NotificationType.BLOCK]: '/api/customer-operations/block',
      [NotificationType.UNBLOCK]: '/api/customer-operations/unblock'
    };
    return endpoints[type];
  }

  private queueNotification(type: NotificationType, payload: unknown): string {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: new Date()
    };

    this.notificationQueue.push(notification);

    this.logger.debug('Notification queued', {
      type,
      id: notification.id,
      queueLength: this.notificationQueue.length
    });

    return notification.id;
  }

  async registerService(service: ServiceRegistration): Promise<void> {
    this.registeredServices.set(service.name, service);

    try {
      const response = await fetch(`${process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399'}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...service,
          serviceType: 'fraud-detection'
        })
      });

      if (response.ok) {
        this.logger.info('Service registered with registry', {
          name: service.name
        });
      }
    } catch (error) {
      this.logger.warn('Failed to register service', {
        name: service.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async notifyHighRisk(notification: HighRiskNotification): Promise<void> {
    this.logger.info('Queuing high-risk notification', {
      customerId: notification.customerId,
      riskScore: notification.riskScore
    });

    // Queue the notification (non-blocking)
    this.queueNotification(NotificationType.HIGH_RISK, {
      type: 'high_risk_fraud_alert',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        customerId: notification.customerId,
        transactionId: notification.transactionId,
        riskScore: notification.riskScore,
        amount: notification.amount,
        reason: notification.reason
      },
      priority: notification.riskScore >= 90 ? 'urgent' : 'high',
      requiresAcknowledgment: true,
      channels: ['sms', 'email', 'push', 'dashboard']
    });

    // Also publish to event bus
    await this.publishEvent('fraud.high_risk', {
      customerId: notification.customerId,
      transactionId: notification.transactionId,
      riskScore: notification.riskScore,
      amount: notification.amount,
      reason: notification.reason
    });
  }

  async notifyAlert(alert: FraudAlert): Promise<void> {
    this.logger.info('Queuing alert notification', {
      alertId: alert.id,
      customerId: alert.customerId
    });

    this.queueNotification(NotificationType.ALERT, {
      type: 'fraud_alert_created',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        alertId: alert.id,
        transactionId: alert.transactionId,
        customerId: alert.customerId,
        merchantId: alert.merchantId,
        riskScore: alert.riskScore,
        severity: alert.severity,
        description: alert.description
      },
      priority: alert.severity === 'critical' ? 'urgent' : 'normal',
      requiresAcknowledgment: alert.severity === 'critical' || alert.severity === 'error'
    });

    // Publish to event bus
    await this.publishEvent('fraud.alert.created', {
      alertId: alert.id,
      transactionId: alert.transactionId,
      customerId: alert.customerId,
      severity: alert.severity
    });
  }

  async notifyResolution(alert: FraudAlert): Promise<void> {
    this.logger.info('Queuing resolution notification', {
      alertId: alert.id,
      status: alert.status
    });

    this.queueNotification(NotificationType.RESOLUTION, {
      type: 'fraud_alert_resolved',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        alertId: alert.id,
        transactionId: alert.transactionId,
        customerId: alert.customerId,
        status: alert.status,
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt?.toISOString()
      },
      priority: 'low'
    });

    // Publish to event bus
    await this.publishEvent('fraud.alert.resolved', {
      alertId: alert.id,
      customerId: alert.customerId,
      status: alert.status
    });
  }

  async requestCustomerAction(
    customerId: string,
    action: CustomerAction,
    reason: string
  ): Promise<void> {
    this.logger.info('Requesting customer action', {
      customerId,
      action
    });

    const actionMap: Record<CustomerAction, string> = {
      [CustomerAction.VERIFY_IDENTITY]: 'verify_identity',
      [CustomerAction.UPDATE_PAYMENT]: 'update_payment_method',
      [CustomerAction.CONFIRM_TRANSACTION]: 'confirm_transaction',
      [CustomerAction.FREEZE_ACCOUNT]: 'freeze_account',
      [CustomerAction.CONTACT_SUPPORT]: 'contact_support'
    };

    this.queueNotification(NotificationType.BLOCK, {
      type: 'customer_action_required',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        customerId,
        action: actionMap[action],
        reason,
        urgent: action === CustomerAction.FREEZE_ACCOUNT
      },
      channels: ['sms', 'email', 'push']
    });
  }

  async blockAccount(customerId: string, reason: string): Promise<void> {
    this.logger.info('Blocking customer account', {
      customerId,
      reason
    });

    this.queueNotification(NotificationType.BLOCK, {
      type: 'account_blocked',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        customerId,
        reason,
        blockedBy: 'fraud-detection',
        blockedAt: new Date().toISOString()
      },
      priority: 'urgent',
      requiresAcknowledgment: true
    });
  }

  async unblockAccount(customerId: string, reason: string): Promise<void> {
    this.logger.info('Unblocking customer account', {
      customerId,
      reason
    });

    this.queueNotification(NotificationType.UNBLOCK, {
      type: 'account_unblocked',
      source: 'fraud-detection',
      timestamp: new Date().toISOString(),
      data: {
        customerId,
        reason,
        unblockedBy: 'fraud-detection',
        unblockedAt: new Date().toISOString()
      }
    });
  }

  private async publishEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.eventBusUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: eventType,
          source: 'fraud-detection',
          timestamp: new Date().toISOString(),
          data
        })
      });

      if (response.ok) {
        this.logger.debug('Event published', { eventType });
      }
    } catch (error) {
      this.logger.warn('Failed to publish event', {
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCustomerRiskProfile(customerId: string): Promise<RiskProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/customer-operations/risk-profile/${customerId}`, {
        method: 'GET',
        headers: {
          'X-Service': 'fraud-detection'
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to get customer risk profile', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return [...this.notificationQueue];
  }

  getStatus(): { queued: number; registered: number } {
    return {
      queued: this.notificationQueue.length,
      registered: this.registeredServices.size
    };
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush remaining notifications
    await this.flushQueue();
  }
}

enum NotificationType {
  HIGH_RISK = 'high_risk',
  ALERT = 'alert',
  RESOLUTION = 'resolution',
  BLOCK = 'block',
  UNBLOCK = 'unblock'
}

interface Notification {
  id: string;
  type: NotificationType;
  payload: unknown;
  timestamp: Date;
}

enum CustomerAction {
  VERIFY_IDENTITY = 'verify_identity',
  UPDATE_PAYMENT = 'update_payment',
  CONFIRM_TRANSACTION = 'confirm_transaction',
  FREEZE_ACCOUNT = 'freeze_account',
  CONTACT_SUPPORT = 'contact_support'
}

interface RiskProfile {
  customerId: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  verified: boolean;
  lastUpdated: Date;
}
