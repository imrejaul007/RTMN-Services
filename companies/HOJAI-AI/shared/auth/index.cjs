/**
 * RTMN Auth Module - Universal Authentication (CJS)
 *
 * CJS mirror of auth/index.js. Auto-loaded by Node when a CJS file does
 *   require('@rtmn/shared/auth')
 * thanks to the package.json `exports` condition map.
 *
 * Keep this file in sync with auth/index.js. The two files are intentionally
 * duplicate-and-adapt (rather than sharing source via a build step) so that
 * the CJS path is fully readable in isolation and has no transpiler dep.
 */

const sessions = new Map();
const apiKeys = new Map();

// =============================================================================
// CORPID-BACKED AUTH (real JWT verification)
// =============================================================================
//
// CJS mirror of the createCorpIdAuthMiddleware helper in index.js. See the
// ESM file for full documentation.

function createCorpIdAuthMiddleware(options) {
  options = options || {};
  const corpidUrl = options.corpidUrl || process.env.CORPID_URL || 'http://localhost:4702';
  const publicPaths = options.publicPaths || [];
  const publicPathPatterns = options.publicPathPatterns || [];
  const cacheTtlMs = options.cacheTtlMs || 60000;
  const timeoutMs = options.timeoutMs || 3000;
  const requireAuthEnv = options.requireAuthEnv || 'REQUIRE_AUTH';

  const PUBLIC = new Set(publicPaths);
  const cache = new Map();

  function isAuthRequired() { return process.env[requireAuthEnv] === 'true'; }
  function isPublic(req) {
    if (PUBLIC.has(req.path)) return true;
    for (let i = 0; i < publicPathPatterns.length; i++) {
      if (publicPathPatterns[i].test(req.path)) return true;
    }
    return false;
  }

  async function verifyToken(token) {
    const cached = cache.get(token);
    if (cached && Date.now() - cached.ts < cacheTtlMs) return cached.user;
    cache.delete(token);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(corpidUrl + '/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
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

  middleware.verifyToken = verifyToken;
  middleware.extractToken = extractToken;
  middleware.isAuthRequired = isAuthRequired;
  middleware.isPublic = isPublic;
  middleware.clearCache = () => cache.clear();
  middleware.cacheSize = () => cache.size;

  return middleware;
}

function setRequireAuth(on, envName) {
  envName = envName || 'REQUIRE_AUTH';
  process.env[envName] = on ? 'true' : 'false';
}
function getRequireAuth(envName) {
  envName = envName || 'REQUIRE_AUTH';
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

function createAuthMiddleware(options = {}) {
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
      // Token presented but doesn't match — reject (don't fall through).
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

const requireAuth = createAuthMiddleware({ required: true });

function createIndustryAuth(industry, industryConfig = {}) {
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
        if (session.owner && session.owner.email === email) {
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

    hasPermission(userRole, requiredRole) {
      const roleHierarchy = ['owner', 'manager', 'staff', 'customer'];
      const userLevel = roleHierarchy.indexOf(userRole);
      const requiredLevel = roleHierarchy.indexOf(requiredRole);
      return userLevel <= requiredLevel;
    },

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

const auth = {
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

// =============================================================================
// TENANT CONTEXT (ADR-0009 Phase 1 multi-tenancy)
// =============================================================================
//
// CJS mirror of createTenantContext in index.js. See the ESM file for full
// documentation. Same behaviour; works with both req.user (CorpID JWT) and
// req.auth (simple token middleware).

function createTenantContext(options) {
  options = options || {};
  const publicPaths = options.publicPaths || [];
  const publicPathPatterns = options.publicPathPatterns || [];
  const requireTenantEnv = options.requireTenantEnv || 'REQUIRE_TENANT';
  const allowHeaderFallbackEnv = options.allowHeaderFallbackEnv || 'ALLOW_HEADER_TENANT';

  const PUBLIC = new Set(publicPaths);
  const PATTERNS = publicPathPatterns;

  function isTenantRequired() { return process.env[requireTenantEnv] === 'true'; }
  function isHeaderFallback() { return process.env[allowHeaderFallbackEnv] === 'true'; }
  function isPublic(req) {
    if (PUBLIC.has(req.path)) return true;
    for (let i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i].test(req.path)) return true;
    }
    return false;
  }

  function resolveFromAuth(req) {
    if (req.user && req.user.businessId) {
      return { companyId: req.user.businessId, source: 'jwt-user' };
    }
    if (req.auth) {
      if (req.auth.businessId) {
        return { companyId: req.auth.businessId, source: 'auth-' + (req.auth.type || 'token') };
      }
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

  middleware.resolveFromAuth = resolveFromAuth;
  middleware.resolveFromHeader = resolveFromHeader;
  middleware.isTenantRequired = isTenantRequired;
  middleware.isHeaderFallback = isHeaderFallback;
  return middleware;
}

function getTenant(req) { return req && req.tenant; }

function requireTenant(req, res, next) {
  if (req.tenant) return next();
  return res.status(400).json({
    success: false,
    error: 'TENANT_REQUIRED',
    message: 'No tenant on request',
  });
}

module.exports = {
  createAuthMiddleware,
  requireAuth,
  createToken,
  verifyToken,
  generateApiKey,
  createIndustryAuth,
  createCorpIdAuthMiddleware,
  setRequireAuth,
  getRequireAuth,
  createTenantContext,
  getTenant,
  requireTenant,
  auth,
};
