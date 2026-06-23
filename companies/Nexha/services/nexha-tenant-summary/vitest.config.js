// vitest.config.js — no MongoDB needed; pure aggregator.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20000,
    globals: false,
    include: ['__tests__/**/*.test.js'],
  },
});