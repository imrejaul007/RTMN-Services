/**
 * RTMN Auth Module - Universal Authentication (ESM)
 *
 * Provides authentication for all Industry OS services.
 * Uses CorpID as the universal identity provider.
 *
 * Usage:
 *   import { requireAuth, createAuthMiddleware } from '@rtmn/shared/auth';
 *
 * Roles:
 *   - owner:   Full access to their business
 *   - manager: Manage operations
 *   - staff:   Basic operations
 *   - customer: Public access
 *
 * For services that need to validate real JWTs against CorpID (the Memory
 * Layer, TwinOS, etc.), use createCorpIdAuthMiddleware instead:
 *
 *   import { createCorpIdAuthMiddleware } from '@rtmn/shared/auth';
 *   const requireAuthMw = createCorpIdAuthMiddleware({ publicPaths: ['/health', '/'] });
 *   app.use(requireAuthMw);
 */

const sessions = new Map();
const apiKeys = new Map();

// =============================================================================
// CORPID-BACKED AUTH (real JWT verification)
// =============================================================================
//
// Verifies JWT bearer tokens by calling CorpID's /auth/verify endpoint over
// HTTP. Caches verifications in-process so high-traffic services don't hammer
// CorpID on every request. A toggle (REQUIRE_AUTH env var) lets dev / test
// environments disable auth without removing the middleware.

/**
 * Create a middleware that validates JWTs against CorpID.
 *
 * @param {object} options
 * @param {string} [options.corpidUrl]         Base URL of CorpID (default: http://localhost:4702)
 * @param {string[]} [options.publicPaths]    Paths that bypass auth (always: exact match)
 * @param {RegExp[]} [options.publicPathPatterns] Paths that bypass auth (regex)
 * @param {number} [options.cacheTtlMs=60000]  In-process verification cache TTL
 * @param {number} [options.timeoutMs=3000]   CorpID /auth/verify timeout
 * @param {string} [options.requireAuthEnv='REQUIRE_AUTH']
 *                                           Env var name; 'true' => require auth, anything else => disabled
 * @returns {Function} Express middleware (req, res, next)
 */
export function createCorpIdAuthMiddleware(options = {}) {
  const {
    corpidUrl = process.env.CORPID_URL || 'http://localhost:4702',
    publicPaths = [],
    publicPathPatterns = [],
    cacheTtlMs = 60_000,
    timeoutMs = 3_000,
    requireAuthEnv = 'REQUIRE_AUTH',
  } = options;

  const PUBLIC = new Set(publicPaths);
  const cache = new Map();

  function isAuthRequired() { return process.env[requireAuthEnv] === 'true'; }
  function isPublic(req) {
    if (PUBLIC.has(req.path)) return true;
    for (const re of publicPathPatterns) if (re.test(req.path)) return true;
    return false;
  }

  async function verifyToken(token) {
    const cached = cache.get(token);
    if (cached && Date.now() - cached.ts < cacheTtlMs) return cached.user;
    cache.delete(token);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(`${corpidUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!r.ok) return null;
      const j = await r.json();
      if (!j.success) return null;
      const user = j.user || j.data || j;
      cache.set(token, { ts: Date.now(), user });
      return user;
    } catch (e) { return null; }
  }

  function extractToken(req) {
    const h = req.headers.authorization || req.headers.Authorization;
    if (!h) return null;
    const m = /^Bearer\s+(.+)$/i.exec(h);
    return m ? m[1] : null;
  }

  function middleware(req, res, next) {
    if (!isAuthRequired()) return next();
    if (isPublic(req)) return next();
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'AUTH_REQUIRED', message: 'Bearer token required' });
    }
    verifyToken(token).then(user => {
      if (!user) {
        return res.status(401).json({ success: false, error: 'AUTH_INVALID', message: 'invalid or expired token' });
      }
      req.user = user;
      next();
    }).catch(() => {
      res.status(503).json({ success: false, error: 'AUTH_SERVICE_DOWN', message: 'CorpID unreachable' });
    });
  }

  // Attach helpers so consumers can introspect or clear the cache.
  middleware.verifyToken = verifyToken;
  middleware.extractToken = extractToken;
  middleware.isAuthRequired = isAuthRequired;
  middleware.isPublic = isPublic;
  middleware.clearCache = () => cache.clear();
  middleware.cacheSize = () => cache.size;

  return middleware;
}

/**
 * Convenience helpers around the REQUIRE_AUTH env var.
 * `setRequireAuth(true)` flips the env var in-process so the middleware
 * starts/stops requiring auth on subsequent requests (no restart needed).
 */
export function setRequireAuth(on, envName = 'REQUIRE_AUTH') {
  process.env[envName] = on ? 'true' : 'false';
}
export function getRequireAuth(envName = 'REQUIRE_AUTH') {
  return process.env[envName] === 'true';
}

function createToken(payload, expiresIn = 86400000) {
  const token = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + expiresIn,
  })).toString('base64');
  return token;
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

function generateApiKey(industry, businessId) {
  const key = `${industry.toUpperCase()}_${businessId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  apiKeys.set(key, { industry, businessId, created: Date.now() });
  return key;
}

export function createAuthMiddleware(options = {}) {
  const { required = true, roles = ['owner', 'manager', 'staff', 'customer'] } = options;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    const internalToken = req.headers['x-internal-token'];
    const expectedInternal = process.env.INTERNAL_SERVICE_TOKEN;

    // Service-to-service: accept x-internal-token first (matches the
    // security-shared/middleware/require-auth.js behavior used by the rest
    // of RTMN). Required so genie runtime can call these specialists.
    if (internalToken && expectedInternal) {
      if (internalToken === expectedInternal) {
        req.auth = { type: 'service', id: 'system' };
        return next();
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid internal token',
      });
    }

    if (apiKey) {
      const keyData = apiKeys.get(apiKey);
      if (keyData) {
        req.auth = { type: 'api-key', ...keyData };
        return next();
      }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = verifyToken(token);
      if (result.valid) {
        req.auth = { type: 'token', ...result.payload };
        return next();
      }
    }

    if (required) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        hint: 'Send Authorization: Bearer <token> or X-API-Key: <key>',
      });
    }

    next();
  };
}

export const requireAuth = createAuthMiddleware({ required: true });

// Exported so test helpers (and any service that needs to mint a token for an
// already-authenticated internal caller) can construct a JWT-style token
// without having to re-implement the base64/exp encoding.
export { createToken, verifyToken, generateApiKey };

// =============================================================================
// TENANT CONTEXT (ADR-0009 Phase 1 multi-tenancy)
// =============================================================================
//
// Every SUTAR service (and any other multi-tenant RTMN service) needs to
// resolve the calling companyId before doing any data work. This middleware
// reads it from the verified auth context (req.user for CorpID-backed JWTs,
// req.auth for the simple token middleware) and stuffs it on req.tenant so
// downstream handlers can do `const { companyId } = req.tenant;` without
// re-implementing the lookup.
//
// Options:
//   publicPaths         exact-match paths that skip tenant resolution
//   publicPathPatterns  regex paths that skip tenant resolution
//   requireTenantEnv    env var name; 'true' => reject if no tenant
//   allowHeaderFallback if true, accept X-Company-Id header when no auth
//                       (dev/test only; off in production)
//
// Behaviour:
//   - REQUIRE_TENANT=false (default) => req.tenant may be undefined; callers
//     must handle the "no tenant" case (typically by treating it as the
//     'default' tenant or 403-ing the request themselves).
//   - REQUIRE_TENANT=true            => missing tenant returns 400 TENANT_REQUIRED.
//   - ALLOW_HEADER_TENANT=true       => missing auth falls back to X-Company-Id
//     header (useful for service-to-service calls that carry tenant but not JWT).
//
// Example:
//   import { requireAuth, createTenantContext } from '@rtmn/shared/auth';
//   app.use(requireAuth);
//   app.use(createTenantContext({ publicPaths: ['/health'] }));
//
//   app.post('/api/v1/decide', (req, res) => {
//     const { companyId } = req.tenant;
//     // ...tenant-scoped business logic
//   });
//
// Test helpers:
//   getTenant(req)                   returns req.tenant or undefined
//   requireTenant(req, res, next)    same as middleware but synchronous

export function createTenantContext(options = {}) {
  const {
    publicPaths = [],
    publicPathPatterns = [],
    requireTenantEnv = 'REQUIRE_TENANT',
    allowHeaderFallbackEnv = 'ALLOW_HEADER_TENANT',
  } = options;

  const PUBLIC = new Set(publicPaths);
  const PATTERNS = publicPathPatterns;

  function isTenantRequired() { return process.env[requireTenantEnv] === 'true'; }
  function isHeaderFallback() { return process.env[allowHeaderFallbackEnv] === 'true'; }
  function isPublic(req) {
    if (PUBLIC.has(req.path)) return true;
    for (const re of PATTERNS) if (re.test(req.path)) return true;
    return false;
  }

  function resolveFromAuth(req) {
    // CorpID-backed JWT middleware sets req.user with businessId
    if (req.user && req.user.businessId) {
      return { companyId: req.user.businessId, source: 'jwt-user' };
    }
    // Simple token middleware sets req.auth (type: 'token' | 'api-key' | 'service')
    if (req.auth) {
      if (req.auth.businessId) {
        return { companyId: req.auth.businessId, source: `auth-${req.auth.type || 'token'}` };
      }
      // Service-to-service internal tokens have no tenant by design
      if (req.auth.type === 'service') return null;
    }
    return null;
  }

  function resolveFromHeader(req) {
    const h = req.headers['x-company-id'] || req.headers['X-Company-Id'];
    if (!h) return null;
    const trimmed = String(h).trim();
    return trimmed ? { companyId: trimmed, source: 'header' } : null;
  }

  function middleware(req, res, next) {
    if (isPublic(req)) return next();

    let tenant = resolveFromAuth(req);
    if (!tenant && isHeaderFallback()) tenant = resolveFromHeader(req);

    if (!tenant && isTenantRequired()) {
      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'No tenant could be resolved from JWT or X-Company-Id header',
      });
    }

    if (tenant) req.tenant = tenant;
    next();
  }

  // Introspection helpers (useful for tests and admin tools)
  middleware.resolveFromAuth = resolveFromAuth;
  middleware.resolveFromHeader = resolveFromHeader;
  middleware.isTenantRequired = isTenantRequired;
  middleware.isHeaderFallback = isHeaderFallback;

  return middleware;
}

/** Read tenant off a request. Returns undefined if no tenant was resolved. */
export function getTenant(req) {
  return req && req.tenant;
}

/** Synchronous guard for use inside route handlers (e.g. legacy code paths
 *  that already have req and want to 403 if no tenant). */
export function requireTenant(req, res, next) {
  if (req.tenant) return next();
  return res.status(400).json({
    success: false,
    error: 'TENANT_REQUIRED',
    message: 'No tenant on request',
  });
}

export function createIndustryAuth(industry, industryConfig = {}) {
  const {
    defaultRole = 'customer',
    allowedRoles = ['owner', 'manager', 'staff', 'customer'],
  } = industryConfig;

  return {
    industry,
    allowedRoles,

    async registerBusiness(businessData) {
      const businessId = `BIZ_${industry.toUpperCase()}_${Date.now()}`;
      const ownerId = `OWN_${industry.toUpperCase()}_${Date.now()}`;

      const business = {
        id: businessId,
        ownerId,
        industry,
        name: businessData.name,
        email: businessData.email,
        phone: businessData.phone,
        address: businessData.address,
        status: 'active',
        plan: businessData.plan || 'starter',
        createdAt: new Date().toISOString(),
      };

      const owner = {
        id: ownerId,
        businessId,
        industry,
        role: 'owner',
        email: businessData.email,
        name: businessData.ownerName || businessData.name,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const apiKey = generateApiKey(industry, businessId);
      const token = createToken({
        userId: ownerId,
        businessId,
        industry,
        role: 'owner',
      });

      sessions.set(ownerId, { business, owner, token });

      return {
        success: true,
        business,
        owner,
        apiKey,
        token,
        endpoints: {
          health: `http://localhost:${businessData.port || 5010}/health`,
          api: `http://localhost:${businessData.port || 5010}/api`,
        },
      };
    },

    async login(email, _password) {
      for (const [userId, session] of sessions) {
        if (session.owner?.email === email) {
          const token = createToken({
            userId,
            businessId: session.business.id,
            industry,
            role: session.owner.role,
          });
          session.token = token;
          return {
            success: true,
            token,
            user: { id: userId, email, role: session.owner.role },
          };
        }
      }
      return { success: false, error: 'Invalid credentials' };
    },

    verifyToken,
    createCustomerToken(customerId, businessId) {
      return createToken({
        userId: customerId,
        businessId,
        industry,
        role: 'customer',
      });
    },
    middleware: createAuthMiddleware({ required: false }),
  };
}

export const auth = {
  restaurant: createIndustryAuth('restaurant', { port: 5010 }),
  hotel: createIndustryAuth('hotel', { port: 5025 }),
  healthcare: createIndustryAuth('healthcare', { port: 5020 }),
  retail: createIndustryAuth('retail', { port: 5030 }),
  legal: createIndustryAuth('legal', { port: 5035 }),
  hospitality: createIndustryAuth('hospitality', { port: 5050 }),
  education: createIndustryAuth('education', { port: 5060 }),
  automotive: createIndustryAuth('automotive', { port: 5080 }),
  beauty: createIndustryAuth('beauty', { port: 5090 }),
  fitness: createIndustryAuth('fitness', { port: 5110 }),
  manufacturing: createIndustryAuth('manufacturing', { port: 5150 }),
  realestate: createIndustryAuth('realestate', { port: 5230 }),
  agent: createIndustryAuth('agent-twin', { port: 3011 }),
  area: createIndustryAuth('area-twin', { port: 3012 }),
  buyer: createIndustryAuth('buyer-twin', { port: 3013 }),
  deal: createIndustryAuth('deal-twin', { port: 3014 }),
  property: createIndustryAuth('property-twin', { port: 3015 }),
  referral: createIndustryAuth('referral-twin', { port: 3016 }),
};