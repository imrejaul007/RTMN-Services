import {
  FamilyNotification,
  NotificationType,
  IFamilyNotificationDocument,
  SupportPermissionType
} from '../models/familySupport';
import { linkageService } from './linkageService';
import { logger } from '../utils/logger';
import { whatsappNotificationService } from './whatsAppNotificationService';

export interface NotificationEvent {
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  channels?: string[];
}

export interface BookingNotificationData {
  bookingId: string;
  serviceType: string;
  date: string;
  time: string;
  location?: string;
  status: string;
}

export interface PrescriptionNotificationData {
  prescriptionId: string;
  medication: string;
  dosage: string;
  frequency: string;
  doctorName?: string;
  pharmacy?: string;
}

export interface AppointmentNotificationData {
  appointmentId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
}

export interface IssueNotificationData {
  issueId: string;
  issueType: string;
  subject: string;
  status: string;
  priority?: string;
  description?: string;
}

export interface ResolutionNotificationData {
  issueId: string;
  subject: string;
  resolution: string;
  resolvedAt: Date;
  feedbackRequested?: boolean;
}

export interface EmergencyNotificationData {
  alertId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  description: string;
  actionRequired?: string;
  contactInfo?: {
    name: string;
    phone: string;
  };
}

export class NotificationService {
  /**
   * Send notification to multiple family members
   */
  async notifyFamily(
    customerId: string,
    customerName: string,
    event: NotificationEvent
  ): Promise<string[]> {
    // Get all family members with access
    const familyMembers = await linkageService.getFamilyLinks(customerId);

    if (familyMembers.length === 0) {
      logger.info('No family members to notify', { customerId });
      return [];
    }

    const notificationIds: string[] = [];

    for (const member of familyMembers) {
      try {
        const notification = await this.createNotification({
          recipientId: member.familyMemberId,
          recipientName: member.familyMemberName,
          type: event.type,
          title: event.title,
          message: event.message,
          data: event.data,
          relatedCustomerId: customerId,
          relatedCustomerName: customerName,
          channels: event.channels || ['in_app', 'push']
        });

        notificationIds.push(notification._id.toString());

        // Send via configured channels
        await this.sendViaChannels(notification, event.channels || ['in_app', 'push']);

      } catch (error) {
        logger.error('Failed to notify family member', {
          error,
          customerId,
          familyMemberId: member.familyMemberId
        });
      }
    }

    logger.info('Family notifications sent', {
      customerId,
      notificationCount: notificationIds.length
    });

    return notificationIds;
  }

  /**
   * Notify family when a booking is created/updated
   */
  async notifyOnBooking(
    customerId: string,
    customerName: string,
    booking: BookingNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.BOOKING_CREATED,
      title: `New Booking: ${booking.serviceType}`,
      message: `${customerName} has a new ${booking.serviceType} booking on ${booking.date} at ${booking.time}`,
      data: {
        bookingId: booking.bookingId,
        ...booking
      },
      channels: ['in_app', 'push', 'whatsapp']
    };

    return this.notifyFamily(customerId, customerName, event);
  }

  /**
   * Notify family when a prescription is added
   */
  async notifyOnPrescription(
    customerId: string,
    customerName: string,
    prescription: PrescriptionNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.PRESCRIPTION_ADDED,
      title: `New Prescription: ${prescription.medication}`,
      message: `${customerName} has a new prescription for ${prescription.medication} (${prescription.dosage})`,
      data: {
        prescriptionId: prescription.prescriptionId,
        ...prescription
      },
      channels: ['in_app', 'push', 'whatsapp']
    };

    return this.notifyFamily(customerId, customerName, event);
  }

  /**
   * Notify family about an appointment reminder
   */
  async notifyOnAppointment(
    customerId: string,
    customerName: string,
    appointment: AppointmentNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.APPOINTMENT_REMINDER,
      title: `Appointment Reminder: ${appointment.doctorName}`,
      message: `Reminder: ${customerName} has an appointment with ${appointment.doctorName} (${appointment.specialization}) on ${appointment.date} at ${appointment.time}`,
      data: {
        appointmentId: appointment.appointmentId,
        ...appointment
      },
      channels: ['in_app', 'push', 'whatsapp']
    };

    return this.notifyFamily(customerId, customerName, event);
  }

  /**
   * Notify family when a support issue is created
   */
  async notifyOnIssue(
    customerId: string,
    customerName: string,
    issue: IssueNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.SUPPORT_ISSUE_CREATED,
      title: `Support Issue: ${issue.subject}`,
      message: `${customerName} has raised a support issue: ${issue.subject}`,
      data: {
        issueId: issue.issueId,
        ...issue
      },
      channels: ['in_app', 'push', 'whatsapp']
    };

    return this.notifyFamily(customerId, customerName, event);
  }

  /**
   * Notify family when a support issue is resolved
   */
  async notifyOnResolution(
    customerId: string,
    customerName: string,
    resolution: ResolutionNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.SUPPORT_RESOLVED,
      title: `Issue Resolved: ${resolution.subject}`,
      message: `The support issue "${resolution.subject}" for ${customerName} has been resolved. ${resolution.resolution}`,
      data: {
        issueId: resolution.issueId,
        ...resolution
      },
      channels: ['in_app', 'push', 'whatsapp']
    };

    return this.notifyFamily(customerId, customerName, event);
  }

  /**
   * Notify family of an emergency alert
   */
  async notifyOnEmergency(
    customerId: string,
    customerName: string,
    emergency: EmergencyNotificationData
  ): Promise<string[]> {
    const event: NotificationEvent = {
      type: NotificationType.EMERGENCY_ALERT,
      title: `EMERGENCY: ${emergency.alertType}`,
      message: `ALERT for ${customerName}: ${emergency.description}. Action required: ${emergency.actionRequired || 'Please check immediately'}`,
      data: {
        alertId: emergency.alertId,
        ...emergency
      },
      channels: ['in_app', 'push', 'whatsapp', 'sms']
    };

    const notificationIds = await this.notifyFamily(customerId, customerName, event);

    // For emergencies, also try to get emergency contacts directly
    // This could integrate with an emergency contacts service
    logger.warn('EMERGENCY alert sent to family', {
      customerId,
      alertId: emergency.alertId,
      severity: emergency.severity
    });

    return notificationIds;
  }

  /**
   * Create a notification record
   */
  async createNotification(params: {
    recipientId: string;
    recipientName: string;
    type: NotificationType;
    title: string;
    message: string;
    data: Record<string, unknown>;
    relatedCustomerId: string;
    relatedCustomerName: string;
    channels: string[];
    metadata?: Record<string, unknown>;
  }): Promise<IFamilyNotificationDocument> {
    const notification = new FamilyNotification({
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
      relatedCustomerId: params.relatedCustomerId,
      relatedCustomerName: params.relatedCustomerName,
      channels: params.channels,
      read: false,
      delivered: false,
      sentAt: new Date(),
      metadata: params.metadata
    });

    await notification.save();

    return notification;
  }

  /**
   * Get notifications for a family member
   */
  async getNotifications(
    memberId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<{
    notifications: IFamilyNotificationDocument[];
    total: number;
    unreadCount: number;
  }> {
    const { limit = 50, offset = 0, unreadOnly = false, type } = options;

    const query: Record<string, unknown> = { recipientId: memberId };

    if (unreadOnly) {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      FamilyNotification.find(query)
        .sort({ sentAt: -1 })
        .skip(offset)
        .limit(limit),
      FamilyNotification.countDocuments(query),
      FamilyNotification.countDocuments({ recipientId: memberId, read: false })
    ]);

    return {
      notifications,
      total,
      unreadCount
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, memberId: string): Promise<boolean> {
    const notification = await FamilyNotification.findOne({
      _id: notificationId,
      recipientId: memberId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return true;
  }

  /**
   * Mark all notifications as read for a member
   */
  async markAllAsRead(memberId: string): Promise<number> {
    const result = await FamilyNotification.updateMany(
      { recipientId: memberId, read: false },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await FamilyNotification.deleteMany({
      sentAt: { $lt: cutoffDate },
      read: true
    });

    if (result.deletedCount > 0) {
      logger.info('Cleaned up old notifications', {
        deletedCount: result.deletedCount,
        daysOld
      });
    }

    return result.deletedCount;
  }

  /**
   * Send notification via configured channels
   */
  private async sendViaChannels(
    notification: IFamilyNotificationDocument,
    channels: string[]
  ): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'whatsapp':
            await this.sendWhatsAppNotification(notification);
            break;
          case 'push':
            await this.sendPushNotification(notification);
            break;
          case 'sms':
            await this.sendSMSNotification(notification);
            break;
          case 'in_app':
          default:
            notification.delivered = true;
            await notification.save();
            break;
        }
      } catch (error) {
        logger.error(`Failed to send notification via ${channel}`, {
          error,
          notificationId: notification._id
        });
      }
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(
    notification: IFamilyNotificationDocument
  ): Promise<void> {
    const message = whatsappNotificationService.formatFamilyMessage(
      notification.type,
      {
        title: notification.title,
        message: notification.message,
        customerName: notification.relatedCustomerName,
        ...notification.data
      }
    );

    await whatsappNotificationService.sendWhatsAppToFamily(
      notification.recipientId,
      message
    );

    logger.info('WhatsApp notification sent', {
      notificationId: notification._id,
      recipientId: notification.recipientId
    });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notification: IFamilyNotificationDocument
  ): Promise<void> {
    // This would integrate with a push notification service (FCM, APNs)
    // For now, we just log it
    logger.info('Push notification would be sent', {
      notificationId: notification._id,
      recipientId: notification.recipientId,
      title: notification.title
    });

    // In production, this would call FCM/APNs
    // await fcmService.send(notification.recipientId, {
    //   title: notification.title,
    //   body: notification.message,
    //   data: notification.data
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: IFamilyNotificationDocument
  ): Promise<void> {
    // This would integrate with an SMS service (Twilio, MSG91)
    logger.info('SMS notification would be sent', {
      notificationId: notification._id,
      recipientId: notification.recipientId,
      message: notification.message
    });

    // In production, this would call SMS service
    // await smsService.send(notification.recipientId, notification.message);
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string): Promise<IFamilyNotificationDocument | null> {
    return FamilyNotification.findById(notificationId);
  }

  /**
   * Get notifications by related customer
   */
  async getNotificationsForCustomer(
    customerId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<IFamilyNotificationDocument[]> {
    const { limit = 100, offset = 0 } = options;

    return FamilyNotification.find({
      relatedCustomerId: customerId
    })
      .sort({ sentAt: -1 })
      .skip(offset)
      .limit(limit);
  }
}

export const notificationService = new NotificationService();
