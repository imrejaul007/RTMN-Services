import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test functions (describe, it, etc.)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/shared/test/**', // This is a smoke test that calls process.exit
      '**/foundry/**', // Template projects with empty test stubs
      '**/hojai-cloud/.storage/**', // Storage directory with temp projects
      '**/eval-platform/**', // Eval platform with empty test stubs
      '**/genie*/**', // Genie products have their own test infrastructure
      '**/__tests__/rez-intel-client.test.*', // Node.js test files, not vitest
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
});
