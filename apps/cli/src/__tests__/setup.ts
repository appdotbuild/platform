/**
 * Vitest setup file
 * This file runs before each test file and sets up the global test environment
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import 'cli-testing-library/vitest';

// Global setup that runs once before all tests
beforeAll(() => {
  // Set up any global test configuration here
  // For example, environment variables, global mocks, etc.

  // Ensure we're in test mode
  process.env.NODE_ENV = 'test';

  // Set up any CLI-specific test environment variables
  process.env.CLI_TEST_MODE = 'true';
});

// Cleanup that runs once after all tests
afterAll(() => {
  // Clean up any global resources
  // For example, close database connections, clean up temp files, etc.
});

// Cleanup that runs after each test
afterEach(() => {
  // Clean up any test-specific resources
  // For example, reset mocks, clear temporary state, etc.
});

// Configure global test utilities if needed
// This is where you can set up global mocks, extend expect matchers, etc.

// Example: Add custom matchers or global test utilities
// expect.extend({
//   toMatchCliOutput(received, expected) {
//     // Custom matcher for CLI output
//   }
// });

// Export any test utilities that might be needed across test files
export const testUtils = {
  // Add any shared test utilities here
  createTempDir: () => {
    // Utility to create temporary directories for testing
  },

  cleanupTempFiles: () => {
    // Utility to clean up temporary files after tests
  },
};
