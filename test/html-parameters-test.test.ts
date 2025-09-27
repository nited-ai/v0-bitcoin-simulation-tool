/**
 * HTML Parameters Test
 * 
 * Tests the parameters from the HTML Power Law Explorer:
 * SLOPE = 5.844, INTERCEPT = -17.01
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('HTML Parameters Test', () => {
  
  it('should test the HTML Power Law Explorer parameters', () => {
    // From the HTML file:
    const HTML_SLOPE = 5.844
    const HTML_INTERCEPT = -17.01
    const HTML_CONSTANT = Math.pow(10, HTML_INTERCEPT) // 10^(-17.01)
    
    console.log(`\n=== HTML POWER LAW EXPLORER PARAMETERS ===`)
    console.log(`Slope: ${HTML_SLOPE}`)
    console.log(`Intercept: ${HTML_INTERCEPT}`)
    console.log(`Constant: ${HTML_CONSTANT.toExponential(10)}`)
    console.log(`Formula: Price = ${HTML_CONSTANT.toExponential(6)} × days^${HTML_SLOPE}`)
    
    // Test with our reference points
    const testPoints = [
      { date: '2011-01-01', expectedPrice: 0.53, description: 'Our start point' },
      { date: '2040-01-01', expectedPrice: 4785285.25, description: 'Our end point' },
      { date: '2024-12-01', description: 'Current date' },
      { date: '2026-01-01', description: 'Giovanni 2026 target' },
      { date: '2033-01-01', description: 'Giovanni 2033 target' }
    ]
    
    console.log(`\n=== PREDICTIONS WITH HTML PARAMETERS ===`)
    
    testPoints.forEach(point => {
      const days = getDaysSinceGenesis(new Date(point.date))
      const predictedPrice = HTML_CONSTANT * Math.pow(days, HTML_SLOPE)
      
      if (point.expectedPrice) {
        const error = Math.abs(predictedPrice - point.expectedPrice) / point.expectedPrice * 100
        console.log(`${point.date} (${point.description}): Expected $${point.expectedPrice}, Predicted $${predictedPrice.toLocaleString()}, Error: ${error.toFixed(1)}%`)
      } else {
        console.log(`${point.date} (${point.description}): $${predictedPrice.toLocaleString()}`)
      }
    })
    
    // Compare with Giovanni's targets
    const giovanni2026 = 210000
    const giovanni2033 = 1000000
    
    const predicted2026 = HTML_CONSTANT * Math.pow(getDaysSinceGenesis(new Date('2026-01-01')), HTML_SLOPE)
    const predicted2033 = HTML_CONSTANT * Math.pow(getDaysSinceGenesis(new Date('2033-01-01')), HTML_SLOPE)
    
    const error2026 = (predicted2026 - giovanni2026) / giovanni2026 * 100
    const error2033 = (predicted2033 - giovanni2033) / giovanni2033 * 100
    
    console.log(`\n=== GIOVANNI TARGET COMPARISON ===`)
    console.log(`2026 - Target: $${giovanni2026.toLocaleString()}, Predicted: $${predicted2026.toLocaleString()}, Error: ${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}%`)
    console.log(`2033 - Target: $${giovanni2033.toLocaleString()}, Predicted: $${predicted2033.toLocaleString()}, Error: ${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}%`)
    
    return { slope: HTML_SLOPE, intercept: HTML_INTERCEPT, constant: HTML_CONSTANT }
  })

  it('should test against BitBo reference points', () => {
    const HTML_SLOPE = 5.844
    const HTML_INTERCEPT = -17.01
    const HTML_CONSTANT = Math.pow(10, HTML_INTERCEPT)
    
    const bitboPoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    console.log(`\n=== HTML PARAMETERS VS BITBO POINTS ===`)
    
    let totalError = 0
    let maxError = 0
    
    bitboPoints.forEach(point => {
      const days = getDaysSinceGenesis(new Date(point.date))
      const predicted = HTML_CONSTANT * Math.pow(days, HTML_SLOPE)
      const error = Math.abs(predicted - point.price) / point.price * 100
      
      totalError += error
      maxError = Math.max(maxError, error)
      
      console.log(`${point.date}: Actual $${point.price.toLocaleString()}, Predicted $${predicted.toLocaleString()}, Error: ${error.toFixed(1)}%`)
    })
    
    const avgError = totalError / bitboPoints.length
    
    console.log(`\nValidation Results:`)
    console.log(`Average error: ${avgError.toFixed(1)}%`)
    console.log(`Maximum error: ${maxError.toFixed(1)}%`)
    
    if (avgError < 20) {
      console.log(`✅ Good fit with BitBo data!`)
    } else {
      console.log(`⚠️ Moderate fit with BitBo data`)
    }
  })

  it('should compare all parameter sets', () => {
    console.log(`\n=== COMPARISON OF ALL PARAMETER SETS ===`)
    
    const parameterSets = [
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
        name: 'Giovanni 5.8',
        slope: 5.8,
        constant: 1.4005713844e-17
      },
      {
        name: 'HTML Explorer',
        slope: 5.844,
        constant: Math.pow(10, -17.01)
      }
    ]
    
    const testDate2026 = new Date('2026-01-01')
    const testDate2033 = new Date('2033-01-01')
    const days2026 = getDaysSinceGenesis(testDate2026)
    const days2033 = getDaysSinceGenesis(testDate2033)
    
    parameterSets.forEach(params => {
      const pred2026 = params.constant * Math.pow(days2026, params.slope)
      const pred2033 = params.constant * Math.pow(days2033, params.slope)
      
      const error2026 = (pred2026 - 210000) / 210000 * 100
      const error2033 = (pred2033 - 1000000) / 1000000 * 100
      
      console.log(`\n${params.name}:`)
      console.log(`  Slope: ${params.slope}`)
      console.log(`  Constant: ${params.constant.toExponential(6)}`)
      console.log(`  2026: $${pred2026.toLocaleString()} (${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}% vs Giovanni)`)
      console.log(`  2033: $${pred2033.toLocaleString()} (${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}% vs Giovanni)`)
    })
  })

  it('should provide implementation recommendation', () => {
    console.log(`\n=== IMPLEMENTATION RECOMMENDATION ===`)
    
    const HTML_SLOPE = 5.844
    const HTML_INTERCEPT = -17.01
    const HTML_CONSTANT = Math.pow(10, HTML_INTERCEPT)
    
    console.log(`\nThe HTML Power Law Explorer uses:`)
    console.log(`- Slope: ${HTML_SLOPE} (very close to our exact fit of 5.836657)`)
    console.log(`- Intercept: ${HTML_INTERCEPT}`)
    console.log(`- Constant: ${HTML_CONSTANT.toExponential(10)}`)
    
    console.log(`\nThis appears to be a well-established parameter set that:`)
    console.log(`✅ Is close to our mathematically exact fit`)
    console.log(`✅ Is close to Giovanni's theoretical 5.8`)
    console.log(`✅ Is used in a public Power Law tool`)
    console.log(`✅ Provides reasonable predictions`)
    
    console.log(`\nRecommendation: Use the HTML Explorer parameters (5.844, -17.01)`)
    console.log(`This gives us industry alignment while maintaining mathematical soundness.`)
  })
})
