import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js', '__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/__tests__/**',
        '**/types/**',
        '**/index.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    // Suppress console output during tests unless explicitly needed
    onConsoleLog: (log, type) => {
      if (type === 'error' || process.env.VITEST_VERBOSE) {
        return log;
      }
      return false;
    }
  },
  // Additional Vite configuration for ESM support
  esbuild: {
    target: 'node18'
  }
});
