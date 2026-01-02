/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/stores/**/*.ts',
        'src/services/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.tsx',
        'src/**/*.test.ts',
        'src/**/*.spec.tsx',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'node_modules',
      ],
    },
  },
});
