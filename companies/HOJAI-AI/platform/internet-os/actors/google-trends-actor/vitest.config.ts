import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@hojai/actor-runtime': path.resolve(__dirname, '../../actor-runtime/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist', '__tests__', '**/*.d.ts']
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
