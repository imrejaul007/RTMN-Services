'use strict';

/**
 * Stub retry.js for inference-gateway
 */

/**
 * Retry wrapper with exponential backoff.
 * @param {Function} fn - async function to retry
 * @param {object} opts - { maxRetries, baseMs, maxDelayMs }
 * @returns {Promise}
 */
async function withRetry(fn, opts) {
  var maxRetries = opts.maxRetries || 2;
  var baseMs = opts.baseMs || 250;
  var maxDelayMs = opts.maxDelayMs || 3000;
  var lastErr;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        var delay = Math.min(baseMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(function(r) { setTimeout(r, delay); });
      }
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
