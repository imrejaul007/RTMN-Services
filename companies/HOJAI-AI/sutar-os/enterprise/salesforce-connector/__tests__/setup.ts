/**
 * Salesforce Connector — Test Setup
 *
 * Stubs @rtmn/shared/* dependencies and express middleware.
 */

import { vi } from 'vitest';

// Stub @rtmn/shared/security
const securityStub = {
  setupSecurity: vi.fn(),
  requireAuth: vi.fn((_req, _res, next) => next()),
  preventPrototypePollution: vi.fn((_req, _res, next) => next()),
  errorHandler: vi.fn((_err, _req, _res, next) => next()),
  defaultLimiter: vi.fn(),
  strictLimiter: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
};

const authStub = { requireAuth: vi.fn((_req, _res, next) => next()) };

// Stub express and middleware
vi.stubGlobal('express', vi.fn(() => ({
  use: vi.fn().mockReturnThis(),
  post: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnThis(),
  listen: vi.fn((port, cb) => { if (cb) cb(); return { close: vi.fn() }; }),
  set: vi.fn().mockReturnThis(),
})));

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
})));
