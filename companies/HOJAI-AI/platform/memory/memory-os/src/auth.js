/**
 * Memory services auth — thin shim that delegates to @rtmn/shared/auth.
 * See auth.cjs for the original CommonJS source.
 */

const { createCorpIdAuthMiddleware, setRequireAuth, getRequireAuth } = await import('@rtmn/shared/auth');

const PUBLIC_PATHS = [
  '/health',
  '/',
  '/api/services',
  '/api/memory/types',
  '/api/memory/importance-levels',
  '/api/memory/lifecycle-stages',
  '/api/auth/toggle',
];

function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

const requireAuthMw = createCorpIdAuthMiddleware({ publicPaths: PUBLIC_PATHS });
const requireAuth = requireAuthMw;

export {
  requireAuthMw,
  requireAuth,
  extractToken,
  setRequireAuth,
  getRequireAuth,
  PUBLIC_PATHS,
};