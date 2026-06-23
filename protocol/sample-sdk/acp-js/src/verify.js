/**
 * ACP signature verification — timing-safe HMAC-SHA256 compare.
 *
 * Per ACP spec §6, receivers MUST use timing-safe comparison.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a signature header against an expected body + secret.
 *
 * @param {object|string} body — the raw body that was signed
 * @param {string} signatureHeader — the value of the X-ACP-Signature header
 * @param {string} secret — the shared secret
 * @returns {boolean} true if the signature matches
 */
export function verifySignature(body, signatureHeader, secret) {
  if (typeof signatureHeader !== 'string') return false;
  if (!signatureHeader.startsWith('sha256=')) return false;

  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const expectedHex = createHmac('sha256', secret).update(raw).digest('hex');
  const expected = `sha256=${expectedHex}`;

  // Both must be the same length for timingSafeEqual
  if (expected.length !== signatureHeader.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
