/**
 * CJS wrapper for @rtmn/shared/event-bus
 * Re-exports the ESM implementation via dynamic import shim.
 *
 * Most RTMN services are ESM (SUTAR / Nexha / Industry OS). The CJS
 * surface exists so CommonJS code paths (e.g. legacy REZ-Workspace
 * bridges) can `require('@rtmn/shared/event-bus')` and still get the
 * same `EventBus` class.
 *
 * Usage:
 *   const { EventBus } = require('@rtmn/shared/event-bus');
 *   const bus = new EventBus({ serviceName: 'legacy-svc' });
 */

'use strict';

// Synchronous facade: returns a constructor that defers to the ESM
// implementation lazily on first `new EventBus()`. Because CJS callers
// can't `await import()` at top level, we pre-load the ESM module
// asynchronously and cache the resolved class.

let _EsmModPromise = null;
function loadEsmMod() {
  if (!_EsmModPromise) {
    _EsmModPromise = import('./index.js').then((m) => m);
  }
  return _EsmModPromise;
}

class EventBus {
  constructor(options) {
    const self = this;
    const ready = loadEsmMod().then((m) => {
      const EsmBus = m.EventBus;
      const inner = new EsmBus(options);
      // Re-bind methods to keep `this` working when called from CJS.
      self._inner = inner;
      for (const key of Object.getOwnPropertyNames(EsmBus.prototype)) {
        if (key === 'constructor') continue;
        self[key] = inner[key].bind(inner);
      }
    });
    this._ready = ready;
  }
  async connect() {
    await this._ready;
    return this._inner.connect();
  }
}

module.exports = { EventBus };
module.exports.default = { EventBus };