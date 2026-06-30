/**
 * Internal-service authentication middleware.
 *
 * Downstream services should call this middleware to verify that incoming
 * requests actually originated from the trusted Hub. The Hub stamps
 * every proxied request with `x-internal-token: <INTERNAL_SERVICE_TOKEN>`
 * (configured via the Hub's env), so a service that checks this header
 * can refuse to accept direct hits from untrusted callers.
 *
 * Behavior:
 *   - If `INTERNAL_SERVICE_TOKEN` env is unset on THIS service, the
 *     middleware is a no-op (dev mode). A warning is logged once.
 *   - If set, requests must carry `x-internal-token: <matching value>`.
 *   - Skips `/health` and `/ready` so orchestrators can probe freely.
 *
 * Pair with the Hub's `requireHubAuth` middleware on the other side.
 */

import { Request, Response, NextFunction } from 'express';

export interface InternalAuthOptions {
  token?: string;
  silent?: boolean;
}

let warnedAboutDisabledAuth = false;

function warnOnce(silent?: boolean) {
  if (silent || warnedAboutDisabledAuth) return;
  warnedAboutDisabledAuth = true;
  console.warn(
    '[InternalAuth] WARNING: INTERNAL_SERVICE_TOKEN is not set — internal auth is DISABLED. ' +
      'Set INTERNAL_SERVICE_TOKEN in production so downstream services can verify the Hub.',
  );
}

/**
 * Express middleware factory. Use as:
 *   app.use(createRequireInternalAuth({ token: process.env.INTERNAL_SERVICE_TOKEN }));
 */
export function createRequireInternalAuth(opts: InternalAuthOptions) {
  const token = opts.token;
  const silent = opts.silent ?? false;

  return function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
    // Health probes are always public
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    // No token configured → dev mode, accept everything
    if (!token) {
      if (!silent) warnOnce(silent);
      return next();
    }

    // Check the header
    const provided = req.headers['x-internal-token'];
    if (provided === token) {
      return next();
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'INTERNAL_AUTH_REQUIRED',
        message: 'This endpoint requires a valid x-internal-token header',
        hint: 'Requests must originate from the RTMN Hub or another trusted service.',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  };
}

/** Default middleware that reads INTERNAL_SERVICE_TOKEN from env. */
export const requireInternalAuth = createRequireInternalAuth({
  token: process.env.INTERNAL_SERVICE_TOKEN,
});
