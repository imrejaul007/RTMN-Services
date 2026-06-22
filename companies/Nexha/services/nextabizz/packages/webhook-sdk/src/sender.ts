import { logger } from '../../shared/logger';
/**
 * REZ Merchant Webhook Sender
 * Sends reorder signals from NextaBiZ to REZ Merchant for merchant notifications
 */

import crypto from 'crypto';

export interface RezMerchantWebhookPayload {
  event: 'reorder.signal.created' | 'reorder.signal.matched';
  merchantId: string;
  merchantName?: string;
  signalId: string;
  productName: string;
  productId?: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  unit: string;
  category?: string;
  timestamp: string;
  matchedSuppliers?: number;
  matchConfidence?: number;
}

export interface WebhookSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  webhookId?: string;
}

/**
 * Create HMAC-SHA256 signature for webhook
 */
// Renamed to avoid duplicate with verify.ts
export function createSenderSignature(
  payload: string,
  secret: string,
  timestamp: string
): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Send reorder signal webhook to REZ Merchant
 */
export async function sendReorderSignalToRezMerchant(
  payload: RezMerchantWebhookPayload,
  config: {
    webhookUrl: string;
    webhookSecret: string;
    timeoutMs?: number;
  }
): Promise<WebhookSendResult> {
  const { webhookUrl, webhookSecret, timeoutMs = 10000 } = config;
  const timestamp = new Date().toISOString();
  const payloadString = JSON.stringify(payload);
  const signature = createSenderSignature(payloadString, webhookSecret, timestamp);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Source': 'nextabizz',
        'X-Webhook-Event': payload.event,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      logger.error(`[REZ-Merchant-Webhook] Failed with status ${response.status}:`, errorBody);
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${errorBody}`,
      };
    }

    const responseData = await response.json().catch(() => ({}));

    return {
      success: true,
      statusCode: response.status,
      webhookId: responseData.webhookId || responseData.signalId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[REZ-Merchant-Webhook] Error sending webhook:`, errorMessage);

    if (errorMessage.includes('aborted')) {
      return {
        success: false,
        error: `Request timeout after ${timeoutMs}ms`,
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build payload for reorder signal notification
 */
export function buildReorderSignalPayload(params: {
  merchantId: string;
  merchantName?: string;
  signalId: string;
  productName: string;
  productId?: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  unit: string;
  category?: string;
  matchedSuppliers?: number;
  matchConfidence?: number;
}): RezMerchantWebhookPayload {
  const event: RezMerchantWebhookPayload['event'] =
    params.matchedSuppliers && params.matchedSuppliers > 0
      ? 'reorder.signal.matched'
      : 'reorder.signal.created';

  return {
    event,
    merchantId: params.merchantId,
    merchantName: params.merchantName,
    signalId: params.signalId,
    productName: params.productName,
    productId: params.productId,
    sku: params.sku,
    currentStock: params.currentStock,
    threshold: params.threshold,
    suggestedQty: params.suggestedQty,
    urgency: params.urgency,
    severity: params.severity,
    unit: params.unit,
    category: params.category,
    timestamp: new Date().toISOString(),
    matchedSuppliers: params.matchedSuppliers,
    matchConfidence: params.matchConfidence,
  };
}
