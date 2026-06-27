const noop = async () => {};
class StubEventBus {
  serviceName = 'stub';
  publishAsync = async () => ({ eventId: null, streamId: null });
  publish = () => {};
  subscribe = noop;
  connect = noop;
  quit = noop;
  stats = noop;
}

const eventBusPath = require.resolve('@rtmn/shared/event-bus', { paths: [__dirname + '/../../'] });
require.cache[eventBusPath] = {
  id: eventBusPath,
  filename: '@rtmn/shared/event-bus (stubbed)',
  loaded: true,
  exports: { EventBus: StubEventBus, default: StubEventBus },
};

// Shared state — accessed by both PersistentMap stub and test assertions
const SHARED: any = {
  services:       new Map(),
  metrics:        new Map(),
  'alert-rules':  new Map(),
  'active-alerts': new Map(),
};
(globalThis as any).__MONITORING_SHARED__ = SHARED;

// PersistentMap stub — seeds data into SHARED maps
class MockPersistentMap {
  private _data: Map<string, any>;
  constructor(name: string) {
    if (!SHARED[name]) SHARED[name] = new Map();
    this._data = SHARED[name];
  }
  get size() { return this._data.size; }
  has(k: string) { return this._data.has(k); }
  get(k: string) { return this._data.get(k); }
  set(k: string, v: any) { this._data.set(k, v); return this; }
  delete(k: string) { return this._data.delete(k); }
  values() { return this._data.values(); }
  entries() { return this._data.entries(); }
}

const pmPath = require.resolve('@rtmn/shared/lib/persistent-map', { paths: [__dirname + '/../../'] });
require.cache[pmPath] = {
  id: pmPath,
  filename: '@rtmn/shared/lib/persistent-map (stubbed)',
  loaded: true,
  exports: { PersistentMap: MockPersistentMap, default: MockPersistentMap },
};

// Stub @rtmn/shared/security
const securityStub = {
  setupSecurity: () => {},
  strictLimiter: () => {},
};
const secPath = require.resolve('@rtmn/shared/security', { paths: [__dirname + '/../../'] });
require.cache[secPath] = { id: secPath, filename: '@rtmn/shared/security (stubbed)', loaded: true, exports: securityStub };

// Stub @rtmn/shared/lib/env
const envStub = { requireEnv: () => {} };
const envPath = require.resolve('@rtmn/shared/lib/env', { paths: [__dirname + '/../../'] });
require.cache[envPath] = { id: envPath, filename: '@rtmn/shared/lib/env (stubbed)', loaded: true, exports: envStub };

// Stub @rtmn/shared/auth
const authStub = { requireAuth: () => (_req: any, _res: any, next: () => void) => next() };
const authPath = require.resolve('@rtmn/shared/auth', { paths: [__dirname + '/../../'] });
require.cache[authPath] = { id: authPath, filename: '@rtmn/shared/auth (stubbed)', loaded: true, exports: authStub };

// Stub @rtmn/shared/lib/shutdown
const shutdownStub = { installGracefulShutdown: () => {} };
try {
  const shutdownPath = require.resolve('@rtmn/shared/lib/shutdown', { paths: [__dirname + '/../../'] });
  require.cache[shutdownPath] = { id: shutdownPath, filename: '@rtmn/shared/lib/shutdown (stubbed)', loaded: true, exports: shutdownStub };
} catch (_) {}

// Stub @rtmn/shared/intel/dual-client (used by rez-intel-client.js)
const dualClientStub = {
  REZ_INTEL_ENABLED: true,
  REZ_INTEL_URL: 'http://localhost:5370',
  checkRezIntelHealth: async () => true,
  enrichAgentContext: async () => ({ ltv: 1500, churnRisk: 'low' }),
  classifyIntent: async () => ({ intent: 'purchase', confidence: 0.92 }),
  getNextBestAction: async () => ({ action: 'upsell', reason: 'high_ltv' }),
};
try {
  const dualPath = require.resolve('@rtmn/shared/intel/dual-client', { paths: [__dirname + '/../../'] });
  require.cache[dualPath] = { id: dualPath, filename: '@rtmn/shared/intel/dual-client (stubbed)', loaded: true, exports: dualClientStub };
} catch (_) {}

// Stub uuid
const uuidStub = { v4: () => 'test-uuid-1234' };
const uuidPath = require.resolve('uuid', { paths: [__dirname + '/../../'] });
require.cache[uuidPath] = { id: uuidPath, filename: 'uuid (stubbed)', loaded: true, exports: uuidStub };

// Stub rez-intel-client (thin wrapper that delegates to @rtmn/shared/intel/dual-client)
const rezIntelStub = {
  default: {
    REZ_INTEL_ENABLED: true,
    REZ_INTEL_URL: 'http://localhost:5370',
    checkRezIntelHealth: async () => true,
    enrichAgentContext: async () => ({ ltv: 1500, churnRisk: 'low' }),
    classifyIntent: async () => ({ intent: 'purchase', confidence: 0.92 }),
    getNextBestAction: async () => ({ action: 'upsell', reason: 'high_ltv' }),
  },
};
try {
  const rezPath = require.resolve('./rez-intel-client', { paths: [__dirname + '/../../src'] });
  require.cache[rezPath] = { id: rezPath, filename: 'rez-intel-client (stubbed)', loaded: true, exports: rezIntelStub };
} catch (_) {
  // If resolve fails, leave the stub out — the source won't be able to import it
}

// Stub express + middleware packages
const expressStub = { default: () => ({ use: () => {}, get: () => {}, post: () => {}, listen: () => {}, disable: () => {} }) };
const paths = [__dirname + '/../../'];
['express', 'cors', 'helmet', 'compression', 'morgan'].forEach(pkg => {
  try {
    const p = require.resolve(pkg, { paths });
    require.cache[p] = { id: p, filename: `${pkg} (stubbed)`, loaded: true, exports: { default: () => {}, ...expressStub } };
  } catch (_) {}
});