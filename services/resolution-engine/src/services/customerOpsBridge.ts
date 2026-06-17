import { Resolution, EscalationRule } from '../models/Resolution';
import winston from 'winston';
import axios from 'axios';

export interface CustomerNotification {
  customerId: string;
  type: 'resolution' | 'escalation' | 'sla_warning' | 'sla_breach';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  history: {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionHours: number;
    satisfactionScore?: number;
  };
}

export class CustomerOpsBridge {
  private logger: winston.Logger;
  private customerTwinUrl: string;
  private notificationServiceUrl: string;
  private cache: Map<string, CustomerProfile>;
  private cacheExpiry: number = 1000 * 60 * 5; // 5 minutes

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4510';
    this.cache = new Map();
  }

  async notifyResolution(resolution: Resolution): Promise<void> {
    this.logger.info(`Notifying customer ${resolution.customerId} about resolution: ${resolution.ticketId}`);

    try {
      // Get customer profile
      const customer = await this.getCustomerProfile(resolution.customerId);

      if (!customer) {
        this.logger.warn(`Customer not found: ${resolution.customerId}`);
        return;
      }

      // Prepare notification
      const notification: CustomerNotification = {
        customerId: resolution.customerId,
        type: 'resolution',
        channel: 'email',
        subject: `Your ticket ${resolution.ticketId} has been resolved`,
        message: this.buildResolutionMessage(resolution, customer),
        metadata: {
          ticketId: resolution.ticketId,
          resolutionMethod: resolution.resolutionMethod,
          confidence: resolution.confidence
        }
      };

      // Send notification
      await this.sendNotification(customer, notification);

      // Update customer profile in Customer Twin
      await this.updateCustomerStats(resolution.customerId, 'resolved');

      // Publish event
      await this.publishEvent('resolution.resolved', {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        customerId: resolution.customerId,
        method: resolution.resolutionMethod,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Customer notified successfully: ${resolution.customerId}`);
    } catch (error: any) {
      this.logger.error(`Failed to notify customer: ${error.message}`);
    }
  }

  async notifyEscalation(resolution: Resolution, rule: EscalationRule): Promise<void> {
    this.logger.info(`Notifying about escalation for ticket: ${resolution.ticketId}`);

    try {
      const customer = await this.getCustomerProfile(resolution.customerId);

      if (!customer) {
        return;
      }

      const notification: CustomerNotification = {
        customerId: resolution.customerId,
        type: 'escalation',
        channel: customer.tier === 'enterprise' ? 'email' : 'in_app',
        subject: `Your ticket ${resolution.ticketId} has been escalated`,
        message: `Your support ticket has been escalated to ${rule.assignTo}. A senior agent will be handling your case.`,
        metadata: {
          ticketId: resolution.ticketId,
          escalationLevel: rule.escalationLevel,
          escalatedTo: rule.assignTo
        }
      };

      await this.sendNotification(customer, notification);

      // Publish escalation event
      await this.publishEvent('resolution.escalated', {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        customerId: resolution.customerId,
        escalationLevel: rule.escalationLevel,
        escalatedTo: rule.assignTo,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.logger.error(`Failed to notify escalation: ${error.message}`);
    }
  }

  async notifySLAWarning(resolution: Resolution, hoursRemaining: number): Promise<void> {
    this.logger.info(`SLA warning for ticket: ${resolution.ticketId}`);

    try {
      const customer = await this.getCustomerProfile(resolution.customerId);

      if (!customer) {
        return;
      }

      const notification: CustomerNotification = {
        customerId: resolution.customerId,
        type: 'sla_warning',
        channel: customer.tier === 'enterprise' ? 'email' : 'in_app',
        subject: `Your ticket ${resolution.ticketId} requires attention`,
        message: `We have ${hoursRemaining.toFixed(1)} hours remaining to resolve your ticket. We are working on it.`,
        metadata: {
          ticketId: resolution.ticketId,
          hoursRemaining
        }
      };

      await this.sendNotification(customer, notification);
    } catch (error: any) {
      this.logger.error(`Failed to notify SLA warning: ${error.message}`);
    }
  }

  async notifySLABreach(resolution: Resolution): Promise<void> {
    this.logger.error(`SLA breached for ticket: ${resolution.ticketId}`);

    try {
      const customer = await this.getCustomerProfile(resolution.customerId);

      if (!customer) {
        return;
      }

      // Enterprise customers get immediate notification
      if (customer.tier === 'enterprise') {
        const notification: CustomerNotification = {
          customerId: resolution.customerId,
          type: 'sla_breach',
          channel: 'email',
          subject: `[URGENT] SLA Breached for ticket ${resolution.ticketId}`,
          message: `We apologize - the SLA for your ticket has been breached. This has been escalated and a manager has been notified.`,
          metadata: {
            ticketId: resolution.ticketId,
            breachTime: resolution.slaBreachTime
          }
        };

        await this.sendNotification(customer, notification);
      }

      // Publish breach event for internal handling
      await this.publishEvent('resolution.sla.breached', {
        resolutionId: resolution.id,
        ticketId: resolution.ticketId,
        customerId: resolution.customerId,
        customerTier: customer.tier,
        breachTime: resolution.slaBreachTime,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.logger.error(`Failed to notify SLA breach: ${error.message}`);
    }
  }

  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    // Check cache first
    const cached = this.cache.get(customerId);
    if (cached) {
      return cached;
    }

    try {
      // Try to fetch from Customer Twin service
      const response = await axios.get(`${this.customerTwinUrl}/api/customers/${customerId}`, {
        timeout: 3000
      });

      if (response.data) {
        const profile: CustomerProfile = {
          id: response.data.id || customerId,
          name: response.data.name || 'Customer',
          email: response.data.email || `${customerId}@example.com`,
          phone: response.data.phone,
          tier: response.data.tier || 'basic',
          preferences: response.data.preferences || {
            notifications: { email: true, sms: false, push: true }
          },
          history: response.data.history || {
            totalTickets: 0,
            resolvedTickets: 0,
            avgResolutionHours: 0
          }
        };

        this.cache.set(customerId, profile);
        return profile;
      }
    } catch (error: any) {
      this.logger.debug(`Customer Twin service unavailable: ${error.message}`);
    }

    // Return mock profile for development
    const mockProfile: CustomerProfile = {
      id: customerId,
      name: 'Customer',
      email: `${customerId}@example.com`,
      tier: 'basic',
      preferences: {
        notifications: { email: true, sms: false, push: true }
      },
      history: {
        totalTickets: 0,
        resolvedTickets: 0,
        avgResolutionHours: 0
      }
    };

    return mockProfile;
  }

  private buildResolutionMessage(resolution: Resolution, customer: CustomerProfile): string {
    const greeting = `Dear ${customer.name},\n\n`;
    const body = resolution.resolutionMethod === 'auto'
      ? `Your support ticket ${resolution.ticketId} has been automatically resolved.\n\n`
      : `Your support ticket ${resolution.ticketId} has been resolved.\n\n`;

    const resolutionText = resolution.resolution
      ? `Resolution: ${resolution.resolution}\n\n`
      : '';

    const steps = resolution.steps && resolution.steps.length > 0
      ? `Steps taken:\n${resolution.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
      : '';

    const satisfaction = `If this doesn't resolve your issue, please reply to this email or contact support.\n\n`;
    const closing = 'Thank you for your patience.\n\nBest regards,\nSupport Team';

    return greeting + body + resolutionText + steps + satisfaction + closing;
  }

  private async sendNotification(customer: CustomerProfile, notification: CustomerNotification): Promise<void> {
    // In production, this would call notification service
    this.logger.info(`Sending ${notification.type} notification to ${customer.email}`);

    // Check if customer has notification enabled for this channel
    if (notification.channel === 'email' && !customer.preferences.notifications.email) {
      this.logger.debug('Email notifications disabled for customer');
      return;
    }

    try {
      // Publish to event bus for notification service to handle
      await this.publishEvent(`notification.${notification.type}`, {
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        channel: notification.channel,
        subject: notification.subject,
        message: notification.message,
        metadata: notification.metadata
      });
    } catch (error: any) {
      this.logger.warn(`Failed to send notification: ${error.message}`);
    }
  }

  private async updateCustomerStats(customerId: string, action: 'resolved' | 'escalated'): Promise<void> {
    try {
      await axios.patch(`${this.customerTwinUrl}/api/customers/${customerId}/stats`, {
        action,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });
    } catch (error: any) {
      this.logger.debug(`Failed to update customer stats: ${error.message}`);
    }
  }

  private async publishEvent(topic: string, payload: any): Promise<void> {
    if (!process.env.EVENT_BUS_URL) {
      return;
    }

    try {
      await axios.post(`${process.env.EVENT_BUS_URL}/publish`, {
        topic: `resolution.${topic}`,
        payload,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });
    } catch (error: any) {
      this.logger.warn(`Failed to publish event: ${error.message}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
