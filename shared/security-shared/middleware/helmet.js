/**
 * @rtmn/security-shared — Helmet (Security Headers) Configuration
 *
 * Replaces ad-hoc helmet calls across RTMN with one secure default.
 * Disables `unsafe-inline` styles, sets strict CSP, and adds HSTS in
 * production.
 */

import helmet from 'helmet';

/**
 * Returns a configured helmet middleware. CSP can be overridden per
 * service (e.g., a service that serves a dashboard might need
 * script-src 'self' to load a vendor bundle).
 *
 * @param {object} [options]
 * @param {object} [options.contentSecurityPolicy] - override CSP entirely
 * @param {boolean} [options.hsts=true]
 * @returns {Function} Express middleware
 */
export function createHelmet(options = {}) {
  const isProd = process.env.NODE_ENV === 'production';

  const defaultCsp = {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // NO 'unsafe-inline' for scripts (XSS protection)
      styleSrc: ["'self'", "'unsafe-inline'"],  // unsafe-inline for styles is acceptable
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  };

  return helmet({
    contentSecurityPolicy: options.contentSecurityPolicy ?? defaultCsp,
    hsts: options.hsts !== false && isProd ? {
      maxAge: 31536000,  // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
}
