/**
 * Webhook Sender - For sending webhooks to partners
 */

import crypto from 'crypto';

export interface WebhookSenderOptions {
  url: string;
  secret: string;
  retries?: number;
  timeout?: number;
}

export interface SendResult {
  success: boolean;
  response?: {
    status: number;
    body: unknown;
  };
  error?: string;
  attempts: number;
}

/**
 * Creates HMAC signature for outgoing webhook
 */
function createSignature(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `sha256=${signature}`;
}

/**
 * Sends a webhook to a partner endpoint with retry logic
 */
export async function sendWebhook<T = unknown>(
  options: WebhookSenderOptions,
  event: {
    id: string;
    type: string;
    source: string;
    timestamp: string;
    data: T;
  }
): Promise<SendResult> {
  const { url, secret, retries = 3, timeout = 10000 } = options;
  const payload = JSON.stringify(event);
  let lastError: string | undefined;
  let attempts = 0;

  for (let i = 0; i <= retries; i++) {
    attempts++;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createSignature(payload, secret, timestamp);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp.toString(),
          'x-webhook-id': event.id,
          'x-webhook-source': event.source,
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return {
          success: true,
          response: {
            status: response.status,
            body: await response.json().catch(() => null),
          },
          attempts,
        };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';

      // Don't retry on abort
      if (error instanceof Error && error.name === 'AbortError') {
        break;
      }
    }

    // Exponential backoff
    if (i < retries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
  };
}

/**
 * Batch send webhooks to multiple endpoints
 */
export async function broadcastWebhook<T = unknown>(
  endpoints: WebhookSenderOptions[],
  event: {
    id: string;
    type: string;
    source: string;
    timestamp: string;
    data: T;
  }
): Promise<Map<string, SendResult>> {
  const results = new Map<string, SendResult>();

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const result = await sendWebhook(endpoint, event);
      results.set(endpoint.url, result);
    })
  );

  return results;
}
