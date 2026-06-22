/**
 * Memory services auth — thin shim that delegates to @rtmn/shared/auth.
 *
 * History:
 *   - Phase 5 (June 21, 2026): local CorpID-backed auth module was added.
 *   - Phase 5.1 (June 21, 2026): that logic was promoted into the shared
 *     module as `createCorpIdAuthMiddleware`. This file is now just a shim
 *     that constructs the middleware with memory-os-specific public paths
 *     and re-exports it as `requireAuthMw` / `requireAuth` so the rest of
 *     memory-os doesn't have to change its import statements.
 *
 * Public paths:
 *   - /health and / are always open (Express default)
 *   - /api/services and the memory metadata endpoints stay open so clients
 *     can introspect the schema without a token
 *   - /api/auth/toggle is open so /api/auth/toggle itself can be called
 *     without a token (it flips REQUIRE_AUTH)
 */

const { createCorpIdAuthMiddleware, setRequireAuth, getRequireAuth } = require('@rtmn/shared/auth');

const PUBLIC_PATHS = [
  '/health',
  '/',
  '/api/services',
  '/api/memory/types',
  '/api/memory/importance-levels',
  '/api/memory/lifecycle-stages',
  '/api/auth/toggle',
];

// Shared helper: token extraction. Re-exported so older call sites still work.
function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

// Same middleware used both globally (`app.use`) and per-route
// (`app.post(path, requireAuth, ...)`). Identity is intentional — the local
// auth module historically returned two references to the same function.
const requireAuthMw = createCorpIdAuthMiddleware({ publicPaths: PUBLIC_PATHS });
const requireAuth = requireAuthMw;

module.exports = {
  requireAuthMw,
  requireAuth,
  extractToken,
  setRequireAuth,
  getRequireAuth,
  PUBLIC_PATHS: new Set(PUBLIC_PATHS),
};