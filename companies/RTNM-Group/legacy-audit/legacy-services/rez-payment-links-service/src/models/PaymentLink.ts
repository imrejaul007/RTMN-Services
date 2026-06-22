// Re-export canonical enums from shared-types to avoid duplication
// The canonical enum definitions live in /shared-types/src/enums/index.ts
export {
  PaymentStatus,
  PaymentMethod,
} from '@rez/shared-types/enums';

export interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: PaymentStatus;
  shortUrl?: string;
  qrCodeDataUrl?: string;
  upiId: string;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  redirectUrl?: string;
  maxUsageCount?: number;
  currentUsageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentLinkRequest {
  merchantId: string;
  amount: number;
  currency?: string;
  purpose: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  expiresIn?: number; // hours
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  redirectUrl?: string;
  maxUsageCount?: number;
}

export interface PaymentLinkResponse {
  id: string;
  url: string;
  shortUrl?: string;
  qrCodeDataUrl: string;
  amount: number;
  currency: string;
  purpose: string;
  status: PaymentStatus;
  expiresAt: Date;
  customerName?: string;
  customerPhone?: string;
}

export interface RefundRequest {
  paymentLinkId: string;
  amount?: number; // partial refund amount
  reason: string;
  initiatedBy: string;
}

export interface RefundResponse {
  refundId: string;
  paymentLinkId: string;
  originalAmount: number;
  refundedAmount: number;
  reason: string;
  status: 'initiated' | 'completed' | 'failed';
  createdAt: Date;
}

export interface ShareRequest {
  paymentLinkId: string;
  channels: ('sms' | 'whatsapp' | 'email')[];
  recipientPhone?: string;
  recipientEmail?: string;
  customMessage?: string;
}

export interface ShareResponse {
  paymentLinkId: string;
  messagesSent: {
    channel: string;
    status: 'sent' | 'failed';
    error?: string;
  }[];
}
