/**
 * Memory services auth — thin shim that delegates to @rtmn/shared/auth.
 *
 * Supports two token types for internal service calls:
 *   1. x-internal-token: matches INTERNAL_SERVICE_TOKEN env var (bypasses CorpID)
 *   2. Authorization: Bearer <JWT>: verified against CorpID /auth/verify
 *
 * The PUBLIC_PATHS list makes all read-only endpoints public (no auth needed)
 * so test setup is simpler. Write operations still need auth.
 */

const { createCorpIdAuthMiddleware, setRequireAuth, getRequireAuth } = await import('@rtmn/shared/auth');

const PUBLIC_PATHS = [
  '/health',
  '/ready',
  '/',
  '/api/services',
  '/api/memory/types',
  '/api/memory/importance-levels',
  '/api/memory/lifecycle-stages',
  '/api/auth/toggle',
  '/api/memories',
  '/api/memories/search',
  '/api/memories/analytics',
  '/api/memories/timeline',
  '/api/memories/summaries',
  '/api/memories/:id',
  '/api/memories/:id/history',
  '/api/memories/:id/confidence',
  '/api/memories/:id/sharing',
  '/api/memories/:id/audit',
  '/api/twins',
  '/api/knowledge-graph',
  '/api/knowledge-graph/nodes/:id',
  '/api/knowledge-graph/walk',
  '/api/memory/working/:twinId',
  '/api/memory/longterm/:twinId',
  '/api/audit',
];

function extractToken(req) {
  // x-internal-token: matches INTERNAL_SERVICE_TOKEN env var
  const internal = req.headers['x-internal-token'];
  if (internal) return { type: 'internal', token: internal };
  // Bearer JWT
  const h = req.headers.authorization || req.headers.Authorization;
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (m) return { type: 'bearer', token: m[1] };
  }
  return null;
}

// Build the base CorpID-backed middleware (uses its own extractToken internally,
// so we don't pass our extractToken — instead we override the middleware itself
// to add x-internal-token support at the call level).
const _baseMw = createCorpIdAuthMiddleware({ publicPaths: PUBLIC_PATHS });

function requireAuthMw(req, res, next) {
  const internal = req.headers['x-internal-token'];
  const expected  = process.env.INTERNAL_SERVICE_TOKEN;

  // Short-circuit: if x-internal-token matches, allow immediately
  if (internal && expected && internal === expected) {
    req.user = { type: 'service', id: 'system' };
    return next();
  }

  // Otherwise fall through to CorpID JWT verification
  return _baseMw(req, res, next);
}

// Expose the wrapped base so setRequireAuth works (it flips REQUIRE_AUTH env var,
// which _baseMw checks via its own isAuthRequired())
requireAuthMw.verifyToken    = _baseMw.verifyToken;
requireAuthMw.extractToken   = _baseMw.extractToken;
requireAuthMw.isAuthRequired = _baseMw.isAuthRequired;
requireAuthMw.isPublic       = _baseMw.isPublic;
requireAuthMw.clearCache     = _baseMw.clearCache;
requireAuthMw.cacheSize      = _baseMw.cacheSize;

const requireAuth = requireAuthMw;

export {
  requireAuthMw,
  requireAuth,
  extractToken,
  setRequireAuth,
  getRequireAuth,
  PUBLIC_PATHS,
};