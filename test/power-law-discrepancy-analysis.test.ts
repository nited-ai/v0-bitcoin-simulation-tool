/**
 * Power Law Discrepancy Analysis
 * 
 * Investigates why we get different constants from different reference points
 * and finds the correct approach to calibrate the model.
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Discrepancy Analysis', () => {
  
  it('should investigate the reference point inconsistency', () => {
    // Reference points from Giovanni's predictions
    const jan2026 = new Date('2026-01-01')
    const year2033 = new Date('2033-01-01')
    
    const targetPrice2026 = 210000
    const targetPrice2033 = 1000000
    
    const days2026 = getDaysSinceGenesis(jan2026)
    const days2033 = getDaysSinceGenesis(year2033)
    
    console.log(`\n=== REFERENCE POINT ANALYSIS ===`)
    console.log(`2026-01-01: ${days2026} days since genesis`)
    console.log(`2033-01-01: ${days2033} days since genesis`)
    console.log(`Days difference: ${days2033 - days2026} days (${((days2033 - days2026) / 365.25).toFixed(1)} years)`)
    
    // Calculate constants from both reference points
    const constant2026 = targetPrice2026 / Math.pow(days2026, 5.8)
    const constant2033 = targetPrice2033 / Math.pow(days2033, 5.8)
    
    console.log(`\nConstant from 2026 target: ${constant2026.toExponential(10)}`)
    console.log(`Constant from 2033 target: ${constant2033.toExponential(10)}`)
    
    const ratio = constant2026 / constant2033
    const percentDiff = Math.abs(constant2026 - constant2033) / constant2026 * 100
    
    console.log(`Ratio (2026/2033): ${ratio.toFixed(3)}`)
    console.log(`Percentage difference: ${percentDiff.toFixed(1)}%`)
    
    // This large difference suggests the reference points are inconsistent
    // with a single power law, or there's an error in the approach
    expect(percentDiff).toBeGreaterThan(30) // This confirms the problem
  })

  it('should test if the reference targets are mathematically consistent', () => {
    // If the targets are consistent with a power law, then:
    // Price2033 / Price2026 should equal (days2033 / days2026)^5.8
    
    const jan2026 = new Date('2026-01-01')
    const year2033 = new Date('2033-01-01')
    
    const targetPrice2026 = 210000
    const targetPrice2033 = 1000000
    
    const days2026 = getDaysSinceGenesis(jan2026)
    const days2033 = getDaysSinceGenesis(year2033)
    
    const actualPriceRatio = targetPrice2033 / targetPrice2026
    const expectedPriceRatio = Math.pow(days2033 / days2026, 5.8)
    
    console.log(`\n=== CONSISTENCY CHECK ===`)
    console.log(`Actual price ratio (2033/2026): ${actualPriceRatio.toFixed(3)}`)
    console.log(`Expected ratio for power law: ${expectedPriceRatio.toFixed(3)}`)
    console.log(`Difference: ${Math.abs(actualPriceRatio - expectedPriceRatio).toFixed(3)}`)
    console.log(`Percentage error: ${(Math.abs(actualPriceRatio - expectedPriceRatio) / expectedPriceRatio * 100).toFixed(1)}%`)
    
    // If these don't match, the reference targets are not consistent with a single power law
    const percentageError = Math.abs(actualPriceRatio - expectedPriceRatio) / expectedPriceRatio * 100
    
    if (percentageError > 5) {
      console.log(`❌ Reference targets are NOT consistent with a single power law!`)
      console.log(`This explains why we get different constants from different reference points.`)
    } else {
      console.log(`✅ Reference targets are consistent with power law.`)
    }
  })

  it('should find the correct constant using current Bitcoin price as calibration', () => {
    // Instead of using future predictions, let's use a known current price point
    // and see what constant that gives us, then project forward
    
    const currentDate = new Date('2024-12-01') // Approximate current date
    const currentPrice = 95000 // Approximate current BTC price
    
    const currentDays = getDaysSinceGenesis(currentDate)
    const currentConstant = currentPrice / Math.pow(currentDays, 5.8)
    
    console.log(`\n=== CURRENT PRICE CALIBRATION ===`)
    console.log(`Current date: ${currentDate.toISOString().split('T')[0]}`)
    console.log(`Current days: ${currentDays}`)
    console.log(`Current price: $${currentPrice.toLocaleString()}`)
    console.log(`Derived constant: ${currentConstant.toExponential(10)}`)
    
    // Now project to 2026 and 2033 using this constant
    const jan2026 = new Date('2026-01-01')
    const year2033 = new Date('2033-01-01')
    
    const days2026 = getDaysSinceGenesis(jan2026)
    const days2033 = getDaysSinceGenesis(year2033)
    
    const projected2026 = currentConstant * Math.pow(days2026, 5.8)
    const projected2033 = currentConstant * Math.pow(days2033, 5.8)
    
    console.log(`\nProjections using current price calibration:`)
    console.log(`2026: $${projected2026.toLocaleString()}`)
    console.log(`2033: $${projected2033.toLocaleString()}`)
    
    console.log(`\nComparison to targets:`)
    console.log(`2026 - Target: $210k, Projected: $${projected2026.toLocaleString()}, Diff: ${((projected2026 - 210000) / 210000 * 100).toFixed(1)}%`)
    console.log(`2033 - Target: $1M, Projected: $${projected2033.toLocaleString()}, Diff: ${((projected2033 - 1000000) / 1000000 * 100).toFixed(1)}%`)
    
    // Convert to log-log parameters
    const intercept = Math.log10(currentConstant)
    console.log(`\nLog-log parameters:`)
    console.log(`Slope: 5.8`)
    console.log(`Intercept: ${intercept}`)
  })

  it('should test different date interpretations', () => {
    // Maybe the issue is with date interpretation
    // Test different interpretations of "early 2026" and "2033"
    
    console.log(`\n=== DATE INTERPRETATION ANALYSIS ===`)
    
    const dateVariations = [
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2026-03-01', date: new Date('2026-03-01') }, // Q1 2026
      { name: '2026-06-01', date: new Date('2026-06-01') }, // Mid 2026
      { name: '2033-01-01', date: new Date('2033-01-01') },
      { name: '2033-06-01', date: new Date('2033-06-01') }, // Mid 2033
      { name: '2033-12-31', date: new Date('2033-12-31') }, // End 2033
    ]
    
    dateVariations.forEach(({ name, date }) => {
      const days = getDaysSinceGenesis(date)
      console.log(`${name}: ${days} days`)
    })
    
    // Test how much the constant changes with different date interpretations
    const target2026 = 210000
    const target2033 = 1000000
    
    console.log(`\nConstant variations:`)
    
    // Early 2026 vs Mid 2026
    const early2026 = getDaysSinceGenesis(new Date('2026-01-01'))
    const mid2026 = getDaysSinceGenesis(new Date('2026-06-01'))
    
    const constantEarly2026 = target2026 / Math.pow(early2026, 5.8)
    const constantMid2026 = target2026 / Math.pow(mid2026, 5.8)
    
    console.log(`Early 2026 constant: ${constantEarly2026.toExponential(6)}`)
    console.log(`Mid 2026 constant: ${constantMid2026.toExponential(6)}`)
    console.log(`Difference: ${((constantEarly2026 - constantMid2026) / constantEarly2026 * 100).toFixed(1)}%`)
  })

  it('should investigate if we need a different approach entirely', () => {
    console.log(`\n=== ALTERNATIVE APPROACHES ===`)
    
    // Maybe the issue is that Giovanni's model isn't a pure power law
    // or has additional factors we're missing
    
    console.log(`Possible issues:`)
    console.log(`1. Reference targets are approximate, not exact`)
    console.log(`2. Giovanni's model has additional factors beyond pure power law`)
    console.log(`3. The exponent might not be exactly 5.8`)
    console.log(`4. There might be different constants for different time periods`)
    console.log(`5. The model might use a different genesis date or calculation method`)
    
    // Test with slightly different exponents
    const testExponents = [5.7, 5.75, 5.8, 5.85, 5.9]
    const jan2026 = new Date('2026-01-01')
    const year2033 = new Date('2033-01-01')
    const days2026 = getDaysSinceGenesis(jan2026)
    const days2033 = getDaysSinceGenesis(year2033)
    
    console.log(`\nTesting different exponents:`)
    testExponents.forEach(exp => {
      const constant2026 = 210000 / Math.pow(days2026, exp)
      const constant2033 = 1000000 / Math.pow(days2033, exp)
      const diff = Math.abs(constant2026 - constant2033) / constant2026 * 100
      
      console.log(`Exponent ${exp}: Constants differ by ${diff.toFixed(1)}%`)
    })
  })
})
