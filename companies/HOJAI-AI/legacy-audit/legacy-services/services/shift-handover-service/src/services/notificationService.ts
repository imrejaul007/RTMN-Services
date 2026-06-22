import { IAlertHandover, IShiftHandover } from '../models/handover';
import { logger } from '../utils/logger';

// Types for notification payloads
export interface NotificationPayload {
  type: 'handover_created' | 'handover_reminder' | 'critical_alert' | 'task_reminder' | 'handover_completed';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  facilityId: string;
  handoverId?: string;
  metadata?: Record<string, unknown>;
  channels: ('push' | 'email' | 'sms' | 'whatsapp')[];
  scheduledAt?: Date;
}

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface SMSNotification {
  to: string;
  message: string;
}

export interface WhatsAppNotification {
  phoneNumber: string;
  templateName: string;
  variables: Record<string, string>;
}

export class NotificationService {
  private readonly notificationQueue: NotificationPayload[] = [];

  /**
   * Notify incoming staff about a new handover
   */
  async notifyIncomingStaff(handoverId: string): Promise<boolean> {
    try {
      const { handoverService } = await import('./handoverService');
      const handover = await handoverService.getHandover(handoverId);

      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (!handover.incomingStaffId) {
        logger.warn(`No incoming staff configured for handover ${handoverId}`);
        return false;
      }

      const payload: NotificationPayload = {
        type: 'handover_created',
        title: 'New Shift Handover',
        message: `You have a new handover from ${handover.outgoingStaffName} for ${handover.facilityName}. Shift date: ${handover.shiftDate.toDateString()}.`,
        priority: 'high',
        userId: handover.incomingStaffId,
        facilityId: handover.facilityId,
        handoverId: handover.handoverId,
        channels: ['push', 'email', 'whatsapp'],
        metadata: {
          outgoingStaffName: handover.outgoingStaffName,
          shiftType: handover.shiftType,
          shiftDate: handover.shiftDate,
          patientCount: handover.sections.patients.length,
          taskCount: handover.sections.tasks.length,
          alertCount: handover.sections.alerts.length
        }
      };

      await this.sendNotification(payload);

      // Send reminders based on alert severity
      if (handover.sections.alerts.length > 0) {
        const criticalAlerts = handover.sections.alerts.filter(
          (a) => a.type === 'critical' || a.type === 'urgent'
        );
        if (criticalAlerts.length > 0) {
          await this.alertOnCriticalAlert(handoverId, criticalAlerts[0]);
        }
      }

      logger.info(`Incoming staff notified for handover ${handoverId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to notify incoming staff for handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Notify about outstanding tasks
   */
  async notifyOutstandingTasks(incomingId: string): Promise<void> {
    try {
      const { handoverService } = await import('./handoverService');
      const pendingHandovers = await handoverService.getPendingHandover(incomingId);

      if (pendingHandovers.length === 0) {
        return;
      }

      // Collect all pending tasks across handovers
      const allPendingTasks: { task: unknown; handoverId: string }[] = [];
      for (const handover of pendingHandovers) {
        const pending = handover.sections.tasks.filter(
          (t) => t.status !== 'completed' && t.status !== 'cancelled'
        );
        for (const task of pending) {
          allPendingTasks.push({ task, handoverId: handover.handoverId });
        }
      }

      if (allPendingTasks.length === 0) {
        return;
      }

      const payload: NotificationPayload = {
        type: 'task_reminder',
        title: 'Outstanding Tasks Reminder',
        message: `You have ${allPendingTasks.length} pending task(s) across ${pendingHandovers.length} handover(s) requiring attention.`,
        priority: 'medium',
        userId: incomingId,
        facilityId: pendingHandovers[0]?.facilityId || '',
        channels: ['push', 'email'],
        metadata: {
          taskCount: allPendingTasks.length,
          handoverCount: pendingHandovers.length,
          tasks: allPendingTasks.slice(0, 5).map((t) => ({
            description: (t.task as { description: string }).description,
            priority: (t.task as { priority: string }).priority,
            handoverId: t.handoverId
          }))
        }
      };

      await this.sendNotification(payload);
      logger.info(`Task reminders sent to user ${incomingId}`);
    } catch (error) {
      logger.error(`Failed to notify outstanding tasks for user ${incomingId}:`, error);
      throw error;
    }
  }

  /**
   * Alert on critical alert
   */
  async alertOnCriticalAlert(
    handoverId: string,
    alert: IAlertHandover
  ): Promise<boolean> {
    try {
      const { handoverService } = await import('./handoverService');
      const handover = await handoverService.getHandover(handoverId);

      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      const payload: NotificationPayload = {
        type: 'critical_alert',
        title: `CRITICAL ALERT: ${alert.type.toUpperCase()}`,
        message: alert.description,
        priority: 'critical',
        userId: handover.incomingStaffId,
        facilityId: handover.facilityId,
        handoverId: handover.handoverId,
        channels: ['push', 'sms', 'whatsapp'],
        metadata: {
          alertId: alert.alertId,
          alertType: alert.type,
          actionRequired: alert.actionRequired,
          patientId: alert.patientId,
          patientName: alert.patientName,
          createdBy: alert.createdBy
        }
      };

      // Send critical alerts immediately with all channels
      await this.sendNotification(payload);

      // Also notify outgoing staff as they created the alert
      const outgoingPayload: NotificationPayload = {
        type: 'critical_alert',
        title: `Your ${alert.type} alert was received`,
        message: `The incoming staff has been notified about the ${alert.type} alert you created.`,
        priority: 'high',
        userId: handover.outgoingStaffId,
        facilityId: handover.facilityId,
        handoverId: handover.handoverId,
        channels: ['push'],
        metadata: {
          alertId: alert.alertId,
          alertType: alert.type,
          acknowledged: false
        }
      };

      await this.sendNotification(outgoingPayload);

      logger.info(`Critical alert ${alert.alertId} sent for handover ${handoverId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to alert on critical alert ${alert.alertId}:`, error);
      throw error;
    }
  }

  /**
   * Notify handover completion
   */
  async notifyHandoverCompleted(handoverId: string): Promise<boolean> {
    try {
      const { handoverService } = await import('./handoverService');
      const handover = await handoverService.getHandover(handoverId);

      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      const payload: NotificationPayload = {
        type: 'handover_completed',
        title: 'Handover Completed',
        message: `Handover from ${handover.outgoingStaffName} to ${handover.incomingStaffName} has been completed successfully.`,
        priority: 'low',
        userId: handover.outgoingStaffId,
        facilityId: handover.facilityId,
        handoverId: handover.handoverId,
        channels: ['push'],
        metadata: {
          outgoingStaffName: handover.outgoingStaffName,
          incomingStaffName: handover.incomingStaffName,
          completedAt: handover.completedAt,
          patientCount: handover.sections.patients.length,
          taskCount: handover.sections.tasks.length,
          alertCount: handover.sections.alerts.length,
          acknowledgmentCount: handover.acknowledgments.length
        }
      };

      await this.sendNotification(payload);
      logger.info(`Handover completion notified for ${handoverId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to notify handover completion for ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule a reminder notification
   */
  async scheduleReminder(
    handoverId: string,
    reminderTime: Date,
    message: string
  ): Promise<void> {
    try {
      const { handoverService } = await import('./handoverService');
      const handover = await handoverService.getHandover(handoverId);

      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      const payload: NotificationPayload = {
        type: 'handover_reminder',
        title: 'Handover Reminder',
        message,
        priority: 'medium',
        userId: handover.incomingStaffId,
        facilityId: handover.facilityId,
        handoverId: handover.handoverId,
        channels: ['push', 'whatsapp'],
        scheduledAt: reminderTime
      };

      this.notificationQueue.push(payload);
      logger.info(`Reminder scheduled for handover ${handoverId} at ${reminderTime}`);
    } catch (error) {
      logger.error(`Failed to schedule reminder for handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Add to queue for processing
      this.notificationQueue.push(payload);

      // Process based on channels
      if (payload.channels.includes('push')) {
        await this.sendPushNotification(payload);
      }

      if (payload.channels.includes('email')) {
        await this.sendEmailNotification(payload);
      }

      if (payload.channels.includes('sms')) {
        await this.sendSMSNotification(payload);
      }

      if (payload.channels.includes('whatsapp')) {
        await this.sendWhatsAppNotification(payload);
      }

      logger.info(`Notification sent: ${payload.type} to ${payload.userId || 'broadcast'}`);
    } catch (error) {
      logger.error(`Failed to send notification:`, error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    // In production, this would integrate with FCM, APNs, or a service like OneSignal
    logger.info(`[PUSH] Sending to user ${payload.userId}: ${payload.title}`);
    // Implementation would call FCM/APNs API here
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    // In production, this would integrate with SendGrid, AWS SES, or similar
    logger.info(`[EMAIL] Sending to user ${payload.userId}: ${payload.title}`);
    // Implementation would call email service API here
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    // In production, this would integrate with Twilio, AWS SNS, or similar
    logger.info(`[SMS] Sending to user ${payload.userId}: ${payload.title}`);
    // Implementation would call SMS service API here
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(payload: NotificationPayload): Promise<void> {
    // In production, this would integrate with Twilio WhatsApp, Gupshup, or similar
    logger.info(`[WHATSAPP] Sending to user ${payload.userId}: ${payload.title}`);
    // Implementation would call WhatsApp service API here
  }

  /**
   * Get pending notifications from queue
   */
  getPendingNotifications(): NotificationPayload[] {
    return this.notificationQueue.filter(
      (n) => !n.scheduledAt || n.scheduledAt > new Date()
    );
  }

  /**
   * Clear processed notifications from queue
   */
  clearProcessedNotifications(): void {
    const now = new Date();
    const remaining = this.notificationQueue.filter(
      (n) => n.scheduledAt && n.scheduledAt > now
    );
    this.notificationQueue.length = 0;
    this.notificationQueue.push(...remaining);
  }
}

export const notificationService = new NotificationService();
