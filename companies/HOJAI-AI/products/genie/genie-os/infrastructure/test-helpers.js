/**
 * Shared test helpers for genie-os services.
 *
 * Usage:
 *   import { authHeaders } from '../../../infrastructure/test-helpers.js';
 *   const H = authHeaders();
 *   fetch(url, { headers: { ...H } });
 */

import { createToken } from '@rtmn/shared/auth';

/**
 * Build standard auth headers for inter-service test calls.
 * Sends both:
 *   - x-internal-token: so reqI() middleware passes
 *   - authorization:    a Bearer JWT so requireAuth() middleware passes
 *
 * The JWT_SECRET env var is set by test-all.js; tests can override
 * JWT_SECRET in the env if they want a different signing key.
 */
export function authHeaders(overrides = {}) {
  const token = createToken({
    userId: overrides.userId || 'TEST-USER-1',
    businessId: overrides.businessId || 'TEST-BIZ-1',
    industry: overrides.industry || 'test',
    role: overrides.role || 'owner',
  });
  // INTERNAL_SERVICE_TOKEN is set by test-all.js (and by .env in dev). No
  // hardcoded fallback here — matches the flowos service-side contract and
  // closes the C-5 audit finding for test paths.
  if (!process.env.INTERNAL_SERVICE_TOKEN) {
    throw new Error('INTERNAL_SERVICE_TOKEN env var is required to build auth headers (set it in .env or in your test runner)');
  }
  return {
    'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
    authorization: `Bearer ${token}`,
    ...(overrides.extra || {}),
  };
}