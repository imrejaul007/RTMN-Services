import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  // Server configuration for development
  server: {
    port: 3001,
    host: true,
    strictPort: true,

    // Proxy API requests to backend during development
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/webhooks': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist/frontend',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
      },
      output: {
        // Chunk splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend'),
      '@server': path.resolve(__dirname, 'server'),
    },
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.SHOPIFY_APP_URL': JSON.stringify(process.env.SHOPIFY_APP_URL || ''),
    'process.env.HOJAI_WIDGET_URL': JSON.stringify(process.env.HOJAI_WIDGET_URL || ''),
  },

  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },

  // Preview server configuration
  preview: {
    port: 3002,
    host: true,
  },
});