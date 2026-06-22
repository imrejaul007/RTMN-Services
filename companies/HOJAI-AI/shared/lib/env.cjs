/**
 * RTMN Shared Env Validation Module (CJS)
 *
 * CJS mirror of lib/env.js. Auto-loaded by Node when a CJS file does
 *   require('@rtmn/shared/lib/env')
 * thanks to the package.json `exports` condition map.
 *
 * Differences from the ESM version:
 *   - Uses a tiny CJS-only logger (no winston import) to avoid the
 *     ESM logger round-trip.
 *   - Synchronous exit on hard fail (no setTimeout flush).
 *
 * Keep behavior in sync with lib/env.js. The two files are intentionally
 * duplicate-and-adapt.
 */

// Tiny CJS logger. Same shape as winston's `.info/.warn/.error/.fatal`
// but synchronous and dependency-free so this file can be required from
// the very first line of any CJS service.
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;

const fmt = (level, obj, msg) => {
  if (typeof obj === 'string') msg = obj;
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: process.env.SERVICE_NAME || 'service',
    ...(typeof obj === 'object' && obj !== null ? obj : {}),
    ...(msg ? { msg } : {}),
  });
  if (level === 'error' || level === 'fatal') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
};

const logger = {
  info: (obj, msg) => { if (currentLevel >= LEVELS.info) fmt('info', obj, msg); },
  warn: (obj, msg) => { if (currentLevel >= LEVELS.warn) fmt('warn', obj, msg); },
  error: (obj, msg) => { if (currentLevel >= LEVELS.error) fmt('error', obj, msg); },
  fatal: (obj, msg) => { fmt('fatal', obj, msg); },
  debug: (obj, msg) => { if (currentLevel >= LEVELS.debug) fmt('debug', obj, msg); },
};

function validateEnv(vars) {
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

function requireEnv(vars, options = {}) {
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

  if (isDev && allowDev) {
    logger.warn(
      { missing: result.missing, NODE_ENV },
      'Environment validation FAILED but continuing (dev mode)'
    );
    return;
  }

  logger.fatal({ missing: result.missing, NODE_ENV }, message);
  process.exit(1);
}

function validateEnvFormat(name, pattern, description) {
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

module.exports = { validateEnv, requireEnv, validateEnvFormat };
module.exports.default = { validateEnv, requireEnv, validateEnvFormat };
