import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
      '@lib': path.resolve(__dirname, './src/lib'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      external: [
        // Exclude problematic CSS imports from node_modules
        'filepond/dist/filepond.min.css'
      ]
    },
    // Increase chunk size limit to avoid warnings
    chunkSizeWarningLimit: 2000
  },
  plugins: [
    react({ 
        jsxRuntime: 'automatic', 
      }),
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
