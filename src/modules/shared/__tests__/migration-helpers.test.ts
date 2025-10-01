/**
 * Migration Helpers Tests
 * 
 * Tests for migration utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  MigrationPhase,
  validateNewFormat,
  detectFormat,
  compareProjections,
  createMigrationReport,
  isMigrated,
  generateMigrationChecklist
} from '../utils/migration-helpers'
import type { PriceProjectionResult } from '../../../../app/simulation/price-models/types'

describe('Migration Helpers', () => {
  describe('validateNewFormat', () => {
    it('should validate correct new format', () => {
      const validProjection: PriceProjectionResult = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: Date.now(),
            price: 50000,
            confidence: 1.0,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: new Date().toISOString()
        }
      }

      const result = validateNewFormat(validProjection)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing modelName', () => {
      const invalidProjection = {
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: new Date().toISOString()
        }
      }

      const result = validateNewFormat(invalidProjection)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing or invalid modelName')
    })

    it('should detect invalid projection points', () => {
      const invalidProjection = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: Date.now(),
            // missing price
            confidence: 1.0
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: new Date().toISOString()
        }
      }

      const result = validateNewFormat(invalidProjection)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('missing or invalid price'))).toBe(true)
    })

    it('should detect missing metadata fields', () => {
      const invalidProjection = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 12
          // missing other required fields
        }
      }

      const result = validateNewFormat(invalidProjection)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('totalGrowth'))).toBe(true)
      expect(result.errors.some(e => e.includes('averageMonthlyGrowth'))).toBe(true)
      expect(result.errors.some(e => e.includes('generatedAt'))).toBe(true)
    })
  })

  describe('detectFormat', () => {
    it('should detect new format', () => {
      const newFormat: PriceProjectionResult = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: Date.now(),
            price: 50000,
            confidence: 1.0,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: new Date().toISOString()
        }
      }

      expect(detectFormat(newFormat)).toBe('new')
    })

    it('should detect old format', () => {
      const oldFormat = {
        projectedPrices: [
          { month: 0, date: '2025-01-01', price: 50000 }
        ],
        projectionPoints: [
          { timestamp: Date.now(), price: 50000, date: '2025-01-01' }
        ],
        metadata: {
          model: 'test-model',
          version: '1.0.0',
          parameters: {},
          generatedAt: new Date().toISOString(),
          totalMonths: 12,
          initialPrice: 50000,
          finalPrice: 55000
        }
      }

      expect(detectFormat(oldFormat)).toBe('old')
    })

    it('should detect legacy format', () => {
      const legacyFormat = [
        {
          date: '2025-01-01',
          days: 0,
          historicalPrice: 50000,
          simulationPath: 50000
        }
      ]

      expect(detectFormat(legacyFormat)).toBe('legacy')
    })

    it('should detect unknown format', () => {
      const unknownFormat = {
        someRandomField: 'value'
      }

      expect(detectFormat(unknownFormat)).toBe('unknown')
    })
  })

  describe('compareProjections', () => {
    it('should detect equal projections', () => {
      const projectionA: PriceProjectionResult = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: 1000,
            price: 50000,
            confidence: 1.0,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: '2025-01-01T00:00:00.000Z'
        }
      }

      const projectionB = { ...projectionA }

      const result = compareProjections(projectionA, projectionB)
      expect(result.equal).toBe(true)
      expect(result.differences).toHaveLength(0)
    })

    it('should detect different model names', () => {
      const projectionA: PriceProjectionResult = {
        modelName: 'model-a',
        modelVersion: '1.0.0',
        projectionPoints: [],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: '2025-01-01T00:00:00.000Z'
        }
      }

      const projectionB: PriceProjectionResult = {
        ...projectionA,
        modelName: 'model-b'
      }

      const result = compareProjections(projectionA, projectionB)
      expect(result.equal).toBe(false)
      expect(result.differences.some(d => d.includes('modelName'))).toBe(true)
    })

    it('should detect different projection points', () => {
      const projectionA: PriceProjectionResult = {
        modelName: 'test-model',
        modelVersion: '1.0.0',
        projectionPoints: [
          {
            timestamp: 1000,
            price: 50000,
            confidence: 1.0,
            metadata: {}
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 0.1,
          averageMonthlyGrowth: 0.008,
          generatedAt: '2025-01-01T00:00:00.000Z'
        }
      }

      const projectionB: PriceProjectionResult = {
        ...projectionA,
        projectionPoints: [
          {
            timestamp: 1000,
            price: 55000, // Different price
            confidence: 1.0,
            metadata: {}
          }
        ]
      }

      const result = compareProjections(projectionA, projectionB)
      expect(result.equal).toBe(false)
      expect(result.differences.some(d => d.includes('price'))).toBe(true)
    })
  })

  describe('createMigrationReport', () => {
    it('should create a migration report', () => {
      const report = createMigrationReport(
        'TestComponent',
        'old',
        'new',
        true,
        'Successfully migrated'
      )

      expect(report).toContain('TestComponent')
      expect(report).toContain('Before: old')
      expect(report).toContain('After: new')
      expect(report).toContain('✅ PASS')
      expect(report).toContain('Successfully migrated')
    })

    it('should handle failed tests', () => {
      const report = createMigrationReport(
        'TestComponent',
        'old',
        'new',
        false
      )

      expect(report).toContain('❌ FAIL')
    })
  })

  describe('isMigrated', () => {
    it('should detect migrated files', () => {
      const migratedContent = `
        // Some code here
        // Phase 1 Migration: Complete
        export function something() {}
      `

      expect(isMigrated(migratedContent)).toBe(true)
    })

    it('should detect non-migrated files', () => {
      const nonMigratedContent = `
        // Some code here
        export function something() {}
      `

      expect(isMigrated(nonMigratedContent)).toBe(false)
    })
  })

  describe('generateMigrationChecklist', () => {
    it('should generate a checklist', () => {
      const checklist = generateMigrationChecklist('TestComponent')

      expect(checklist).toBeInstanceOf(Array)
      expect(checklist.length).toBeGreaterThan(0)
      expect(checklist.some(item => item.includes('TestComponent'))).toBe(true)
      expect(checklist.some(item => item.includes('tests'))).toBe(true)
      expect(checklist.some(item => item.includes('Commit'))).toBe(true)
    })
  })
})

