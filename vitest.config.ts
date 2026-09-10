import path from 'path';
import { defineConfig } from 'vitest/config';


const __dirname = import.meta.dirname;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['tests/utils/**/*.ts'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['./tests/unit/utils/**/*.test.ts'],
        },
        resolve: {
          alias: {
            '@utils': path.resolve(__dirname, './tests/utils'),
            '@config': path.resolve(__dirname, './src/config'),
            '@types': path.resolve(__dirname, './src/types'),
          },
        },
      },
    ],
    reporters: [
      'default',
      ['allure-vitest/reporter', { resultsDir: 'allure-results' }],
    ],
    setupFiles: ['allure-vitest/setup'],
  },
});
