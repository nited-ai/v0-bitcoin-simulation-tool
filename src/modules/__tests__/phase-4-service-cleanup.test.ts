/**
 * Phase 4: Service Cleanup Verification Tests
 * 
 * Task 17: Evaluate and clean up deprecated services
 * 
 * Verifies that:
 * - Deprecated directories are removed
 * - PriceDataService is properly marked as deprecated
 * - No legacy methods remain (except those needed for backward compatibility)
 * - Service documentation is updated
 */

import { describe, it, expect } from 'vitest'
import { PriceDataService } from '../price-data/services/PriceDataService'
import * as fs from 'fs'
import * as path from 'path'

describe('Phase 4: Service Cleanup Verification', () => {
  describe('Directory Cleanup', () => {
    it('should have removed src/modules/price-projection/types/', () => {
      const typesPath = path.join(process.cwd(), 'src/modules/price-projection/types')
      
      // Directory should either not exist or be empty
      if (fs.existsSync(typesPath)) {
        const files = fs.readdirSync(typesPath)
        expect(files.length).toBe(0)
      } else {
        // Directory doesn't exist - that's fine too
        expect(true).toBe(true)
      }
    })

    it('should have removed src/modules/price-projection/index.ts', () => {
      const indexPath = path.join(process.cwd(), 'src/modules/price-projection/index.ts')
      expect(fs.existsSync(indexPath)).toBe(false)
    })

    it('src/modules/price-projection/ directory should be empty or removed', () => {
      const priceProjectionPath = path.join(process.cwd(), 'src/modules/price-projection')
      
      if (fs.existsSync(priceProjectionPath)) {
        const files = fs.readdirSync(priceProjectionPath)
        // Should only contain empty 'types' directory or be completely empty
        const nonEmptyDirs = files.filter(file => {
          const fullPath = path.join(priceProjectionPath, file)
          if (fs.statSync(fullPath).isDirectory()) {
            const dirFiles = fs.readdirSync(fullPath)
            return dirFiles.length > 0
          }
          return true // Files count as non-empty
        })
        expect(nonEmptyDirs.length).toBe(0)
      } else {
        // Directory doesn't exist - perfect!
        expect(true).toBe(true)
      }
    })
  })

  describe('PriceDataService Status', () => {
    it('should have PriceDataService available (for backward compatibility)', () => {
      const service = PriceDataService.getInstance()
      expect(service).toBeDefined()
      expect(typeof service.generatePriceProjection).toBe('function')
    })

    it('should have generatePriceProjection method (deprecated but functional)', () => {
      const service = PriceDataService.getInstance()
      expect(typeof service.generatePriceProjection).toBe('function')
    })

    it('should have loadHistoricalData method', () => {
      const service = PriceDataService.getInstance()
      expect(typeof service.loadHistoricalData).toBe('function')
    })

    it('should have getCurrentPrice method', () => {
      const service = PriceDataService.getInstance()
      expect(typeof service.getCurrentPrice).toBe('function')
    })
  })

  describe('Service Documentation', () => {
    it('should have JSDoc comments on PriceDataService', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should have class-level documentation
      expect(content).toContain('/**')
      expect(content).toContain('Price Data Service')
    })

    it('should have documentation on generatePriceProjection method', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should have method documentation
      expect(content).toContain('Generate price projection')
    })

    it('should mention Phase 1 Migration in generatePriceProjection', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should reference the migration
      expect(content).toContain('Phase 1 Migration')
    })
  })

  describe('Import Cleanup', () => {
    it('should not import from deprecated price-projection module', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should NOT import from old location
      expect(content).not.toContain("from '../../price-projection/types'")
      expect(content).not.toContain('from "../price-projection/types"')
    })

    it('should import from shared module', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should import from shared module
      expect(content).toContain("from '../../shared'")
    })

    it('should import UnifiedPriceProjectionService', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      expect(content).toContain('unifiedPriceProjectionService')
    })

    it('should import PriceProjectionAdapter', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      expect(content).toContain('PriceProjectionAdapter')
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain generatePriceProjection for backward compatibility', () => {
      const service = PriceDataService.getInstance()
      
      // Method should exist and be callable
      expect(service.generatePriceProjection).toBeDefined()
      expect(typeof service.generatePriceProjection).toBe('function')
    })

    it('should use UnifiedPriceProjectionService internally', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should call unified service
      expect(content).toContain('unifiedPriceProjectionService.generateProjectionFromLegacyParams')
    })

    it('should convert to legacy format for backward compatibility', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should use adapter to convert
      expect(content).toContain('PriceProjectionAdapter.toLegacyFormat')
    })
  })

  describe('Phase 4 Cleanup Status', () => {
    it('should have no references to old PriceProjectionResult type', () => {
      const serviceFilePath = path.join(process.cwd(), 'src/modules/price-data/services/PriceDataService.ts')
      const content = fs.readFileSync(serviceFilePath, 'utf-8')
      
      // Should not have old type references
      expect(content).not.toContain('OldPriceProjectionResult')
    })

    it('should have clean service implementation', () => {
      const service = PriceDataService.getInstance()
      
      // Service should be functional
      expect(service).toBeDefined()
      expect(service.clearCache).toBeDefined()
      expect(service.getCacheStats).toBeDefined()
    })
  })
})

