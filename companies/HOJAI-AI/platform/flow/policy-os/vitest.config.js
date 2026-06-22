/**
 * vitest config for PolicyOS unit tests
 *
 * Uses NODE_ENV=test so PolicyOS skips listen() (we only import
 * the pure functions; we don't need a live server for these tests).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.test.js'],
    globals: false,
    testTimeout: 5000,
  },
});
