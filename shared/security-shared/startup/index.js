/**
 * @rtmn/security-shared — Startup Validation
 *
 * Replaces the "silently fall back to a hardcoded string" pattern found
 * in every audited system. Call `validateProductionEnv()` at the top of
 * every service entry point. It throws a single, clear error if anything
 * is missing or invalid.
 *
 * The validation is strict by design: it is better to refuse to start
 * than to start in a state where authentication is silently broken.
 *
 * Required env vars for any service handling auth or PII:
 *  - JWT_SECRET (>= 32 bytes) — user JWT signing key
 *  - JWT_ADMIN_SECRET (>= 32 bytes, if admin endpoints exist)
 *  - SECRETS_PEPPER (>= 32 bytes) — for hashSecret/verifySecret
 *  - AUDIT_LOG_SECRET (>= 32 bytes) — for hash-chained audit log
 *  - INTERNAL_SERVICE_TOKEN (>= 32 bytes) — for service-to-service auth
 *  - CORS_ORIGIN (comma-separated, no '*' with credentials) — in production
 */

import { initializeSecrets } from '../auth/jwt.js';

const MIN_SECRET_BYTES = 32;

/**
 * Validate a secret env var is set and at least MIN_SECRET_BYTES long.
 * Throws with a clear message if not.
 */
function requireSecret(name) {
  const v = process.env[name];
  if (!v || typeof v !== 'string') {
    throw new Error(
      `[startup] Required env var ${name} is missing.\n` +
      `Generate one with:\n` +
      `  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n` +
      `Then add to your .env file.`
    );
  }
  if (Buffer.byteLength(v, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(
      `[startup] ${name} is too short (${Buffer.byteLength(v, 'utf8')} bytes). ` +
      `Must be at least ${MIN_SECRET_BYTES} bytes.`
    );
  }
  return v;
}

/**
 * Validate production env. Call at the very top of every service entry
 * point, BEFORE importing anything that reads JWT_SECRET.
 *
 * @param {object} [options]
 * @param {boolean} [options.requireAdminSecret=false]
 * @param {boolean} [options.requireMerchantSecret=false]
 * @param {boolean} [options.requireCorsOrigin=true] - require CORS_ORIGIN in production
 * @param {boolean} [options.isProduction] - override NODE_ENV check
 * @returns {void}
 */
export function validateProductionEnv(options = {}) {
  const {
    requireAdminSecret = false,
    requireMerchantSecret = false,
    requireCorsOrigin = true,
    isProduction = process.env.NODE_ENV === 'production',
  } = options;

  const errors = [];

  // Always required
  try { requireSecret('JWT_SECRET'); } catch (e) { errors.push(e.message); }
  try { requireSecret('SECRETS_PEPPER'); } catch (e) { errors.push(e.message); }
  try { requireSecret('AUDIT_LOG_SECRET'); } catch (e) { errors.push(e.message); }
  try { requireSecret('INTERNAL_SERVICE_TOKEN'); } catch (e) { errors.push(e.message); }

  if (requireAdminSecret) {
    try { requireSecret('JWT_ADMIN_SECRET'); } catch (e) { errors.push(e.message); }
  }
  if (requireMerchantSecret) {
    try { requireSecret('JWT_MERCHANT_SECRET'); } catch (e) { errors.push(e.message); }
  }

  if (isProduction && requireCorsOrigin) {
    const cors = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
    if (!cors) {
      errors.push(
        `[startup] CORS_ORIGIN is required in production.\n` +
        `Set to a comma-separated list of allowed origins.`
      );
    } else if (cors.includes('*') && process.env.CORS_ALLOW_CREDENTIALS === 'true') {
      errors.push(
        `[startup] CORS_ORIGIN cannot include "*" when credentials are enabled.`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[startup] Cannot start service — ${errors.length} configuration error(s):\n` +
      errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
    );
  }

  // Force the JWT module to validate secrets and cache them
  initializeSecrets();
}

/**
 * Validate dev/test env. Looser — allows some secrets to be missing
 * if the service is not handling auth.
 */
export function validateDevEnv(options = {}) {
  return validateProductionEnv({ ...options, isProduction: false });
}
