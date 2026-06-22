import axios, { AxiosInstance } from 'axios';
import { NotificationType } from '../models/familySupport';
import { logger } from '../utils/logger';

export interface WhatsAppMessage {
  to: string;
  type: string;
  template?: string;
  components?: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  text?: string;
}

export interface BookingData {
  bookingId: string;
  serviceType: string;
  date: string;
  time: string;
  location?: string;
  status: string;
  customerName: string;
}

export interface MedicationData {
  medication: string;
  dosage: string;
  frequency: string;
  doctorName?: string;
  refillsRemaining?: number;
  customerName: string;
}

export interface AppointmentData {
  appointmentId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
  customerName: string;
}

export interface EmergencyAlertData {
  alertType: string;
  severity: string;
  description: string;
  location?: string;
  actionRequired?: string;
  customerName: string;
  contactPhone?: string;
}

export class WhatsAppNotificationService {
  private client: AxiosInstance;
  private readonly WHATSAPP_API_URL: string;
  private readonly WHATSAPP_PHONE_NUMBER_ID: string;

  constructor() {
    // These would typically come from environment variables
    this.WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    this.client = axios.create({
      baseURL: this.WHATSAPP_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send WhatsApp message to a family member
   */
  async sendWhatsAppToFamily(
    memberId: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production, you would look up the member's WhatsApp number
      const memberPhone = await this.getMemberPhone(memberId);

      if (!memberPhone) {
        logger.warn('No WhatsApp number found for family member', { memberId });
        return { success: false, error: 'No WhatsApp number found' };
      }

      const response = await this.client.post(
        `/${this.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: memberPhone,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
          }
        }
      );

      logger.info('WhatsApp message sent', {
        memberId,
        messageId: response.data.messages?.[0]?.id
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };

    } catch (error: any) {
      logger.error('Failed to send WhatsApp message', {
        error: error.message,
        memberId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send booking update notification via WhatsApp
   */
  async sendBookingUpdate(
    memberId: string,
    booking: BookingData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = this.formatFamilyMessage(NotificationType.BOOKING_CREATED, {
      customerName: booking.customerName,
      title: 'Booking Update',
      message: `New ${booking.serviceType} booking on ${booking.date} at ${booking.time}${booking.location ? ` at ${booking.location}` : ''}. Status: ${booking.status}`
    });

    return this.sendWhatsAppToFamily(memberId, message);
  }

  /**
   * Send medication reminder via WhatsApp
   */
  async sendMedicationReminder(
    memberId: string,
    medication: MedicationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = this.formatFamilyMessage(NotificationType.PRESCRIPTION_ADDED, {
      customerName: medication.customerName,
      title: 'Medication Reminder',
      message: `Time for ${medication.medication} (${medication.dosage}). ${medication.frequency}.${medication.doctorName ? ` Prescribed by ${medication.doctorName}.` : ''}`
    });

    return this.sendWhatsAppToFamily(memberId, message);
  }

  /**
   * Send appointment reminder via WhatsApp
   */
  async sendAppointmentReminder(
    memberId: string,
    appointment: AppointmentData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appointmentType = appointment.isVirtual ? 'Virtual' : 'In-person';
    const locationInfo = appointment.isVirtual
      ? 'You will receive a link to join'
      : `Location: ${appointment.location}`;

    const message = this.formatFamilyMessage(NotificationType.APPOINTMENT_REMINDER, {
      customerName: appointment.customerName,
      title: 'Appointment Reminder',
      message: `Reminder: ${appointmentType} appointment with ${appointment.doctorName} (${appointment.specialization}) on ${appointment.date} at ${appointment.time}. ${locationInfo}`
    });

    return this.sendWhatsAppToFamily(memberId, message);
  }

  /**
   * Send emergency alert via WhatsApp
   */
  async sendEmergencyAlert(
    memberId: string,
    alert: EmergencyAlertData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const severityEmoji = this.getSeverityEmoji(alert.severity);

    const message = `${severityEmoji} *EMERGENCY ALERT*\n\n${alert.customerName}: ${alert.alertType}\n\n${alert.description}\n\n${alert.location ? `📍 Location: ${alert.location}\n\n` : ''}${alert.actionRequired ? `⚠️ Action Required: ${alert.actionRequired}\n\n` : ''}${alert.contactPhone ? `📞 Contact: ${alert.contactPhone}` : ''}`;

    // Emergency messages should have higher priority
    return this.sendWhatsAppToFamily(memberId, message);
  }

  /**
   * Format a family notification message
   */
  formatFamilyMessage(
    type: NotificationType,
    data: {
      title: string;
      message: string;
      customerName: string;
      [key: string]: unknown;
    }
  ): string {
    const { customerName, title, message } = data;

    const prefix = this.getMessagePrefix(type);
    const suffix = this.getMessageSuffix(type);

    let formattedMessage = `${prefix}\n\n`;
    formattedMessage += `👤 *${customerName}*\n\n`;
    formattedMessage += `${message}\n\n`;
    formattedMessage += suffix;

    return formattedMessage;
  }

  /**
   * Send a templated WhatsApp message
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    languageCode: string = 'en',
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
      }>;
    }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.post(
        `/${this.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };

    } catch (error: any) {
      logger.error('Failed to send template message', {
        error: error.message,
        templateName,
        phoneNumber
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send media message (image, document, etc.)
   */
  async sendMediaMessage(
    memberId: string,
    mediaType: 'image' | 'document' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const memberPhone = await this.getMemberPhone(memberId);

      if (!memberPhone) {
        return { success: false, error: 'No WhatsApp number found' };
      }

      const response = await this.client.post(
        `/${this.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: memberPhone,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            caption
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };

    } catch (error: any) {
      logger.error('Failed to send media message', {
        error: error.message,
        memberId,
        mediaType
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send location message
   */
  async sendLocationMessage(
    memberId: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const memberPhone = await this.getMemberPhone(memberId);

      if (!memberPhone) {
        return { success: false, error: 'No WhatsApp number found' };
      }

      const response = await this.client.post(
        `/${this.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: memberPhone,
          type: 'location',
          location: {
            latitude,
            longitude,
            name: name || 'Location',
            address: address || ''
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };

    } catch (error: any) {
      logger.error('Failed to send location message', {
        error: error.message,
        memberId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get member's WhatsApp phone number
   */
  private async getMemberPhone(memberId: string): Promise<string | null> {
    // In production, this would look up the member's phone from a user service
    // For now, return a placeholder or fetch from cache/database
    // This is a mock implementation
    try {
      // Check Redis cache first
      // const cachedPhone = await redisClient.get(`whatsapp:${memberId}`);
      // if (cachedPhone) return cachedPhone;

      // In production, fetch from user service
      // const userServiceUrl = process.env.USER_SERVICE_URL;
      // const response = await axios.get(`${userServiceUrl}/users/${memberId}/contact`);
      // return response.data.whatsappNumber;

      return null; // Return null for now, real implementation would query user service

    } catch (error) {
      logger.error('Failed to get member phone', { error, memberId });
      return null;
    }
  }

  /**
   * Get message prefix based on notification type
   */
  private getMessagePrefix(type: NotificationType): string {
    const prefixes: Record<NotificationType, string> = {
      [NotificationType.BOOKING_CREATED]: '📅 *Booking Update*',
      [NotificationType.BOOKING_UPDATED]: '📅 *Booking Changed*',
      [NotificationType.BOOKING_CANCELLED]: '📅 *Booking Cancelled*',
      [NotificationType.PRESCRIPTION_ADDED]: '💊 *New Prescription*',
      [NotificationType.PRESCRIPTION_UPDATED]: '💊 *Prescription Updated*',
      [NotificationType.APPOINTMENT_REMINDER]: '⏰ *Appointment Reminder*',
      [NotificationType.APPOINTMENT_CANCELLED]: '⏰ *Appointment Cancelled*',
      [NotificationType.SUPPORT_ISSUE_CREATED]: '🎫 *Support Issue*',
      [NotificationType.SUPPORT_ISSUE_UPDATED]: '🎫 *Support Update*',
      [NotificationType.SUPPORT_RESOLVED]: '✅ *Issue Resolved*',
      [NotificationType.EMERGENCY_ALERT]: '🚨 *EMERGENCY ALERT*',
      [NotificationType.DELEGATION_REQUEST]: '🔐 *Delegation Request*',
      [NotificationType.DELEGATION_ACCEPTED]: '🔐 *Delegation Accepted*',
      [NotificationType.DELEGATION_REVOKED]: '🔐 *Delegation Revoked*',
      [NotificationType.CARE_CIRCLE_UPDATE]: '👥 *Care Circle Update*'
    };

    return prefixes[type] || '📬 *Notification*';
  }

  /**
   * Get message suffix based on notification type
   */
  private getMessageSuffix(type: NotificationType): string {
    const suffixes: Record<NotificationType, string> = {
      [NotificationType.EMERGENCY_ALERT]: 'Please respond immediately.',
      [NotificationType.APPOINTMENT_REMINDER]: 'Reply STOP to unsubscribe.',
      [NotificationType.DELEGATION_REQUEST]: 'Reply YES to accept or NO to decline.',
      default: '— HOJAI Family Support'
    };

    return suffixes[type] || suffixes.default;
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };

    return emojis[severity.toLowerCase()] || '⚠️';
  }
}

export const whatsappNotificationService = new WhatsAppNotificationService();
