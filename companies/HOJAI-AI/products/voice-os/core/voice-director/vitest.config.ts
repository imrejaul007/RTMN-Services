import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    extensions: {
      include: ['.ts', '.tsx'],
    },
  },
});
