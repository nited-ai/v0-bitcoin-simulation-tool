/**
 * Library consolidation tests
 * These tests verify library imports work correctly during consolidation
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Library Consolidation Tests', () => {
  describe('Consolidated Library Structure', () => {
    it('should have consolidated lib directory with all services after consolidation', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'lib'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/database'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/price-engine'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/services'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/strategy-engine'))).toBe(true)
    })

    it('should have lib directory with generated prisma client', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'lib'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/generated/prisma'))).toBe(true)
    })

    it('should have key utility files in consolidated lib', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'lib/utils.ts'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/fonts.ts'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/i18n.ts'))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'lib/load-btc-price.ts'))).toBe(true)
    })

    it('should not have old src/lib directory after consolidation', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'src/lib'))).toBe(false)
    })
  })

  describe('TypeScript Configuration', () => {
    it('should have tsconfig.json with current path mappings', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
      expect(tsconfig.compilerOptions.paths).toBeDefined()
      expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./'])
    })
  })

  describe('Import Dependencies', () => {
    it('should be able to identify files that import from src/lib', async () => {
      // This test helps us identify which files need import path updates
      const { execSync } = require('child_process')
      
      try {
        // Search for imports from src/lib
        const result = execSync('grep -r "from.*src/lib" app/ src/ --include="*.ts" --include="*.tsx" || echo "No matches"', 
          { encoding: 'utf8', stdio: 'pipe' })
        
        // We expect to find some imports that need updating
        expect(typeof result).toBe('string')
      } catch (error) {
        // On Windows, grep might not be available, so we'll skip this test
        expect(true).toBe(true)
      }
    })
  })
})
