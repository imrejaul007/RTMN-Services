const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    testTimeout: 30000,
    setupFiles: ['./__tests__/setup.js'],
  },
});
