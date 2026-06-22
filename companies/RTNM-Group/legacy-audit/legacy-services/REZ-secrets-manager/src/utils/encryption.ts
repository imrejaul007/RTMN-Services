import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createLogger } from './logger';

const logger = createLogger('encryption');

// Configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_ROUNDS = 12;

/**
 * Derives an encryption key from the master key using PBKDF2
 */
export function deriveKey(masterKey: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts plaintext using AES-256-GCM
 */
export function encrypt(plaintext: string, masterKey?: string): string {
  const key = masterKey || process.env.VAULT_MASTER_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('Encryption key not configured');
  }

  const salt = crypto.randomBytes(32).toString('hex');
  const derivedKey = deriveKey(key, salt);

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted
  return `${salt}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts ciphertext encrypted with AES-256-GCM
 */
export function decrypt(ciphertext: string, masterKey?: string): string {
  const key = masterKey || process.env.VAULT_MASTER_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('Decryption key not configured');
  }

  const parts = ciphertext.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [salt, ivHex, authTagHex, encrypted] = parts;

  const derivedKey = deriveKey(key, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  // Set auth tag
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hashes a secret value for storage (one-way)
 */
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

/**
 * Verifies a secret against its hash
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * Generates a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a cryptographically secure API key
 */
export function generateApiKey(): { key: string; prefix: string } {
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = key.substring(0, 8);
  return { key, prefix };
}

/**
 * Hashes an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verifies an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Generates a hash for comparison (fast, one-way)
 */
export function sha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a hash for secret values (slower, more secure)
 */
export async function secureHash(data: string): Promise<string> {
  return bcrypt.hash(data, SALT_ROUNDS);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Masks a secret value for logging
 */
export function maskSecret(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const masked = '*'.repeat(Math.min(value.length - visibleChars * 2, 20));

  return `${start}${masked}${end}`;
}

/**
 * Generates database credentials dynamically
 */
export function generateDatabaseCredentials(username?: string): {
  username: string;
  password: string;
} {
  const generatedUsername = username || `rez_${crypto.randomBytes(8).toString('hex')}`;
  const password = crypto.randomBytes(24).toString('base64');

  return {
    username: generatedUsername,
    password
  };
}

/**
 * Encrypts with a specific key (for multi-tenant scenarios)
 */
export function encryptWithKey(plaintext: string, key: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const derivedKey = deriveKey(key, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${salt}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts with a specific key
 */
export function decryptWithKey(ciphertext: string, key: string): string {
  const parts = ciphertext.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [salt, ivHex, authTagHex, encrypted] = parts;

  const derivedKey = deriveKey(key, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export default {
  encrypt,
  decrypt,
  hashSecret,
  verifySecret,
  generateSecureToken,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  sha256Hash,
  secureHash,
  timingSafeEqual,
  maskSecret,
  generateDatabaseCredentials,
  encryptWithKey,
  decryptWithKey
};
