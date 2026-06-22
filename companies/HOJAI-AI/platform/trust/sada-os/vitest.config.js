import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/unit/**/*.test.{js,ts}'],
    environment: 'node',
    server: {
      deps: {
        inline: ['@rtmn/shared'],
      },
    },
  },
  esbuild: {
    target: 'node18',
  },
});