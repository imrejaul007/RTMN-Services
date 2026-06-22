import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  ReminderChannel,
  ReminderDeliveryLogModel,
  IReminderDeliveryLog,
  StepStatus
} from '../models/nextStep';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

interface NextStep {
  stepId: string;
  customerId: string;
  title: string;
  description?: string;
  stepType: string;
  priority: string;
  dueDate?: Date;
  nextReminderAt?: Date;
  reminderSettings?: {
    channels: Array<{
      channel: ReminderChannel;
      enabled: boolean;
      templateId?: string;
    }>;
  };
}

interface ProactiveAlert {
  alertId: string;
  title: string;
  message: string;
  customerId: string;
  channels: ReminderChannel[];
}

interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: ReminderChannel;
}

// ============================================
// REMINDER SERVICE
// ============================================

export class ReminderService {
  private whatsappApiUrl: string;
  private smsApiUrl: string;
  private emailApiUrl: string;
  private pushApiUrl: string;

  constructor() {
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'http://localhost:4011/api/whatsapp/send';
    this.smsApiUrl = process.env.SMS_API_URL || 'http://localhost:4011/api/sms/send';
    this.emailApiUrl = process.env.EMAIL_API_URL || 'http://localhost:4011/api/email/send';
    this.pushApiUrl = process.env.PUSH_API_URL || 'http://localhost:4011/api/push/send';
  }

  /**
   * Send a reminder notification for a step
   */
  async sendReminder(step: NextStep, channel: ReminderChannel): Promise<DeliveryResult> {
    const logId = uuidv4();

    try {
      logger.info('Sending reminder', { stepId: step.stepId, channel, customerId: step.customerId });

      // Log the attempt
      await this.createDeliveryLog(logId, step, channel, 'queued');

      // Format the message
      const message = this.formatReminderMessage(step, channel);

      // Send through the appropriate channel
      let result: DeliveryResult;

      switch (channel) {
        case ReminderChannel.WHATSAPP:
          result = await this.sendWhatsAppReminder(step, message);
          break;
        case ReminderChannel.SMS:
          result = await this.sendSMSReminder(step, message);
          break;
        case ReminderChannel.EMAIL:
          result = await this.sendEmailReminder(step, message);
          break;
        case ReminderChannel.PUSH:
        case ReminderChannel.IN_APP:
          result = await this.sendPushReminder(step, message);
          break;
        default:
          result = { success: false, error: 'Unknown channel', channel };
      }

      // Update the log
      await this.trackDelivery(logId, channel, result.success ? 'sent' : 'failed', result.error);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error sending reminder', { error, stepId: step.stepId, channel });

      await this.trackDelivery(logId, channel, 'failed', errorMessage);

      return { success: false, error: errorMessage, channel };
    }
  }

  /**
   * Send WhatsApp reminder
   */
  async sendWhatsAppReminder(step: NextStep, message: string): Promise<DeliveryResult> {
    try {
      // Get customer phone number - this would come from a user/customer service
      const customerPhone = await this.getCustomerContact(step.customerId, 'whatsapp');

      if (!customerPhone) {
        return { success: false, error: 'No WhatsApp number found for customer', channel: ReminderChannel.WHATSAPP };
      }

      // Build WhatsApp message with buttons if due date exists
      const payload: Record<string, unknown> = {
        to: customerPhone,
        template: 'reminder_reminder', // Template name
        language: 'en',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: step.title },
              { type: 'text', text: this.formatDueDate(step.dueDate) }
            ]
          },
          {
            type: 'buttons',
            buttons: [
              { type: 'reply', reply: { id: `complete_${step.stepId}`, title: 'Done' } },
              { type: 'reply', reply: { id: `snooze_${step.stepId}`, title: 'Remind Later' } }
            ]
          }
        ]
      };

      // For simple text messages without templates
      const simplePayload = {
        to: customerPhone,
        message: message
      };

      try {
        const response = await axios.post(this.whatsappApiUrl, simplePayload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY || ''}`
          }
        });

        return {
          success: true,
          messageId: response.data?.messageId || uuidv4(),
          channel: ReminderChannel.WHATSAPP
        };
      } catch (apiError) {
        // If WhatsApp API fails, log and try to send via alternative
        logger.warn('WhatsApp API failed, attempting fallback', { stepId: step.stepId });

        // Fallback to notification service
        return this.sendViaNotificationService(step, message, 'whatsapp');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WhatsApp reminder failed', { error, stepId: step.stepId });
      return { success: false, error: errorMessage, channel: ReminderChannel.WHATSAPP };
    }
  }

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(step: NextStep, message: string): Promise<DeliveryResult> {
    try {
      const phoneNumber = await this.getCustomerContact(step.customerId, 'sms');

      if (!phoneNumber) {
        return { success: false, error: 'No phone number found for customer', channel: ReminderChannel.SMS };
      }

      // SMS has character limit, truncate if necessary
      const smsMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

      const payload = {
        to: phoneNumber,
        message: smsMessage,
        sender: process.env.SMS_SENDER_ID || 'REZAI'
      };

      const response = await axios.post(this.smsApiUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SMS_API_KEY || ''}`
        }
      });

      return {
        success: true,
        messageId: response.data?.messageId || uuidv4(),
        channel: ReminderChannel.SMS
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SMS reminder failed', { error, stepId: step.stepId });

      return { success: false, error: errorMessage, channel: ReminderChannel.SMS };
    }
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(step: NextStep, message: string): Promise<DeliveryResult> {
    try {
      const email = await this.getCustomerContact(step.customerId, 'email');

      if (!email) {
        return { success: false, error: 'No email found for customer', channel: ReminderChannel.EMAIL };
      }

      const payload = {
        to: email,
        subject: `Reminder: ${step.title}`,
        html: this.formatEmailHtml(step, message),
        text: message,
        template: 'reminder',
        data: {
          title: step.title,
          description: step.description,
          dueDate: step.dueDate,
          priority: step.priority,
          actionUrl: `${process.env.FRONTEND_URL || 'https://app.rez.ai'}/steps/${step.stepId}`
        }
      };

      const response = await axios.post(this.emailApiUrl, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_API_KEY || ''}`
        }
      });

      return {
        success: true,
        messageId: response.data?.messageId || uuidv4(),
        channel: ReminderChannel.EMAIL
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email reminder failed', { error, stepId: step.stepId });

      return { success: false, error: errorMessage, channel: ReminderChannel.EMAIL };
    }
  }

  /**
   * Send push notification
   */
  async sendPushReminder(step: NextStep, message: string): Promise<DeliveryResult> {
    try {
      // Get device tokens for the customer
      const deviceTokens = await this.getCustomerDeviceTokens(step.customerId);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, error: 'No device tokens found for customer', channel: ReminderChannel.PUSH };
      }

      const payload = {
        tokens: deviceTokens,
        notification: {
          title: step.title,
          body: message,
          icon: 'notification_icon',
          click_action: `steps/${step.stepId}`
        },
        data: {
          stepId: step.stepId,
          stepType: step.stepType,
          priority: step.priority,
          dueDate: step.dueDate?.toISOString()
        }
      };

      const response = await axios.post(this.pushApiUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PUSH_API_KEY || ''}`
        }
      });

      return {
        success: true,
        messageId: response.data?.messageId || uuidv4(),
        channel: ReminderChannel.PUSH
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Push reminder failed', { error, stepId: step.stepId });

      return { success: false, error: errorMessage, channel: ReminderChannel.PUSH };
    }
  }

  /**
   * Send proactive alert
   */
  async sendProactiveAlert(alert: ProactiveAlert, channel: ReminderChannel): Promise<DeliveryResult> {
    const step: NextStep = {
      stepId: alert.alertId,
      customerId: alert.customerId,
      title: alert.title,
      message: alert.message,
      stepType: 'reminder',
      priority: 'medium'
    } as unknown as NextStep;

    switch (channel) {
      case ReminderChannel.WHATSAPP:
        return this.sendWhatsAppReminder(step, alert.message);
      case ReminderChannel.SMS:
        return this.sendSMSReminder(step, alert.message);
      case ReminderChannel.EMAIL:
        return this.sendEmailReminder(step, alert.message);
      case ReminderChannel.PUSH:
      case ReminderChannel.IN_APP:
        return this.sendPushReminder(step, alert.message);
      default:
        return { success: false, error: 'Unknown channel', channel };
    }
  }

  /**
   * Format reminder message for the given channel
   */
  formatReminderMessage(step: NextStep, channel: ReminderChannel): string {
    const title = step.title;
    const dueDate = this.formatDueDate(step.dueDate);
    const priority = this.formatPriority(step.priority);

    switch (channel) {
      case ReminderChannel.WHATSAPP:
        return `*Reminder:* ${title}${dueDate ? `\nDue: ${dueDate}` : ''}${priority !== 'medium' ? `\nPriority: ${priority}` : ''}\n\nReply *Done* when completed or *Snooze* to be reminded later.`;

      case ReminderChannel.SMS:
        return `REZ Reminder: ${title}${dueDate ? ` - Due: ${dueDate}` : ''}`;

      case ReminderChannel.EMAIL:
        return `${title}\n\n${step.description || ''}\n\nDue Date: ${dueDate}\nPriority: ${priority}`;

      case ReminderChannel.PUSH:
      case ReminderChannel.IN_APP:
        return title;

      default:
        return title;
    }
  }

  /**
   * Track delivery status
   */
  async trackDelivery(
    logId: string,
    channel: ReminderChannel,
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered',
    errorMessage?: string
  ): Promise<void> {
    try {
      await ReminderDeliveryLogModel.updateOne(
        { logId },
        {
          $set: {
            status,
            errorMessage,
            deliveredAt: status === 'delivered' ? new Date() : undefined
          }
        }
      );
    } catch (error) {
      logger.error('Error tracking delivery', { error, logId });
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async createDeliveryLog(
    logId: string,
    step: NextStep,
    channel: ReminderChannel,
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered'
  ): Promise<void> {
    try {
      const log: IReminderDeliveryLog = {
        logId,
        stepId: step.stepId,
        customerId: step.customerId,
        channel,
        status,
        createdAt: new Date(),
        metadata: {
          stepTitle: step.title,
          stepType: step.stepType,
          priority: step.priority
        }
      };

      await new ReminderDeliveryLogModel(log).save();
    } catch (error) {
      logger.error('Error creating delivery log', { error, logId, stepId: step.stepId });
    }
  }

  private async getCustomerContact(customerId: string, type: 'whatsapp' | 'sms' | 'email'): Promise<string | null> {
    try {
      // In a real implementation, this would call the user/customer service
      // For now, we'll return null and let the channel-specific methods handle missing contacts
      // This would be an HTTP call to the auth or user service

      // Example:
      // const response = await axios.get(`${process.env.USER_SERVICE_URL}/customers/${customerId}/contact`, {
      //   params: { type }
      // });
      // return response.data.contact;

      // For demo purposes, return a mock if environment variable is set
      if (process.env.DEMO_MODE === 'true') {
        return type === 'email' ? 'demo@example.com' : '+919876543210';
      }

      return null;
    } catch (error) {
      logger.warn('Could not fetch customer contact', { error, customerId, type });
      return null;
    }
  }

  private async getCustomerDeviceTokens(customerId: string): Promise<string[]> {
    try {
      // In a real implementation, this would fetch device tokens from a push notification service
      // For demo purposes, return empty array
      if (process.env.DEMO_MODE === 'true') {
        return ['demo_device_token'];
      }
      return [];
    } catch (error) {
      logger.warn('Could not fetch device tokens', { error, customerId });
      return [];
    }
  }

  private async sendViaNotificationService(
    step: NextStep,
    message: string,
    channel: string
  ): Promise<DeliveryResult> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011';

      const response = await axios.post(
        `${notificationServiceUrl}/api/notifications/send`,
        {
          customerId: step.customerId,
          channel,
          message,
          metadata: {
            stepId: step.stepId,
            stepType: step.stepType
          }
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data?.success || true,
        messageId: response.data?.messageId || uuidv4(),
        channel: ReminderChannel.WHATSAPP
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Notification service fallback failed', { error, stepId: step.stepId });

      return { success: false, error: errorMessage, channel: ReminderChannel.WHATSAPP };
    }
  }

  private formatDueDate(dueDate?: Date): string {
    if (!dueDate) return '';

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      // Overdue
      if (diffDays === 0) return 'Overdue today';
      return `Overdue by ${Math.abs(diffDays)} day(s)`;
    }

    if (diffHours < 24) {
      return `Due in ${diffHours} hour(s)`;
    }

    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;

    return `Due: ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  private formatPriority(priority: string): string {
    const formatted = priority.charAt(0).toUpperCase() + priority.slice(1);
    return formatted;
  }

  private formatEmailHtml(step: NextStep, message: string): string {
    const priorityColors: Record<string, string> = {
      urgent: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };

    const priorityColor = priorityColors[step.priority] || priorityColors.medium;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  <div style="background-color: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="border-bottom: 2px solid ${priorityColor}; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333;">${step.title}</h2>
    </div>

    ${step.description ? `<p style="color: #666; line-height: 1.6;">${step.description}</p>` : ''}

    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #888; padding: 8px 0;">Type</td>
          <td style="color: #333; font-weight: 500;">${step.stepType}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 8px 0;">Priority</td>
          <td style="color: ${priorityColor}; font-weight: 600; text-transform: uppercase;">${step.priority}</td>
        </tr>
        ${step.dueDate ? `
        <tr>
          <td style="color: #888; padding: 8px 0;">Due Date</td>
          <td style="color: #333;">${new Date(step.dueDate).toLocaleString('en-IN')}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.FRONTEND_URL || 'https://app.rez.ai'}/steps/${step.stepId}"
         style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        View Details
      </a>
    </div>
  </div>

  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
    This reminder was sent by REZ AI. To manage your preferences, visit your account settings.
  </p>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const reminderService = new ReminderService();
