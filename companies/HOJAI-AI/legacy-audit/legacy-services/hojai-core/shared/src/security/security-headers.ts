/**
 * HOJAI AI - Security Headers Middleware
 * 
 * Sets HTTP security headers for production security
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean;
  strictTransportSecurity?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions?: boolean;
  xssProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

const defaultConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: true,
  strictTransportSecurity: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
};

export function securityHeaders(config: SecurityHeadersConfig = {}) {
  const opts = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Content Security Policy
    if (opts.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://*.hojai.ai https://*.rabtul.com",
        "frame-ancestors 'none'",
      ].join('; '));
    }

    // HTTP Strict Transport Security
    if (opts.strictTransportSecurity) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // X-Frame-Options
    if (opts.xFrameOptions) {
      res.setHeader('X-Frame-Options', opts.xFrameOptions);
    }

    // X-Content-Type-Options
    if (opts.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // XSS Protection (legacy but still useful)
    if (opts.xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (opts.referrerPolicy) {
      res.setHeader('Referrer-Policy', opts.referrerPolicy);
    }

    // Permissions Policy
    if (opts.permissionsPolicy) {
      res.setHeader('Permissions-Policy', opts.permissionsPolicy);
    }

    // Remove server header
    res.removeHeader('X-Powered-By');

    next();
  };
}

export default securityHeaders();
