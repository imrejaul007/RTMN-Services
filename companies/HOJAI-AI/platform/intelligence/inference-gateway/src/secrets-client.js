'use strict';

/**
 * Stub secrets-client.js for inference-gateway
 *
 * Real implementation would call Secrets Manager (port 4744) to fetch
 * provider API keys. Stub always returns null (triggering stub mode).
 */

var _cache = {};

function getProviderKey(provider) {
  // Cache lookup (stub always misses)
  if (_cache[provider]) return Promise.resolve(_cache[provider]);
  // In real implementation: HTTP call to Secrets Manager
  // For now: no keys configured, returns null → triggers stub fallback
  return Promise.resolve(null);
}

function clearCache() {
  _cache = {};
}

function getCacheState() {
  return { entries: Object.keys(_cache).length, cached: Object.keys(_cache) };
}

module.exports = { getProviderKey: getProviderKey, clearCache: clearCache, getCacheState: getCacheState };
