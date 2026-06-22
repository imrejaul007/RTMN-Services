/**
 * RABTUL Notification Bridge
 *
 * Connects GlamAI to RABTUL Notification service for:
 * - Beauty follow-up reminders
 * - Appointment reminders
 * - WhatsApp notifications
 * - SMS alerts
 */

import axios from 'axios';
import { logger } from '../../../utils/logger.js';

const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:4005';
const WHATSAPP_URL = process.env.WHATSAPP_URL || 'http://localhost:4006';

export class NotificationBridge {
  private notification: axios.AxiosInstance;
  private whatsapp: axios.AxiosInstance;

  constructor() {
    this.notification = axios.create({
      baseURL: NOTIFICATION_URL,
      timeout: 10000
    });
    this.whatsapp = axios.create({
      baseURL: WHATSAPP_URL,
      timeout: 15000
    });
  }

  // ============ BEAUTY FOLLOW-UP ============

  /**
   * Send beauty follow-up reminder
   */
  async sendBeautyFollowUp(customerId: string, data: {
    phone: string;
    name: string;
    type: 'rebooking' | 'product' | 'birthday' | 'seasonal';
    message: string;
    offer?: {
      type: 'discount' | 'points' | 'free_service';
      value: number;
      description: string;
    };
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'beauty_followup',
        variables: {
          name: data.name,
          message: data.message,
          offer: data.offer?.description
        }
      });

      logger.info(`Sent beauty follow-up to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Beauty follow-up failed: ${error.message}`);
      return false;
    }
  }

  // ============ APPOINTMENT REMINDERS ============

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(customerId: string, data: {
    phone: string;
    name: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceName: string;
    stylistName?: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'appointment_reminder',
        variables: {
          name: data.name,
          date: data.appointmentDate,
          time: data.appointmentTime,
          service: data.serviceName,
          stylist: data.stylistName
        }
      });

      logger.info(`Sent appointment reminder to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Appointment reminder failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(customerId: string, data: {
    phone: string;
    name: string;
    appointmentId: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceName: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'appointment_confirmed',
        variables: {
          name: data.name,
          appointmentId: data.appointmentId,
          date: data.appointmentDate,
          time: data.appointmentTime,
          service: data.serviceName
        }
      });

      logger.info(`Sent appointment confirmation to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Appointment confirmation failed: ${error.message}`);
      return false;
    }
  }

  // ============ PRODUCT RECOMMENDATIONS ============

  /**
   * Send product recommendation
   */
  async sendProductRecommendation(customerId: string, data: {
    phone: string;
    name: string;
    productName: string;
    productBenefits: string;
    offer?: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'product_recommendation',
        variables: {
          name: data.name,
          product: data.productName,
          benefits: data.productBenefits,
          offer: data.offer
        }
      });

      logger.info(`Sent product recommendation to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Product recommendation failed: ${error.message}`);
      return false;
    }
  }

  // ============ BIRTHDAY/ANNIVERSARY ============

  /**
   * Send birthday offer
   */
  async sendBirthdayOffer(customerId: string, data: {
    phone: string;
    name: string;
    offer: {
      type: string;
      value: number;
      description: string;
    };
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'birthday_offer',
        variables: {
          name: data.name,
          offer: data.offer.description
        }
      });

      logger.info(`Sent birthday offer to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Birthday offer failed: ${error.message}`);
      return false;
    }
  }

  // ============ LOYALTY/NOTIFICATIONS ============

  /**
   * Send loyalty points update
   */
  async sendLoyaltyUpdate(customerId: string, data: {
    phone: string;
    name: string;
    pointsEarned: number;
    totalPoints: number;
    tier: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'loyalty_update',
        variables: {
          name: data.name,
          points: data.pointsEarned,
          total: data.totalPoints,
          tier: data.tier
        }
      });

      logger.info(`Sent loyalty update to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Loyalty update failed: ${error.message}`);
      return false;
    }
  }

  // ============ STYLIST NOTIFICATIONS ============

  /**
   * Notify stylist of upcoming appointment
   */
  async notifyStylist(stylistId: string, data: {
    phone: string;
    name: string;
    customerName: string;
    serviceName: string;
    appointmentTime: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'stylist_appointment',
        variables: {
          stylist: data.name,
          customer: data.customerName,
          service: data.serviceName,
          time: data.appointmentTime,
          notes: data.notes
        }
      });

      logger.info(`Sent stylist notification to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Stylist notification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Notify stylist of replacement needed
   */
  async notifyStylistReplacement(stylistId: string, data: {
    phone: string;
    name: string;
    appointmentId: string;
    reason: string;
    customerName: string;
  }): Promise<boolean> {
    try {
      await this.whatsapp.post('/api/send', {
        phone: data.phone,
        template: 'stylist_replacement',
        variables: {
          stylist: data.name,
          appointmentId: data.appointmentId,
          reason: data.reason,
          customer: data.customerName
        }
      });

      logger.info(`Sent replacement notification to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Replacement notification failed: ${error.message}`);
      return false;
    }
  }

  // ============ INVENTORY ALERTS ============

  /**
   * Send low stock alert to manager
   */
  async sendInventoryAlert(managerId: string, data: {
    phone: string;
    name: string;
    productName: string;
    currentStock: number;
    threshold: number;
    urgency: 'high' | 'medium' | 'low';
  }): Promise<boolean> {
    try {
      await this.notification.post('/api/alert', {
        type: 'inventory_low',
        recipientId: managerId,
        phone: data.phone,
        data: {
          product: data.productName,
          currentStock: data.currentStock,
          threshold: data.threshold,
          urgency: data.urgency
        }
      });

      logger.info(`Sent inventory alert to ${data.phone}`);
      return true;
    } catch (error: any) {
      logger.warn(`Inventory alert failed: ${error.message}`);
      return false;
    }
  }

  // ============ BULK NOTIFICATIONS ============

  /**
   * Send bulk beauty reminders
   */
  async sendBulkBeautyReminders(customers: Array<{
    customerId: string;
    phone: string;
    name: string;
    message: string;
  }>): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      const success = await this.sendBeautyFollowUp(customer.customerId, {
        phone: customer.phone,
        name: customer.name,
        type: 'rebooking',
        message: customer.message
      });

      if (success) sent++;
      else failed++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info(`Bulk reminder sent: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<boolean> {
    try {
      await this.notification.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationBridge = new NotificationBridge();
