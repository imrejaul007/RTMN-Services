/**
 * @rtmn/security-shared — Cryptography Utilities
 *
 * Provides timing-safe comparisons, secure random generation, and AES-256-GCM
 * encryption used by auth, tokens, and audit logging.
 *
 * NO BACKWARD-COMPATIBLE FALLBACKS. All functions throw on missing input
 * rather than silently fall back to insecure defaults.
 */

import crypto from 'crypto';
import { Buffer } from 'buffer';

// ----- Timing-safe comparison -----
/**
 * Constant-time string comparison. Use this for any secret/token comparison
 * to prevent timing attacks. Both inputs are converted to Buffers first; if
 * lengths differ, returns false immediately (this leaks length, which is
 * acceptable — secrets should always be the same length).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ----- Random generation -----
/**
 * Generate a cryptographically secure random hex string.
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} hex string
 */
export function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a URL-safe random token (base64url, no padding).
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string}
 */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate a 6-digit OTP. Note: this is NOT a secure random — it's a fast
 * numeric code for human-typed verification. The throttling and rate limits
 * on the verification endpoint are what protect it.
 *
 * @returns {string} 6-digit zero-padded string
 */
export function generateOTP() {
  // 0..999999, zero-padded. crypto.randomInt is uniform.
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// ----- Hashing -----
/**
 * SHA-256 of a value, returned as hex. Use for API-key fingerprinting
 * (where the key has high entropy and bcrypt would be wasteful).
 *
 * @param {string} value
 * @returns {string} 64-char hex string
 */
export function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * HMAC-SHA-256 with a server pepper. Use to fingerprint API keys/tokens
 * without storing the raw value.
 *
 * @param {string} value
 * @param {string} pepper - Server secret
 * @returns {string} 64-char hex string
 */
export function hmacSha256(value, pepper) {
  if (!pepper) throw new Error('hmacSha256: pepper required');
  return crypto.createHmac('sha256', pepper).update(value, 'utf8').digest('hex');
}

// ----- AES-256-GCM symmetric encryption -----
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;        // 96-bit IV, standard for GCM
const KEY_BYTES = 32;       // 256-bit key
const TAG_BYTES = 16;       // 128-bit auth tag

/**
 * Derive a 256-bit key from arbitrary-length secret via SHA-256.
 * Convenience for setups where the user provides a passphrase.
 *
 * @param {string} secret
 * @returns {Buffer}
 */
export function deriveKey(secret) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('deriveKey: secret required');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Encrypt plaintext with AES-256-GCM.
 *
 * @param {string} plaintext
 * @param {Buffer} key - 32-byte key
 * @returns {string} base64-encoded "iv || ciphertext || tag"
 */
export function encrypt(plaintext, key) {
  if (typeof plaintext !== 'string') throw new Error('encrypt: plaintext must be string');
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new Error('encrypt: key must be 32-byte Buffer');
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64');
}

/**
 * Decrypt a value previously produced by `encrypt`.
 *
 * @param {string} payload - base64 "iv || ciphertext || tag"
 * @param {Buffer} key - 32-byte key
 * @returns {string} plaintext
 */
export function decrypt(payload, key) {
  if (typeof payload !== 'string') throw new Error('decrypt: payload must be string');
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new Error('decrypt: key must be 32-byte Buffer');
  }
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES) {
    throw new Error('decrypt: payload too short');
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const enc = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ----- Hash chaining for append-only audit logs -----
/**
 * Compute a chain hash for an append-only log entry. Each entry's chain
 * hash includes the previous chain hash, so any tampering is detectable.
 *
 * @param {string} prevChainHash
 * @param {object} entry - The audit event payload (without chainHash field)
 * @param {string} secret - Server secret (HMAC key)
 * @returns {string} hex chain hash
 */
export function computeChainHash(prevChainHash, entry, secret) {
  if (!secret) throw new Error('computeChainHash: secret required');
  const data = JSON.stringify({ prev: prevChainHash, entry });
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}
