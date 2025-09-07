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
      expect(fs.existsSync(path.join(process.cwd(), 'src/app'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'src/lib'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/components'))).toBe(true)
    })

    it('should have broken duplicate components that need removal', () => {
      // These directories contain broken duplicates
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/parameters/components'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/results/components'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'src/modules/price-projection/components'))).toBe(true)
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

    it('should have working components in app/simulation/components', () => {
      // Working components that should remain
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/components/navigation/TabNavigation.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/components/layout/SimulationHeader.tsx'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/components/parameters'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'app/simulation/components/results'))).toBe(true)
    })
  })
})
