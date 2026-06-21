/**
 * @rtmn/security-shared — CORS Configuration
 *
 * Fixes the audit's "wildcard CORS with credentials" pattern. The default
 * CORS in cors/Express allows `origin: '*'` with `credentials: true` if
 * you pass them together, but browsers reject this combination AND it
 * silently misbehaves on every request.
 *
 * Strict rules enforced here:
 *  - In production, CORS_ORIGIN env var MUST be set.
 *  - Wildcard origin is NEVER allowed with credentials.
 *  - Wildcard origin is only allowed if credentials are false.
 *  - The allowed headers are an explicit allowlist (not reflection).
 *  - The allowed methods are an explicit allowlist.
 *  - Preflight responses are cached for 1 hour.
 */

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Internal-Token',
  'X-Request-ID',
  'X-Company-ID',
  'X-Tenant-ID',
];
const MAX_AGE_SECONDS = 3600;

/**
 * Build a CORS middleware. Reads CORS_ORIGIN from env (comma-separated).
 * Throws at startup if the config is invalid for production.
 *
 * @param {object} [options]
 * @param {boolean} [options.credentials=false] - allow cookies
 * @param {string[]} [options.allowedHeaders] - override the header list
 * @returns {Function} Express middleware factory
 */
export function createCors(options = {}) {
  const { credentials = false, allowedHeaders = ALLOWED_HEADERS } = options;

  // Resolve origin at startup
  const originEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
  let origin;

  if (!originEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[security-shared] CORS_ORIGIN env var is required in production. ' +
        'Set it to a comma-separated list of allowed origins ' +
        '(e.g., "https://app.example.com,https://admin.example.com").'
      );
    }
    // Dev: allow localhost on common ports
    origin = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:8080',
    ];
  } else {
    origin = originEnv.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Reject the dangerous combination
  if (origin.includes('*') && credentials) {
    throw new Error(
      '[security-shared] CORS_ORIGIN cannot include "*" when credentials=true. ' +
      'This is rejected by browsers and silently misbehaves.'
    );
  }

  return (req, res, next) => {
    const requestOrigin = req.headers.origin;
    let allowedOrigin = '';

    if (origin === '*') {
      allowedOrigin = '*';
    } else if (Array.isArray(origin)) {
      if (origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    } else if (origin === requestOrigin) {
      allowedOrigin = requestOrigin;
    }

    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(','));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
      res.setHeader('Access-Control-Max-Age', String(MAX_AGE_SECONDS));
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  };
}
