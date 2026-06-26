/**
 * PolicyOS — Custom Auth Middleware
 *
 * Three authentication paths:
 *   1. X-Service-Token / X-Internal-Token: <SERVICE_TOKEN> — service-to-service (either header works)
 *   2. Authorization: Bearer <HS256-JWT>      — HS256-signed JWT verified against JWT_SECRET
 *   3. X-API-Key: <key>                       — pre-shared API key (issued via /api/apikeys)
 *
 * SECURITY (Phase 5): The previous "base64-encoded JSON" token path was REMOVED.
 * Only signed HS256 JWTs (verified against process.env.JWT_SECRET) are accepted.
 * JWT_SECRET must be set at startup; if missing, the Bearer auth path is disabled
 * (deny-by-default).
 *
 * Phase 6 Fix: SERVICE_TOKEN is no longer logged to console.
 */

import { v4 as uuidv4 } from 'uuid';

let _jwtModule = null;
let _jwtVerify = null;

// Lazily load jsonwebtoken only when JWT_SECRET is present
async function loadJwt() {
  if (!_jwtModule) {
    _jwtModule = await import('jsonwebtoken');
    _jwtVerify = _jwtModule.default.verify.bind(_jwtModule.default);
  }
}

export function createCustomAuth({ requireAuth = true, serviceToken, apiKeysStore }) {
  // Load JWT lazily
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    loadJwt();
  }

  async function verifyToken(token) {
    if (!jwtSecret) {
      return { valid: false, error: 'JWT verification not configured (JWT_SECRET missing)' };
    }
    await loadJwt();
    try {
      // Pin algorithm to HS256 to prevent alg=none / RS256 confusion attacks.
      const payload = _jwtVerify(token, jwtSecret, { algorithms: ['HS256'] });
      return { valid: true, payload };
    } catch (err) {
      return {
        valid: false,
        error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      };
    }
  }

  return async function customAuth(req, res, next) {
    if (!requireAuth) return next();

    // 1. Service-to-service tokens (X-Service-Token and X-Internal-Token)
    const svcToken = req.headers['x-service-token'];
    const intToken = req.headers['x-internal-token'];
    if ((svcToken && svcToken === serviceToken) || (intToken && intToken === serviceToken)) {
      req.auth = { type: 'service', service: 'policy-os', role: 'admin' };
      return next();
    }

    // 2. Bearer token (HS256 JWT only)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await verifyToken(token);
      if (result.valid) {
        req.auth = { type: 'token', ...result.payload };
        return next();
      }
    }

    // 3. API key (issued at runtime and registered in policy-os)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKeysStore) {
      const keyData = apiKeysStore.get(apiKey);
      if (keyData && (!keyData.expiresAt || keyData.expiresAt > Date.now())) {
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
  // Generate a cryptographically random service token (not base64 JSON)
  return `svc_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}
