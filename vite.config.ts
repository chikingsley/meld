import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import terminal from 'vite-plugin-terminal'
import autoImport from 'unplugin-auto-import/vite'
import path from 'path';

const ReactCompilerConfig = {
  // Enable auto-memoization
  memoization: {
    enabled: true,
    // Optional: configure which components to memoize
    include: ['**/components/**'], // memoize all components in components directory
    exclude: [] // exclude nothing
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite']
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  plugins: [
    react({ 
      babel: { 
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig]], 
        }, 
        jsxRuntime: 'automatic', 
      }),
    terminal({ 
      console: 'terminal',
      output: ['terminal', 'console'] 
    }),
    autoImport({
      imports: [],
    })
  ],
  server: {
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/oauth2-cc/token': 'https://api.hume.ai',
      '/v0/evi/chat': 'https://api.hume.ai',
    },
  },
});
