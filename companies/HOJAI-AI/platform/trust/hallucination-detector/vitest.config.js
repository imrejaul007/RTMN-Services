import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.{js,ts}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js'],
    },
    testTimeout: 10000,
  },
  esbuild: {
    target: 'node18',
  },
});