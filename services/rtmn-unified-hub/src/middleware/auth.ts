/**
 * Authentication middleware for the RTMN Unified Hub.
 *
 * The Hub is a single entry point for 100+ downstream services — by default
 * we keep `/health` and `/ready` open so external load balancers and
 * orchestrators can probe the Hub without credentials, but every other
 * request requires either:
 *
 *   1. A static API key in `Authorization: Bearer <key>`, OR
 *   2. An `x-internal-token` header matching `INTERNAL_SERVICE_TOKEN`
 *      (used for trusted service-to-service calls).
 *
 * The API key is read from `HUB_API_KEY`. If unset, auth is **disabled**
 * (with a console warning). This preserves dev-ergonomics while letting
 * prod enable auth with a single env var.
 *
 * To enable auth in production, set `HUB_API_KEY` to a long random string
 * and distribute it to clients via your secrets manager.
 */

import { Request, Response, NextFunction } from 'express';

export interface HubAuthOptions {
  apiKey?: string;
  internalServiceToken?: string;
  /** Override for testing — when true, skips the "auth disabled" warning */
  silent?: boolean;
}

let warnedAboutDisabledAuth = false;

function warnOnceAboutDisabledAuth() {
  if (warnedAboutDisabledAuth) return;
  warnedAboutDisabledAuth = true;
  console.warn(
    '[Hub] WARNING: HUB_API_KEY is not set — authentication is DISABLED. ' +
      'Set HUB_API_KEY in production to protect proxied routes.',
  );
}

/**
 * Express middleware factory that enforces bearer-token auth on protected routes.
 * Skips `/health` and `/ready` (always public for orchestrators).
 *
 * Use `requireHubAuth` to read from process.env (production), or
 * `createRequireHubAuth({...})` for explicit options (testing).
 */
export function createRequireHubAuth(opts: HubAuthOptions) {
  const apiKey = opts.apiKey;
  const internalToken = opts.internalServiceToken;
  const silent = opts.silent ?? false;

  return function requireHubAuth(req: Request, res: Response, next: NextFunction) {
    // Always allow health probes
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    // If no API key configured, auth is disabled (dev mode)
    if (!apiKey) {
      if (!silent) warnOnceAboutDisabledAuth();
      return next();
    }

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === apiKey) {
        return next();
      }
    }

    // Check internal service token (for service-to-service calls)
    if (internalToken && req.headers['x-internal-token'] === internalToken) {
      return next();
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid bearer token required',
        hint: apiKey
          ? 'Pass Authorization: Bearer <HUB_API_KEY>'
          : 'Hub is running with auth disabled (HUB_API_KEY not set)',
      },
      meta: { timestamp: new Date().toISOString() },
    });
  };
}

/**
 * Default middleware that reads HUB_API_KEY and INTERNAL_SERVICE_TOKEN from env.
 * In production, set HUB_API_KEY. In dev, leaving it unset disables auth.
 */
export const requireHubAuth = createRequireHubAuth({
  apiKey: process.env.HUB_API_KEY,
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN,
});
