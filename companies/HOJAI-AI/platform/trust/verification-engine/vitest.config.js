import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10000,
    include: ['__tests__/**/*.test.js', '__tests__/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js', 'src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.config.*', 'node_modules/**']
    },
    reporters: ['default', 'verbose'],
    setupFiles: [],
    sequence: {
      shuffle: false,
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});
