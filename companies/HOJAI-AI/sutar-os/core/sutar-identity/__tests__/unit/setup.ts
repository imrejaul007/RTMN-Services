/**
 * Test setup for sutar-identity unit tests
 * Mocks external dependencies
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '4144';
process.env.JWT_SECRET = 'test-secret-for-testing-only';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

// Mock @rtmn/shared modules
vi.mock('@rtmn/shared/lib/env', () => ({
  requireEnv: vi.fn(),
}));

vi.mock('@rtmn/shared/security', () => ({
  setupSecurity: vi.fn(),
  strictLimiter: vi.fn(),
}));

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (req: any, res: any, next: () => void) => {
    req.user = { type: 'test', id: 'test-user' };
    next();
  },
}));

vi.mock('@rtmn/shared/lib/shutdown', () => ({
  installGracefulShutdown: vi.fn(),
}));

vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    values: vi.fn().mockReturnValue([]),
    keys: vi.fn().mockReturnValue([]),
    size: 0,
  })),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
    })),
  },
}));

vi.mock('../../src/rez-intel-client', () => ({
  REZ_INTEL_ENABLED: false,
  REZ_INTEL_URL: 'http://localhost:5370',
  checkRezIntelHealth: vi.fn().mockResolvedValue(false),
  enrichAgentContext: vi.fn().mockResolvedValue(null),
  classifyIntent: vi.fn().mockResolvedValue(null),
  getNextBestAction: vi.fn().mockResolvedValue(null),
}));

vi.setConfig({ testTimeout: 10000 });
