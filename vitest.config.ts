import { defineConfig } from 'vitest/config';
import path from 'path';


const __dirname = import.meta.dirname;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['tests/utils/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, './tests/utils'),
      '@config': path.resolve(__dirname, './src/config'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});
