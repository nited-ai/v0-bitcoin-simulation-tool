/**
 * BitBo Discrepancy Analysis
 * 
 * Analyzes why our prices differ from BitBo chart values
 * by examining the exact data points and methodology differences.
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis } from '../src/modules/price-data/models/powerLaw'

describe('BitBo Discrepancy Analysis', () => {
  
  it('should analyze the exact BitBo reference points vs our calculations', () => {
    // From your screenshots, the exact BitBo reference points are:
    const bitboPoints = [
      { date: '2013-12-30', price: 736.5, description: 'BitBo chart point' },
      { date: '2023-01-03', price: 16670.11, description: 'BitBo chart point' },
      { date: '2025-12-27', price: 142245.42, description: 'BitBo chart point' },
      { date: '2031-01-08', price: 1077645.42, description: 'BitBo chart point' },
      { date: '2040-01-01', price: 4785285.25, description: 'BitBo chart point' }
    ]
    
    // Our current implementation (exact fit between 2011 and 2040)
    const ourSlope = 5.836656989322271
    const ourConstant = 1.0447124016e-17
    
    // BitBo's formula from screenshot
    const bitboSlope = 5.9762
    const bitboConstant = 3.4896e-18
    
    console.log(`\n=== BITBO VS OUR CALCULATIONS ===`)
    console.log(`Our formula: Price = ${ourConstant.toExponential(6)} × days^${ourSlope.toFixed(6)}`)
    console.log(`BitBo formula: Price = ${bitboConstant.toExponential(6)} × days^${bitboSlope}`)
    
    bitboPoints.forEach(point => {
      const days = getDaysSinceGenesis(new Date(point.date))
      
      const ourPrediction = ourConstant * Math.pow(days, ourSlope)
      const bitboPrediction = bitboConstant * Math.pow(days, bitboSlope)
      
      const ourError = Math.abs(ourPrediction - point.price) / point.price * 100
      const bitboError = Math.abs(bitboPrediction - point.price) / point.price * 100
      
      console.log(`\n${point.date} (${days} days):`)
      console.log(`  Actual BitBo: $${point.price.toLocaleString()}`)
      console.log(`  Our prediction: $${ourPrediction.toLocaleString()} (${ourError.toFixed(1)}% error)`)
      console.log(`  BitBo formula: $${bitboPrediction.toLocaleString()} (${bitboError.toFixed(1)}% error)`)
      console.log(`  Difference: Our vs BitBo formula = ${((ourPrediction - bitboPrediction) / bitboPrediction * 100).toFixed(1)}%`)
    })
  })

  it('should investigate possible reasons for discrepancies', () => {
    console.log(`\n=== POSSIBLE REASONS FOR DISCREPANCIES ===`)
    
    console.log(`\n1. DIFFERENT REFERENCE POINTS:`)
    console.log(`   - We used: $0.53 (2011-01-01) → $4,785,285.25 (2040-01-01)`)
    console.log(`   - BitBo might use: Different start/end points or more data points`)
    
    console.log(`\n2. DIFFERENT FITTING METHOD:`)
    console.log(`   - We used: Exact 2-point fit (perfect for endpoints)`)
    console.log(`   - BitBo uses: Regression fit across all historical data (R² = 0.92101)`)
    
    console.log(`\n3. DIFFERENT DATA SOURCES:`)
    console.log(`   - We used: Chart screenshot values (potential reading errors)`)
    console.log(`   - BitBo uses: Their own historical price database`)
    
    console.log(`\n4. DIFFERENT TIME CALCULATIONS:`)
    console.log(`   - We use: Math.ceil((date - genesis) / (1000*60*60*24))`)
    console.log(`   - BitBo might use: Different day counting method`)
    
    // Test different day calculation methods
    const testDate = new Date('2023-01-03')
    const genesis = new Date('2009-01-03')
    
    const method1 = Math.ceil((testDate.getTime() - genesis.getTime()) / (1000 * 60 * 60 * 24))
    const method2 = Math.floor((testDate.getTime() - genesis.getTime()) / (1000 * 60 * 60 * 24))
    const method3 = Math.round((testDate.getTime() - genesis.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log(`\n5. DAY CALCULATION METHODS (for 2023-01-03):`)
    console.log(`   - Math.ceil: ${method1} days`)
    console.log(`   - Math.floor: ${method2} days`)
    console.log(`   - Math.round: ${method3} days`)
    console.log(`   - Our current: ${getDaysSinceGenesis(testDate)} days`)
  })

  it('should test if BitBo uses a different genesis date or offset', () => {
    console.log(`\n=== TESTING DIFFERENT GENESIS DATES/OFFSETS ===`)
    
    // Maybe BitBo uses a different genesis date or has an offset
    const bitboSlope = 5.9762
    const bitboConstant = 3.4896e-18
    
    const testPoint = { date: '2023-01-03', price: 16670.11 }
    const testDate = new Date(testPoint.date)
    
    // Test different genesis dates
    const possibleGenesisDates = [
      { name: 'Jan 3, 2009 (standard)', date: new Date('2009-01-03') },
      { name: 'Jan 1, 2009', date: new Date('2009-01-01') },
      { name: 'Jan 9, 2009 (first transaction)', date: new Date('2009-01-09') },
      { name: 'Oct 31, 2008 (whitepaper)', date: new Date('2008-10-31') }
    ]
    
    possibleGenesisDates.forEach(genesis => {
      const days = Math.ceil((testDate.getTime() - genesis.date.getTime()) / (1000 * 60 * 60 * 24))
      const prediction = bitboConstant * Math.pow(days, bitboSlope)
      const error = Math.abs(prediction - testPoint.price) / testPoint.price * 100
      
      console.log(`${genesis.name}: ${days} days → $${prediction.toLocaleString()} (${error.toFixed(1)}% error)`)
    })
    
    // Test with offsets
    console.log(`\nTesting with day offsets:`)
    const standardDays = getDaysSinceGenesis(testDate)
    
    for (let offset = -10; offset <= 10; offset += 5) {
      const adjustedDays = standardDays + offset
      const prediction = bitboConstant * Math.pow(adjustedDays, bitboSlope)
      const error = Math.abs(prediction - testPoint.price) / testPoint.price * 100
      
      console.log(`Offset ${offset}: ${adjustedDays} days → $${prediction.toLocaleString()} (${error.toFixed(1)}% error)`)
    }
  })

  it('should reverse-engineer BitBo parameters from their data points', () => {
    console.log(`\n=== REVERSE-ENGINEERING BITBO PARAMETERS ===`)
    
    // Use BitBo's actual data points to find what parameters they're really using
    const bitboPoints = [
      { date: '2013-12-30', price: 736.5 },
      { date: '2023-01-03', price: 16670.11 },
      { date: '2025-12-27', price: 142245.42 },
      { date: '2031-01-08', price: 1077645.42 },
      { date: '2040-01-01', price: 4785285.25 }
    ]
    
    // Try to find the best slope and constant that fits BitBo's actual data
    const testSlopes = [5.8, 5.85, 5.9, 5.95, 5.9762, 6.0]
    
    testSlopes.forEach(slope => {
      // Calculate constants from each point
      const constants = bitboPoints.map(point => {
        const days = getDaysSinceGenesis(new Date(point.date))
        return point.price / Math.pow(days, slope)
      })
      
      const avgConstant = constants.reduce((sum, c) => sum + c, 0) / constants.length
      const stdDev = Math.sqrt(constants.reduce((sum, c) => sum + Math.pow(c - avgConstant, 2), 0) / constants.length)
      const coeffVar = stdDev / avgConstant * 100
      
      console.log(`\nSlope ${slope}:`)
      console.log(`  Average constant: ${avgConstant.toExponential(6)}`)
      console.log(`  Coefficient of variation: ${coeffVar.toFixed(1)}%`)
      
      if (coeffVar < 20) {
        console.log(`  ✅ Good fit - testing predictions...`)
        
        // Test predictions with this slope and constant
        const pred2026 = avgConstant * Math.pow(getDaysSinceGenesis(new Date('2026-01-01')), slope)
        const pred2033 = avgConstant * Math.pow(getDaysSinceGenesis(new Date('2033-01-01')), slope)
        
        console.log(`    2026: $${pred2026.toLocaleString()}`)
        console.log(`    2033: $${pred2033.toLocaleString()}`)
      }
    })
  })

  it('should provide recommendations for alignment', () => {
    console.log(`\n=== RECOMMENDATIONS FOR BITBO ALIGNMENT ===`)
    
    console.log(`\nTo align with BitBo, we could:`)
    
    console.log(`\n1. USE BITBO'S EXACT FORMULA:`)
    console.log(`   - Slope: 5.9762`)
    console.log(`   - Constant: 3.4896e-18`)
    console.log(`   - Pro: Matches BitBo chart exactly`)
    console.log(`   - Con: May not fit our reference points perfectly`)
    
    console.log(`\n2. USE REGRESSION FIT ON ALL BITBO POINTS:`)
    console.log(`   - Fit a line through all BitBo data points`)
    console.log(`   - Pro: Better overall fit to BitBo data`)
    console.log(`   - Con: More complex than 2-point fit`)
    
    console.log(`\n3. KEEP OUR EXACT FIT BUT DOCUMENT DIFFERENCES:`)
    console.log(`   - Our method: Exact 2-point fit (mathematically pure)`)
    console.log(`   - BitBo method: Regression fit (better for noisy data)`)
    console.log(`   - Pro: Simple and mathematically sound`)
    console.log(`   - Con: Will differ from BitBo chart`)
    
    console.log(`\n4. HYBRID APPROACH:`)
    console.log(`   - Use Giovanni's theoretical slope (5.8)`)
    console.log(`   - Calibrate constant to match key targets`)
    console.log(`   - Pro: Theoretical foundation + practical alignment`)
    console.log(`   - Con: Compromise between theory and BitBo`)
    
    console.log(`\nRecommendation: Option 4 (Hybrid) seems best for practical use.`)
  })
})
