/**
 * Test setup for sutar-gateway unit tests
 * Mocks external dependencies
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '4140';
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock @rtmn/shared modules
vi.mock('@rtmn/shared/lib/env', () => ({
  requireEnv: vi.fn(),
}));

vi.mock('@rtmn/shared/security', () => ({
  setupSecurity: vi.fn(),
  strictLimiter: vi.fn(),
}));

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { type: 'test', id: 'test-user' };
    next();
  },
}));

vi.mock('@rtmn/shared/lib/shutdown', () => ({
  installGracefulShutdown: vi.fn(),
}));

// Mock rez-intel-client
vi.mock('./rez-intel-client', () => ({
  REZ_INTEL_ENABLED: false,
  REZ_INTEL_URL: 'http://localhost:5370',
  checkRezIntelHealth: vi.fn().mockResolvedValue(false),
  enrichAgentContext: vi.fn().mockResolvedValue(null),
  classifyIntent: vi.fn().mockResolvedValue(null),
  getNextBestAction: vi.fn().mockResolvedValue(null),
}));

// Increase timeout for async tests
vi.setConfig({ testTimeout: 10000 });