/**
 * PolicyOS — Custom Auth Middleware (Phase 0.5: JWT RS256 Upgrade)
 *
 * Three authentication paths:
 *   1. X-Service-Token / X-Internal-Token: <SERVICE_TOKEN> — service-to-service
 *   2. Authorization: Bearer <JWT>         — JWT verified (RS256 or HS256)
 *   3. X-API-Key: <key>                    — pre-shared API key
 *
 * Phase 0.5 changes (JWT RS256 Upgrade):
 *   - RS256 support: load RS256 public key from JWT_PUBLIC_KEY env var (PEM)
 *   - Algorithm pinning: RS256 preferred, HS256 fallback (migration window)
 *   - Audience validation: JWT must have 'aud' matching POLICYOS_JWT_AUDIENCE
 *   - Refresh tokens: POST /api/tokens/refresh issues short-lived access tokens
 *
 * Algorithm policy (migration):
 *   1. If JWT_PUBLIC_KEY is set → accept RS256 only (no HS256)
 *   2. If JWT_SECRET is set but JWT_PUBLIC_KEY is not → accept HS256 only (legacy)
 *   3. If both are set → accept BOTH (migration window — remove JWT_SECRET at end)
 *
 * SECURITY notes:
 *   - JWT_SECRET is only for HS256 (symmetric). RS256 uses asymmetric keys.
 *   - JWT_PUBLIC_KEY must be the PUBLIC key for RS256 verification.
 *     Generate a keypair:
 *       openssl genrsa -out private.pem 2048
 *       openssl rsa -in private.pem -pubout -out public.pem
 */

import { v4 as uuidv4 } from 'uuid';

// =================================================================
// Module-level state (lazily initialized)
// =================================================================

let _initialized = false;
let _rs256Mode = false;
let _hs256Mode = false;
let _publicKey = null;
let _privateKey = null;
let _publicKeySource = null;
let _audience = null;

let _jwtModule = null;
let _jwtVerify = null;
let _jwtSign = null;

async function loadJwt() {
  if (!_jwtModule) {
    _jwtModule = await import('jsonwebtoken');
    _jwtVerify = _jwtModule.default.verify.bind(_jwtModule.default);
    _jwtSign = _jwtModule.default.sign.bind(_jwtModule.default);
  }
}

function ensureInitialized() {
  if (_initialized) return;
  _initialized = true;

  const publicKeyPem = process.env.JWT_PUBLIC_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  if (publicKeyPem) {
    _rs256Mode = true;
    _publicKey = publicKeyPem;
    _publicKeySource = 'env:JWT_PUBLIC_KEY';
    _privateKey = process.env.JWT_PRIVATE_KEY || null;
  }
  if (jwtSecret) {
    _hs256Mode = true;
  }
  _audience = process.env.POLICYOS_JWT_AUDIENCE || 'policy-os';

  if (!_rs256Mode && !_hs256Mode) {
    console.warn(
      '[auth] ⚠️  No JWT_PUBLIC_KEY or JWT_SECRET configured. ' +
      'Bearer JWT auth is DISABLED. Set JWT_PUBLIC_KEY (RS256) or JWT_SECRET (HS256).'
    );
  }
  if (_rs256Mode && _hs256Mode) {
    console.warn(
      '[auth] ⚠️  Migration mode: both RS256 and HS256 are configured. ' +
      'Remove JWT_SECRET after migrating all clients to RS256.'
    );
  }
}

/**
 * Reset all auth state (for testing — call this in beforeEach).
 */
export function _resetAuthState() {
  _initialized = false;
  _rs256Mode = false;
  _hs256Mode = false;
  _publicKey = null;
  _privateKey = null;
  _publicKeySource = null;
  _audience = null;
  _jwtModule = null;
  _jwtVerify = null;
  _jwtSign = null;
}

/** Export current state for test introspection */
export function _getAuthState() {
  return {
    initialized: _initialized,
    rs256Mode: _rs256Mode,
    hs256Mode: _hs256Mode,
    hasPublicKey: !!_publicKey,
    audience: _audience,
    error: null,
  };
}

/** Export verifyToken for direct testing (mirrors actual middleware logic) */
export async function _verifyTokenForTest(token) {
  ensureInitialized();
  if (!_rs256Mode && !_hs256Mode) {
    return { valid: false, error: 'no JWT mode configured' };
  }
  await loadJwt();

  // Try RS256 first
  if (_rs256Mode) {
    try {
      const payload = _jwtVerify(token, _publicKey, { algorithms: ['RS256'], audience: _audience });
      return { valid: true, payload, alg: 'RS256' };
    } catch (_) { /* try HS256 next */ }
  }

  // Try HS256
  if (_hs256Mode) {
    try {
      const payload = _jwtVerify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: _audience });
      return { valid: true, payload, alg: 'HS256' };
    } catch (err) {
      return { valid: false, error: err.name, message: err.message };
    }
  }

  return { valid: false, error: 'no algorithm succeeded' };
}

/** Export a tracing version of verifyToken for debug */
export async function _verifyTokenDebug(token) {
  ensureInitialized();
  const state = {
    _initialized,
    _rs256Mode,
    _hs256Mode,
    hasPublicKey: !!_publicKey,
    _audience,
  };
  if (!_rs256Mode && !_hs256Mode) {
    return { valid: false, error: 'JWT verification not configured', state };
  }
  await loadJwt();

  // Try RS256 first if available
  if (_rs256Mode) {
    try {
      const payload = _jwtVerify(token, _publicKey, { algorithms: ['RS256'], audience: _audience });
      return { valid: true, payload, alg: 'RS256', state };
    } catch (err) {
      // fall through to HS256
    }
  }

  // Try HS256
  if (_hs256Mode) {
    try {
      const payload = _jwtVerify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: _audience });
      return { valid: true, payload, alg: 'HS256', state };
    } catch (err) {
      return { valid: false, error: err.name, message: err.message, state };
    }
  }

  return { valid: false, error: 'No algorithm succeeded', state };
}

// =================================================================
// Auth middleware factory
// =================================================================

export function createCustomAuth({ requireAuth = true, serviceToken, apiKeysStore }) {

  async function verifyToken(token) {
    ensureInitialized();
    if (!_rs256Mode && !_hs256Mode) {
      return { valid: false, error: 'JWT verification not configured (no JWT_PUBLIC_KEY or JWT_SECRET)' };
    }
    await loadJwt();

    // Try RS256 first if available
    if (_rs256Mode) {
      try {
        const payload = _jwtVerify(token, _publicKey, { algorithms: ['RS256'], audience: _audience });
        return { valid: true, payload, alg: 'RS256', keySource: _publicKeySource };
      } catch (err) {
        // If RS256 failed and HS256 is available, try HS256 as fallback
        if (_hs256Mode && err.name === 'JsonWebTokenError') {
          // fall through to HS256
        } else {
          return {
            valid: false,
            error: err.name === 'TokenExpiredError' ? 'Token expired' :
                   err.message.includes('audience') ? 'Invalid token audience' : 'Invalid token',
            reason: err.message,
          };
        }
      }
    }

    // Try HS256
    if (_hs256Mode) {
      try {
        const payload = _jwtVerify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: _audience });
        return { valid: true, payload, alg: 'HS256', keySource: 'env:JWT_SECRET' };
      } catch (err) {
        return {
          valid: false,
          error: err.name === 'TokenExpiredError' ? 'Token expired' :
                 err.message.includes('audience') ? 'Invalid token audience' : 'Invalid token',
          reason: err.message,
        };
      }
    }

    return { valid: false, error: 'No JWT algorithm configured' };
  }

  return async function customAuth(req, res, next) {
    if (!requireAuth) return next();

    // 1. Service-to-service tokens
    const svcToken = req.headers['x-service-token'];
    const intToken = req.headers['x-internal-token'];
    if ((svcToken && svcToken === serviceToken) || (intToken && intToken === serviceToken)) {
      req.auth = { type: 'service', service: 'policy-os', role: 'admin' };
      return next();
    }

    // 2. Bearer token (RS256 or HS256 JWT)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await verifyToken(token);
      if (result.valid) {
        req.auth = {
          type: 'token',
          alg: result.alg,
          keySource: result.keySource,
          ...result.payload,
        };
        return next();
      }
      // JWT was provided but invalid — return specific error
      return res.status(401).json({
        error: result.error || 'Invalid token',
        hint: 'Your JWT may have expired or uses the wrong signing key',
      });
    }

    // 3. API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKeysStore) {
      const keyData = apiKeysStore.get(apiKey);
      if (keyData) {
        if (keyData.revokedAt) {
          return res.status(401).json({
            error: 'API key has been revoked',
            hint: 'Request a new key from your administrator',
          });
        }
        if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
          return res.status(401).json({
            error: 'API key has expired',
            hint: 'Request a new key from your administrator',
          });
        }
        req.auth = { type: 'api-key', ...keyData };
        return next();
      }
    }

    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Send X-Service-Token, Authorization: Bearer <token>, or X-API-Key',
    });
  };
}

export function createServiceToken() {
  return `svc_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * Sign a JWT with the configured algorithm (RS256 or HS256).
 * @param {object} payload
 * @param {number} [expiresInMs]
 */
export async function signToken(payload, expiresInMs = 86400000) {
  ensureInitialized();
  await loadJwt();

  const alg = _rs256Mode ? 'RS256' : _hs256Mode ? 'HS256' : 'HS256';

  let key;
  if (alg === 'RS256') {
    key = _privateKey || process.env.JWT_PRIVATE_KEY;
    if (!key) {
      throw new Error(
        'Cannot sign RS256 token: JWT_PRIVATE_KEY env var is not set. ' +
        'RS256 signing requires the private key. Generate with: ' +
        'openssl genrsa -out private.pem 2048 && ' +
        'openssl rsa -in private.pem -pubout -out public.pem'
      );
    }
  } else {
    key = process.env.JWT_SECRET;
    if (!key) {
      throw new Error('Cannot sign HS256 token: JWT_SECRET env var is not set');
    }
  }

  return _jwtSign(
    { ...payload, aud: _audience },
    key,
    { algorithm: alg, expiresIn: Math.floor(expiresInMs / 1000) + 's' }
  );
}
