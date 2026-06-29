const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    globals: true
  }
});
