/**
 * BitBo Exact Formula Test
 * 
 * Tests the exact formula from BitBo chart:
 * Power law p=A*(t-t1)^alpha
 * A = 3.4896e-18, alpha = 5.9762, t1 = days from Jan 3, 2009
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('BitBo Exact Formula', () => {
  
  it('should test the exact BitBo formula from screenshot', () => {
    // From the screenshot:
    // Power law p=A*(t-t1)^alpha
    // A = 3.4896e-18
    // alpha = 5.9762
    // t1 = days from Jan 3, 2009
    // R² = 0.92101
    
    const A = 3.4896e-18
    const alpha = 5.9762
    
    console.log(`\n=== BITBO EXACT FORMULA TEST ===`)
    console.log(`Formula: p = ${A.toExponential(6)} × (days since genesis)^${alpha}`)
    
    // Test with our reference points
    const testPoints = [
      { date: '2011-01-01', expectedPrice: 0.53 },
      { date: '2040-01-01', expectedPrice: 4785285.25 },
      { date: '2026-01-01', description: 'Giovanni 2026 target' },
      { date: '2033-01-01', description: 'Giovanni 2033 target' }
    ]
    
    testPoints.forEach(point => {
      const days = getDaysSinceGenesis(new Date(point.date))
      const predictedPrice = A * Math.pow(days, alpha)
      
      if (point.expectedPrice) {
        const error = Math.abs(predictedPrice - point.expectedPrice) / point.expectedPrice * 100
        console.log(`${point.date}: Expected $${point.expectedPrice}, Predicted $${predictedPrice.toLocaleString()}, Error: ${error.toFixed(1)}%`)
      } else {
        console.log(`${point.date} (${point.description}): $${predictedPrice.toLocaleString()}`)
      }
    })
  })

  it('should test what happens with slope 5.8 and the "1" factor', () => {
    // The user asks about using 5.8 and what about the "1"
    // The "1" might refer to (t-t1) where t1 is the offset
    
    console.log(`\n=== TESTING SLOPE 5.8 WITH DIFFERENT APPROACHES ===`)
    
    // Approach 1: Use Giovanni's 5.8 with BitBo's constant
    const bitboConstant = 3.4896e-18
    const giovanniSlope = 5.8
    
    console.log(`\nApproach 1: BitBo constant (${bitboConstant.toExponential(6)}) + Giovanni slope (${giovanniSlope})`)
    
    const testDates = [
      { name: '2011-01-01', date: new Date('2011-01-01'), expected: 0.53 },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') },
      { name: '2040-01-01', date: new Date('2040-01-01'), expected: 4785285.25 }
    ]
    
    testDates.forEach(({ name, date, expected }) => {
      const days = getDaysSinceGenesis(date)
      const predicted = bitboConstant * Math.pow(days, giovanniSlope)
      
      if (expected) {
        const error = Math.abs(predicted - expected) / expected * 100
        console.log(`  ${name}: Expected $${expected}, Predicted $${predicted.toLocaleString()}, Error: ${error.toFixed(1)}%`)
      } else {
        console.log(`  ${name}: $${predicted.toLocaleString()}`)
      }
    })
    
    // Approach 2: What if the "1" means (days - 1) or some offset?
    console.log(`\nApproach 2: Testing (days - 1) offset`)
    
    testDates.forEach(({ name, date, expected }) => {
      const days = getDaysSinceGenesis(date)
      const predicted = bitboConstant * Math.pow(days - 1, giovanniSlope) // Using (days - 1)
      
      if (expected) {
        const error = Math.abs(predicted - expected) / expected * 100
        console.log(`  ${name}: Expected $${expected}, Predicted $${predicted.toLocaleString()}, Error: ${error.toFixed(1)}%`)
      } else {
        console.log(`  ${name}: $${predicted.toLocaleString()}`)
      }
    })
  })

  it('should find the best constant for slope 5.8', () => {
    // If we force the slope to be 5.8, what constant gives the best fit?
    
    const targetSlope = 5.8
    
    // Use our reference points to find the best constant
    const point1 = { date: '2011-01-01', price: 0.53, days: getDaysSinceGenesis(new Date('2011-01-01')) }
    const point2 = { date: '2040-01-01', price: 4785285.25, days: getDaysSinceGenesis(new Date('2040-01-01')) }
    
    // Calculate constants from both points
    const constant1 = point1.price / Math.pow(point1.days, targetSlope)
    const constant2 = point2.price / Math.pow(point2.days, targetSlope)
    
    console.log(`\n=== BEST CONSTANT FOR SLOPE 5.8 ===`)
    console.log(`Constant from 2011 point: ${constant1.toExponential(10)}`)
    console.log(`Constant from 2040 point: ${constant2.toExponential(10)}`)
    
    const avgConstant = (constant1 + constant2) / 2
    const percentDiff = Math.abs(constant1 - constant2) / avgConstant * 100
    
    console.log(`Average constant: ${avgConstant.toExponential(10)}`)
    console.log(`Difference between constants: ${percentDiff.toFixed(1)}%`)
    
    // Test predictions with average constant
    console.log(`\nPredictions with slope 5.8 and average constant:`)
    
    const testDates = [
      { name: '2024-12-01', date: new Date('2024-12-01') },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') }
    ]
    
    testDates.forEach(({ name, date }) => {
      const days = getDaysSinceGenesis(date)
      const predicted = avgConstant * Math.pow(days, targetSlope)
      console.log(`  ${name}: $${predicted.toLocaleString()}`)
    })
    
    // Compare with Giovanni targets
    const giovanni2026 = 210000
    const giovanni2033 = 1000000
    
    const predicted2026 = avgConstant * Math.pow(getDaysSinceGenesis(new Date('2026-01-01')), targetSlope)
    const predicted2033 = avgConstant * Math.pow(getDaysSinceGenesis(new Date('2033-01-01')), targetSlope)
    
    const error2026 = (predicted2026 - giovanni2026) / giovanni2026 * 100
    const error2033 = (predicted2033 - giovanni2033) / giovanni2033 * 100
    
    console.log(`\nComparison with Giovanni targets:`)
    console.log(`2026 - Target: $${giovanni2026.toLocaleString()}, Predicted: $${predicted2026.toLocaleString()}, Error: ${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}%`)
    console.log(`2033 - Target: $${giovanni2033.toLocaleString()}, Predicted: $${predicted2033.toLocaleString()}, Error: ${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}%`)
    
    return { constant: avgConstant, slope: targetSlope }
  })

  it('should compare all approaches', () => {
    console.log(`\n=== COMPARISON OF ALL APPROACHES ===`)
    
    const approaches = [
      {
        name: 'Our Exact Fit',
        slope: 5.836656989322271,
        constant: 1.0447124016e-17
      },
      {
        name: 'BitBo Screenshot',
        slope: 5.9762,
        constant: 3.4896e-18
      },
      {
        name: 'Giovanni Slope + Best Constant',
        slope: 5.8,
        constant: 1.3301905849e-17 // This will be calculated
      }
    ]
    
    // Calculate the best constant for Giovanni's slope
    const point1Days = getDaysSinceGenesis(new Date('2011-01-01'))
    const point2Days = getDaysSinceGenesis(new Date('2040-01-01'))
    const constant1 = 0.53 / Math.pow(point1Days, 5.8)
    const constant2 = 4785285.25 / Math.pow(point2Days, 5.8)
    approaches[2].constant = (constant1 + constant2) / 2
    
    const testDate2026 = new Date('2026-01-01')
    const testDate2033 = new Date('2033-01-01')
    const days2026 = getDaysSinceGenesis(testDate2026)
    const days2033 = getDaysSinceGenesis(testDate2033)
    
    approaches.forEach(approach => {
      const pred2026 = approach.constant * Math.pow(days2026, approach.slope)
      const pred2033 = approach.constant * Math.pow(days2033, approach.slope)
      
      console.log(`\n${approach.name}:`)
      console.log(`  Slope: ${approach.slope}`)
      console.log(`  Constant: ${approach.constant.toExponential(6)}`)
      console.log(`  2026: $${pred2026.toLocaleString()}`)
      console.log(`  2033: $${pred2033.toLocaleString()}`)
    })
  })
})
