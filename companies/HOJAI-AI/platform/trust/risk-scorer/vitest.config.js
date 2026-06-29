import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.{js,ts}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.js',
        '**/*.md',
        '__tests__/**'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  esbuild: {
    target: 'node18'
  }
});
