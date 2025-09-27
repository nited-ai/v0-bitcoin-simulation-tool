/**
 * Proper Power Law Fit Analysis
 * 
 * Uses the correct approach: fit a line between 2011 start point and 2040 target
 * to determine the proper Power Law parameters.
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Proper Power Law Fit', () => {
  
  it('should calculate the correct fit using 2011 start and 2040 end points', () => {
    // From the BitBo chart screenshots:
    // 2011 start point: ~$0.53 (or should we use a different early point?)
    // 2040 target point: $4,785,285.25
    
    // Let me use the 2011 point you mentioned
    const startPoint = {
      date: '2011-01-01', // Approximate date for the $0.53 price
      price: 0.53
    }
    
    const endPoint = {
      date: '2040-01-01',
      price: 4785285.25
    }
    
    console.log(`\n=== PROPER POWER LAW FIT ANALYSIS ===`)
    console.log(`Start point: ${startPoint.date} - $${startPoint.price}`)
    console.log(`End point: ${endPoint.date} - $${endPoint.price.toLocaleString()}`)
    
    const startDays = getDaysSinceGenesis(new Date(startPoint.date))
    const endDays = getDaysSinceGenesis(new Date(endPoint.date))
    
    console.log(`Start days since genesis: ${startDays}`)
    console.log(`End days since genesis: ${endDays}`)
    console.log(`Time span: ${endDays - startDays} days (${((endDays - startDays) / 365.25).toFixed(1)} years)`)
    
    // Calculate the constant that fits both points with exponent 5.8
    // For a power law: Price = constant × days^5.8
    // We have two equations:
    // startPrice = constant × startDays^5.8
    // endPrice = constant × endDays^5.8
    
    // From the first equation: constant = startPrice / startDays^5.8
    const constantFromStart = startPoint.price / Math.pow(startDays, 5.8)
    
    // From the second equation: constant = endPrice / endDays^5.8
    const constantFromEnd = endPoint.price / Math.pow(endDays, 5.8)
    
    console.log(`\nConstant from start point: ${constantFromStart.toExponential(10)}`)
    console.log(`Constant from end point: ${constantFromEnd.toExponential(10)}`)
    
    // Check if they match (they should if the points are on the same power law)
    const ratio = constantFromStart / constantFromEnd
    const percentDiff = Math.abs(constantFromStart - constantFromEnd) / constantFromStart * 100
    
    console.log(`Ratio (start/end): ${ratio.toFixed(6)}`)
    console.log(`Percentage difference: ${percentDiff.toFixed(2)}%`)
    
    if (percentDiff < 1) {
      console.log(`✅ Points are consistent with power law!`)
    } else {
      console.log(`❌ Points are not perfectly consistent - ${percentDiff.toFixed(1)}% difference`)
    }
    
    // Use the average as the best fit
    const bestFitConstant = (constantFromStart + constantFromEnd) / 2
    console.log(`Best fit constant (average): ${bestFitConstant.toExponential(10)}`)
    
    return bestFitConstant
  })

  it('should test different early reference points', () => {
    // Test different early points to see which gives the best fit with 2040
    const endPoint = {
      date: '2040-01-01',
      price: 4785285.25
    }
    
    const earlyPoints = [
      { date: '2010-01-01', price: 0.19, description: '2010 early price' },
      { date: '2011-01-01', price: 0.53, description: '2011 price from chart' },
      { date: '2011-06-01', price: 10.89, description: '2011 mid-year peak' },
      { date: '2012-01-01', price: 5.0, description: '2012 estimated price' }
    ]
    
    console.log(`\n=== TESTING DIFFERENT EARLY REFERENCE POINTS ===`)
    console.log(`End point: ${endPoint.date} - $${endPoint.price.toLocaleString()}`)
    
    const endDays = getDaysSinceGenesis(new Date(endPoint.date))
    const endConstant = endPoint.price / Math.pow(endDays, 5.8)
    
    earlyPoints.forEach(point => {
      const startDays = getDaysSinceGenesis(new Date(point.date))
      const startConstant = point.price / Math.pow(startDays, 5.8)
      
      const percentDiff = Math.abs(startConstant - endConstant) / endConstant * 100
      
      console.log(`\n${point.description}:`)
      console.log(`  Date: ${point.date}, Price: $${point.price}`)
      console.log(`  Days: ${startDays}`)
      console.log(`  Constant: ${startConstant.toExponential(6)}`)
      console.log(`  Difference from 2040: ${percentDiff.toFixed(1)}%`)
      
      if (percentDiff < 5) {
        console.log(`  ✅ Good fit!`)
      } else if (percentDiff < 15) {
        console.log(`  ⚠️ Moderate fit`)
      } else {
        console.log(`  ❌ Poor fit`)
      }
    })
  })

  it('should calculate the optimal constant using best early point', () => {
    // Based on the analysis above, use the best fitting early point
    // Let's assume the 2011 point gives us the best fit
    
    const startPoint = { date: '2011-01-01', price: 0.53 }
    const endPoint = { date: '2040-01-01', price: 4785285.25 }
    
    const startDays = getDaysSinceGenesis(new Date(startPoint.date))
    const endDays = getDaysSinceGenesis(new Date(endPoint.date))
    
    const startConstant = startPoint.price / Math.pow(startDays, 5.8)
    const endConstant = endPoint.price / Math.pow(endDays, 5.8)
    
    const optimalConstant = (startConstant + endConstant) / 2
    const optimalIntercept = Math.log10(optimalConstant)
    
    console.log(`\n=== OPTIMAL POWER LAW PARAMETERS ===`)
    console.log(`Optimal constant: ${optimalConstant.toExponential(10)}`)
    console.log(`Optimal intercept: ${optimalIntercept}`)
    console.log(`Formula: Price = ${optimalConstant.toExponential(6)} × (days since genesis)^5.8`)
    
    // Test predictions with this constant
    const testDates = [
      { name: '2024-12-01', date: new Date('2024-12-01') },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2030-01-01', date: new Date('2030-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') }
    ]
    
    console.log(`\n=== PREDICTIONS WITH OPTIMAL CONSTANT ===`)
    testDates.forEach(({ name, date }) => {
      const days = getDaysSinceGenesis(date)
      const predictedPrice = optimalConstant * Math.pow(days, 5.8)
      console.log(`${name}: $${predictedPrice.toLocaleString()}`)
    })
    
    // Compare with Giovanni's targets
    const giovanni2026 = 210000
    const giovanni2033 = 1000000
    
    const predicted2026 = optimalConstant * Math.pow(getDaysSinceGenesis(new Date('2026-01-01')), 5.8)
    const predicted2033 = optimalConstant * Math.pow(getDaysSinceGenesis(new Date('2033-01-01')), 5.8)
    
    const error2026 = (predicted2026 - giovanni2026) / giovanni2026 * 100
    const error2033 = (predicted2033 - giovanni2033) / giovanni2033 * 100
    
    console.log(`\n=== COMPARISON WITH GIOVANNI TARGETS ===`)
    console.log(`2026 - Target: $${giovanni2026.toLocaleString()}, Predicted: $${predicted2026.toLocaleString()}, Error: ${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}%`)
    console.log(`2033 - Target: $${giovanni2033.toLocaleString()}, Predicted: $${predicted2033.toLocaleString()}, Error: ${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}%`)
    
    return {
      constant: optimalConstant,
      intercept: optimalIntercept,
      error2026,
      error2033
    }
  })

  it('should verify the fit quality', () => {
    // Test how well our fitted line matches intermediate points
    const fittedConstant = 1.47e-17 // Approximate from previous calculation
    
    // Test against some intermediate BitBo points
    const intermediatePoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 }
    ]
    
    console.log(`\n=== FIT QUALITY VERIFICATION ===`)
    console.log(`Using fitted constant: ${fittedConstant.toExponential(6)}`)
    
    let totalError = 0
    intermediatePoints.forEach(point => {
      const days = getDaysSinceGenesis(new Date(point.date))
      const predicted = fittedConstant * Math.pow(days, 5.8)
      const error = Math.abs(predicted - point.price) / point.price * 100
      totalError += error
      
      console.log(`${point.date}: Actual $${point.price.toLocaleString()}, Predicted $${predicted.toLocaleString()}, Error: ${error.toFixed(1)}%`)
    })
    
    const avgError = totalError / intermediatePoints.length
    console.log(`\nAverage error: ${avgError.toFixed(1)}%`)
    
    if (avgError < 20) {
      console.log(`✅ Good fit quality!`)
    } else {
      console.log(`⚠️ Moderate fit quality - may need adjustment`)
    }
  })
})
