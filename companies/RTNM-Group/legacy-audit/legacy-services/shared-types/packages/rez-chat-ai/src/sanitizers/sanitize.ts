// ── Data Sanitizers ─────────────────────────────────────────────────────────────
// NEVER share sensitive data in chat: card numbers, CVV, passwords, full IDs, etc.

import { Sanitizer } from '../types';

// ── Blocklist Patterns (NEVER show these) ─────────────────────────────────────

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  // Credit/Debit Card Numbers
  { pattern: /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g, replacement: '[CARD NUMBER REDACTED]', description: 'Full card number' },
  { pattern: /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{1,4})\b/g, replacement: '[CARD NUMBER REDACTED]', description: 'Partial card number' },

  // CVV/CVC
  { pattern: /\b(CVV|CVC|CVV2|CVC2)[:\s]*(\d{3,4})\b/gi, replacement: '[CVV REDACTED]', description: 'CVV code' },

  // Passwords
  { pattern: /\b(password|pwd|passwd|secret)[:\s]*([^\s,]+)/gi, replacement: '[PASSWORD REDACTED]', description: 'Password' },

  // API Keys / Tokens
  { pattern: /\b(api[_-]?key|token|auth[_-]?token|access[_-]?token)[:\s]*([a-zA-Z0-9_-]{20,})/gi, replacement: '[API KEY REDACTED]', description: 'API key' },

  // JWT Tokens
  { pattern: /\b(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)\b/g, replacement: '[JWT REDACTED]', description: 'JWT token' },

  // Bank Account Numbers
  { pattern: /\b(acct|account)[_-]?(no|number)[:\s]*(\d{8,18})/gi, replacement: '[ACCOUNT NUMBER REDACTED]', description: 'Bank account' },

  // UPI IDs with full details
  { pattern: /\b([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)\b/gi, replacement: '[UPI REDACTED]', description: 'UPI ID (when combined with amounts)' },

  // Social Security / National IDs
  { pattern: /\b(\d{3})[- ]?(\d{2})[- ]?(\d{4})\b/g, replacement: '[ID REDACTED]', description: 'SSN/National ID' },

  // Transaction IDs (masked format)
  { pattern: /\b(tx[n]?|trans)[_-]?(id)?[:\s]*([a-zA-Z0-9_-]{10,})/gi, replacement: '[TXN ID REDACTED]', description: 'Transaction ID' },

  // Booking IDs (internal format)
  { pattern: /\b(booking[_-]?id)[:\s]*([a-zA-Z0-9_-]{8,})/gi, replacement: '[BOOKING ID REDACTED]', description: 'Booking ID' },

  // Order IDs (internal format)
  { pattern: /\b(order[_-]?id)[:\s]*([a-zA-Z0-9_-]{8,})/gi, replacement: '[ORDER ID REDACTED]', description: 'Order ID' },

  // Session IDs
  { pattern: /\b(session[_-]?id)[:\s]*([a-zA-Z0-9_-]{10,})/gi, replacement: '[SESSION REDACTED]', description: 'Session ID' },

  // OTP Codes
  { pattern: /\b(otp|one[_-]?time[_-]?password)[:\s]*(\d{4,8})\b/gi, replacement: '[OTP REDACTED]', description: 'OTP code' },

  // PIN Codes
  { pattern: /\b(pin)[:\s]*(\d{4,6})\b/gi, replacement: '[PIN REDACTED]', description: 'PIN code' },
];

// ── Safe Patterns (OK to show) ────────────────────────────────────────────────

const SAFE_PATTERNS: RegExp[] = [
  // Phone numbers (partial)
  /\b(\d{3})[- ]?(\d{3})[- ]?(\d{4})\b/, // Show last 4 digits
  // Email (partial)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Normal emails are OK for contact
  // Order dates (OK to show)
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
];

// ── Sanitizers ─────────────────────────────────────────────────────────────────

export const sensitiveDataSanitizer: Sanitizer = {
  name: 'sensitiveDataSanitizer',
  sanitize: (text: string): string => {
    if (!text) return '';

    let sanitized = text;

    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }
};

export const cardNumberSanitizer: Sanitizer = {
  name: 'cardNumberSanitizer',
  sanitize: (text: string): string => {
    return text.replace(
      /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
      '****-****-****-$4'
    );
  }
};

export const emailSanitizer: Sanitizer = {
  name: 'emailSanitizer',
  sanitize: (text: string): string => {
    return text.replace(
      /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
      (match, local, domain) => {
        const partial = local.charAt(0) + '***@' + domain;
        return partial;
      }
    );
  }
};

export const phoneSanitizer: Sanitizer = {
  name: 'phoneSanitizer',
  sanitize: (text: string): string => {
    return text.replace(
      /\b(\d{3})[- ]?(\d{3})[- ]?(\d{4})\b/g,
      '***-***-$3'
    );
  }
};

export const idSanitizer: Sanitizer = {
  name: 'idSanitizer',
  sanitize: (text: string): string => {
    return text
      .replace(/\b(booking[_-]?id)[:\s]*([a-zA-Z0-9_-]{8,})/gi, '[BOOKING REDACTED]')
      .replace(/\b(order[_-]?id)[:\s]*([a-zA-Z0-9_-]{8,})/gi, '[ORDER REDACTED]')
      .replace(/\b(user[_-]?id)[:\s]*([a-zA-Z0-9_-]{8,})/gi, '[USER REDACTED]');
  }
};

export const transactionSanitizer: Sanitizer = {
  name: 'transactionSanitizer',
  sanitize: (text: string): string => {
    return text
      .replace(/\b(tx[n]?|trans)[_-]?(id)?[:\s]*([a-zA-Z0-9_-]{10,})/gi, '[TRANSACTION REDACTED]')
      .replace(/\b(reference)[_-]?(id)?[:\s]*([a-zA-Z0-9_-]{10,})/gi, '[REFERENCE REDACTED]');
  }
};

// ── Composed Sanitizer ──────────────────────────────────────────────────────────

export class DataSanitizer {
  private sanitizers: Sanitizer[];

  constructor(sanitizers: Sanitizer[] = [
    sensitiveDataSanitizer,
    idSanitizer,
    transactionSanitizer,
    cardNumberSanitizer,
  ]) {
    this.sanitizers = sanitizers;
  }

  sanitize(text: string): string {
    let result = text;
    for (const sanitizer of this.sanitizers) {
      result = sanitizer.sanitize(result);
    }
    return result;
  }

  sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  sanitizeChatMessage(message: string): string {
    // Sanitize message content
    let sanitized = this.sanitize(message);

    // Remove any attempts to extract sensitive data via prompt injection
    sanitized = sanitized
      .replace(/ignore (previous|above|system) instructions?/gi, '')
      .replace(/disregard (previous|above|system) instructions?/gi, '')
      .replace(/forget (previous|above|system) instructions?/gi, '')
      .replace(/pretend you are/i, '')
      .replace(/you are now/i, '')
      .replace(/system prompt/i, '');

    return sanitized.trim();
  }
}

// ── Default Instance ─────────────────────────────────────────────────────────────

export const defaultSanitizer = new DataSanitizer();

// ── Context Sanitization ────────────────────────────────────────────────────────

export interface SanitizedCustomerContext {
  name?: string;
  tier?: string;
  preferences?: Record<string, unknown>;
  totalSpent?: number;
  visitCount?: number;
  recentActivity?: string; // Summarized, not raw data
}

export function sanitizeCustomerContext(context: Record<string, unknown>): SanitizedCustomerContext {
  const {
    customerId,
    email,
    phone,
    cardNumbers,
    passwords,
    tokens,
    apiKeys,
    ...safeData
  } = context as any;

  return {
    name: safeData.name,
    tier: safeData.tier,
    preferences: safeData.preferences,
    totalSpent: safeData.totalSpent,
    visitCount: safeData.visitCount,
    recentActivity: safeData.recentOrders
      ? `Has ${safeData.recentOrders?.length || 0} recent orders`
      : undefined,
  };
}
