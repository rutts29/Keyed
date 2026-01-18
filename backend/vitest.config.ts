import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'tests'],
    },
  },
});
