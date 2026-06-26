/**
 * _setup-mock.cjs — Mock @rtmn/shared before ESM service loads
 *
 * This CommonJS module runs BEFORE the ESM service (via the test file's top-level
 * `import('./_setup-mock.cjs')`). It creates stub files in a temp directory that
 * re-export minimal stubs for @rtmn/shared, then monkey-patches Module._resolveFilename
 * so the ESM service can `import '@rtmn/shared/auth'` without needing npm install.
 *
 * This is the most reliable way to mock ESM dependencies when the real package
 * isn't installed in node_modules.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const Module = require('module');

// Create a temp directory for our mock packages
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kg-mocks-'));
const mockRtmn = path.join(tmpDir, '@rtmn');
fs.mkdirSync(mockRtmn, { recursive: true });

// Create @rtmn/shared/auth stub (ESM-compatible)
const authStub = `
// Mock @rtmn/shared/auth — always allows all requests in test mode
export function requireAuth(req, res, next) {
  // Allow all requests in test (auth is bypassed via the app's own NO_AUTH handling)
  next();
}
export function createAuthMiddleware() {
  return function(req, res, next) { next(); };
}
export function createCorpIdAuthMiddleware() {
  return function(req, res, next) { next(); };
}
`;

const sharedDir = path.join(mockRtmn, 'shared');
const authDir = path.join(sharedDir, 'auth');
const libDir = path.join(sharedDir, 'lib');
fs.mkdirSync(authDir, { recursive: true });
fs.mkdirSync(libDir, { recursive: true });

fs.writeFileSync(path.join(authDir, 'index.js'), authStub);
fs.writeFileSync(path.join(sharedDir, 'package.json'), JSON.stringify({ type: 'module' }));
fs.writeFileSync(path.join(authDir, 'package.json'), JSON.stringify({ type: 'module' }));

// Create @rtmn/shared/lib/shutdown stub (ESM-compatible)
const shutdownStub = `
// Mock installGracefulShutdown — no-op in tests
export function installGracefulShutdown(server) {
  // no-op: tests don't need graceful shutdown
}
`;
fs.writeFileSync(path.join(libDir, 'shutdown.js'), shutdownStub);
fs.writeFileSync(path.join(libDir, 'package.json'), JSON.stringify({ type: 'module' }));

// Store the original _resolveFilename
const originalResolve = Module._resolveFilename;

// Monkey-patch Module._resolveFilename to intercept @rtmn/shared requests
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '@rtmn/shared' || request.startsWith('@rtmn/shared/')) {
    const mockPath = path.join(tmpDir, request);
    // Check if it matches a file we created
    const jsPath = mockPath + '.js';
    const indexPath = path.join(mockPath, 'index.js');
    if (fs.existsSync(jsPath)) return jsPath;
    if (fs.existsSync(indexPath)) return indexPath;
  }
  return originalResolve(request, parent, isMain, options);
};

// Cleanup is registered at process exit
process.on('exit', function() {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});
