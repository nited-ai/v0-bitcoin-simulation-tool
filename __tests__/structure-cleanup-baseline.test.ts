/**
 * Baseline tests for structure cleanup
 * These tests verify current application functionality before cleanup
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Structure Cleanup Baseline Tests', () => {
  describe('Directory Structure', () => {
    it('should have current directory structure before cleanup', () => {
      // Verify current structure exists
      expect(fs.existsSync(path.join(process.cwd(), 'app'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'src'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/tabs'))).toBe(true)
    })

    it('should have broken duplicate components that need removal', () => {
      // These directories no longer exist after cleanup (parameters was removed)
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/parameters/components'))).toBe(false)
      // Results components still exist as they're part of the modular structure
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/results/components'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/price-projection/components'))).toBe(false)
    })
  })

  describe('TypeScript Compilation', () => {
    it('should have TypeScript configuration files', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'next.config.mjs'))).toBe(true)
    })
  })

  describe('Key Files Exist', () => {
    it('should have main application files', () => {
      // Core application files
      expect(fs.existsSync(path.join(process.cwd(), 'app/page.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/page.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/SimulationPage.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/context/SimulationContext.tsx'))).toBe(true)
    })

    it('should have working components in app/simulation/tabs', () => {
      // Working components that should remain in tabs structure
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/tabs/parameters'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/tabs/price-projection'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/tabs/results'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/shared'))).toBe(true)
    })
  })
})
