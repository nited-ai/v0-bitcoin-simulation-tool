import { describe, it, expect, beforeEach } from 'vitest'
import { PriceProjectionAdapter } from '../../adapters/PriceProjectionAdapter'
import type { StrategyPriceData } from '../../types'
import type { PriceProjectionResult, ProjectionPoint } from '@/modules/price-projection/types'

describe('PriceProjectionAdapter', () => {
  let adapter: PriceProjectionAdapter
  let mockProjectionResult: PriceProjectionResult
  let mockProjectionPoints: ProjectionPoint[]

  beforeEach(() => {
    adapter = new PriceProjectionAdapter()
    
    mockProjectionPoints = [
      {
        timestamp: 1704067200000, // 2024-01-01
        price: 70000,
        support: 65000,
        resistance: 75000,
        confidence: 0.9,
        metadata: { month: 0 }
      },
      {
        timestamp: 1706745600000, // 2024-02-01
        price: 72000,
        support: 67000,
        resistance: 77000,
        confidence: 0.85,
        metadata: { month: 1 }
      },
      {
        timestamp: 1709251200000, // 2024-03-01
        price: 74000,
        support: 69000,
        resistance: 79000,
        confidence: 0.8,
        metadata: { month: 2 }
      }
    ]

    mockProjectionResult = {
      modelName: 'Test Model',
      modelVersion: '1.0.0',
      projectionPoints: mockProjectionPoints,
      metadata: {
        totalMonths: 3,
        totalGrowth: 5.71,
        averageMonthlyGrowth: 1.9,
        confidence: 0.85,
        generatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })

  describe('Data Validation', () => {
    it('should validate correct projection data', () => {
      const result = adapter.validateProjectionData([mockProjectionResult])
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty projection data', () => {
      const result = adapter.validateProjectionData([])
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Projection data cannot be empty')
    })

    it('should reject projection data without points', () => {
      const invalidData = {
        ...mockProjectionResult,
        projectionPoints: []
      }
      
      const result = adapter.validateProjectionData([invalidData])
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Projection must contain at least one data point')
    })

    it('should reject projection points without required fields', () => {
      const invalidData = {
        ...mockProjectionResult,
        projectionPoints: [
          {
            timestamp: 1704067200000,
            // Missing price field
            confidence: 0.9
          } as any
        ]
      }
      
      const result = adapter.validateProjectionData([invalidData])
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('price'))).toBe(true)
    })

    it('should reject invalid timestamp values', () => {
      const invalidData = {
        ...mockProjectionResult,
        projectionPoints: [
          {
            timestamp: -1, // Invalid timestamp
            price: 70000,
            confidence: 0.9
          }
        ]
      }
      
      const result = adapter.validateProjectionData([invalidData])
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('timestamp'))).toBe(true)
    })

    it('should reject invalid price values', () => {
      const invalidData = {
        ...mockProjectionResult,
        projectionPoints: [
          {
            timestamp: 1704067200000,
            price: -1000, // Invalid negative price
            confidence: 0.9
          }
        ]
      }
      
      const result = adapter.validateProjectionData([invalidData])
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('price'))).toBe(true)
    })
  })

  describe('Price Line Selection', () => {
    it('should get available price lines from projection data', () => {
      const availableLines = adapter.getAvailablePriceLines([mockProjectionResult])
      
      expect(availableLines).toContain('volatile')
      expect(availableLines).toContain('average')
      expect(availableLines).toContain('support')
      expect(availableLines).toContain('resistance')
    })

    it('should handle projection data without support/resistance lines', () => {
      const dataWithoutLines = {
        ...mockProjectionResult,
        projectionPoints: mockProjectionPoints.map(point => ({
          timestamp: point.timestamp,
          price: point.price,
          confidence: point.confidence,
          metadata: point.metadata
        }))
      }
      
      const availableLines = adapter.getAvailablePriceLines([dataWithoutLines])
      
      expect(availableLines).toContain('volatile')
      expect(availableLines).toContain('average')
      expect(availableLines).not.toContain('support')
      expect(availableLines).not.toContain('resistance')
    })
  })

  describe('Data Conversion', () => {
    it('should convert projection data using volatile price line', () => {
      const strategyData = adapter.convertForStrategy([mockProjectionResult], 'volatile')
      
      expect(strategyData).toHaveLength(3)
      expect(strategyData[0].price).toBe(70000) // Main price
      expect(strategyData[0].timestamp).toBe(1704067200000)
      expect(strategyData[0].confidence).toBe(0.9)
    })

    it('should convert projection data using support price line', () => {
      const strategyData = adapter.convertForStrategy([mockProjectionResult], 'support')
      
      expect(strategyData).toHaveLength(3)
      expect(strategyData[0].price).toBe(65000) // Support price
      expect(strategyData[1].price).toBe(67000)
      expect(strategyData[2].price).toBe(69000)
    })

    it('should convert projection data using resistance price line', () => {
      const strategyData = adapter.convertForStrategy([mockProjectionResult], 'resistance')
      
      expect(strategyData).toHaveLength(3)
      expect(strategyData[0].price).toBe(75000) // Resistance price
      expect(strategyData[1].price).toBe(77000)
      expect(strategyData[2].price).toBe(79000)
    })

    it('should convert projection data using average price line', () => {
      const strategyData = adapter.convertForStrategy([mockProjectionResult], 'average')
      
      expect(strategyData).toHaveLength(3)
      // Average of main price, support, and resistance
      expect(strategyData[0].price).toBe(70000) // (70000 + 65000 + 75000) / 3
      expect(strategyData[1].price).toBe(72000)
      expect(strategyData[2].price).toBe(74000)
    })

    it('should preserve metadata during conversion', () => {
      const strategyData = adapter.convertForStrategy([mockProjectionResult], 'volatile')

      expect(strategyData[0].metadata).toEqual({
        month: 0,
        selectedLine: 'volatile',
        originalPrice: 70000
      })
      expect(strategyData[1].metadata).toEqual({
        month: 1,
        selectedLine: 'volatile',
        originalPrice: 72000
      })
      expect(strategyData[2].metadata).toEqual({
        month: 2,
        selectedLine: 'volatile',
        originalPrice: 74000
      })
    })

    it('should handle missing support/resistance gracefully', () => {
      const dataWithoutLines = {
        ...mockProjectionResult,
        projectionPoints: mockProjectionPoints.map(point => ({
          timestamp: point.timestamp,
          price: point.price,
          confidence: point.confidence,
          metadata: point.metadata
        }))
      }
      
      const strategyData = adapter.convertForStrategy([dataWithoutLines], 'support')
      
      expect(strategyData).toHaveLength(3)
      // Should fallback to main price when support is not available
      expect(strategyData[0].price).toBe(70000)
    })
  })

  describe('Multiple Projection Results', () => {
    it('should handle multiple projection results', () => {
      const secondProjection = {
        ...mockProjectionResult,
        modelName: 'Second Model',
        projectionPoints: [
          {
            timestamp: 1711929600000, // 2024-04-01
            price: 76000,
            support: 71000,
            resistance: 81000,
            confidence: 0.75,
            metadata: { month: 3 }
          }
        ]
      }
      
      const strategyData = adapter.convertForStrategy([mockProjectionResult, secondProjection], 'volatile')
      
      expect(strategyData).toHaveLength(4) // 3 + 1 points
      expect(strategyData[3].price).toBe(76000)
      expect(strategyData[3].timestamp).toBe(1711929600000)
    })

    it('should sort combined data by timestamp', () => {
      const outOfOrderProjection = {
        ...mockProjectionResult,
        projectionPoints: [
          {
            timestamp: 1701475200000, // 2023-12-01 (earlier)
            price: 68000,
            confidence: 0.95,
            metadata: { month: -1 }
          }
        ]
      }
      
      const strategyData = adapter.convertForStrategy([mockProjectionResult, outOfOrderProjection], 'volatile')
      
      expect(strategyData).toHaveLength(4)
      expect(strategyData[0].timestamp).toBe(1701475200000) // Earliest first
      expect(strategyData[1].timestamp).toBe(1704067200000)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for invalid price line selection', () => {
      expect(() => {
        adapter.convertForStrategy([mockProjectionResult], 'invalid' as any)
      }).toThrow('Invalid price line selection')
    })

    it('should handle empty projection results gracefully', () => {
      const strategyData = adapter.convertForStrategy([], 'volatile')
      
      expect(strategyData).toHaveLength(0)
    })

    it('should handle projection results with no points', () => {
      const emptyProjection = {
        ...mockProjectionResult,
        projectionPoints: []
      }
      
      const strategyData = adapter.convertForStrategy([emptyProjection], 'volatile')
      
      expect(strategyData).toHaveLength(0)
    })
  })

  describe('Performance', () => {
    it('should convert large datasets efficiently', () => {
      // Create large dataset
      const largeProjectionPoints = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: 1704067200000 + (i * 86400000), // Daily points
        price: 70000 + (i * 10),
        support: 65000 + (i * 10),
        resistance: 75000 + (i * 10),
        confidence: 0.9 - (i * 0.0001),
        metadata: { month: i }
      }))

      const largeProjection = {
        ...mockProjectionResult,
        projectionPoints: largeProjectionPoints
      }
      
      const startTime = performance.now()
      const strategyData = adapter.convertForStrategy([largeProjection], 'volatile')
      const endTime = performance.now()
      
      expect(strategyData).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })
  })
})
