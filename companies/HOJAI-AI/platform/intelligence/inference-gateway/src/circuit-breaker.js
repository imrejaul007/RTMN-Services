'use strict';

/**
 * Stub circuit-breaker.js for inference-gateway
 */

/**
 * Per-provider circuit breaker state.
 * Stub implementation: always allows requests.
 */
var _breakers = {
  openai: { shouldAllow: function() { return true; }, recordSuccess: function() {}, recordFailure: function() {} },
  anthropic: { shouldAllow: function() { return true; }, recordSuccess: function() {}, recordFailure: function() {} },
  google: { shouldAllow: function() { return true; }, recordSuccess: function() {}, recordFailure: function() {} },
  mistral: { shouldAllow: function() { return true; }, recordSuccess: function() {}, recordFailure: function() {} },
  local: { shouldAllow: function() { return true; }, recordSuccess: function() {}, recordFailure: function() {} }
};

var breakers = _breakers;

function getAllBreakerStates() {
  var states = {};
  Object.keys(breakers).forEach(function(p) {
    states[p] = { status: 'closed', failures: 0, lastFailure: null };
  });
  return states;
}

module.exports = { breakers: breakers, getAllBreakerStates: getAllBreakerStates };
