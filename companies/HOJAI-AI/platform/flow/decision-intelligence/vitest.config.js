const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['__tests__/**/*.test.js', '__tests__/**/*.test.ts'],
    testTimeout: 15000,
  },
});