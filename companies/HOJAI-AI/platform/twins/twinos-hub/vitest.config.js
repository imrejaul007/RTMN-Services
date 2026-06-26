import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit tests run by default; integration tests need running server
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.js'],
    exclude: ['__tests__/integration.test.js'], // Run separately with server
  },
});
