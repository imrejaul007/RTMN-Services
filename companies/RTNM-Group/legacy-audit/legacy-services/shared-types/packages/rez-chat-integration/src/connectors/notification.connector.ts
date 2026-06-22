// ── Notification Connector ──────────────────────────────────────────────────────────
// Connects to notification services

import axios, { AxiosInstance } from 'axios';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image?: string;
  clickAction?: string;
  channel?: 'push' | 'sms' | 'email' | 'whatsapp';
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  delivered: boolean;
  error?: string;
}

export class NotificationConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.NOTIFICATION_URL || 'https://rez-notification-service.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Send notification
   */
  async send(params: NotificationPayload): Promise<NotificationResult> {
    try {
      const response = await this.client.post('/v1/notifications/send', {
        userId: params.userId,
        title: params.title,
        body: params.body,
        data: params.data,
        image: params.image,
        clickAction: params.clickAction,
        channel: params.channel || 'push',
      });

      return {
        success: true,
        notificationId: response.data.id,
        delivered: true,
      };
    } catch (error: any) {
      console.error('[NotificationConnector] Send error:', error.message);
      return {
        success: false,
        delivered: false,
        error: error.message,
      };
    }
  }

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(params: {
    userId: string;
    bookingRef: string;
    hotelName: string;
    checkIn: string;
    checkOut: string;
  }): Promise<NotificationResult> {
    return this.send({
      userId: params.userId,
      title: 'Booking Confirmed! 🎉',
      body: `Your stay at ${params.hotelName} from ${params.checkIn} to ${params.checkOut} is confirmed. Ref: ${params.bookingRef}`,
      data: {
        type: 'booking_confirmation',
        bookingRef: params.bookingRef,
      },
      clickAction: 'BOOKING_DETAILS',
    });
  }

  /**
   * Send order update notification
   */
  async sendOrderUpdate(params: {
    userId: string;
    orderId: string;
    status: string;
    statusText: string;
    estimatedTime?: string;
  }): Promise<NotificationResult> {
    return this.send({
      userId: params.userId,
      title: `Order ${params.statusText}`,
      body: params.estimatedTime
        ? `Your order is ${params.statusText}. Estimated: ${params.estimatedTime}`
        : `Your order status: ${params.statusText}`,
      data: {
        type: 'order_update',
        orderId: params.orderId,
        status: params.status,
      },
      clickAction: 'ORDER_TRACKING',
    });
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccess(params: {
    userId: string;
    amount: number;
    transactionId: string;
    type: 'booking' | 'order';
    referenceId: string;
  }): Promise<NotificationResult> {
    return this.send({
      userId: params.userId,
      title: 'Payment Successful ✓',
      body: `₹${params.amount} paid successfully. ${params.type === 'booking' ? 'Booking' : 'Order'} ref: ${params.referenceId}`,
      data: {
        type: 'payment_success',
        transactionId: params.transactionId,
        amount: params.amount,
      },
      clickAction: params.type === 'booking' ? 'BOOKING_DETAILS' : 'ORDER_DETAILS',
    });
  }

  /**
   * Send AI chat summary notification
   */
  async sendChatSummary(params: {
    userId: string;
    summary: string;
    actionTaken?: string;
    nextSteps?: string;
  }): Promise<NotificationResult> {
    let body = params.summary;
    if (params.actionTaken) body += `\n\nAction: ${params.actionTaken}`;
    if (params.nextSteps) body += `\n\nNext: ${params.nextSteps}`;

    return this.send({
      userId: params.userId,
      title: 'Chat Summary',
      body,
      data: {
        type: 'chat_summary',
      },
      clickAction: 'CHAT_HISTORY',
    });
  }
}
