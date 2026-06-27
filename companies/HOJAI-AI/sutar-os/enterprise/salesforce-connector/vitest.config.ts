import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    setupFiles: [resolve(__dirname, '__tests__/setup.ts')],
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
});
