// vitest config for customer-intelligence-gateway
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    include: ['__tests__/**/*.test.js'],
    globals: true,
    setupFiles: ['./__tests__/setup.js'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }
  }
});
