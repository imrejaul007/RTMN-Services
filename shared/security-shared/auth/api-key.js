/**
 * @rtmn/security-shared — API Key Management
 *
 * Replaces the bcrypt-hashed API keys in rez-merchant-auth-service
 * (100ms lookup, DoS amplifier) with the O(1) SHA-256+pepper approach
 * the audit recommended. Reserve bcrypt for human-typed passwords.
 *
 * API keys are generated as 32 random bytes (256 bits), encoded as
 * base64url. The plaintext key is shown to the user ONCE at creation
 * time. The server stores only the fingerprint.
 *
 * Format: rtk_<random> — easy to identify in logs and rate-limit lists.
 */

import { randomBytes } from 'crypto';
import { hashSecret, verifySecret } from './password.js';

const KEY_PREFIX = 'rtk_';
const KEY_BYTES = 32;  // 256 bits

/**
 * Generate a new API key. Returns the plaintext key (to show to the user
 * once) and the fingerprint (to store).
 *
 * @returns {{ plaintext: string, fingerprint: string, prefix: string }}
 */
export function generateApiKey() {
  const random = randomBytes(KEY_BYTES).toString('base64url');
  const plaintext = `${KEY_PREFIX}${random}`;
  const fingerprint = hashSecret(plaintext);
  // The prefix portion is also stored so users can identify the key
  // in the dashboard without revealing the full value.
  const prefix = plaintext.substring(0, 12);
  return { plaintext, fingerprint, prefix };
}

/**
 * Verify an API key against a stored fingerprint.
 * @param {string} plaintext
 * @param {string} storedFingerprint
 * @returns {boolean}
 */
export function verifyApiKey(plaintext, storedFingerprint) {
  return verifySecret(plaintext, storedFingerprint);
}

/**
 * Extract the prefix portion of an API key (for identification in lists).
 * @param {string} plaintext
 * @returns {string} the first 12 characters (e.g. "rtk_a1b2c3d4")
 */
export function apiKeyPrefix(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return '';
  return plaintext.substring(0, 12);
}
