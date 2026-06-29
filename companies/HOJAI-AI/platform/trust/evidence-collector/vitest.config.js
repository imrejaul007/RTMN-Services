import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['__tests__/**/*.test.{js,ts}'],

    // Test environment
    environment: 'node',

    // Coverage settings (optional, enable if needed)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '__tests__/**',
        'dist/**',
        '*.config.*',
      ],
    },

    // Test timeout (30 seconds for integration tests)
    testTimeout: 30000,

    // Hooks configuration
    hooks: {
      // Setup file runs before all tests
      beforeAll: [],
      // Teardown file runs after all tests
      afterAll: [],
    },

    // Reporter configuration
    reporters: ['default', 'verbose'],

    // Pool configuration for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        // Use a single thread for simpler debugging
        singleThread: process.env.CI === 'true',
      },
    },
  },

  // ESBuild configuration
  esbuild: {
    target: 'node18',
  },

  // Resolve configuration
  resolve: {
    // Ensure ESM modules work correctly
    extensions: ['.js', '.ts', '.json'],
  },
});
