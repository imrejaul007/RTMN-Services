/**
 * @rtmn/security-shared — OAuth State (HMAC-Signed)
 *
 * Replaces the unauthenticated OAuth state in rez-auth-service and
 * others. The state is HMAC-signed so the server can detect tampering
 * even if Redis is briefly unavailable.
 *
 * Format: base64url(payload) + '.' + base64url(hmac-sha256(payload, secret))
 */

import crypto from 'crypto';

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || Buffer.byteLength(s, 'utf8') < 32) {
    throw new Error('[oauth-state] JWT_SECRET must be set (>= 32 bytes)');
  }
  return s;
}

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

function sign(payloadStr, secret) {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');
}

/**
 * Mint a signed OAuth state containing the given params.
 *
 * @param {object} params - arbitrary data to embed (provider, redirect_uri, scopes, etc.)
 * @returns {string} signed state string
 */
export function mintOAuthState(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('mintOAuthState: params object required');
  }
  const payload = {
    ...params,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
  };
  const payloadStr = b64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadStr, getSecret());
  return `${payloadStr}.${sig}`;
}

/**
 * Verify and parse a signed OAuth state. Throws on any failure.
 *
 * @param {string} state
 * @param {number} [maxAgeMs=600000] - default 10 min
 * @returns {object} the embedded params
 */
export function verifyOAuthState(state, maxAgeMs = 10 * 60 * 1000) {
  if (!state || typeof state !== 'string') {
    throw new Error('verifyOAuthState: state required');
  }
  const parts = state.split('.');
  if (parts.length !== 2) {
    throw new Error('verifyOAuthState: malformed state');
  }
  const [payloadStr, sig] = parts;
  const expected = sign(payloadStr, getSecret());
  // timing-safe compare
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('verifyOAuthState: bad signature');
  }
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString('utf8'));
  } catch {
    throw new Error('verifyOAuthState: malformed payload');
  }
  if (Date.now() - payload.iat > maxAgeMs) {
    throw new Error('verifyOAuthState: state expired');
  }
  return payload;
}
