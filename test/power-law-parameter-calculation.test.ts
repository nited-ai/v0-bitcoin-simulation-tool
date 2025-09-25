/**
 * Power Law Parameter Calculation Test
 * 
 * Calculates the exact parameters needed to match Giovanni's predictions
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Parameter Calculation', () => {
  
  it('should calculate exact parameters for Giovanni\'s predictions', () => {
    // Reference points from Giovanni Santostasi
    const jan2026 = new Date('2026-01-01')
    const year2033 = new Date('2033-01-01')
    
    const targetPrice2026 = 210000
    const targetPrice2033 = 1000000
    
    const days2026 = getDaysSinceGenesis(jan2026)
    const days2033 = getDaysSinceGenesis(year2033)
    
    console.log(`Days since genesis:`)
    console.log(`2026-01-01: ${days2026} days`)
    console.log(`2033-01-01: ${days2033} days`)
    
    // Calculate constants from both reference points
    const constant2026 = targetPrice2026 / Math.pow(days2026, 5.8)
    const constant2033 = targetPrice2033 / Math.pow(days2033, 5.8)
    
    console.log(`\nConstants calculated:`)
    console.log(`From $210k in 2026: ${constant2026.toExponential(10)}`)
    console.log(`From $1M in 2033: ${constant2033.toExponential(10)}`)
    
    // The difference suggests we need to find a compromise
    const tolerance = Math.abs(constant2026 - constant2033) / constant2026
    console.log(`Tolerance: ${(tolerance * 100).toFixed(2)}%`)
    
    // Try different approaches to find the best constant
    
    // Approach 1: Geometric mean
    const geometricMean = Math.sqrt(constant2026 * constant2033)
    console.log(`\nGeometric mean constant: ${geometricMean.toExponential(10)}`)
    
    // Test geometric mean
    const testPrice2026_geo = geometricMean * Math.pow(days2026, 5.8)
    const testPrice2033_geo = geometricMean * Math.pow(days2033, 5.8)
    console.log(`Geometric mean test - 2026: $${testPrice2026_geo.toLocaleString()}, 2033: $${testPrice2033_geo.toLocaleString()}`)
    
    // Approach 2: Weighted average (favor the closer date)
    const weight2026 = 0.6 // Give more weight to 2026 prediction
    const weight2033 = 0.4
    const weightedAverage = (constant2026 * weight2026) + (constant2033 * weight2033)
    console.log(`\nWeighted average constant: ${weightedAverage.toExponential(10)}`)
    
    // Test weighted average
    const testPrice2026_weighted = weightedAverage * Math.pow(days2026, 5.8)
    const testPrice2033_weighted = weightedAverage * Math.pow(days2033, 5.8)
    console.log(`Weighted average test - 2026: $${testPrice2026_weighted.toLocaleString()}, 2033: $${testPrice2033_weighted.toLocaleString()}`)
    
    // Approach 3: Find optimal constant that minimizes total error
    const findOptimalConstant = () => {
      let bestConstant = constant2026
      let minError = Infinity
      
      // Test constants in a range
      for (let i = 0; i < 1000; i++) {
        const testConstant = constant2033 + (constant2026 - constant2033) * (i / 999)
        
        const pred2026 = testConstant * Math.pow(days2026, 5.8)
        const pred2033 = testConstant * Math.pow(days2033, 5.8)
        
        const error2026 = Math.abs(pred2026 - targetPrice2026) / targetPrice2026
        const error2033 = Math.abs(pred2033 - targetPrice2033) / targetPrice2033
        
        const totalError = error2026 + error2033
        
        if (totalError < minError) {
          minError = totalError
          bestConstant = testConstant
        }
      }
      
      return bestConstant
    }
    
    const optimalConstant = findOptimalConstant()
    console.log(`\nOptimal constant: ${optimalConstant.toExponential(10)}`)
    
    // Test optimal constant
    const testPrice2026_optimal = optimalConstant * Math.pow(days2026, 5.8)
    const testPrice2033_optimal = optimalConstant * Math.pow(days2033, 5.8)
    console.log(`Optimal test - 2026: $${testPrice2026_optimal.toLocaleString()}, 2033: $${testPrice2033_optimal.toLocaleString()}`)
    
    const error2026 = Math.abs(testPrice2026_optimal - targetPrice2026) / targetPrice2026 * 100
    const error2033 = Math.abs(testPrice2033_optimal - targetPrice2033) / targetPrice2033 * 100
    console.log(`Errors - 2026: ${error2026.toFixed(2)}%, 2033: ${error2033.toFixed(2)}%`)
    
    // Convert to log-log parameters
    const optimalSlope = 5.8
    const optimalIntercept = Math.log10(optimalConstant)
    
    console.log(`\nOptimal Power Law parameters:`)
    console.log(`Slope: ${optimalSlope}`)
    console.log(`Intercept: ${optimalIntercept}`)
    
    // Verify the log-log formula
    const verifyPrice2026 = Math.pow(10, optimalSlope * Math.log10(days2026) + optimalIntercept)
    const verifyPrice2033 = Math.pow(10, optimalSlope * Math.log10(days2033) + optimalIntercept)
    console.log(`\nVerification with log-log formula:`)
    console.log(`2026: $${verifyPrice2026.toLocaleString()}`)
    console.log(`2033: $${verifyPrice2033.toLocaleString()}`)
    
    // The optimal constant should produce reasonable results
    expect(testPrice2026_optimal).toBeGreaterThan(190000)
    expect(testPrice2026_optimal).toBeLessThan(230000)
    expect(testPrice2033_optimal).toBeGreaterThan(900000)
    expect(testPrice2033_optimal).toBeLessThan(1100000)
    
    // Return the optimal parameters for use in the actual implementation
    return {
      constant: optimalConstant,
      slope: optimalSlope,
      intercept: optimalIntercept
    }
  })
  
  it('should calculate support and resistance line parameters', () => {
    // Use the fit line as the base and calculate support/resistance adjustments
    const jan2026 = new Date('2026-01-01')
    const days2026 = getDaysSinceGenesis(jan2026)
    
    // From the previous test, we know the optimal constant for the fit line
    // Let's assume we want support to be ~30% below fit and resistance ~80% above fit
    const fitConstant = 2.0e-17 // This will be refined based on the previous test
    
    const supportMultiplier = 0.7 // 30% below
    const resistanceMultiplier = 1.8 // 80% above
    
    const supportConstant = fitConstant * supportMultiplier
    const resistanceConstant = fitConstant * resistanceMultiplier
    
    console.log(`Line constants:`)
    console.log(`Fit: ${fitConstant.toExponential(10)}`)
    console.log(`Support: ${supportConstant.toExponential(10)}`)
    console.log(`Resistance: ${resistanceConstant.toExponential(10)}`)
    
    // Convert to intercepts
    const fitIntercept = Math.log10(fitConstant)
    const supportIntercept = Math.log10(supportConstant)
    const resistanceIntercept = Math.log10(resistanceConstant)
    
    console.log(`\nIntercepts:`)
    console.log(`Fit: ${fitIntercept}`)
    console.log(`Support: ${supportIntercept}`)
    console.log(`Resistance: ${resistanceIntercept}`)
    
    // Test the lines for 2026
    const fitPrice2026 = Math.pow(10, 5.8 * Math.log10(days2026) + fitIntercept)
    const supportPrice2026 = Math.pow(10, 5.8 * Math.log10(days2026) + supportIntercept)
    const resistancePrice2026 = Math.pow(10, 5.8 * Math.log10(days2026) + resistanceIntercept)
    
    console.log(`\n2026 predictions:`)
    console.log(`Support: $${supportPrice2026.toLocaleString()}`)
    console.log(`Fit: $${fitPrice2026.toLocaleString()}`)
    console.log(`Resistance: $${resistancePrice2026.toLocaleString()}`)
    
    // Verify relationships
    expect(supportPrice2026).toBeLessThan(fitPrice2026)
    expect(fitPrice2026).toBeLessThan(resistancePrice2026)
  })
})
