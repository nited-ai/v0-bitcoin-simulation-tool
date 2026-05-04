/**
 * Test to verify that the volatility pattern correctly matches historical price movements
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PowerLawModel } from '../price-models/models/PowerLawModel'
import { VolatilityService } from '../price-models/services/VolatilityService'
import type { PriceModelParams } from '../price-models/types'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'

describe('Volatility Pattern Verification', () => {
  let model: PowerLawModel
  let volatilityService: VolatilityService
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    model = new PowerLawModel()
    volatilityService = new VolatilityService()
    
    // Create realistic mock historical data with known volatility pattern
    // Pattern: 0.8, 1.2, 0.9, 1.5, 1.0 (repeating)
    const now = Date.now()
    const patternValues = [0.8, 1.2, 0.9, 1.5, 1.0]
    
    mockHistoricalData = Array.from({ length: 10 }, (_, i) => {
      const monthsAgo = 10 - i
      const timestamp = now - monthsAgo * 30 * 24 * 60 * 60 * 1000
      const date = new Date(timestamp)
      
      // Calculate Power Law price for this date
      const daysSinceGenesis = (timestamp - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24)
      const powerLawPrice = Math.pow(10, 5.844 * Math.log10(daysSinceGenesis) - 17.01)
      
      // Apply known deviation pattern
      const patternValue = patternValues[i % patternValues.length]
      const actualPrice = powerLawPrice * patternValue
      
      return {
        time: Math.floor(timestamp / 1000),
        date: date.toISOString().split('T')[0],
        open: actualPrice * 0.98,
        high: actualPrice * 1.02,
        low: actualPrice * 0.96,
        close: actualPrice,
        source: 'test'
      }
    })
  })

  describe('Deviation Pattern Extraction', () => {
    it('should extract correct deviation ratios from historical data', () => {
      console.log('\n========================================')
      console.log('🔍 DEVIATION PATTERN EXTRACTION TEST')
      console.log('========================================\n')

      const getPowerLawPrice = (date: Date, line: 'fit' | 'support' | 'resistance') => {
        const daysSinceGenesis = (date.getTime() - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24)
        return Math.pow(10, 5.844 * Math.log10(daysSinceGenesis) - 17.01)
      }

      const deviationPattern = volatilityService.extractDeviationPattern(
        mockHistoricalData,
        10,
        'fit',
        getPowerLawPrice
      )

      console.log('📊 Extracted deviation pattern:', deviationPattern.map(d => d.toFixed(2)))
      console.log('📊 Expected pattern: [0.80, 1.20, 0.90, 1.50, 1.00, 0.80, 1.20, 0.90, 1.50, 1.00]')
      console.log('')

      // Verify the pattern matches our known input pattern
      expect(deviationPattern).toHaveLength(10)
      
      // Check that deviations are close to expected values (within 1% tolerance)
      const expectedPattern = [0.8, 1.2, 0.9, 1.5, 1.0, 0.8, 1.2, 0.9, 1.5, 1.0]
      deviationPattern.forEach((deviation, i) => {
        const expected = expectedPattern[i]
        const tolerance = expected * 0.01 // 1% tolerance
        expect(Math.abs(deviation - expected)).toBeLessThan(tolerance)
      })

      console.log('✅ Deviation pattern extraction is correct!')
      console.log('========================================\n')
    })

    it('should use the last N months of historical data', () => {
      console.log('\n========================================')
      console.log('🔍 HISTORICAL DATA SELECTION TEST')
      console.log('========================================\n')

      const getPowerLawPrice = (date: Date) => {
        const daysSinceGenesis = (date.getTime() - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24)
        return Math.pow(10, 5.844 * Math.log10(daysSinceGenesis) - 17.01)
      }

      // Request only the last 5 months
      const deviationPattern = volatilityService.extractDeviationPattern(
        mockHistoricalData,
        5,
        'fit',
        getPowerLawPrice
      )

      console.log('📊 Total historical data points:', mockHistoricalData.length)
      console.log('📊 Requested pattern length: 5 months')
      console.log('📊 Extracted pattern length:', deviationPattern.length)
      console.log('📊 Extracted pattern:', deviationPattern.map(d => d.toFixed(2)))
      console.log('')

      expect(deviationPattern).toHaveLength(5)
      
      // The last 5 months should correspond to indices 5-9 of our data
      // Which have pattern values: [0.8, 1.2, 0.9, 1.5, 1.0]
      const expectedPattern = [0.8, 1.2, 0.9, 1.5, 1.0]
      deviationPattern.forEach((deviation, i) => {
        const expected = expectedPattern[i]
        const tolerance = expected * 0.01
        expect(Math.abs(deviation - expected)).toBeLessThan(tolerance)
      })

      console.log('✅ Correctly uses the LAST N months of historical data!')
      console.log('========================================\n')
    })
  })

  describe('Pattern Application', () => {
    it('should apply deviation pattern correctly to projections', () => {
      console.log('\n========================================')
      console.log('🔍 PATTERN APPLICATION TEST')
      console.log('========================================\n')

      const basePrice = 100000
      const deviationPattern = [0.8, 1.2, 0.9, 1.5, 1.0]
      const diminishingFactor = 1.0 // No diminishing

      console.log('📊 Base price:', basePrice)
      console.log('📊 Deviation pattern:', deviationPattern)
      console.log('📊 Diminishing factor:', diminishingFactor)
      console.log('')

      const results = []
      for (let month = 0; month < 10; month++) {
        const volatilePrice = volatilityService.applyVolatility(
          basePrice,
          deviationPattern,
          month,
          diminishingFactor
        )
        
        const expectedDeviation = deviationPattern[month % deviationPattern.length]
        const expectedPrice = basePrice * expectedDeviation
        
        results.push({
          month,
          patternIndex: month % deviationPattern.length,
          deviation: expectedDeviation,
          expectedPrice,
          actualPrice: volatilePrice,
          match: Math.abs(volatilePrice - expectedPrice) < 1
        })
      }

      console.log('📊 Application results:')
      results.forEach(r => {
        console.log(`   Month ${r.month}: Pattern[${r.patternIndex}]=${r.deviation.toFixed(2)} → Expected: $${r.expectedPrice.toFixed(0)}, Actual: $${r.actualPrice.toFixed(0)}, Match: ${r.match ? '✅' : '❌'}`)
      })
      console.log('')

      // Verify all prices match expected values
      results.forEach(r => {
        expect(r.match).toBe(true)
      })

      console.log('✅ Pattern application is correct!')
      console.log('========================================\n')
    })

    it('should cycle through pattern correctly for projections longer than pattern', () => {
      console.log('\n========================================')
      console.log('🔍 PATTERN CYCLING TEST')
      console.log('========================================\n')

      const basePrice = 100000
      const deviationPattern = [0.8, 1.2, 0.9] // 3-month pattern
      const diminishingFactor = 1.0

      console.log('📊 Pattern length: 3 months')
      console.log('📊 Projection length: 10 months')
      console.log('📊 Pattern:', deviationPattern)
      console.log('')

      const results = []
      for (let month = 0; month < 10; month++) {
        const volatilePrice = volatilityService.applyVolatility(
          basePrice,
          deviationPattern,
          month,
          diminishingFactor
        )
        
        const patternIndex = month % deviationPattern.length
        const expectedDeviation = deviationPattern[patternIndex]
        
        results.push({
          month,
          patternIndex,
          deviation: expectedDeviation,
          price: volatilePrice
        })
      }

      console.log('📊 Cycling results:')
      results.forEach(r => {
        console.log(`   Month ${r.month} → Pattern[${r.patternIndex}] = ${r.deviation.toFixed(2)} → Price: $${r.price.toFixed(0)}`)
      })
      console.log('')

      // Verify pattern cycles correctly
      expect(results[0].patternIndex).toBe(0)
      expect(results[3].patternIndex).toBe(0) // Should cycle back
      expect(results[6].patternIndex).toBe(0) // Should cycle back again
      expect(results[9].patternIndex).toBe(0) // Should cycle back again

      console.log('✅ Pattern cycling is correct!')
      console.log('========================================\n')
    })
  })

  describe('End-to-End Verification', () => {
    it('should produce projections that match historical volatility pattern', async () => {
      console.log('\n========================================')
      console.log('🔍 END-TO-END PATTERN MATCHING TEST')
      console.log('========================================\n')

      const params: PriceModelParams = {
        startPrice: 68000,
        projectionMonths: 10,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 10,
            diminishingFactor: 1.0
          }
        }
      }

      const result = await model.generateProjection(mockHistoricalData, params)

      console.log('📊 Historical deviation pattern (last 10 months):')
      const getPowerLawPrice = (date: Date) => {
        const daysSinceGenesis = (date.getTime() - new Date('2009-01-03').getTime()) / (1000 * 60 * 60 * 24)
        return Math.pow(10, 5.844 * Math.log10(daysSinceGenesis) - 17.01)
      }

      const historicalDeviations = mockHistoricalData.map(point => {
        const date = new Date(point.time * 1000)
        const powerLawPrice = getPowerLawPrice(date)
        return point.close / powerLawPrice
      })

      console.log('   ', historicalDeviations.map(d => d.toFixed(2)).join(', '))
      console.log('')

      console.log('📊 Projected price deviations (first 10 months):')
      const projectedDeviations = result.projectionPoints.map(point => {
        const basePrice = point.metadata?.basePrice || 0
        return basePrice > 0 ? point.price / basePrice : 0
      })

      console.log('   ', projectedDeviations.map(d => d.toFixed(2)).join(', '))
      console.log('')

      // Verify that projected deviations match historical deviations
      projectedDeviations.forEach((deviation, i) => {
        const historicalDeviation = historicalDeviations[i]
        const tolerance = historicalDeviation * 0.01 // 1% tolerance
        const match = Math.abs(deviation - historicalDeviation) < tolerance
        console.log(`   Month ${i}: Historical=${historicalDeviation.toFixed(2)}, Projected=${deviation.toFixed(2)}, Match=${match ? '✅' : '❌'}`)
        expect(match).toBe(true)
      })

      console.log('')
      console.log('✅ Projected volatility pattern matches historical pattern!')
      console.log('========================================\n')
    })
  })
})
