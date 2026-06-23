/**
 * ACP signing helpers (v0.2 spec) — HMAC-SHA256 of the raw body.
 *
 *   X-ACP-Signature: sha256=<hex digest>
 *
 * Receivers MUST verify with timing-safe comparison (see verify.js).
 */

import { createHmac } from 'node:crypto';

/**
 * Sign a JSON body using HMAC-SHA256.
 *
 * @param {object|string} body — the body to sign (object → JSON.stringify, string → as-is)
 * @param {string} secret — shared secret
 * @returns {string} the signature header value (e.g. "sha256=abc123...")
 */
export function signBody(body, secret) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const hex = createHmac('sha256', secret).update(raw).digest('hex');
  return `sha256=${hex}`;
}
