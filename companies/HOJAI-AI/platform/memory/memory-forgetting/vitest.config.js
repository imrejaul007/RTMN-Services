import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      '__tests__/**/*.test.{js,mjs}',
      '__tests__/**/*.spec.{js,mjs}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '__tests__/**',
        'dist/**'
      ]
    }
  }
});
