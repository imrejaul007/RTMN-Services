/**
 * Alert Service - Business logic for SLA alerts
 */

import { v4 as uuidv4 } from 'uuid';
import { Alert, IAlert, AlertType, AlertChannel, AlertStatus } from '../models/Alert';
import logger from '../utils/logger';

export interface CreateAlertInput {
  slaId: string;
  ticketId: string;
  type: AlertType;
  channel: AlertChannel;
  recipient: string;
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class AlertService {
  /**
   * Create a new alert
   */
  async createAlert(input: CreateAlertInput): Promise<IAlert> {
    const alertData: Partial<IAlert> = {
      alertId: `ALT-${uuidv4().slice(0, 8).toUpperCase()}`,
      slaId: input.slaId,
      ticketId: input.ticketId,
      type: input.type,
      channel: input.channel,
      status: AlertStatus.PENDING,
      recipient: input.recipient,
      subject: input.subject,
      message: input.message,
      retryCount: 0,
      metadata: input.metadata || {},
    };

    const alert = new Alert(alertData);
    await alert.save();

    logger.info('Alert created', { alertId: alert.alertId, type: input.type, channel: input.channel });
    return alert;
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<IAlert | null> {
    return Alert.findOne({ alertId }).exec();
  }

  /**
   * Get alerts for SLA
   */
  async getAlertsForSLA(slaId: string): Promise<IAlert[]> {
    return Alert.find({ slaId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get pending alerts
   */
  async getPendingAlerts(): Promise<IAlert[]> {
    return Alert.find({ status: AlertStatus.PENDING }).sort({ createdAt: 1 }).exec();
  }

  /**
   * Mark alert as sent
   */
  async markAlertSent(alertId: string): Promise<IAlert | null> {
    return Alert.findOneAndUpdate(
      { alertId },
      {
        $set: {
          status: AlertStatus.SENT,
          sentAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Mark alert as failed
   */
  async markAlertFailed(alertId: string, errorMessage: string): Promise<IAlert | null> {
    return Alert.findOneAndUpdate(
      { alertId },
      {
        $set: {
          status: AlertStatus.FAILED,
          errorMessage,
        },
        $inc: { retryCount: 1 },
      },
      { new: true }
    ).exec();
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<IAlert | null> {
    return Alert.findOneAndUpdate(
      { alertId },
      {
        $set: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedBy,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Retry failed alert
   */
  async retryAlert(alertId: string): Promise<IAlert | null> {
    return Alert.findOneAndUpdate(
      { alertId, status: AlertStatus.FAILED },
      {
        $set: { status: AlertStatus.PENDING },
 },
      { new: true }
    ).exec();
  }

  /**
   * Send alert (simulated - would integrate with actual notification services)
   */
  async sendAlert(alert: IAlert): Promise<boolean> {
    try {
      // Simulate sending based on channel
      switch (alert.channel) {
        case AlertChannel.EMAIL:
          // Would integrate with email service
          logger.info('Sending email alert', { alertId: alert.alertId, recipient: alert.recipient });
          break;
        case AlertChannel.SMS:
          logger.info('Sending SMS alert', { alertId: alert.alertId, recipient: alert.recipient });
          break;
        case AlertChannel.PUSH:
          logger.info('Sending push alert', { alertId: alert.alertId, recipient: alert.recipient });
          break;
        case AlertChannel.WEBHOOK:
          logger.info('Sending webhook alert', { alertId: alert.alertId, recipient: alert.recipient });
          break;
        case AlertChannel.DASHBOARD:
          logger.info('Sending dashboard alert', { alertId: alert.alertId });
          break;
      }

      await this.markAlertSent(alert.alertId);
      return true;
    } catch (error) {
      logger.error('Failed to send alert', { alertId: alert.alertId, error });
      await this.markAlertFailed(alert.alertId, String(error));
      return false;
    }
  }
}

export const alertService = new AlertService();
export default alertService;