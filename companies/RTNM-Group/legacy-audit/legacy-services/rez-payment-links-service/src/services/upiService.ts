import { logger } from '../utils/logger';

export interface UPIRefundRequest {
  transactionId: string;
  amount: number;
  refundId: string;
}

export interface UPIRefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface UPITransactionStatus {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId?: string;
  amount?: number;
  timestamp?: string;
  error?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class UPIService {
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    this.provider = process.env.UPI_PROVIDER || 'razorpay';
    this.apiKey = process.env.UPI_API_KEY || '';
    this.apiSecret = process.env.UPI_API_SECRET || '';
  }

  async initializePayment(params: {
    amount: number;
    currency: string;
    merchantId: string;
    purpose: string;
    customerPhone?: string;
    customerEmail?: string;
    webhookUrl?: string;
  }): Promise<{
    success: boolean;
    paymentUrl?: string;
    transactionId?: string;
    error?: string;
  }> {
    logger.info('Initializing UPI payment', {
      merchantId: params.merchantId,
      amount: params.amount
    });

    try {
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (this.provider === 'mock') {
        return {
          success: true,
          paymentUrl: `https://mock-upi.gateway/pay/${transactionId}`,
          transactionId
        };
      }

      const payload = {
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        method: 'upi',
        vpa: `pay@merchant.${params.merchantId}`,
        contact: params.customerPhone,
        email: params.customerEmail,
        description: params.purpose,
        callback_url: params.webhookUrl,
        metadata: {
          merchant_id: params.merchantId,
          purpose: params.purpose
        }
      };

      const response = await this.makeAPICall('POST', '/payments', payload);

      if (response.status === 'created' || response.status === 'pending') {
        return {
          success: true,
          paymentUrl: response.short_url || response.authorization_url,
          transactionId: response.id
        };
      }

      return {
        success: false,
        error: `Payment initialization failed: ${response.error?.description || 'Unknown error'}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('UPI payment initialization failed', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async checkTransactionStatus(transactionId: string): Promise<UPITransactionStatus> {
    logger.info('Checking UPI transaction status', { transactionId });

    try {
      if (this.provider === 'mock') {
        return {
          status: 'SUCCESS',
          transactionId,
          amount: 0,
          timestamp: new Date().toISOString()
        };
      }

      const response = await this.makeAPICall('GET', `/payments/${transactionId}`);

      if (response.status === 'captured') {
        return {
          status: 'SUCCESS',
          transactionId: response.id,
          amount: response.amount / 100,
          timestamp: new Date(response.created_at * 1000).toISOString()
        };
      }

      if (response.status === 'failed') {
        return {
          status: 'FAILED',
          transactionId: response.id,
          error: response.error?.description || 'Payment failed'
        };
      }

      return {
        status: 'PENDING',
        transactionId: response.id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Transaction status check failed', {
        transactionId,
        error: errorMessage
      });
      return {
        status: 'PENDING',
        transactionId,
        error: errorMessage
      };
    }
  }

  async processRefund(request: UPIRefundRequest): Promise<UPIRefundResult> {
    logger.info('Processing UPI refund', {
      refundId: request.refundId,
      transactionId: request.transactionId,
      amount: request.amount
    });

    try {
      if (this.provider === 'mock') {
        await this.simulateDelay(500);
        return {
          success: true,
          refundId: request.refundId,
          status: 'SUCCESS'
        };
      }

      const payload = {
        amount: Math.round(request.amount * 100),
        notes: {
          refund_id: request.refundId
        }
      };

      const response = await this.makeAPICall('POST', `/payments/${request.transactionId}/refund`, payload);

      if (response.status === 'created' || response.status === 'processed') {
        return {
          success: true,
          refundId: response.id,
          status: 'SUCCESS'
        };
      }

      if (response.error) {
        return {
          success: false,
          error: response.error.description,
          status: 'FAILED'
        };
      }

      return {
        success: false,
        error: 'Refund processing failed',
        status: 'PENDING'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Refund processing failed', {
        refundId: request.refundId,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        status: 'FAILED'
      };
    }
  }

  async validateVPA(vpa: string): Promise<{ valid: boolean; name?: string; error?: string }> {
    logger.info('Validating VPA', { vpa });

    try {
      const response = await this.makeAPICall('POST', '/payments/va/validate', { vpa });

      if (response.status === 'validated') {
        return {
          valid: true,
          name: response.name
        };
      }

      return {
        valid: false,
        error: response.error || 'VPA validation failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('VPA validation failed', { vpa, error: errorMessage });
      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    logger.info('Sending SMS', { phoneNumber, messageLength: message.length });

    try {
      if (this.provider === 'mock') {
        await this.simulateDelay(300);
        return {
          success: true,
          messageId: `SMS_${Date.now()}`
        };
      }

      const payload = {
        to: phoneNumber,
        message,
        type: 'transactional'
      };

      const response = await this.makeAPICall('POST', '/sms/send', payload);

      if (response.id) {
        return {
          success: true,
          messageId: response.id
        };
      }

      return {
        success: false,
        error: response.error || 'SMS sending failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SMS sending failed', {
        phoneNumber,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async sendWhatsApp(phoneNumber: string, message: string): Promise<WhatsAppResult> {
    logger.info('Sending WhatsApp message', {
      phoneNumber,
      messageLength: message.length
    });

    try {
      if (this.provider === 'mock') {
        await this.simulateDelay(300);
        return {
          success: true,
          messageId: `WA_${Date.now()}`
        };
      }

      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const payload = {
        to: cleanPhone,
        template: 'payment_request',
        language: 'en',
        components: {
          body: [{ text: message }]
        }
      };

      const response = await this.makeAPICall('POST', '/whatsapp/send', payload);

      if (response.id) {
        return {
          success: true,
          messageId: response.id
        };
      }

      return {
        success: false,
        error: response.error || 'WhatsApp sending failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WhatsApp sending failed', {
        phoneNumber,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
    logger.info('Sending email', { to, subject });

    try {
      if (this.provider === 'mock') {
        await this.simulateDelay(500);
        return {
          success: true,
          messageId: `EMAIL_${Date.now()}`
        };
      }

      const payload = {
        to: [{ email: to }],
        subject,
        html,
        from: {
          email: process.env.EMAIL_FROM || 'noreply@rezpay.in',
          name: 'ReZ Pay'
        }
      };

      const response = await this.makeAPICall('POST', '/email/send', payload);

      if (response.id) {
        return {
          success: true,
          messageId: response.id
        };
      }

      return {
        success: false,
        error: response.error || 'Email sending failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email sending failed', {
        to,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async makeAPICall(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    payload?: object
  ): Promise<any> {
    const baseUrl = process.env.UPI_API_URL || 'https://api.razorpay.com/v1';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorBody.error?.description || errorBody.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateUPILink(params: {
    upiId: string;
    amount: number;
    merchantName: string;
    transactionId: string;
    purpose: string;
  }): string {
    const paramsObj = new URLSearchParams({
      pa: params.upiId,
      pn: params.merchantName,
      am: params.amount.toString(),
      tr: params.transactionId,
      tn: params.purpose
    });

    return `upi://pay?${paramsObj.toString()}`;
  }

  parseUPIResponse(upiString: string): {
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    transactionId?: string;
    amount?: number;
    error?: string;
  } | null {
    try {
      const url = new URL(upiString);
      const response = url.searchParams.get('Status');

      if (response?.toLowerCase() === 'success') {
        return {
          status: 'SUCCESS',
          transactionId: url.searchParams.get('txnId') || undefined,
          amount: url.searchParams.get('amt')
            ? parseFloat(url.searchParams.get('amt')!)
            : undefined
        };
      }

      if (response?.toLowerCase() === 'fail') {
        return {
          status: 'FAILED',
          error: url.searchParams.get('rejectReason') || 'Payment failed'
        };
      }

      return {
        status: 'PENDING'
      };
    } catch {
      return null;
    }
  }
}

export const upiService = new UPIService();
