import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'packages/webhook-sdk/src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**', '__tests__/**'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/*': resolve(__dirname, './'),
      '@nextabizz/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
      '@nextabizz/webhook-sdk': resolve(__dirname, '../../packages/webhook-sdk/src'),
    },
  },
});
