/**
 * Simple Straight Line Fit
 * 
 * Just a straight line on log/log scale between:
 * - Start: $0.53 on 2011-01-01
 * - End: $4,785,285.25 on 2040-01-01
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('Simple Straight Line Fit', () => {
  
  it('should calculate the exact power law parameters from two points', () => {
    // The two points that define the line
    const point1 = {
      date: '2011-01-01',
      price: 0.53,
      days: getDaysSinceGenesis(new Date('2011-01-01'))
    }
    
    const point2 = {
      date: '2040-01-01', 
      price: 4785285.25,
      days: getDaysSinceGenesis(new Date('2040-01-01'))
    }
    
    console.log(`\n=== SIMPLE STRAIGHT LINE FIT ===`)
    console.log(`Point 1: ${point1.date} - $${point1.price} (${point1.days} days)`)
    console.log(`Point 2: ${point2.date} - $${point2.price.toLocaleString()} (${point2.days} days)`)
    
    // For a power law: Price = constant × days^slope
    // Taking log of both sides: log(Price) = log(constant) + slope × log(days)
    // This is a straight line: y = intercept + slope × x
    // where y = log(Price), x = log(days), intercept = log(constant)
    
    const x1 = Math.log10(point1.days)
    const y1 = Math.log10(point1.price)
    const x2 = Math.log10(point2.days)
    const y2 = Math.log10(point2.price)
    
    console.log(`\nLog-log coordinates:`)
    console.log(`Point 1: x=${x1.toFixed(6)}, y=${y1.toFixed(6)}`)
    console.log(`Point 2: x=${x2.toFixed(6)}, y=${y2.toFixed(6)}`)
    
    // Calculate slope: slope = (y2 - y1) / (x2 - x1)
    const slope = (y2 - y1) / (x2 - x1)
    
    // Calculate intercept: intercept = y1 - slope × x1
    const intercept = y1 - slope * x1
    
    // Calculate constant: constant = 10^intercept
    const constant = Math.pow(10, intercept)
    
    console.log(`\n=== EXACT POWER LAW PARAMETERS ===`)
    console.log(`Slope: ${slope}`)
    console.log(`Intercept: ${intercept}`)
    console.log(`Constant: ${constant.toExponential(10)}`)
    console.log(`Formula: Price = ${constant.toExponential(6)} × (days since genesis)^${slope.toFixed(6)}`)
    
    // Verify the fit
    const verify1 = constant * Math.pow(point1.days, slope)
    const verify2 = constant * Math.pow(point2.days, slope)
    
    console.log(`\n=== VERIFICATION ===`)
    console.log(`Point 1: Expected $${point1.price}, Calculated $${verify1.toFixed(6)} (${Math.abs(verify1 - point1.price) < 0.001 ? '✅' : '❌'})`)
    console.log(`Point 2: Expected $${point2.price.toLocaleString()}, Calculated $${verify2.toLocaleString()} (${Math.abs(verify2 - point2.price) < 1 ? '✅' : '❌'})`)
    
    return { slope, intercept, constant }
  })

  it('should generate predictions with the exact fit', () => {
    // Use the exact parameters from the straight line fit
    const point1 = { date: '2011-01-01', price: 0.53, days: getDaysSinceGenesis(new Date('2011-01-01')) }
    const point2 = { date: '2040-01-01', price: 4785285.25, days: getDaysSinceGenesis(new Date('2040-01-01')) }
    
    const x1 = Math.log10(point1.days)
    const y1 = Math.log10(point1.price)
    const x2 = Math.log10(point2.days)
    const y2 = Math.log10(point2.price)
    
    const slope = (y2 - y1) / (x2 - x1)
    const intercept = y1 - slope * x1
    const constant = Math.pow(10, intercept)
    
    console.log(`\n=== PREDICTIONS WITH EXACT FIT ===`)
    console.log(`Using: Price = ${constant.toExponential(6)} × days^${slope.toFixed(6)}`)
    
    const testDates = [
      { name: '2024-12-01', date: new Date('2024-12-01') },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2030-01-01', date: new Date('2030-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') },
      { name: '2035-01-01', date: new Date('2035-01-01') }
    ]
    
    testDates.forEach(({ name, date }) => {
      const days = getDaysSinceGenesis(date)
      const predictedPrice = constant * Math.pow(days, slope)
      console.log(`${name}: $${predictedPrice.toLocaleString()}`)
    })
    
    // Compare with Giovanni's targets
    const giovanni2026 = 210000
    const giovanni2033 = 1000000
    
    const predicted2026 = constant * Math.pow(getDaysSinceGenesis(new Date('2026-01-01')), slope)
    const predicted2033 = constant * Math.pow(getDaysSinceGenesis(new Date('2033-01-01')), slope)
    
    const error2026 = (predicted2026 - giovanni2026) / giovanni2026 * 100
    const error2033 = (predicted2033 - giovanni2033) / giovanni2033 * 100
    
    console.log(`\n=== COMPARISON WITH GIOVANNI TARGETS ===`)
    console.log(`2026 - Target: $${giovanni2026.toLocaleString()}, Predicted: $${predicted2026.toLocaleString()}, Error: ${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}%`)
    console.log(`2033 - Target: $${giovanni2033.toLocaleString()}, Predicted: $${predicted2033.toLocaleString()}, Error: ${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}%`)
    
    return { slope, intercept, constant, predicted2026, predicted2033 }
  })

  it('should show why the slope is not exactly 5.8', () => {
    // Calculate what the actual slope is from the BitBo data
    const point1 = { date: '2011-01-01', price: 0.53, days: getDaysSinceGenesis(new Date('2011-01-01')) }
    const point2 = { date: '2040-01-01', price: 4785285.25, days: getDaysSinceGenesis(new Date('2040-01-01')) }
    
    const x1 = Math.log10(point1.days)
    const y1 = Math.log10(point1.price)
    const x2 = Math.log10(point2.days)
    const y2 = Math.log10(point2.price)
    
    const actualSlope = (y2 - y1) / (x2 - x1)
    const giovanniSlope = 5.8
    
    console.log(`\n=== SLOPE ANALYSIS ===`)
    console.log(`Actual slope from BitBo data: ${actualSlope.toFixed(6)}`)
    console.log(`Giovanni's theoretical slope: ${giovanniSlope}`)
    console.log(`Difference: ${(actualSlope - giovanniSlope).toFixed(6)}`)
    console.log(`Percentage difference: ${((actualSlope - giovanniSlope) / giovanniSlope * 100).toFixed(2)}%`)
    
    if (Math.abs(actualSlope - giovanniSlope) < 0.1) {
      console.log(`✅ Very close to Giovanni's theoretical value!`)
    } else {
      console.log(`⚠️ Significant difference from Giovanni's theoretical value`)
      console.log(`This suggests either:`)
      console.log(`1. The BitBo chart uses a different slope`)
      console.log(`2. The reference points are approximate`)
      console.log(`3. There are measurement errors in reading the chart`)
    }
    
    // Test what happens if we force Giovanni's slope
    const forcedIntercept = y1 - giovanniSlope * x1
    const forcedConstant = Math.pow(10, forcedIntercept)
    
    console.log(`\n=== FORCED GIOVANNI SLOPE (5.8) ===`)
    console.log(`Forced intercept: ${forcedIntercept}`)
    console.log(`Forced constant: ${forcedConstant.toExponential(10)}`)
    
    // Check how well this fits our reference points
    const verify1 = forcedConstant * Math.pow(point1.days, giovanniSlope)
    const verify2 = forcedConstant * Math.pow(point2.days, giovanniSlope)
    
    console.log(`\nFit quality with forced slope:`)
    console.log(`Point 1: Expected $${point1.price}, Calculated $${verify1.toFixed(6)}, Error: ${((verify1 - point1.price) / point1.price * 100).toFixed(1)}%`)
    console.log(`Point 2: Expected $${point2.price.toLocaleString()}, Calculated $${verify2.toLocaleString()}, Error: ${((verify2 - point2.price) / point2.price * 100).toFixed(1)}%`)
  })

  it('should provide the final implementation parameters', () => {
    // Calculate the exact parameters for implementation
    const point1 = { date: '2011-01-01', price: 0.53, days: getDaysSinceGenesis(new Date('2011-01-01')) }
    const point2 = { date: '2040-01-01', price: 4785285.25, days: getDaysSinceGenesis(new Date('2040-01-01')) }
    
    const x1 = Math.log10(point1.days)
    const y1 = Math.log10(point1.price)
    const x2 = Math.log10(point2.days)
    const y2 = Math.log10(point2.price)
    
    const slope = (y2 - y1) / (x2 - x1)
    const intercept = y1 - slope * x1
    const constant = Math.pow(10, intercept)
    
    console.log(`\n=== FINAL IMPLEMENTATION PARAMETERS ===`)
    console.log(`Exact slope: ${slope}`)
    console.log(`Exact intercept: ${intercept}`)
    console.log(`Exact constant: ${constant.toExponential(10)}`)
    
    // Support and resistance lines (typically ±0.15 in log space)
    const supportIntercept = intercept - 0.15
    const resistanceIntercept = intercept + 0.15
    
    console.log(`\nPower Law Lines:`)
    console.log(`Support line intercept: ${supportIntercept}`)
    console.log(`Fit line intercept: ${intercept}`)
    console.log(`Resistance line intercept: ${resistanceIntercept}`)
    
    console.log(`\nTypeScript implementation:`)
    console.log(`const POWER_LAW_MODELS = {`)
    console.log(`  fit: { slope: ${slope}, intercept: ${intercept} },`)
    console.log(`  support: { slope: ${slope}, intercept: ${supportIntercept} },`)
    console.log(`  resistance: { slope: ${slope}, intercept: ${resistanceIntercept} }`)
    console.log(`}`)
    
    return { slope, intercept, constant, supportIntercept, resistanceIntercept }
  })
})
