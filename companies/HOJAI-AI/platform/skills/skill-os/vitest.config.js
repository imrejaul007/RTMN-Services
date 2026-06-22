/**
 * vitest config for SkillOS unit tests
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.test.js'],
    globals: false,
    testTimeout: 5000,
  },
});
