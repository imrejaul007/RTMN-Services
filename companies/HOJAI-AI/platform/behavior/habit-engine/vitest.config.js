import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js'], // Exclude main entry to test individual modules
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    },

    // Test file patterns
    include: [
      '__tests__/**/*.test.js',
      '__tests__/**/*.spec.js',
      '**/*.test.js',
      '**/*.spec.js'
    ],

    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporter options
    reporters: ['default', 'verbose'],

    // Aliases for cleaner imports
    alias: {
      '@': './src',
      '@tests': './__tests__'
    },

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage'
    ],

    // Run tests serially to avoid state leakage in in-memory stores
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },

    // Clear mocks between tests
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
  }
});
