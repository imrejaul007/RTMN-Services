import crypto from 'crypto';

export interface SignatureOptions {
  algorithm?: string;
  timestampTolerance?: number; // seconds
}

const defaultOptions: SignatureOptions = {
  algorithm: 'sha256',
  timestampTolerance: 300, // 5 minutes
};

class SignatureService {
  private options: SignatureOptions = defaultOptions;

  configure(options: Partial<SignatureOptions>): void {
    this.options = { ...this.options, ...options };
  }

  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateSignature(
    payload: object,
    secret: string,
    timestamp?: number
  ): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);

    // Create the signature payload
    const signaturePayload = {
      timestamp: ts,
      ...payload,
    };

    // Stringify the payload deterministically
    const payloadString = JSON.stringify(signaturePayload, Object.keys(signaturePayload).sort());

    // Generate HMAC signature
    const hmac = crypto.createHmac(this.options.algorithm || 'sha256', secret);
    hmac.update(payloadString);
    const signature = hmac.digest('hex');

    // Return signature with timestamp
    return `t=${ts},v1=${signature}`;
  }

  verifySignature(
    payload: object,
    signature: string,
    secret: string
  ): { valid: boolean; error?: string } {
    try {
      // Parse the signature string
      const parts = this.parseSignature(signature);

      if (!parts) {
        return { valid: false, error: 'Invalid signature format' };
      }

      // Check timestamp tolerance
      const now = Math.floor(Date.now() / 1000);
      const timestampAge = now - parts.timestamp;

      if (timestampAge > (this.options.timestampTolerance || 300)) {
        return { valid: false, error: `Timestamp too old: ${timestampAge}s` };
      }

      if (timestampAge < -60) {
        return { valid: false, error: 'Timestamp in the future' };
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(payload, secret, parts.timestamp);

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      return { valid: isValid };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Signature verification failed',
      };
    }
  }

  private parseSignature(signature: string): { timestamp: number; version: string; hash: string } | null {
    try {
      const parts = signature.split(',');
      if (parts.length !== 2) return null;

      const timestampPart = parts[0];
      const versionPart = parts[1];

      if (!timestampPart.startsWith('t=') || !versionPart.startsWith('v1=')) {
        return null;
      }

      const timestamp = parseInt(timestampPart.substring(2), 10);
      const hash = versionPart.substring(3);

      if (isNaN(timestamp) || !hash) {
        return null;
      }

      return {
        timestamp,
        version: 'v1',
        hash,
      };
    } catch {
      return null;
    }
  }

  // Static utility for generating webhook endpoint signatures
  static generateEndpointSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash a payload for logging purposes (without revealing the data)
  static hashPayload(payload: object): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    return hash.digest('hex').substring(0, 16);
  }

  // Generate a webhook URL with signature token
  static generateSignedUrl(baseUrl: string, secret: string, expiresIn: number = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `${baseUrl}.${expires}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return `${baseUrl}?expires=${expires}&signature=${signature}`;
  }

  // Verify a signed URL
  static verifySignedUrl(url: string, secret: string): boolean {
    try {
      const urlObj = new URL(url);
      const expires = parseInt(urlObj.searchParams.get('expires') || '0', 10);
      const signature = urlObj.searchParams.get('signature') || '';

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (now > expires) {
        return false;
      }

      // Verify signature
      const payload = `${urlObj.origin}${urlObj.pathname}.${expires}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }
}

export const signatureService = new SignatureService();
