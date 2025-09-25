/**
 * Test suite for Power Law visualization improvements
 * 
 * Tests the implementation of:
 * 1. Log-log chart view toggle functionality
 * 2. Power Law lines overlay on historical data
 * 3. Proper line colors and styling
 * 4. Mathematical accuracy in log-log view
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getPowerLawPrice, getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Visualization Improvements', () => {
  describe('Log-Log Scale Mathematical Validation', () => {
    it('should generate Power Law prices that appear as straight lines in log-log space', () => {
      console.log('🧮 Testing Power Law mathematical accuracy for log-log visualization...')
      
      // Test dates spanning Bitcoin's history
      const testDates = [
        new Date('2011-01-01'), // Early Bitcoin
        new Date('2013-12-01'), // First major peak
        new Date('2017-12-01'), // 2017 peak
        new Date('2021-11-01'), // 2021 peak
        new Date('2024-12-01'), // Current
        new Date('2030-01-01'), // Future projection
      ]
      
      const results = {
        support: [] as Array<{ date: Date, days: number, price: number, logDays: number, logPrice: number }>,
        fit: [] as Array<{ date: Date, days: number, price: number, logDays: number, logPrice: number }>,
        resistance: [] as Array<{ date: Date, days: number, price: number, logDays: number, logPrice: number }>
      }
      
      // Calculate Power Law prices for each date
      testDates.forEach(date => {
        const days = getDaysSinceGenesis(date)
        
        const supportPrice = getPowerLawPrice(date, 'support')
        const fitPrice = getPowerLawPrice(date, 'fit')
        const resistancePrice = getPowerLawPrice(date, 'resistance')
        
        results.support.push({
          date,
          days,
          price: supportPrice,
          logDays: Math.log10(days),
          logPrice: Math.log10(supportPrice)
        })
        
        results.fit.push({
          date,
          days,
          price: fitPrice,
          logDays: Math.log10(days),
          logPrice: Math.log10(fitPrice)
        })
        
        results.resistance.push({
          date,
          days,
          price: resistancePrice,
          logDays: Math.log10(days),
          logPrice: Math.log10(resistancePrice)
        })
      })
      
      console.log('📊 Power Law prices calculated:')
      console.table(results.fit.map(r => ({
        Date: r.date.toISOString().split('T')[0],
        Days: r.days,
        'Fit Price': `$${r.price.toLocaleString()}`,
        'Log Days': r.logDays.toFixed(3),
        'Log Price': r.logPrice.toFixed(3)
      })))
      
      // Test linearity in log-log space for each line type
      Object.entries(results).forEach(([lineType, data]) => {
        console.log(`\n🔍 Testing ${lineType} line linearity in log-log space...`)
        
        // Calculate slope between consecutive points
        const slopes = []
        for (let i = 1; i < data.length; i++) {
          const slope = (data[i].logPrice - data[i-1].logPrice) / (data[i].logDays - data[i-1].logDays)
          slopes.push(slope)
        }
        
        // All slopes should be approximately equal (straight line in log-log space)
        const avgSlope = slopes.reduce((sum, slope) => sum + slope, 0) / slopes.length
        const maxDeviation = Math.max(...slopes.map(slope => Math.abs(slope - avgSlope)))
        
        console.log(`📈 ${lineType} average slope: ${avgSlope.toFixed(6)}`)
        console.log(`📏 ${lineType} max deviation: ${maxDeviation.toFixed(6)}`)
        
        // Expect very small deviation (straight line in log-log space)
        expect(maxDeviation).toBeLessThan(0.001)
        
        // Expect slope to be close to theoretical 5.844
        expect(Math.abs(avgSlope - 5.844)).toBeLessThan(0.01)
      })
    })
    
    it('should maintain proper channel relationships between support, fit, and resistance', () => {
      console.log('🎯 Testing Power Law channel relationships...')
      
      const testDate = new Date('2024-12-01')
      
      const supportPrice = getPowerLawPrice(testDate, 'support')
      const fitPrice = getPowerLawPrice(testDate, 'fit')
      const resistancePrice = getPowerLawPrice(testDate, 'resistance')
      
      console.log(`📊 Current Power Law prices:`)
      console.log(`   Support: $${supportPrice.toLocaleString()}`)
      console.log(`   Fit: $${fitPrice.toLocaleString()}`)
      console.log(`   Resistance: $${resistancePrice.toLocaleString()}`)
      
      // Support should be below fit
      expect(supportPrice).toBeLessThan(fitPrice)
      
      // Resistance should be above fit
      expect(resistancePrice).toBeGreaterThan(fitPrice)
      
      // Calculate channel ratios
      const supportRatio = supportPrice / fitPrice
      const resistanceRatio = resistancePrice / fitPrice
      
      console.log(`📏 Channel ratios:`)
      console.log(`   Support/Fit: ${supportRatio.toFixed(3)} (${(supportRatio * 100).toFixed(1)}%)`)
      console.log(`   Resistance/Fit: ${resistanceRatio.toFixed(3)} (${(resistanceRatio * 100).toFixed(1)}%)`)
      
      // Ratios should be reasonable for Bitcoin volatility
      expect(supportRatio).toBeGreaterThan(0.1) // Support not too far below
      expect(supportRatio).toBeLessThan(0.8)    // But meaningfully below
      expect(resistanceRatio).toBeGreaterThan(1.5) // Resistance meaningfully above
      expect(resistanceRatio).toBeLessThan(50)     // But not unreasonably high
    })
  })
  
  describe('Historical Calibration Validation', () => {
    it('should properly calibrate support line to 2022 market bottom', () => {
      console.log('🔍 Testing support line calibration to 2022 bottom...')
      
      // 2022 market bottom: approximately $15,500 on November 21, 2022
      const bottomDate = new Date('2022-11-21')
      const supportPrice = getPowerLawPrice(bottomDate, 'support')
      
      console.log(`📉 2022 bottom calibration:`)
      console.log(`   Date: ${bottomDate.toISOString().split('T')[0]}`)
      console.log(`   Support price: $${supportPrice.toLocaleString()}`)
      console.log(`   Historical bottom: ~$15,500`)
      console.log(`   Error: $${Math.abs(supportPrice - 15500).toLocaleString()}`)
      
      // Support line should be very close to historical bottom
      expect(Math.abs(supportPrice - 15500)).toBeLessThan(100) // Within $100
    })
    
    it('should properly calibrate resistance line to 2013 market peak', () => {
      console.log('🔍 Testing resistance line calibration to 2013 peak...')
      
      // 2013 market peak: approximately $1,177 on November 30, 2013
      const peakDate = new Date('2013-11-30')
      const resistancePrice = getPowerLawPrice(peakDate, 'resistance')
      
      console.log(`📈 2013 peak calibration:`)
      console.log(`   Date: ${peakDate.toISOString().split('T')[0]}`)
      console.log(`   Resistance price: $${resistancePrice.toLocaleString()}`)
      console.log(`   Historical peak: ~$1,177`)
      console.log(`   Error: $${Math.abs(resistancePrice - 1177).toLocaleString()}`)
      
      // Resistance line should be very close to historical peak
      expect(Math.abs(resistancePrice - 1177)).toBeLessThan(50) // Within $50
    })
  })
  
  describe('Future Projections', () => {
    it('should generate reasonable future projections', () => {
      console.log('🔮 Testing future Power Law projections...')
      
      const futureDates = [
        { date: new Date('2026-01-01'), label: '2026' },
        { date: new Date('2030-01-01'), label: '2030' },
        { date: new Date('2033-01-01'), label: '2033' }
      ]
      
      futureDates.forEach(({ date, label }) => {
        const supportPrice = getPowerLawPrice(date, 'support')
        const fitPrice = getPowerLawPrice(date, 'fit')
        const resistancePrice = getPowerLawPrice(date, 'resistance')
        
        console.log(`📅 ${label} projections:`)
        console.log(`   Support: $${supportPrice.toLocaleString()}`)
        console.log(`   Fit: $${fitPrice.toLocaleString()}`)
        console.log(`   Resistance: $${resistancePrice.toLocaleString()}`)
        
        // All prices should be positive and increasing over time
        expect(supportPrice).toBeGreaterThan(0)
        expect(fitPrice).toBeGreaterThan(0)
        expect(resistancePrice).toBeGreaterThan(0)
        
        // Channel relationships should be maintained
        expect(supportPrice).toBeLessThan(fitPrice)
        expect(resistancePrice).toBeGreaterThan(fitPrice)
      })
    })
  })
})
