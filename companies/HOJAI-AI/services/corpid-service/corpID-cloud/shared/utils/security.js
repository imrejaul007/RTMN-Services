/**
 * CorpID Cloud - Security Utilities
 * Password hashing, token generation, input sanitization
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ============ PASSWORD HASHING ============

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;

  return {
    score, // 0-5
    strength: score < 2 ? 'weak' : score < 4 ? 'fair' : score < 5 ? 'good' : 'strong',
    checks,
    suggestions: generatePasswordSuggestions(checks)
  };
}

function generatePasswordSuggestions(checks) {
  const suggestions = [];
  if (!checks.length) suggestions.push('Password must be at least 8 characters');
  if (!checks.lowercase) suggestions.push('Add lowercase letters');
  if (!checks.uppercase) suggestions.push('Add uppercase letters');
  if (!checks.number) suggestions.push('Add numbers');
  if (!checks.special) suggestions.push('Add special characters (@$!%*?&)');
  return suggestions;
}

// ============ TOKEN GENERATION ============

/**
 * Generate a secure random token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric OTP
 */
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

/**
 * Generate an API key with prefix
 */
export function generateAPIKey(prefix = 'cpk') {
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * Generate an API secret
 */
export function generateAPISecret() {
  return crypto.randomBytes(32).toString('hex');
}

// ============ HASHING ============

/**
 * SHA-256 hash
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * HMAC-SHA256
 */
export function hmacSHA256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Hash API key for storage (only store the hash, never the key itself)
 */
export function hashAPIKey(apiKey) {
  return sha256(apiKey);
}

// ============ ENCRYPTION ============

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data
 */
export function encrypt(text, encryptionKey = process.env.ENCRYPTION_KEY) {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData, encryptionKey = process.env.ENCRYPTION_KEY) {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  const key = Buffer.from(encryptionKey, 'hex');
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============ INPUT SANITIZATION ============

/**
 * Prevent prototype pollution
 */
export function preventPrototypePollution(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!dangerous.includes(key)) {
      sanitized[key] = typeof value === 'object' && value !== null
        ? preventPrototypePollution(value)
        : value;
    }
  }

  return sanitized;
}

/**
 * Sanitize search input
 */
export function sanitizeSearchInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 200);
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone, countryCode = 'IN') {
  // Basic international format validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate slug from string
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// ============ MASKING ============

/**
 * Mask email address
 */
export function maskEmail(email) {
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

/**
 * Mask API key (show prefix and last 4 chars)
 */
export function maskAPIKey(key) {
  const parts = key.split('_');
  if (parts.length < 2) return '***';
  const prefix = parts[0];
  const lastPart = parts[parts.length - 1];
  const maskedLast = lastPart.slice(-4);
  return `${prefix}_***${maskedLast}`;
}

export default {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  generateToken,
  generateOTP,
  generateAPIKey,
  generateAPISecret,
  sha256,
  hmacSHA256,
  hashAPIKey,
  encrypt,
  decrypt,
  preventPrototypePollution,
  sanitizeSearchInput,
  sanitizeHTML,
  isValidEmail,
  isValidPhone,
  isValidUUID,
  generateSlug,
  maskEmail,
  maskPhone,
  maskAPIKey
};
