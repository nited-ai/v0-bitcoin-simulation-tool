/**
 * BitBo Chart Reference Calibration
 * 
 * Uses actual data points from the BitBo Power Law chart to calibrate our model
 * with precise reference values instead of approximate predictions.
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('BitBo Reference Calibration', () => {
  
  it('should analyze all BitBo reference points', () => {
    // Reference points from BitBo chart screenshots
    const referencePoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    console.log(`\n=== BITBO REFERENCE POINTS ANALYSIS ===`)
    
    const constants = []
    
    referencePoints.forEach(point => {
      const date = new Date(point.date)
      const days = getDaysSinceGenesis(date)
      const constant = point.price / Math.pow(days, 5.8)
      constants.push(constant)
      
      console.log(`${point.date}: ${days} days, $${point.price.toLocaleString()}, constant: ${constant.toExponential(6)}`)
    })
    
    // Calculate statistics
    const avgConstant = constants.reduce((sum, c) => sum + c, 0) / constants.length
    const minConstant = Math.min(...constants)
    const maxConstant = Math.max(...constants)
    const stdDev = Math.sqrt(constants.reduce((sum, c) => sum + Math.pow(c - avgConstant, 2), 0) / constants.length)
    
    console.log(`\nStatistics:`)
    console.log(`Average constant: ${avgConstant.toExponential(6)}`)
    console.log(`Min constant: ${minConstant.toExponential(6)}`)
    console.log(`Max constant: ${maxConstant.toExponential(6)}`)
    console.log(`Standard deviation: ${stdDev.toExponential(6)}`)
    console.log(`Coefficient of variation: ${(stdDev / avgConstant * 100).toFixed(2)}%`)
    
    // Check consistency
    const maxVariation = (maxConstant - minConstant) / avgConstant * 100
    console.log(`Maximum variation from average: ${maxVariation.toFixed(2)}%`)
    
    if (maxVariation < 10) {
      console.log(`✅ BitBo reference points are highly consistent!`)
    } else if (maxVariation < 20) {
      console.log(`⚠️ BitBo reference points have moderate variation`)
    } else {
      console.log(`❌ BitBo reference points have high variation`)
    }
    
    return avgConstant
  })

  it('should find the best-fit constant using BitBo data', () => {
    const referencePoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    // Calculate weighted average (more weight to recent/reliable points)
    const weights = [0.1, 0.3, 0.3, 0.2, 0.1] // More weight to 2023-2031 range
    
    let weightedSum = 0
    let totalWeight = 0
    
    referencePoints.forEach((point, index) => {
      const date = new Date(point.date)
      const days = getDaysSinceGenesis(date)
      const constant = point.price / Math.pow(days, 5.8)
      const weight = weights[index]
      
      weightedSum += constant * weight
      totalWeight += weight
    })
    
    const bestConstant = weightedSum / totalWeight
    
    console.log(`\n=== BEST-FIT CONSTANT ===`)
    console.log(`Weighted average constant: ${bestConstant.toExponential(10)}`)
    
    // Convert to log-log parameters
    const intercept = Math.log10(bestConstant)
    console.log(`Log-log intercept: ${intercept}`)
    
    // Test predictions with this constant
    console.log(`\n=== PREDICTIONS WITH BEST-FIT CONSTANT ===`)
    
    const testDates = [
      { name: '2024-12-01', date: new Date('2024-12-01') },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2030-01-01', date: new Date('2030-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') }
    ]
    
    testDates.forEach(({ name, date }) => {
      const days = getDaysSinceGenesis(date)
      const predictedPrice = bestConstant * Math.pow(days, 5.8)
      console.log(`${name}: $${predictedPrice.toLocaleString()}`)
    })
    
    return { constant: bestConstant, intercept }
  })

  it('should validate against BitBo reference points', () => {
    // Use the best-fit constant to validate against all reference points
    const bestConstant = 1.4e-17 // Approximate from previous calculation
    
    const referencePoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    console.log(`\n=== VALIDATION AGAINST BITBO POINTS ===`)
    console.log(`Using constant: ${bestConstant.toExponential(6)}`)
    
    let totalError = 0
    let maxError = 0
    
    referencePoints.forEach(point => {
      const date = new Date(point.date)
      const days = getDaysSinceGenesis(date)
      const predicted = bestConstant * Math.pow(days, 5.8)
      const error = Math.abs(predicted - point.price) / point.price * 100
      
      totalError += error
      maxError = Math.max(maxError, error)
      
      console.log(`${point.date}: Actual $${point.price.toLocaleString()}, Predicted $${predicted.toLocaleString()}, Error: ${error.toFixed(1)}%`)
    })
    
    const avgError = totalError / referencePoints.length
    
    console.log(`\nValidation Results:`)
    console.log(`Average error: ${avgError.toFixed(2)}%`)
    console.log(`Maximum error: ${maxError.toFixed(2)}%`)
    
    if (avgError < 5) {
      console.log(`✅ Excellent fit!`)
    } else if (avgError < 10) {
      console.log(`✅ Good fit`)
    } else {
      console.log(`⚠️ Moderate fit - may need adjustment`)
    }
  })

  it('should compare with Giovanni predictions', () => {
    // Now compare our BitBo-calibrated model with Giovanni's predictions
    const bestConstant = 1.4e-17
    
    const giovanniTargets = [
      { date: '2026-01-01', target: 210000, description: 'Giovanni ~$210k early 2026' },
      { date: '2033-01-01', target: 1000000, description: 'Giovanni $1M by 2033' }
    ]
    
    console.log(`\n=== COMPARISON WITH GIOVANNI PREDICTIONS ===`)
    
    giovanniTargets.forEach(({ date, target, description }) => {
      const days = getDaysSinceGenesis(new Date(date))
      const predicted = bestConstant * Math.pow(days, 5.8)
      const error = (predicted - target) / target * 100
      
      console.log(`${description}:`)
      console.log(`  Target: $${target.toLocaleString()}`)
      console.log(`  BitBo model: $${predicted.toLocaleString()}`)
      console.log(`  Difference: ${error > 0 ? '+' : ''}${error.toFixed(1)}%`)
      console.log()
    })
  })

  it('should provide final calibrated parameters', () => {
    // Calculate the final parameters for implementation
    const referencePoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    // Calculate simple average for final implementation
    const constants = referencePoints.map(point => {
      const date = new Date(point.date)
      const days = getDaysSinceGenesis(date)
      return point.price / Math.pow(days, 5.8)
    })
    
    const finalConstant = constants.reduce((sum, c) => sum + c, 0) / constants.length
    const finalIntercept = Math.log10(finalConstant)
    
    console.log(`\n=== FINAL CALIBRATED PARAMETERS ===`)
    console.log(`Constant: ${finalConstant.toExponential(10)}`)
    console.log(`Log-log intercept: ${finalIntercept}`)
    console.log(`Formula: Price = ${finalConstant.toExponential(6)} × (days since genesis)^5.8`)
    console.log(`Log formula: log10(Price) = ${finalIntercept.toFixed(6)} + 5.8 × log10(days)`)
    
    // Support and resistance lines (typically ±0.15 from fit line)
    const supportIntercept = finalIntercept - 0.15
    const resistanceIntercept = finalIntercept + 0.15
    
    console.log(`\nPower Law Lines:`)
    console.log(`Support line intercept: ${supportIntercept.toFixed(6)}`)
    console.log(`Fit line intercept: ${finalIntercept.toFixed(6)}`)
    console.log(`Resistance line intercept: ${resistanceIntercept.toFixed(6)}`)
    
    return {
      constant: finalConstant,
      intercept: finalIntercept,
      supportIntercept,
      resistanceIntercept
    }
  })
})
