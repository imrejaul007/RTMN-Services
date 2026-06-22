/**
 * Thin re-export shim for memory-confidence (ESM).
 *
 * The real auth implementation lives in `@rtmn/shared/auth`. We keep this
 * shim so consumers can `import ... from './auth.js'` without caring whether
 * the middleware is local or shared, and so we have a single place to add
 * service-specific helpers later (e.g. route-scoped public-paths).
 */

export {
  createCorpIdAuthMiddleware,
  setRequireAuth,
  getRequireAuth,
} from '@rtmn/shared/auth';

import { createCorpIdAuthMiddleware } from '@rtmn/shared/auth';

/**
 * Default middleware instance for memory-confidence. Public paths here are
 * intentionally minimal — anything that should be reachable without a token
 * belongs in this allowlist. The /api/auth/toggle route is needed by the
 * e2e smoke tests so they can flip REQUIRE_AUTH without a restart.
 */
export const requireAuthMw = createCorpIdAuthMiddleware({
  publicPaths: ['/health', '/', '/api/services', '/api/auth/toggle'],
});

/**
 * Per-route alias. Calling `requireAuth` is identical to calling
 * `requireAuthMw` (same function reference) — kept for parity with how the
 * service was originally wired (global middleware + per-route guard).
 */
export const requireAuth = requireAuthMw;
