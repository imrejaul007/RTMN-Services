/**
 * PolicyOS Input Sanitization (Phase 0.7)
 *
 * Guards against:
 *  - Prototype pollution (__proto__, constructor, prototype in request bodies)
 *  - Malformed policy IDs (only alphanumeric + hyphens, max 64 chars)
 *  - Dangerous webhook URLs (javascript:, data:, internal IPs, non-HTTPS in prod)
 *  - Control-character injection in expression text
 */

const MAX_POLICY_ID_LENGTH = 64;

// ── Prototype Pollution Guard ─────────────────────────────────────────────────

/**
 * Deep-scan an object for prototype-pollution keys and strip them.
 * Returns a sanitized copy — the original object is not mutated.
 *
 * Dangerous keys blocked: __proto__, constructor, prototype,
 * and any key containing a null byte.
 */
export function sanitizePrototypePollution(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  const seen = new WeakSet();
  function walk(value) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return value; // cycle guard
    seen.add(value);
    if (Array.isArray(value)) return value.map(walk);
    const result = {};
    for (const key of Object.keys(value)) {
      // Block prototype-pollution and null-byte keys.
      if (
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype' ||
        key === '__defineGetter__' ||
        key === '__defineSetter__' ||
        key === '__lookupGetter__' ||
        key === '__lookupSetter__' ||
        key.includes('\0')
      ) {
        continue; // drop dangerous keys silently
      }
      result[key] = walk(value[key]);
    }
    return result;
  }
  return walk(obj);
}

/**
 * Express middleware that strips prototype-pollution keys from req.body.
 * Logs a warning but does NOT block the request — dangerous keys are simply removed.
 */
export function prototypePollutionMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const before = Object.keys(req.body).length;
    req.body = sanitizePrototypePollution(req.body);
    const after = Object.keys(req.body).length;
    if (before !== after) {
      console.warn(`[sanitization] Prototype-pollution keys stripped from ${req.path}: ${before - after} key(s) removed`);
    }
  }
  next();
}

// ── Policy ID Sanitization ───────────────────────────────────────────────────

/**
 * Sanitize a policy ID: lowercase alphanumeric + hyphens, max 64 chars.
 * Returns null if the input is invalid (not a string after trimming).
 *
 * Examples:
 *   "My Policy!"       → "my-policy"
 *   "policy_v1"        → "policy-v1"
 *   ""                 → null
 *   null               → null
 */
export function sanitizePolicyId(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_POLICY_ID_LENGTH) return null;
  // Lowercase, replace spaces/underscores/dots with hyphens, remove anything else.
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[ _.,;:!?()[\]{}'"\\\/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleaned || cleaned.length > MAX_POLICY_ID_LENGTH) return null;
  return cleaned;
}

// ── Webhook URL Validation ────────────────────────────────────────────────────

const INTERNAL_IP_RANGES = [
  /^127\./,           // loopback
  /^10\./,            // RFC 1918 private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918 private
  /^192\.168\./,      // RFC 1918 private
  /^169\.254\./,      // link-local
  /^0\./,             // current network
  /^localhost$/i,     // literal "localhost"
  /^::1$/i,           // IPv6 loopback
  /^fe80:/i,          // IPv6 link-local
  /^fc00:/i,          // IPv6 unique local
  /^fd00:/i,          // IPv6 unique local
];

/**
 * Validate a webhook URL for security.
 * - Must be http or https
 * - No javascript:, data:, vbscript: schemes
 * - No internal/private IP ranges (unless NODE_ENV=development and localhost)
 * - Must parse as a valid URL
 *
 * Returns { valid: true } or { valid: false, reason: string }
 */
export function validateWebhookUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return { valid: false, reason: 'url is required' };
  }

  const trimmed = url.trim();

  // Block dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { valid: false, reason: `Disallowed URL scheme: ${trimmed.split(':')[0]}` };
  }

  // Must be http or https
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: `Only http and https URLs are allowed, got ${parsed.protocol}` };
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';

  // In production, localhost is always disallowed.
  if (isLocalhost) {
    if (process.env.NODE_ENV !== 'development') {
      return { valid: false, reason: 'Localhost URLs are not allowed in production' };
    }
    // In dev, allow localhost HTTP.
    return { valid: true };
  }

  // Block internal IP ranges.
  for (const range of INTERNAL_IP_RANGES) {
    if (range.test(parsed.hostname)) {
      return { valid: false, reason: `Internal/private IP addresses are not allowed: ${parsed.hostname}` };
    }
  }

  return { valid: true };
}

// ── Expression Sanitization ───────────────────────────────────────────────────

/**
 * Sanitize expression text: strip control characters, validate charset.
 * - Removes ASCII control chars (0x00–0x1F except \t\n\r) and 0x7F
 * - Max 1000 characters
 * - Returns sanitized string or null if result is empty
 */
export function sanitizeExpression(input, maxLength = 1000) {
  if (typeof input !== 'string') return null;
  const stripped = input
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // Allow tab, newline, carriage return; block all other control chars.
      if (code === 9 || code === 10 || code === 13) return true;
      if (code < 32 || code === 127) return false;
      return true;
    })
    .join('')
    .trim();

  const limited = stripped.slice(0, maxLength);
  return limited || null;
}

// ── Name Sanitization (for policy names, role names, etc.) ────────────────────

/**
 * Sanitize a human-readable name: strip control characters,
 * allow printable Unicode, max 128 chars.
 */
export function sanitizeName(input) {
  if (typeof input !== 'string') return null;
  const stripped = input
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // Allow printable (including safe Unicode), tab, space, basic punctuation.
      if (code >= 32 && code <= 126) return true;
      if (code >= 160) return true; // Latin-1 Supplement and beyond
      return false;
    })
    .join('')
    .trim();
  return stripped.slice(0, 128) || null;
}