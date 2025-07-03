import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Setup files to run before each test file
    setupFiles: ['./src/__tests__/setup.ts'],

    // Test environment - use node for CLI testing
    environment: 'node',

    // Include patterns for test files
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tmp/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],

    // Timeout for tests (useful for CLI tests that might take longer)
    testTimeout: 30000,

    // Reporter configuration
    reporters: ['verbose'],

    // ESM support
    server: {
      deps: {
        external: ['bun'],
      },
    },
  },

  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
