/**
 * RTMN Shared Env Validation Module
 *
 * Fail-fast validation of required environment variables at service startup.
 *
 * Usage:
 *   import { requireEnv, validateEnv } from '@rtmn/shared/lib/env';
 *
 *   // Option 1: hard-fail (process exits if any var is missing)
 *   requireEnv(['PORT', 'JWT_SECRET', 'MONGODB_URI']);
 *
 *   // Option 2: return a result object without exiting
 *   const result = validateEnv(['PORT', 'JWT_SECRET']);
 *   if (!result.ok) {
 *     console.error('Missing:', result.missing);
 *     return res.status(503).json({ error: 'service-misconfigured' });
 *   }
 *
 * Best practice: call this at the very top of src/index.js, BEFORE any
 * service-specific initialization. This prevents the service from accepting
 * traffic with a broken config.
 */

import { logger } from './logger.js';

/**
 * Validate that all required env vars are present. Returns an object
 * describing the result. Does NOT exit the process.
 *
 * @param {string[]} vars - Required env var names
 * @returns {{ok: boolean, missing: string[], present: string[]}}
 */
export function validateEnv(vars) {
  const missing = [];
  const present = [];

  for (const name of vars) {
    const value = process.env[name];
    if (value === undefined || value === null || value === '') {
      missing.push(name);
    } else {
      present.push(name);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    present,
  };
}

/**
 * Hard-fail validation. If any required env var is missing, log a fatal
 * error and exit the process with code 1.
 *
 * Use this at the top of src/index.js BEFORE app.listen() is called.
 *
 * @param {string[]} vars - Required env var names
 * @param {object} [options]
 * @param {boolean} [options.allowDev=false] - If true, only warn in development
 * @throws {never} - exits the process if any var is missing (unless allowDev)
 */
export function requireEnv(vars, options = {}) {
  const { allowDev = false } = options;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isDev = NODE_ENV !== 'production';

  const result = validateEnv(vars);

  if (result.ok) {
    logger.info(
      { service: process.env.SERVICE_NAME, vars: result.present },
      'Environment validation passed'
    );
    return;
  }

  const message = `Missing required environment variables: ${result.missing.join(', ')}`;

  // In dev with allowDev, warn but don't exit
  if (isDev && allowDev) {
    logger.warn(
      { missing: result.missing, NODE_ENV },
      'Environment validation FAILED but continuing (dev mode)'
    );
    return;
  }

  // Hard fail
  logger.fatal({ missing: result.missing, NODE_ENV }, message);
  // Give winston a moment to flush
  setTimeout(() => process.exit(1), 100).unref();
}

/**
 * Validate a single env var against a regex pattern (e.g., port number, URL).
 * Useful for catching format errors that would otherwise fail at runtime.
 *
 * @param {string} name - Env var name
 * @param {RegExp} pattern - Pattern the value must match
 * @param {string} [description] - Human description for error messages
 * @returns {boolean}
 */
export function validateEnvFormat(name, pattern, description) {
  const value = process.env[name];
  if (!value) return false;
  if (!pattern.test(value)) {
    logger.error(
      { name, value, description },
      `Env var ${name} does not match expected format${description ? ` (${description})` : ''}`
    );
    return false;
  }
  return true;
}

export default { validateEnv, requireEnv, validateEnvFormat };
