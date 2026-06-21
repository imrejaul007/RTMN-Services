/**
 * @rtmn/security-shared — Main Entry Point
 *
 * The single source of truth for security primitives in the RTMN
 * ecosystem. Every service that handles auth, identity, PII, or
 * payment data MUST use this package.
 *
 * Re-exports:
 *   - JWT: sign, verify, signRefresh, tryVerify, decode
 *   - Password: hashPassword, verifyPassword, validatePasswordStrength
 *   - API Key: generateApiKey, verifyApiKey, apiKeyPrefix
 *   - OAuth State: mintOAuthState, verifyOAuthState
 *   - Middleware: requireAuth, requireRole, requirePermission,
 *                 requireOwnership, optionalAuth
 *   - Rate Limiting: defaultLimiter, authLimiter, strictLimiter,
 *                    internalLimiter, createRateLimit
 *   - CORS: createCors
 *   - Helmet: createHelmet
 *   - Audit Log: AuditLog class, createAuditLog
 *   - Crypto: timingSafeEqual, randomHex, randomToken, sha256, hmacSha256,
 *             encrypt, decrypt, deriveKey, computeChainHash
 *   - Startup: validateProductionEnv, validateDevEnv
 *
 * Usage:
 *   import {
 *     requireAuth, authLimiter, createHelmet, createCors,
 *     sign, verify, hashPassword, validateProductionEnv,
 *     createAuditLog,
 *   } from '@rtmn/security-shared';
 *
 *   validateProductionEnv({ requireAdminSecret: true });
 *
 *   app.use(createHelmet());
 *   app.use(createCors({ credentials: true }));
 *
 *   app.post('/login', authLimiter, async (req, res) => { ... });
 *   app.get('/me', requireAuth(), (req, res) => { res.json(req.user); });
 */

// Auth — JWT
export {
  sign,
  verify,
  signRefresh,
  tryVerify,
  decode,
  initializeSecrets,
  clearSecretCache,
} from './auth/jwt.js';

// Auth — Passwords
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './auth/password.js';

// Auth — API Keys
export {
  generateApiKey,
  verifyApiKey,
  apiKeyPrefix,
} from './auth/api-key.js';

// Auth — OAuth State
export {
  mintOAuthState,
  verifyOAuthState,
} from './auth/oauth-state.js';

// Middleware — Auth
export {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  requireOwnership,
} from './middleware/require-auth.js';

// Middleware — Rate Limiting
export {
  createRateLimit,
  defaultLimiter,
  authLimiter,
  strictLimiter,
  internalLimiter,
} from './middleware/rate-limit.js';

// Middleware — CORS
export { createCors } from './middleware/cors.js';

// Middleware — Helmet
export { createHelmet } from './middleware/helmet.js';

// Middleware — Audit Log
export { AuditLog, createAuditLog } from './middleware/audit-log.js';

// Utilities — Crypto
export {
  timingSafeEqual,
  randomHex,
  randomToken,
  generateOTP,
  sha256,
  hmacSha256,
  encrypt,
  decrypt,
  deriveKey,
  computeChainHash,
} from './utils/crypto.js';

// Startup validation
export {
  validateProductionEnv,
  validateDevEnv,
} from './startup/index.js';
