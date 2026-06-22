import crypto from 'crypto';

/**
 * Options for webhook signature verification
 */
export interface WebhookVerificationOptions {
  /** The shared secret used to sign the webhook */
  secret: string;
  /** Header containing the HMAC signature (default: 'x-webhook-signature') */
  signatureHeader?: string;
  /** Header containing the timestamp (default: 'x-webhook-timestamp') */
  timestampHeader?: string;
  /** Maximum age of the webhook in seconds (default: 300) */
  toleranceSeconds?: number;
}

/**
 * Headers object type that can have string or string array values
 */
export type HeadersRecord = Record<string, string | string[] | undefined>;

/**
 * Result of signature verification
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Extracts a header value from the headers object, handling both single
 * and array values
 */
function getHeaderValue(headers: HeadersRecord, headerName: string): string | undefined {
  const value = headers[headerName];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parses the signature header value into algorithm and signature components.
 * Format: "sha256=<hex>" or just "<hex>"
 * Note: The timestamp is received separately via the timestampHeader, not in the signature.
 */
function parseSignatureHeader(signatureHeader: string): { algorithm: string; signature: string } {
  // Handle "sha256=<signature>" format
  const parts = signatureHeader.split('=');
  if (parts.length >= 2) {
    const algorithm = parts[0];
    const signature = parts.slice(1).join('=');
    return { algorithm, signature };
  }

  // Handle raw signature format
  return { algorithm: 'sha256', signature: signatureHeader };
}

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
  const { algorithm: providedAlgorithm, signature: providedSignature } =
    parseSignatureHeader(signatureHeaderValue);

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

  // Use timing-safe comparison to prevent timing attacks
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
 * Verifies webhook signature and throws detailed errors.
 * Use this when you need to distinguish between different failure modes.
 *
 * @param payload - The raw webhook payload
 * @param headers - Request headers
 * @param options - Verification options
 * @returns VerificationResult with valid flag and optional error message
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
