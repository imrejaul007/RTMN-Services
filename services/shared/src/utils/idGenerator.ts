/**
 * Secure ID Generator
 * Uses crypto for secure random ID generation
 */
import crypto from 'crypto';

// UUID v4 generator using crypto
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Short ID generator (12 chars, URL-safe)
export function generateShortId(): string {
  return crypto.randomBytes(9).toString('base64url');
}

// Nano ID (21 chars, URL-safe, more entropy than UUID)
export function generateNanoId(size: number = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = crypto.randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

// Prefixed ID generator (e.g., 'AGT-xxxxx', 'TXN-xxxxx')
export function generatePrefixedId(prefix: string, size: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  const bytes = crypto.randomBytes(size);
  for (let i = 0; i < size; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${id}`;
}

// Generate multiple IDs
export function generateIds(count: number, generator: () => string = generateUUID): string[] {
  return Array.from({ length: count }, () => generator());
}

export default {
  generateUUID,
  generateShortId,
  generateNanoId,
  generatePrefixedId,
  generateIds
};
