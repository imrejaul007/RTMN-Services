const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.js'],
    setupFiles: [],
    testTimeout: 15000,
  },
});