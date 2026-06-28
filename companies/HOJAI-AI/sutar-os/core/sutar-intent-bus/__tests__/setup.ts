/**
 * SUTAR Intent Bus — Test Setup
 * Intercepts @rtmn/shared requires before module evaluation.
 */
import { vi } from 'vitest';

// Stub @rtmn/shared/security — must happen BEFORE source module requires it
const securityStub = {
  setupSecurity: vi.fn(),
  requireAuth: vi.fn((_r: any, _res: any, next: () => void) => next()),
  preventPrototypePollution: vi.fn((_r: any, _res: any, next: () => void) => next()),
  errorHandler: vi.fn((_err: any, _req: any, _res: any, next: () => void) => next()),
  defaultLimiter: vi.fn(),
  strictLimiter: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
};

// Stub @rtmn/shared/auth
const authStub = { requireAuth: vi.fn((_r: any, _res: any, next: () => void) => next()) };

// Interject into require cache BEFORE any source module loads
try {
  const secPath = require.resolve('@rtmn/shared/security', { paths: [__dirname + '/../../'] });
  require.cache[secPath] = { id: secPath, loaded: true, exports: securityStub } as any;
} catch (_) {}

try {
  const authPath = require.resolve('@rtmn/shared/auth', { paths: [__dirname + '/../../'] });
  require.cache[authPath] = { id: authPath, loaded: true, exports: authStub } as any;
} catch (_) {}

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));