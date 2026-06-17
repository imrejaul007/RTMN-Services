import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      name: 'RTMNChatWidget',
      fileName: 'chat-widget',
      formats: ['iife', 'umd', 'es']
    },
    rollupOptions: {
      output: {
        assetFileNames: 'chat-widget.[ext]'
      }
    },
    cssCodeSplit: false,
    minify: 'terser',
    sourcemap: true
  }
});
