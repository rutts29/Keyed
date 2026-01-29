import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/e2e/setup.ts'],
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 120000, // 2 minutes - DevNet transactions can be slow
    hookTimeout: 60000,  // 1 minute for setup/teardown hooks
    pool: 'forks',       // Use forks to avoid shared state between test files
    poolOptions: {
      forks: {
        singleFork: true,  // Run all files in a single process to avoid 429s
      },
    },
    sequence: {
      concurrent: false, // Run test files sequentially (shared DevNet state)
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'tests'],
    },
  },
});
