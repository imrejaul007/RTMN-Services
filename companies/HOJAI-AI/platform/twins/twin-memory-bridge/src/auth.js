/**
 * Thin re-export shim for twin-memory-bridge (ESM).
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
 * Default middleware instance for twin-memory-bridge. /api/auth/toggle is
 * always public so the e2e smoke tests can flip REQUIRE_AUTH at runtime.
 */
export const requireAuthMw = createCorpIdAuthMiddleware({
  publicPaths: ['/health', '/', '/api/auth/toggle'],
});

/**
 * Per-route alias — same function reference as `requireAuthMw`. Kept for
 * parity with how the service was originally wired (global + per-route).
 */
export const requireAuth = requireAuthMw;
