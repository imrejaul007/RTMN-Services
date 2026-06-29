import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.{js,ts}'],
    environment: 'node',
    testTimeout: 10000,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['node_modules/**', '__tests__/**'],
    },
  },
  esbuild: {
    target: 'node18',
  },
});
