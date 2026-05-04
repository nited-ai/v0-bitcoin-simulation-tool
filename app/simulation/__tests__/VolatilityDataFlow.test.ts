/**
 * Test to trace the complete data flow of volatility settings
 * from UI to PowerLawModel to VolatilityService
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PowerLawModel } from '../price-models/models/PowerLawModel'
import type { PriceModelParams } from '../price-models/types'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'

describe('Volatility Data Flow Investigation', () => {
  let model: PowerLawModel
  let mockHistoricalData: HistoricalDataPoint[]

  beforeEach(() => {
    model = new PowerLawModel()
    
    // Create realistic mock historical data (96 months = 8 years)
    const now = Date.now()
    mockHistoricalData = Array.from({ length: 96 }, (_, i) => {
      const monthsAgo = 96 - i
      const timestamp = now - monthsAgo * 30 * 24 * 60 * 60 * 1000
      
      // Simulate realistic Bitcoin price with volatility
      const basePrice = 20000 + i * 500 // Growing from $20k to $68k
      const volatility = Math.sin(i / 12) * 0.3 // ±30% volatility
      const price = basePrice * (1 + volatility)
      
      return {
        time: Math.floor(timestamp / 1000),
        date: new Date(timestamp).toISOString().split('T')[0],
        open: price * 0.98,
        high: price * 1.02,
        low: price * 0.96,
        close: price,
        source: 'test'
      }
    })
  })

  describe('Complete Data Flow Test', () => {
    it('should trace volatility settings from params to model to service', async () => {
      console.log('\n========================================')
      console.log('🔍 VOLATILITY DATA FLOW INVESTIGATION')
      console.log('========================================\n')

      // Step 1: Simulate UI settings (what PowerLawControls.tsx would create)
      const volatilitySettings = {
        enabled: true,
        patternLengthMonths: 96,
        diminishingFactor: 1.0
      }

      console.log('📝 Step 1: UI Settings Created')
      console.log('   Volatility settings:', volatilitySettings)
      console.log('')

      // Step 2: Simulate what UnifiedPriceChart.tsx would pass to the model
      const params: PriceModelParams = {
        startPrice: 68000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: volatilitySettings
        }
      }

      console.log('📝 Step 2: Chart Component Params')
      console.log('   modelSpecificParams:', params.modelSpecificParams)
      console.log('')

      // Step 3: Call PowerLawModel.generateProjection
      console.log('📝 Step 3: Calling PowerLawModel.generateProjection')
      console.log('   Historical data points:', mockHistoricalData.length)
      console.log('')

      const result = await model.generateProjection(mockHistoricalData, params)

      console.log('\n📝 Step 4: Results Analysis')
      console.log('   Projection points generated:', result.projectionPoints.length)
      console.log('   Volatility applied?', result.metadata.volatilityApplied)
      console.log('   Volatility settings in metadata:', result.metadata.volatilitySettings)
      console.log('   Deviation pattern length:', result.metadata.deviationPatternLength)
      console.log('')

      // Verify results
      expect(result.projectionPoints).toHaveLength(12)
      expect(result.metadata.volatilityApplied).toBe(true)
      expect(result.metadata.volatilitySettings).toEqual(volatilitySettings)
      expect(result.metadata.deviationPatternLength).toBeGreaterThan(0)

      // Check that prices show volatility (not a smooth curve)
      const prices = result.projectionPoints.map(p => p.price)
      console.log('📊 First 5 projection prices:', prices.slice(0, 5).map(p => `$${Math.round(p).toLocaleString()}`))
      console.log('')

      // Calculate price changes to verify volatility
      const priceChanges = []
      for (let i = 1; i < prices.length; i++) {
        const change = ((prices[i] - prices[i-1]) / prices[i-1]) * 100
        priceChanges.push(change)
      }

      console.log('📈 Month-to-month price changes (%):', priceChanges.slice(0, 5).map(c => c.toFixed(2)))
      console.log('')

      // Verify that volatility creates non-uniform price changes
      const hasVariation = priceChanges.some((change, i) => {
        if (i === 0) return false
        return Math.abs(change - priceChanges[i-1]) > 0.1 // Changes should vary
      })

      console.log('✅ Price changes show variation (volatility)?', hasVariation)
      console.log('\n========================================\n')

      expect(hasVariation).toBe(true)
    })

    it('should NOT apply volatility when disabled', async () => {
      console.log('\n========================================')
      console.log('🔍 VOLATILITY DISABLED TEST')
      console.log('========================================\n')

      const params: PriceModelParams = {
        startPrice: 68000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: false,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      console.log('📝 Volatility settings:', params.modelSpecificParams.cycleRepeatVolatility)
      console.log('')

      const result = await model.generateProjection(mockHistoricalData, params)

      console.log('📝 Results:')
      console.log('   Volatility applied?', result.metadata.volatilityApplied)
      console.log('   Deviation pattern length:', result.metadata.deviationPatternLength)
      console.log('\n========================================\n')

      expect(result.metadata.volatilityApplied).toBe(false)
      expect(result.metadata.deviationPatternLength).toBe(0)
    })

    it('should handle missing volatility settings gracefully', async () => {
      console.log('\n========================================')
      console.log('🔍 MISSING VOLATILITY SETTINGS TEST')
      console.log('========================================\n')

      const params: PriceModelParams = {
        startPrice: 68000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
          // No cycleRepeatVolatility property
        }
      }

      console.log('📝 modelSpecificParams:', params.modelSpecificParams)
      console.log('')

      const result = await model.generateProjection(mockHistoricalData, params)

      console.log('📝 Results:')
      console.log('   Volatility applied?', result.metadata.volatilityApplied)
      console.log('   Projection points:', result.projectionPoints.length)
      console.log('\n========================================\n')

      expect(result.metadata.volatilityApplied).toBe(false)
      expect(result.projectionPoints).toHaveLength(12)
    })
  })
})
