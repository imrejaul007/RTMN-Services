'use strict';

/**
 * Real Secrets Manager client for inference-gateway
 *
 * Fetches provider API keys from HOJAI Secrets Manager (port 4744).
 * Keys are cached for 5 minutes to avoid repeated HTTP calls.
 */

const http = require('http');
const https = require('https');

const SECRETS_MANAGER_URL = process.env.SECRETS_MANAGER_URL || 'http://localhost:4744';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const _cache = {};

const PROVIDER_KEY_NAMES = {
  openai:    'openai-api-key',
  anthropic: 'anthropic-api-key',
  google:    'google-ai-api-key',
  mistral:   'mistral-api-key',
};

/**
 * Fetch a secret from HOJAI Secrets Manager.
 * @param {string} name - secret name
 * @returns {Promise<string|null>} secret value or null if not found
 */
function fetchSecret(name) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SECRETS_MANAGER_URL}/api/secrets/${encodeURIComponent(name)}`);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname,
      method:   'GET',
      headers:  {
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
        'Accept': 'application/json',
      },
      timeout: 3000,
    }, (res) => {
      if (res.statusCode === 404 || res.statusCode === 401) {
        resolve(null);
        return;
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        try {
          const json = JSON.parse(body);
          resolve(json.value || json.secret || null);
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Get provider API key (with 5-min cache).
 * @param {string} provider - 'openai' | 'anthropic' | 'google' | 'mistral'
 * @returns {Promise<string|null>}
 */
function getProviderKey(provider) {
  const now = Date.now();
  const cached = _cache[provider];
  if (cached && (now - cached.ts) < CACHE_TTL_MS) {
    return Promise.resolve(cached.value);
  }

  const keyName = PROVIDER_KEY_NAMES[provider];
  if (!keyName) return Promise.resolve(null);

  return fetchSecret(keyName).then(value => {
    if (value) _cache[provider] = { value, ts: now };
    return value || null;
  });
}

function clearCache() {
  for (const k of Object.keys(_cache)) delete _cache[k];
}

function getCacheState() {
  return {
    entries: Object.keys(_cache).length,
    cached:  Object.keys(_cache).map(p => ({ provider: p, ageMs: Date.now() - _cache[p].ts })),
  };
}

module.exports = { getProviderKey, clearCache, getCacheState };