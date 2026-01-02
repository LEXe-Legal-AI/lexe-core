import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist/widget',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/widget.tsx'),
      name: 'LeoWebchat',
      fileName: 'leo-webchat',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        inlineDynamicImports: true,
      },
    },
    // Target: < 50KB gzipped
    chunkSizeWarningLimit: 100,
  },
});
