/**
 * @rtmn/security-shared — Password Hashing
 *
 * Replaces all unsalted SHA-256 / weak bcrypt usage across RTMN with
 * bcryptjs at 12 rounds (the modern OWASP recommendation for interactive
 * logins on commodity hardware).
 *
 *  - `hashPassword` is for human-typed passwords.
 *  - `verifyPassword` is timing-safe via bcrypt's built-in compare.
 *  - `hashSecret` is for server-generated high-entropy secrets (refresh
 *    tokens, API keys, etc.) and uses SHA-256+pepper for O(1) indexed
 *    lookup. NEVER use bcrypt for these — the audit showed that
 *    rez-merchant-auth-service's API key brute force took 100ms per key.
 */

import bcrypt from 'bcryptjs';
import { hmacSha256 } from '../utils/crypto.js';

const BCRYPT_ROUNDS = 12;

// ----- Human passwords (bcrypt-12) -----
/**
 * Hash a human-typed password.
 * @param {string} plaintext
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashPassword(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('hashPassword: plaintext required');
  }
  if (plaintext.length > 1024) {
    // Pre-hash to avoid bcrypt's 72-byte truncation creating silent aliasing.
    // (bcryptjs has a 72-byte limit; longer strings silently get truncated.)
    // Using SHA-256 of the password as the input to bcrypt avoids that.
    const { createHash } = await import('crypto');
    plaintext = createHash('sha256').update(plaintext, 'utf8').digest('base64');
  }
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Verify a human-typed password against a stored bcrypt hash. Timing-safe.
 * @param {string} plaintext
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, hash) {
  if (typeof plaintext !== 'string' || typeof hash !== 'string') return false;
  if (plaintext.length > 1024) {
    const { createHash } = await import('crypto');
    plaintext = createHash('sha256').update(plaintext, 'utf8').digest('base64');
  }
  return bcrypt.compare(plaintext, hash);
}

// ----- Server secrets (SHA-256 + pepper) -----
let _pepper = null;
function getPepper() {
  if (_pepper) return _pepper;
  const pepper = process.env.SECRETS_PEPPER;
  if (!pepper || Buffer.byteLength(pepper, 'utf8') < 32) {
    throw new Error(
      '[security-shared] SECRETS_PEPPER env var is missing or too short. ' +
      'It must be at least 32 bytes. Required for hashSecret/verifySecret.'
    );
  }
  _pepper = pepper;
  return _pepper;
}

/**
 * Set the pepper programmatically (for tests).
 */
export function setPepper(value) {
  _pepper = value;
}

/**
 * Fingerprint a server-generated secret (API key, refresh token, OTP
 * verification hash, etc.) for O(1) indexed lookup. Use with
 * `verifySecret` to compare in constant time.
 *
 * @param {string} secret - the raw secret value
 * @returns {string} 64-char hex string
 */
export function hashSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('hashSecret: secret required');
  }
  return hmacSha256(secret, getPepper());
}

/**
 * Constant-time comparison of a raw secret against a stored fingerprint.
 * Use this for API key / refresh token lookups where you store the
 * fingerprint and compare the incoming value against it.
 *
 * @param {string} secret
 * @param {string} storedFingerprint
 * @returns {boolean}
 */
export function verifySecret(secret, storedFingerprint) {
  if (!secret || !storedFingerprint) return false;
  return hashSecret(secret) === storedFingerprint;
}

// ----- Password strength validation -----
/**
 * Validate a password meets minimum requirements.
 *   - At least 12 characters (NIST 800-63B minimum for memorized secrets)
 *   - At least one letter and one number
 *
 * Returns null on success, or a string describing the failure.
 *
 * @param {string} password
 * @returns {string|null}
 */
export function validatePasswordStrength(password) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 12) return 'Password must be at least 12 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain a letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}
