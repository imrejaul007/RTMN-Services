import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import {
  PaymentLinkModel,
  PaymentStatus,
  RefundModel,
  RefundStatus,
  IPaymentLink
} from '../models/PaymentLinkModel';
import { logger } from '../utils/logger';
import { upiService } from './upiService';

interface CreatePaymentLinkRequest {
  merchantId: string;
  amount: number;
  currency?: string;
  purpose: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  redirectUrl?: string;
  maxUsageCount?: number;
}

interface PaymentLinkResponse {
  id: string;
  url: string;
  shortUrl: string;
  qrCodeDataUrl: string;
  amount: number;
  currency: string;
  purpose: string;
  status: PaymentStatus;
  expiresAt: Date;
  customerName?: string;
  customerPhone?: string;
}

interface RefundRequest {
  paymentLinkId: string;
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  refundId: string;
  paymentLinkId: string;
  originalAmount: number;
  refundedAmount: number;
  reason?: string;
  status: string;
  createdAt: Date;
}

interface ShareRequest {
  paymentLinkId: string;
  channels: ('SMS' | 'WHATSAPP' | 'EMAIL')[];
  customMessage?: string;
  recipientEmail?: string;
}

interface ShareResponse {
  paymentLinkId: string;
  messagesSent: Array<{
    channel: string;
    status: string;
    error?: string;
  }>;
}

class PaymentService {
  async createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (request.expiresIn || 72) * 60 * 60 * 1000);

    const upiId = `pay@rezpay${id.substring(0, 8)}`;

    const baseUrl = process.env.BASE_URL || 'https://pay.rezpay.in';
    const shortUrl = `${baseUrl}/l/${id.substring(0, 12)}`;

    const upiString = this.buildUPIString({
      id,
      amount: request.amount,
      currency: request.currency || 'INR',
      purpose: request.purpose,
      upiId
    });

    const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Save to MongoDB instead of in-memory
    const paymentLink = await PaymentLinkModel.create({
      _id: id,
      merchantId: request.merchantId,
      amount: request.amount,
      currency: request.currency || 'INR',
      purpose: request.purpose,
      description: request.description,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      status: PaymentStatus.PENDING,
      upiId,
      expiresAt,
      metadata: request.metadata,
      webhookUrl: request.webhookUrl,
      redirectUrl: request.redirectUrl,
      shortUrl,
      qrCodeDataUrl,
      maxUsageCount: request.maxUsageCount,
      currentUsageCount: 0
    });

    logger.info('Payment link created', {
      paymentLinkId: id,
      merchantId: request.merchantId,
      amount: request.amount
    });

    return {
      id: paymentLink.id,
      url: `${baseUrl}/pay/${id}`,
      shortUrl,
      qrCodeDataUrl,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      purpose: paymentLink.purpose,
      status: paymentLink.status,
      expiresAt: paymentLink.expiresAt,
      customerName: paymentLink.customerName,
      customerPhone: paymentLink.customerPhone
    };
  }

  private buildUPIString(link: { amount: number; currency: string; purpose: string; upiId: string; id: string }): string {
    const params = new URLSearchParams({
      pa: link.upiId,
      pn: 'ReZ Pay',
      am: link.amount.toString(),
      cu: link.currency,
      tr: link.id,
      tn: encodeURIComponent(link.purpose)
    });

    return `upi://pay?${params.toString()}`;
  }

  async getPaymentLink(id: string): Promise<IPaymentLink | null> {
    const link = await PaymentLinkModel.findById(id);

    if (!link) {
      return null;
    }

    // Check and update expiration
    if (new Date() > link.expiresAt && link.status === PaymentStatus.PENDING) {
      link.status = PaymentStatus.EXPIRED;
      link.updatedAt = new Date();
      await link.save();
    }

    return link;
  }

  async getPaymentLinkByShortId(shortId: string): Promise<IPaymentLink | null> {
    // Find by shortUrl containing the shortId
    return PaymentLinkModel.findOne({
      shortUrl: { $regex: shortId }
    });
  }

  async getPaymentLinkStatus(id: string): Promise<{
    id: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    paidAt?: Date;
    paymentMethod?: string;
  } | null> {
    const link = await this.getPaymentLink(id);
    if (!link) {
      return null;
    }

    return {
      id: link.id,
      status: link.status,
      amount: link.amount,
      currency: link.currency,
      paidAt: link.paidAt,
      paymentMethod: link.paymentMethod
    };
  }

  async handlePaymentWebhook(payload: {
    transactionId: string;
    upiId?: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED';
    timestamp: string;
    merchantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<IPaymentLink | null> {
    logger.info('Payment webhook received', { transactionId: payload.transactionId });

    // Find matching payment link by merchantId and amount
    const link = await PaymentLinkModel.findOneAndUpdate(
      {
        merchantId: payload.merchantId,
        amount: payload.amount,
        status: PaymentStatus.PENDING
      },
      {
        $set: {
          transactionId: payload.transactionId,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!link) {
      logger.warn('No matching payment link found for webhook', { payload });
      return null;
    }

    if (payload.status === 'SUCCESS') {
      link.status = PaymentStatus.COMPLETED;
      link.paidAt = new Date(payload.timestamp);
      link.paymentMethod = 'UPI';
      link.currentUsageCount += 1;
      await link.save();

      if (link.webhookUrl) {
        await this.sendWebhookNotification(link);
      }

      logger.info('Payment confirmed', {
        paymentLinkId: link.id,
        transactionId: payload.transactionId
      });
    } else {
      link.status = PaymentStatus.FAILED;
      await link.save();

      logger.info('Payment failed', {
        paymentLinkId: link.id,
        transactionId: payload.transactionId
      });
    }

    return link;
  }

  private async sendWebhookNotification(link: IPaymentLink): Promise<void> {
    if (!link.webhookUrl) return;

    const payload = {
      event: 'payment.completed',
      timestamp: new Date().toISOString(),
      data: {
        id: link.id,
        merchantId: link.merchantId,
        amount: link.amount,
        currency: link.currency,
        status: link.status,
        transactionId: link.transactionId,
        paidAt: link.paidAt,
        customerPhone: link.customerPhone,
        customerEmail: link.customerEmail,
        metadata: link.metadata
      }
    };

    try {
      const crypto = await import('crypto');
      const secret = process.env.WEBHOOK_SECRET;
      if (!secret) {
        logger.error('WEBHOOK_SECRET not configured');
        return;
      }
      const signature = crypto.createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await fetch(link.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        logger.error('Webhook delivery failed', {
          paymentLinkId: link.id,
          webhookUrl: link.webhookUrl,
          statusCode: response.status
        });
      } else {
        logger.info('Webhook delivered successfully', {
          paymentLinkId: link.id,
          webhookUrl: link.webhookUrl
        });
      }
    } catch (error) {
      logger.error('Webhook delivery error', {
        paymentLinkId: link.id,
        webhookUrl: link.webhookUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async initiateRefund(request: RefundRequest): Promise<RefundResponse> {
    const link = await PaymentLinkModel.findById(request.paymentLinkId);

    if (!link) {
      throw new Error('Payment link not found');
    }

    if (link.status !== PaymentStatus.COMPLETED) {
      throw new Error(`Cannot refund payment with status: ${link.status}`);
    }

    const refundAmount = request.amount || link.amount;

    if (refundAmount > link.amount) {
      throw new Error(`Refund amount (${refundAmount}) exceeds original amount (${link.amount})`);
    }

    const refundId = uuidv4();

    // Create refund record in MongoDB
    await RefundModel.create({
      refundId,
      paymentLinkId: link.id,
      originalAmount: link.amount,
      refundedAmount: refundAmount,
      reason: request.reason,
      status: RefundStatus.INITIATED
    });

    const refundResult = await upiService.processRefund({
      transactionId: link.transactionId || '',
      amount: refundAmount,
      refundId
    });

    const refund = await RefundModel.findOne({ refundId });

    if (refundResult.success) {
      refund!.status = RefundStatus.COMPLETED;

      if (refundAmount === link.amount) {
        link.status = PaymentStatus.REFUNDED;
      } else {
        link.status = PaymentStatus.PARTIALLY_REFUNDED;
      }

      logger.info('Refund completed', {
        refundId,
        paymentLinkId: link.id,
        amount: refundAmount
      });
    } else {
      refund!.status = RefundStatus.FAILED;
      logger.error('Refund failed', {
        refundId,
        paymentLinkId: link.id,
        error: refundResult.error
      });
    }

    await Promise.all([
      refund!.save(),
      link.save()
    ]);

    return {
      refundId,
      paymentLinkId: link.id,
      originalAmount: link.amount,
      refundedAmount: refundAmount,
      reason: request.reason,
      status: refund!.status,
      createdAt: refund!.createdAt
    };
  }

  async sharePaymentLink(request: ShareRequest): Promise<ShareResponse> {
    const link = await this.getPaymentLink(request.paymentLinkId);

    if (!link) {
      throw new Error('Payment link not found');
    }

    if (link.status !== PaymentStatus.PENDING) {
      throw new Error('Cannot share non-pending payment link');
    }

    const messagesSent: ShareResponse['messagesSent'] = [];

    for (const channel of request.channels) {
      try {
        switch (channel) {
          case 'SMS':
            await this.sendSMS(link, request.customMessage);
            messagesSent.push({ channel: 'SMS', status: 'SENT' });
            break;
          case 'WHATSAPP':
            await this.sendWhatsApp(link, request.customMessage);
            messagesSent.push({ channel: 'WHATSAPP', status: 'SENT' });
            break;
          case 'EMAIL':
            await this.sendEmail(link, request.customMessage, request.recipientEmail);
            messagesSent.push({ channel: 'EMAIL', status: 'SENT' });
            break;
        }
      } catch (error) {
        messagesSent.push({
          channel,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Payment link shared', {
      paymentLinkId: link.id,
      channels: request.channels
    });

    return {
      paymentLinkId: link.id,
      messagesSent
    };
  }

  private async sendSMS(link: IPaymentLink, customMessage?: string): Promise<void> {
    if (!link.customerPhone) {
      throw new Error('Customer phone number not available');
    }

    const message = customMessage || `Payment request of Rs.${link.amount} for ${link.purpose}. Pay now: ${link.shortUrl}`;
    const phone = link.customerPhone.replace(/[^0-9]/g, '');

    await upiService.sendSMS(phone, message);

    logger.info('SMS sent', {
      paymentLinkId: link.id,
      phone: link.customerPhone
    });
  }

  private async sendWhatsApp(link: IPaymentLink, customMessage?: string): Promise<void> {
    if (!link.customerPhone) {
      throw new Error('Customer phone number not available');
    }

    const message = customMessage || `Hi ${link.customerName || 'Customer'},\n\nYou have a payment request of Rs.${link.amount} for ${link.purpose}.\n\nPay now: ${link.shortUrl}\n\nThank you for your payment!`;

    await upiService.sendWhatsApp(link.customerPhone, message);

    logger.info('WhatsApp message sent', {
      paymentLinkId: link.id,
      phone: link.customerPhone
    });
  }

  private async sendEmail(link: IPaymentLink, customMessage?: string, recipientEmail?: string): Promise<void> {
    const email = recipientEmail || link.customerEmail;

    if (!email) {
      throw new Error('Customer email not available');
    }

    const subject = `Payment Request: Rs.${link.amount} for ${link.purpose}`;
    const html = `
      <h2>Payment Request</h2>
      <p>Dear ${link.customerName || 'Customer'},</p>
      <p>You have a payment request of <strong>Rs.${link.amount}</strong> for <strong>${link.purpose}</strong>.</p>
      ${link.description ? `<p>${link.description}</p>` : ''}
      <p><a href="${link.shortUrl}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Now</a></p>
      <p>Or copy this link: ${link.shortUrl}</p>
      <p>Thank you!</p>
    `;

    await upiService.sendEmail(email, subject, html);

    logger.info('Email sent', {
      paymentLinkId: link.id,
      email
    });
  }

  async generateQRCode(id: string): Promise<string | null> {
    const link = await this.getPaymentLink(id);

    if (!link) {
      return null;
    }

    if (link.qrCodeDataUrl) {
      return link.qrCodeDataUrl;
    }

    const upiString = this.buildUPIString({
      id: link.id,
      amount: link.amount,
      currency: link.currency,
      purpose: link.purpose,
      upiId: link.upiId
    });

    return QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  async listPaymentLinks(merchantId: string, filters?: {
    status?: PaymentStatus;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<IPaymentLink[]> {
    const query: Record<string, unknown> = { merchantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        (query.createdAt as Record<string, Date>).$gte = filters.fromDate;
      }
      if (filters.toDate) {
        (query.createdAt as Record<string, Date>).$lte = filters.toDate;
      }
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;

    return PaymentLinkModel.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  async getRefund(refundId: string): Promise<RefundResponse | null> {
    const refund = await RefundModel.findOne({ refundId });
    if (!refund) return null;

    return {
      refundId: refund.refundId,
      paymentLinkId: refund.paymentLinkId,
      originalAmount: refund.originalAmount,
      refundedAmount: refund.refundedAmount,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt
    };
  }

  async getRefundsForPaymentLink(paymentLinkId: string): Promise<RefundResponse[]> {
    const refunds = await RefundModel.find({ paymentLinkId });

    return refunds.map(refund => ({
      refundId: refund.refundId,
      paymentLinkId: refund.paymentLinkId,
      originalAmount: refund.originalAmount,
      refundedAmount: refund.refundedAmount,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt
    }));
  }
}

export const paymentService = new PaymentService();
