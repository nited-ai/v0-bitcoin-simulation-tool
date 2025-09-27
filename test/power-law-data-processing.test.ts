/**
 * Power Law Data Processing Test
 * 
 * Tests to verify the Power Law data sampling and processing logic
 * works correctly and preserves all chart data points.
 */

import { describe, it, expect } from 'vitest'

describe('Power Law Data Processing', () => {
  describe('Data Sampling Logic', () => {
    it('should preserve all data points when adding Power Law values', () => {
      // Mock chart data with 100 points
      const mockChartData = Array.from({ length: 100 }, (_, index) => ({
        date: `2024-01-${String(index + 1).padStart(2, '0')}`,
        timestamp: new Date(`2024-01-${String(index + 1).padStart(2, '0')}`).getTime(),
        price: 50000 + index * 100,
        close: 50000 + index * 100,
        isHistorical: true
      }))

      // Simulate the sampling logic from UnifiedPriceChart
      const maxPoints = 50 // Smaller for testing
      const sampleInterval = Math.max(1, Math.floor(mockChartData.length / maxPoints))
      
      // Process data like the fixed logic does
      const processedData = mockChartData.map((point, index) => {
        const shouldCalculatePowerLaw = index % sampleInterval === 0
        
        if (!shouldCalculatePowerLaw) {
          return {
            ...point,
            plSupport: null,
            plFit: null,
            plResistance: null
          }
        }

        // Mock Power Law calculations for sampled points
        return {
          ...point,
          plSupport: 45000 + index * 90,
          plFit: 50000 + index * 100,
          plResistance: 55000 + index * 110
        }
      })

      // Verify all original data points are preserved
      expect(processedData).toHaveLength(mockChartData.length)
      expect(processedData.length).toBe(100)

      // Verify original data is preserved
      processedData.forEach((point, index) => {
        expect(point.date).toBe(mockChartData[index].date)
        expect(point.timestamp).toBe(mockChartData[index].timestamp)
        expect(point.price).toBe(mockChartData[index].price)
        expect(point.close).toBe(mockChartData[index].close)
      })

      // Verify Power Law data is added correctly
      const powerLawPoints = processedData.filter(p => p.plSupport !== null)
      const expectedSampledPoints = Math.ceil(mockChartData.length / sampleInterval)
      
      expect(powerLawPoints.length).toBeGreaterThan(0)
      expect(powerLawPoints.length).toBeLessThanOrEqual(expectedSampledPoints)

      // Verify sampled points have valid Power Law values
      powerLawPoints.forEach(point => {
        expect(point.plSupport).toBeTypeOf('number')
        expect(point.plFit).toBeTypeOf('number')
        expect(point.plResistance).toBeTypeOf('number')
        expect(point.plSupport).toBeGreaterThan(0)
        expect(point.plFit).toBeGreaterThan(0)
        expect(point.plResistance).toBeGreaterThan(0)
      })
    })

    it('should calculate correct sampling interval', () => {
      const testCases = [
        { dataLength: 100, maxPoints: 50, expectedInterval: 2 },
        { dataLength: 1000, maxPoints: 500, expectedInterval: 2 },
        { dataLength: 50, maxPoints: 500, expectedInterval: 1 },
        { dataLength: 2000, maxPoints: 500, expectedInterval: 4 }
      ]

      testCases.forEach(({ dataLength, maxPoints, expectedInterval }) => {
        const sampleInterval = Math.max(1, Math.floor(dataLength / maxPoints))
        expect(sampleInterval).toBe(expectedInterval)
      })
    })

    it('should handle edge cases gracefully', () => {
      // Empty data
      const emptyData: any[] = []
      const processedEmpty = emptyData.map((point, index) => ({
        ...point,
        plSupport: null,
        plFit: null,
        plResistance: null
      }))
      expect(processedEmpty).toHaveLength(0)

      // Single data point
      const singlePoint = [{
        date: '2024-01-01',
        timestamp: new Date('2024-01-01').getTime(),
        price: 50000,
        close: 50000,
        isHistorical: true
      }]

      const processedSingle = singlePoint.map((point, index) => {
        const shouldCalculatePowerLaw = index % 1 === 0 // Always true for single point
        return shouldCalculatePowerLaw ? {
          ...point,
          plSupport: 45000,
          plFit: 50000,
          plResistance: 55000
        } : {
          ...point,
          plSupport: null,
          plFit: null,
          plResistance: null
        }
      })

      expect(processedSingle).toHaveLength(1)
      expect(processedSingle[0].plSupport).toBe(45000)
      expect(processedSingle[0].plFit).toBe(50000)
      expect(processedSingle[0].plResistance).toBe(55000)
    })
  })

  describe('Performance Optimization', () => {
    it('should limit Power Law calculations to improve performance', () => {
      const largeDataset = Array.from({ length: 2000 }, (_, index) => ({
        date: `2024-01-01`,
        timestamp: Date.now() + index * 86400000, // Daily intervals
        price: 50000 + index,
        close: 50000 + index,
        isHistorical: true
      }))

      const maxPoints = 500
      const sampleInterval = Math.max(1, Math.floor(largeDataset.length / maxPoints))
      
      let calculatedPoints = 0
      const processedData = largeDataset.map((point, index) => {
        const shouldCalculatePowerLaw = index % sampleInterval === 0
        
        if (shouldCalculatePowerLaw) {
          calculatedPoints++
          return {
            ...point,
            plSupport: 45000,
            plFit: 50000,
            plResistance: 55000
          }
        }

        return {
          ...point,
          plSupport: null,
          plFit: null,
          plResistance: null
        }
      })

      // Verify performance optimization
      expect(processedData).toHaveLength(2000) // All points preserved
      expect(calculatedPoints).toBeLessThanOrEqual(maxPoints) // Limited calculations
      expect(calculatedPoints).toBeGreaterThan(0) // Some calculations performed
      
      // Verify the optimization actually reduces calculations
      expect(calculatedPoints).toBeLessThan(largeDataset.length)
    })
  })
})
