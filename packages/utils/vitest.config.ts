import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tell Vitest to run your setup file before any tests
    setupFiles: ['./tests/vitest.setup.ts'],
    
    // Other recommended settings
    globals: true,
    environment: 'node',
  },
});