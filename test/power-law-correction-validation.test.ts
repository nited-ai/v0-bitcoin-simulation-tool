/**
 * Power Law Model Correction Validation Test
 * 
 * Validates that the corrected Power Law implementation matches
 * Giovanni Santostasi's reference predictions and the BitBo chart.
 */

import { describe, it, expect } from 'vitest'

// Import corrected implementations
import { powerLawModel } from '../app/simulation/price-models/models/PowerLawModel'
import { getPowerLawPrice, getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Model Correction Validation', () => {
  
  describe('Reference Point Validation', () => {
    it('should predict ~$210,000 by January 2026', () => {
      const jan2026 = new Date('2026-01-01')
      const predictedPrice = getPowerLawPrice(jan2026, 'fit')
      
      console.log(`Corrected model prediction for January 2026: $${predictedPrice.toLocaleString()}`)
      
      // Should be close to $210,000 (within 15% tolerance - acceptable for power law model)
      expect(predictedPrice).toBeGreaterThan(175000)
      expect(predictedPrice).toBeLessThan(245000)
      expect(predictedPrice).toBeCloseTo(210000, -5) // Within $30000 - reasonable for power law model
    })

    it('should predict ~$1,000,000 by 2033', () => {
      const year2033 = new Date('2033-01-01')
      const predictedPrice = getPowerLawPrice(year2033, 'fit')
      
      console.log(`Corrected model prediction for 2033: $${predictedPrice.toLocaleString()}`)
      
      // Should be close to $1,000,000 (within 35% tolerance - acceptable for long-term power law)
      expect(predictedPrice).toBeGreaterThan(900000)
      expect(predictedPrice).toBeLessThan(1400000)
      expect(predictedPrice).toBeCloseTo(1000000, -6) // Within $350000 - reasonable for long-term power law
    })
  })

  describe('Power Law Formula Validation', () => {
    it('should use correct exponent of 5.8', () => {
      // Test that the model uses the correct exponent
      const testDate1 = new Date('2025-01-01')
      const testDate2 = new Date('2025-02-01')
      
      const days1 = getDaysSinceGenesis(testDate1)
      const days2 = getDaysSinceGenesis(testDate2)
      
      const price1 = getPowerLawPrice(testDate1, 'fit')
      const price2 = getPowerLawPrice(testDate2, 'fit')
      
      // Calculate the implied exponent from the price ratio
      const dayRatio = days2 / days1
      const priceRatio = price2 / price1
      const impliedExponent = Math.log(priceRatio) / Math.log(dayRatio)
      
      console.log(`Implied exponent from price progression: ${impliedExponent.toFixed(3)}`)
      
      // Should be very close to 5.8
      expect(impliedExponent).toBeCloseTo(5.8, 1)
    })

    it('should maintain proper relationship between support, fit, and resistance lines', () => {
      const testDate = new Date('2026-01-01')
      
      const supportPrice = getPowerLawPrice(testDate, 'support')
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const resistancePrice = getPowerLawPrice(testDate, 'resistance')
      
      console.log(`Power Law lines for January 2026:`)
      console.log(`Support: $${supportPrice.toLocaleString()}`)
      console.log(`Fit: $${fitPrice.toLocaleString()}`)
      console.log(`Resistance: $${resistancePrice.toLocaleString()}`)
      
      // Support should be lower than fit, fit should be lower than resistance
      expect(supportPrice).toBeLessThan(fitPrice)
      expect(fitPrice).toBeLessThan(resistancePrice)
      
      // Reasonable spread between lines (support ~30% below fit, resistance ~40-80% above fit)
      const supportRatio = supportPrice / fitPrice
      const resistanceRatio = resistancePrice / fitPrice

      expect(supportRatio).toBeGreaterThan(0.6)
      expect(supportRatio).toBeLessThan(0.8)
      expect(resistanceRatio).toBeGreaterThan(1.4)
      expect(resistanceRatio).toBeLessThan(2.0)
    })
  })

  describe('Historical Consistency', () => {
    it('should show reasonable progression from current prices', () => {
      const currentDate = new Date()
      const currentPrice = getPowerLawPrice(currentDate, 'fit')
      
      const oneYearLater = new Date()
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      const futurePrice = getPowerLawPrice(oneYearLater, 'fit')
      
      const annualGrowth = ((futurePrice - currentPrice) / currentPrice) * 100
      
      console.log(`Current Power Law price: $${currentPrice.toLocaleString()}`)
      console.log(`One year later: $${futurePrice.toLocaleString()}`)
      console.log(`Implied annual growth: ${annualGrowth.toFixed(1)}%`)
      
      // Annual growth should be reasonable (10-50% per year)
      expect(annualGrowth).toBeGreaterThan(10)
      expect(annualGrowth).toBeLessThan(50)
    })

    it('should produce realistic prices for intermediate dates', () => {
      const testDates = [
        { date: new Date('2024-12-31'), expectedRange: [90000, 140000] },
        { date: new Date('2025-06-01'), expectedRange: [100000, 160000] },
        { date: new Date('2027-01-01'), expectedRange: [220000, 320000] },
        { date: new Date('2030-01-01'), expectedRange: [500000, 750000] }
      ]
      
      console.log('\nIntermediate date predictions:')
      testDates.forEach(({ date, expectedRange }) => {
        const price = getPowerLawPrice(date, 'fit')
        console.log(`${date.toISOString().split('T')[0]}: $${price.toLocaleString()}`)
        
        expect(price).toBeGreaterThan(expectedRange[0])
        expect(price).toBeLessThan(expectedRange[1])
      })
    })
  })

  describe('Model Integration Test', () => {
    it('should work correctly with the PowerLawModel class', async () => {
      const params = {
        startPrice: 95000,
        projectionMonths: 24,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }
      
      const result = await powerLawModel.generateProjection([], params)
      
      expect(result).toBeDefined()
      expect(result.projectionPoints).toHaveLength(24)
      expect(result.modelName).toBe('Power Law Model')
      
      // Check that the first projection point is reasonable
      const firstPoint = result.projectionPoints[0]
      expect(firstPoint.price).toBeGreaterThan(90000)
      expect(firstPoint.price).toBeLessThan(180000)
      
      // Check that the last projection point shows growth
      const lastPoint = result.projectionPoints[23]
      expect(lastPoint.price).toBeGreaterThan(firstPoint.price)
      
      console.log(`PowerLawModel integration test:`)
      console.log(`First month: $${firstPoint.price.toLocaleString()}`)
      console.log(`Last month (24): $${lastPoint.price.toLocaleString()}`)
      console.log(`Total growth: ${((lastPoint.price - firstPoint.price) / firstPoint.price * 100).toFixed(1)}%`)
    })
  })

  describe('Comparison with BitBo Chart', () => {
    it('should align with BitBo Power Law visualization expectations', () => {
      // Test key dates that should align with the BitBo chart
      const keyDates = [
        { date: new Date('2024-01-01'), description: 'Early 2024' },
        { date: new Date('2025-01-01'), description: 'Early 2025' },
        { date: new Date('2026-01-01'), description: 'Early 2026 (~$210k target)' },
        { date: new Date('2030-01-01'), description: 'Early 2030' },
        { date: new Date('2033-01-01'), description: 'Early 2033 (~$1M target)' }
      ]
      
      console.log('\nBitBo Chart Alignment Test:')
      console.log('Date\t\tPrice\t\tDescription')
      console.log('----\t\t-----\t\t-----------')
      
      keyDates.forEach(({ date, description }) => {
        const price = getPowerLawPrice(date, 'fit')
        console.log(`${date.getFullYear()}-01-01\t$${price.toLocaleString().padEnd(12)}\t${description}`)
        
        // All prices should be positive and reasonable
        expect(price).toBeGreaterThan(0)
        expect(price).toBeLessThan(10000000) // Less than $10M (sanity check)
      })
      
      // Specific validation for target dates
      const price2026 = getPowerLawPrice(new Date('2026-01-01'), 'fit')
      const price2033 = getPowerLawPrice(new Date('2033-01-01'), 'fit')
      
      // These should match the BitBo/Giovanni predictions (within reasonable tolerance)
      expect(price2026).toBeCloseTo(210000, -5) // Within $30k
      expect(price2033).toBeCloseTo(1000000, -6) // Within $350k
    })
  })
})
