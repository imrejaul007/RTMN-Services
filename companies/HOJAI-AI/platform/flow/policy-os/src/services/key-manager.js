/**
 * PolicyOS — Encryption Key Manager
 *
 * Manages the at-rest encryption key for PersistentStore AES-256-GCM.
 * Key resolution order (first wins):
 *   1. PERSISTENT_STORE_KEY env var (hex string, 64 chars)
 *   2. PERSISTENT_STORE_KEY_FILE env var (path to file with key)
 *   3. In-memory generated key (DEV/TEST ONLY — never use in production)
 *
 * For production, set PERSISTENT_STORE_KEY in the environment.
 * Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENV_KEY = 'PERSISTENT_STORE_KEY';
const ENV_KEY_FILE = 'PERSISTENT_STORE_KEY_FILE';

function isProduction() {
  const e = process.env.NODE_ENV || process.env.NODE_ENVIRONMENT || 'development';
  return e === 'production' || e === 'prod';
}

let _cachedKey = null;

/**
 * Resolve the encryption key. Cached after first call.
 * @returns {{ key: Buffer, source: string, isDevKey: boolean }}
 */
export function resolveEncryptionKey() {
  if (_cachedKey) return _cachedKey;

  // 1. Direct env var
  let hexKey = process.env[ENV_KEY];
  if (hexKey) {
    validateHexKey(hexKey);
    _cachedKey = { key: Buffer.from(hexKey, 'hex'), source: `env:${ENV_KEY}`, isDevKey: false };
    return _cachedKey;
  }

  // 2. Key file
  const keyFile = process.env[ENV_KEY_FILE];
  if (keyFile) {
    if (!fs.existsSync(keyFile)) {
      throw new Error(
        `[KeyManager] PERSISTENT_STORE_KEY_FILE points to "${keyFile}" but file does not exist. ` +
        `Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      );
    }
    hexKey = fs.readFileSync(keyFile, 'utf8').trim();
    validateHexKey(hexKey);
    _cachedKey = { key: Buffer.from(hexKey, 'hex'), source: `file:${keyFile}`, isDevKey: false };
    return _cachedKey;
  }

  // 3. Dev/test fallback — generate random key per process start
  // WARNING: Data encrypted with this key is NOT recoverable after restart.
  const devKey = crypto.randomBytes(32).toString('hex');
  if (isProduction()) {
    throw new Error(
      `[KeyManager] NODE_ENV=production but no encryption key configured. ` +
      `Set ${ENV_KEY} or ${ENV_KEY_FILE} before starting the server. ` +
      `Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  const envLabel = process.env.NODE_ENV || process.env.NODE_ENVIRONMENT || 'development';
  console.warn(
    `\n[KeyManager] ⚠️  ${envLabel.toUpperCase()} MODE — using ephemeral in-memory encryption key.\n` +
    `   Data encrypted with this key is NOT recoverable after restart.\n` +
    `   For persistent encryption, set ${ENV_KEY} in your environment.\n` +
    `   Key source: in-memory (ephemeral)\n`
  );

  _cachedKey = { key: Buffer.from(devKey, 'hex'), source: 'in-memory-ephemeral', isDevKey: true };
  return _cachedKey;
}

/**
 * Validate that a hex string is exactly 64 characters (256 bits).
 */
function validateHexKey(hex) {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      `[KeyManager] Invalid encryption key: must be 64 hex characters (256 bits). ` +
      `Generate a valid key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
}

/**
 * Generate a new random encryption key.
 * @returns {string} 64-character hex string
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clear the cached key (useful for testing).
 */
export function clearKeyCache() {
  _cachedKey = null;
}