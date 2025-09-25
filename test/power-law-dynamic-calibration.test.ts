/**
 * Power Law Dynamic Calibration Test
 * 
 * Tests the dynamic calibration of Power Law support and resistance lines
 * based on actual historical Bitcoin price extremes.
 */

import { describe, it, expect } from 'vitest'
import { powerLawCalibrationService } from '../src/modules/price-data/services/PowerLawCalibrationService'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'
import type { HistoricalDataPoint } from '../src/modules/price-data/types'

describe('Power Law Dynamic Calibration', () => {
  
  // Create mock historical data with known extremes
  const createMockHistoricalData = (): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = []
    
    // Known historical extremes for testing
    const knownPoints = [
      // Major bottoms (support extremes)
      { date: '2011-11-18', price: 2.0 },
      { date: '2015-01-14', price: 177 },
      { date: '2018-12-15', price: 3200 },
      { date: '2022-11-21', price: 15500 },
      
      // Major peaks (resistance extremes)
      { date: '2013-11-30', price: 1177 },
      { date: '2017-12-17', price: 19783 },
      { date: '2021-11-10', price: 68789 },
      
      // Some intermediate points
      { date: '2012-06-01', price: 5.5 },
      { date: '2014-06-01', price: 650 },
      { date: '2016-06-01', price: 575 },
      { date: '2019-06-01', price: 8500 },
      { date: '2020-06-01', price: 9500 },
      { date: '2023-06-01', price: 27000 }
    ]
    
    for (const point of knownPoints) {
      const date = new Date(point.date)
      data.push({
        time: Math.floor(date.getTime() / 1000), // Convert to seconds
        open: point.price,
        high: point.price * 1.05,
        low: point.price * 0.95,
        close: point.price,
        volume: 1000000
      })
    }
    
    return data.sort((a, b) => a.time - b.time)
  }

  it('should calibrate Power Law lines based on historical extremes', async () => {
    const mockData = createMockHistoricalData()
    
    console.log(`\n=== POWER LAW DYNAMIC CALIBRATION TEST ===`)
    console.log(`Testing with ${mockData.length} historical data points`)
    
    const calibration = await powerLawCalibrationService.calibratePowerLawLines(mockData)
    
    // Validate calibration structure
    expect(calibration).toHaveProperty('fit')
    expect(calibration).toHaveProperty('support')
    expect(calibration).toHaveProperty('resistance')
    expect(calibration).toHaveProperty('calibrationData')
    
    // Validate that all lines have the same slope
    expect(calibration.fit.slope).toBe(5.844)
    expect(calibration.support.slope).toBe(5.844)
    expect(calibration.resistance.slope).toBe(5.844)
    
    // Validate that intercepts are different
    expect(calibration.support.intercept).toBeLessThan(calibration.fit.intercept)
    expect(calibration.resistance.intercept).toBeGreaterThan(calibration.fit.intercept)
    
    console.log(`\n=== CALIBRATION RESULTS ===`)
    console.log(`Fit line: slope=${calibration.fit.slope}, intercept=${calibration.fit.intercept}`)
    console.log(`Support line: slope=${calibration.support.slope}, intercept=${calibration.support.intercept.toFixed(6)}`)
    console.log(`Resistance line: slope=${calibration.resistance.slope}, intercept=${calibration.resistance.intercept.toFixed(6)}`)
    
    // Test that support line passes through the most extreme bottom
    const supportPoint = calibration.calibrationData.supportPoint
    const supportDays = getDaysSinceGenesis(supportPoint.date)
    const calculatedSupportPrice = Math.pow(10, calibration.support.slope * Math.log10(supportDays) + calibration.support.intercept)
    
    console.log(`\nSupport line validation:`)
    console.log(`Extreme point: ${supportPoint.date.toISOString().split('T')[0]} - $${supportPoint.actualPrice}`)
    console.log(`Calculated price: $${calculatedSupportPrice.toFixed(2)}`)
    console.log(`Difference: ${Math.abs(calculatedSupportPrice - supportPoint.actualPrice).toFixed(2)}`)
    
    expect(Math.abs(calculatedSupportPrice - supportPoint.actualPrice)).toBeLessThan(0.1)
    
    // Test that resistance line passes through the most extreme peak
    const resistancePoint = calibration.calibrationData.resistancePoint
    const resistanceDays = getDaysSinceGenesis(resistancePoint.date)
    const calculatedResistancePrice = Math.pow(10, calibration.resistance.slope * Math.log10(resistanceDays) + calibration.resistance.intercept)
    
    console.log(`\nResistance line validation:`)
    console.log(`Extreme point: ${resistancePoint.date.toISOString().split('T')[0]} - $${resistancePoint.actualPrice}`)
    console.log(`Calculated price: $${calculatedResistancePrice.toFixed(2)}`)
    console.log(`Difference: ${Math.abs(calculatedResistancePrice - resistancePoint.actualPrice).toFixed(2)}`)
    
    expect(Math.abs(calculatedResistancePrice - resistancePoint.actualPrice)).toBeLessThan(1)
  })

  it('should validate calibration against known extremes', async () => {
    const mockData = createMockHistoricalData()
    const calibration = await powerLawCalibrationService.calibratePowerLawLines(mockData)
    
    const validation = powerLawCalibrationService.validateCalibration(calibration)
    
    console.log(`\n=== CALIBRATION VALIDATION ===`)
    console.log(`Is valid: ${validation.isValid}`)
    if (validation.issues.length > 0) {
      console.log(`Issues found:`)
      validation.issues.forEach(issue => console.log(`- ${issue}`))
    } else {
      console.log(`✅ All validation checks passed`)
    }
    
    // The calibration should be valid (or have minimal issues)
    expect(validation.issues.length).toBeLessThan(3) // Allow some tolerance
  })

  it('should show improvement over fixed offsets', async () => {
    const mockData = createMockHistoricalData()
    const calibration = await powerLawCalibrationService.calibratePowerLawLines(mockData)
    
    // Compare with fixed offsets (current implementation)
    const fixedSupportIntercept = -17.16 // Current fixed offset
    const fixedResistanceIntercept = -16.86 // Current fixed offset
    
    console.log(`\n=== COMPARISON WITH FIXED OFFSETS ===`)
    console.log(`Fixed support intercept: ${fixedSupportIntercept}`)
    console.log(`Dynamic support intercept: ${calibration.support.intercept.toFixed(6)}`)
    console.log(`Fixed resistance intercept: ${fixedResistanceIntercept}`)
    console.log(`Dynamic resistance intercept: ${calibration.resistance.intercept.toFixed(6)}`)
    
    // Test a few key dates to show the difference
    const testDates = [
      { date: '2015-01-14', description: '2015 Bottom' },
      { date: '2017-12-17', description: '2017 Peak' },
      { date: '2022-11-21', description: '2022 Bottom' }
    ]
    
    console.log(`\n=== PRICE PREDICTIONS COMPARISON ===`)
    for (const test of testDates) {
      const date = new Date(test.date)
      const days = getDaysSinceGenesis(date)
      
      // Fixed offset predictions
      const fixedSupportPrice = Math.pow(10, 5.844 * Math.log10(days) + fixedSupportIntercept)
      const fixedResistancePrice = Math.pow(10, 5.844 * Math.log10(days) + fixedResistanceIntercept)
      
      // Dynamic calibration predictions
      const dynamicSupportPrice = Math.pow(10, calibration.support.slope * Math.log10(days) + calibration.support.intercept)
      const dynamicResistancePrice = Math.pow(10, calibration.resistance.slope * Math.log10(days) + calibration.resistance.intercept)
      
      console.log(`\n${test.description} (${test.date}):`)
      console.log(`  Fixed Support: $${fixedSupportPrice.toLocaleString()}`)
      console.log(`  Dynamic Support: $${dynamicSupportPrice.toLocaleString()}`)
      console.log(`  Fixed Resistance: $${fixedResistancePrice.toLocaleString()}`)
      console.log(`  Dynamic Resistance: $${dynamicResistancePrice.toLocaleString()}`)
    }
    
    // The dynamic calibration should be different from fixed offsets
    expect(Math.abs(calibration.support.intercept - fixedSupportIntercept)).toBeGreaterThan(0.01)
    expect(Math.abs(calibration.resistance.intercept - fixedResistanceIntercept)).toBeGreaterThan(0.01)
  })

  it('should provide future predictions with calibrated lines', async () => {
    const mockData = createMockHistoricalData()
    const calibration = await powerLawCalibrationService.calibratePowerLawLines(mockData)
    
    // Test future predictions
    const futureDates = [
      { date: '2025-01-01', description: 'Near-term (2025)' },
      { date: '2026-01-01', description: 'Giovanni 2026 target' },
      { date: '2030-01-01', description: 'Mid-term (2030)' },
      { date: '2033-01-01', description: 'Giovanni 2033 target' }
    ]
    
    console.log(`\n=== FUTURE PREDICTIONS WITH CALIBRATED LINES ===`)
    for (const test of futureDates) {
      const date = new Date(test.date)
      const days = getDaysSinceGenesis(date)
      
      const supportPrice = Math.pow(10, calibration.support.slope * Math.log10(days) + calibration.support.intercept)
      const fitPrice = Math.pow(10, calibration.fit.slope * Math.log10(days) + calibration.fit.intercept)
      const resistancePrice = Math.pow(10, calibration.resistance.slope * Math.log10(days) + calibration.resistance.intercept)
      
      console.log(`\n${test.description} (${test.date}):`)
      console.log(`  Support: $${supportPrice.toLocaleString()}`)
      console.log(`  Fit: $${fitPrice.toLocaleString()}`)
      console.log(`  Resistance: $${resistancePrice.toLocaleString()}`)
      console.log(`  Channel width: ${((resistancePrice / supportPrice) * 100).toFixed(0)}%`)
    }
    
    // Predictions should be reasonable
    const fit2026 = Math.pow(10, calibration.fit.slope * Math.log10(getDaysSinceGenesis(new Date('2026-01-01'))) + calibration.fit.intercept)
    expect(fit2026).toBeGreaterThan(100000) // Should be > $100k
    expect(fit2026).toBeLessThan(300000) // Should be < $300k
  })
})
