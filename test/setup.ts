/**
 * Vitest Test Setup
 * 
 * Global test configuration and setup for the Bitcoin simulation tool.
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables for tests
// Set NODE_ENV for test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true
})

// Global test utilities
global.console = {
  ...console,
  // Suppress console.warn in tests unless explicitly needed
  warn: process.env.VITEST_VERBOSE ? console.warn : () => {},
}
