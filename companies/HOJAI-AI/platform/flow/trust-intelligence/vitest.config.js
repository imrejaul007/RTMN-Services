// vitest config for trust-intelligence
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    include: ['__tests__/**/*.test.js'],
    globals: true,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }
  }
});