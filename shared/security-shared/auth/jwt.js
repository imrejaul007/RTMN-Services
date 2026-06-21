/**
 * @rtmn/security-shared — JWT Authentication
 *
 * The single source of truth for JWT signing/verification across RTMN.
 *
 * Key invariants enforced here (that the audits showed were violated in
 * every system):
 *  - NO hardcoded secret fallback. process.env.JWT_SECRET is required and
 *    must be at least 32 bytes. Boot fails otherwise.
 *  - `algorithms` is always pinned to ['HS256'] on verify (or whatever
 *    algorithms are explicitly allowed by the caller). `alg: none` is
 *    rejected. RS256→HS256 confusion is rejected.
 *  - `issuer` and `audience` claims are validated on verify.
 *  - Token expiry is always checked (no skipping via cast).
 *  - Signing always includes `algorithm`, `expiresIn`, and optionally
 *    `issuer`/`audience`.
 *
 * Two flavors of secret are supported to support segregated roles
 * (consumer/admin/merchant) per the rez-auth-service pattern:
 *  - JWT_SECRET (default — for regular user tokens)
 *  - JWT_ADMIN_SECRET (for superadmin tokens)
 *  - JWT_MERCHANT_SECRET (for merchant tokens)
 *
 * Each secret must be at least 32 bytes (256 bits).
 */

import jwt from 'jsonwebtoken';

const ALG = 'HS256';
const MIN_SECRET_BYTES = 32;
const DEFAULT_ISSUER = 'rtmn-corpid';
const DEFAULT_AUDIENCE = 'rtmn-api';

// ----- Secret management -----
let _cachedSecrets = null;

function readSecret(name) {
  const v = process.env[name];
  if (!v || typeof v !== 'string') {
    throw new Error(
      `[security-shared] Required env var ${name} is missing. ` +
      `Set it to a cryptographically random string of at least 32 bytes. ` +
      `Example: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  if (Buffer.byteLength(v, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(
      `[security-shared] ${name} is too short (${Buffer.byteLength(v, 'utf8')} bytes). ` +
      `Must be at least ${MIN_SECRET_BYTES} bytes.`
    );
  }
  return v;
}

function getSecrets() {
  if (_cachedSecrets) return _cachedSecrets;
  _cachedSecrets = {
    user: readSecret('JWT_SECRET'),
    admin: process.env.JWT_ADMIN_SECRET ? readSecret('JWT_ADMIN_SECRET') : null,
    merchant: process.env.JWT_MERCHANT_SECRET ? readSecret('JWT_MERCHANT_SECRET') : null,
  };
  return _cachedSecrets;
}

/**
 * Call once at service startup. Throws if any required secret is missing.
 * Optional secrets (admin, merchant) only fail if their env var is set
 * to an invalid value.
 *
 * @returns {{user: string, admin: string|null, merchant: string|null}}
 */
export function initializeSecrets() {
  return getSecrets();
}

/**
 * Rotate the in-memory secret cache. Call after rotating JWT_SECRET in env
 * to pick up the new value. Most deployments will need a process restart.
 */
export function clearSecretCache() {
  _cachedSecrets = null;
}

// ----- Sign -----
/**
 * Sign a JWT. ALWAYS uses HS256, ALWAYS requires explicit expiry, and
 * includes issuer/audience by default.
 *
 * @param {object} payload - claims to embed
 * @param {object} options
 * @param {string} [options.role='user'] - 'user' | 'admin' | 'merchant'
 * @param {string|number} [options.expiresIn='15m']
 * @param {string} [options.issuer] - defaults to 'rtmn-corpid'
 * @param {string} [options.audience] - defaults to 'rtmn-api'
 * @param {string} [options.subject] - sub claim
 * @returns {string} signed JWT
 */
export function sign(payload, options = {}) {
  const { role = 'user', expiresIn = '15m', issuer, audience, subject } = options;
  const secrets = getSecrets();
  let secret;
  if (role === 'admin' && secrets.admin) secret = secrets.admin;
  else if (role === 'merchant' && secrets.merchant) secret = secrets.merchant;
  else secret = secrets.user;

  return jwt.sign(payload, secret, {
    algorithm: ALG,
    expiresIn,
    issuer: issuer || DEFAULT_ISSUER,
    audience: audience || DEFAULT_AUDIENCE,
    ...(subject ? { subject } : {}),
  });
}

/**
 * Sign a refresh token. 7-day TTL by default. Uses the user secret.
 */
export function signRefresh(payload, options = {}) {
  return sign(payload, { ...options, expiresIn: options.expiresIn || '7d' });
}

// ----- Verify -----
/**
 * Verify a JWT. ALWAYS pins algorithms to a whitelist (default: HS256 only).
 * ALWAYS validates issuer and audience. Throws on any failure.
 *
 * @param {string} token
 * @param {object} options
 * @param {string[]} [options.allowedAlgorithms=['HS256']]
 * @param {string} [options.issuer='rtmn-corpid']
 * @param {string} [options.audience='rtmn-api']
 * @param {string} [options.role] - if 'admin' uses admin secret, etc.
 * @returns {object} decoded payload
 */
export function verify(token, options = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('verify: token is required');
  }
  const {
    allowedAlgorithms = [ALG],
    issuer = DEFAULT_ISSUER,
    audience = DEFAULT_AUDIENCE,
    role,
  } = options;

  const secrets = getSecrets();
  let secret;
  if (role === 'admin' && secrets.admin) secret = secrets.admin;
  else if (role === 'merchant' && secrets.merchant) secret = secrets.merchant;
  else secret = secrets.user;

  return jwt.verify(token, secret, {
    algorithms: allowedAlgorithms,
    issuer,
    audience,
  });
}

/**
 * Try to verify without throwing. Returns null on failure.
 */
export function tryVerify(token, options = {}) {
  try {
    return verify(token, options);
  } catch {
    return null;
  }
}

/**
 * Decode a JWT without verifying. NEVER use this for authentication — it
 * trusts the payload. Useful for logging, metrics, or displaying user info
 * when you already have a verified token elsewhere.
 */
export function decode(token) {
  return jwt.decode(token);
}
