/**
 * @rez/webhook-sdk - Universal Webhook Verification SDK
 *
 * Provides enterprise-grade webhook security with:
 * - HMAC-SHA256 signature verification
 * - Timing-safe comparison (prevents timing attacks)
 * - Replay attack prevention (timestamp tolerance)
 * - Support for multiple signature formats
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@rez/webhook-sdk';
 *
 * const isValid = verifyWebhookSignature(rawBody, headers, {
 *   secret: process.env.WEBHOOK_SECRET,
 *   toleranceSeconds: 300
 * });
 * ```
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WebhookVerificationOptions {
  /** The shared secret used to sign the webhook */
  secret: string;
  /** Header containing the HMAC signature (default: 'x-webhook-signature') */
  signatureHeader?: string;
  /** Header containing the timestamp (default: 'x-webhook-timestamp') */
  timestampHeader?: string;
  /** Maximum age of the webhook in seconds (default: 300 = 5 minutes) */
  toleranceSeconds?: number;
}

export type HeadersRecord = Record<string, string | string[] | undefined>;

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function getHeaderValue(headers: HeadersRecord, headerName: string): string | undefined {
  const value = headers[headerName.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseSignatureHeader(signatureHeader: string): { algorithm: string; signature: string } {
  const parts = signatureHeader.split('=');
  if (parts.length >= 2) {
    return { algorithm: parts[0], signature: parts.slice(1).join('=') };
  }
  return { algorithm: 'sha256', signature: signatureHeader };
}

// ============================================================================
// Core Verification Function
// ============================================================================

/**
 * Verifies the HMAC-SHA256 signature of a webhook payload.
 *
 * Security features:
 * - Uses timing-safe comparison to prevent timing attacks
 * - Validates timestamp to prevent replay attacks
 * - Supports configurable tolerance window
 *
 * @param payload - The raw webhook payload (string or Buffer)
 * @param headers - Request headers containing signature and timestamp
 * @param options - Verification options including secret and tolerances
 * @returns true if signature is valid, false otherwise
 * @throws Error with descriptive message if required headers are missing
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  headers: HeadersRecord,
  options: WebhookVerificationOptions
): boolean {
  const {
    secret,
    signatureHeader = 'x-webhook-signature',
    timestampHeader = 'x-webhook-timestamp',
    toleranceSeconds = 300,
  } = options;

  // Normalize payload to string
  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf-8');

  // Get signature from header
  const signatureHeaderValue = getHeaderValue(headers, signatureHeader);
  if (!signatureHeaderValue) {
    throw new Error(
      `Missing signature header '${signatureHeader}'. Webhook signature verification requires the signature header to be present.`
    );
  }

  // Parse signature (format: "sha256=<hex>" or just "<hex>")
  const { signature: providedSignature } = parseSignatureHeader(signatureHeaderValue);

  if (!providedSignature) {
    throw new Error(
      `Invalid signature format in header '${signatureHeader}'. Expected format: sha256=<hex_signature>`
    );
  }

  // Get timestamp from header
  const timestampHeaderValue = getHeaderValue(headers, timestampHeader);
  if (!timestampHeaderValue) {
    throw new Error(
      `Missing timestamp header '${timestampHeader}'. Webhook signature verification requires the timestamp header to be present.`
    );
  }

  // Parse and validate timestamp
  const timestamp = parseInt(timestampHeaderValue, 10);
  if (isNaN(timestamp)) {
    throw new Error(
      `Invalid timestamp value '${timestampHeaderValue}' in header '${timestampHeader}'. Expected Unix timestamp in seconds.`
    );
  }

  // Verify timestamp is within tolerance window (prevents replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentTime - timestamp);

  if (timeDifference > toleranceSeconds) {
    throw new Error(
      `Webhook timestamp expired. Timestamp ${timestamp} is ${timeDifference} seconds from current time ${currentTime}. ` +
      `Maximum allowed difference is ${toleranceSeconds} seconds. This may indicate a replay attack.`
    );
  }

  // Compute expected signature: HMAC-SHA256 of `${timestamp}.${payload}`
  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures using timing-safe comparison
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(providedSignature, 'hex');

  // Validate buffer lengths match before comparison
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Creates a webhook signature for testing purposes.
 *
 * @param payload - The payload to sign
 * @param secret - The shared secret
 * @param timestamp - Unix timestamp in seconds
 * @returns The full signature header value (e.g., "sha256=abc123...")
 */
export function createWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `sha256=${signature}`;
}

/**
 * Creates webhook headers object for sending webhooks.
 *
 * @param payload - The payload to sign
 * @param secret - The shared secret
 * @returns Headers object with signature and timestamp
 */
export function createWebhookHeaders(
  payload: string,
  secret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createWebhookSignature(payload, secret, timestamp);

  return {
    'Content-Type': 'application/json',
    'x-webhook-signature': signature,
    'x-webhook-timestamp': timestamp.toString(),
  };
}

/**
 * Verifies webhook signature and throws detailed errors.
 * Use this when you need to distinguish between different failure modes.
 */
export function verifyWebhookSignatureDetailed(
  payload: string | Buffer,
  headers: HeadersRecord,
  options: WebhookVerificationOptions
): VerificationResult {
  try {
    const isValid = verifyWebhookSignature(payload, headers, options);
    return { valid: isValid };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Express middleware for webhook verification
 */
export function createWebhookMiddleware(options: WebhookVerificationOptions) {
  return (req: { body: string; headers: HeadersRecord }, res: { status: (code: number) => { json: (data: object) => void } }, next: () => void) => {
    try {
      const isValid = verifyWebhookSignature(req.body, req.headers, options);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
      next();
    } catch (error) {
      res.status(401).json({
        error: 'Webhook verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
