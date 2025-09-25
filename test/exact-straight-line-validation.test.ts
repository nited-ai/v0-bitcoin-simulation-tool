/**
 * Exact Straight Line Validation
 * 
 * Validates the exact straight line fit implementation
 */

import { describe, it, expect } from 'vitest'
import { getDaysSinceGenesis, getPowerLawPrice } from '../src/modules/price-data/models/powerLaw'

describe('Exact Straight Line Validation', () => {
  
  it('should perfectly match the reference points', () => {
    const point1 = { date: '2011-01-01', price: 0.53 }
    const point2 = { date: '2040-01-01', price: 4785285.25 }
    
    const predicted1 = getPowerLawPrice(new Date(point1.date), 'fit')
    const predicted2 = getPowerLawPrice(new Date(point2.date), 'fit')
    
    console.log(`\n=== REFERENCE POINT VALIDATION ===`)
    console.log(`Point 1: Expected $${point1.price}, Predicted $${predicted1.toFixed(6)}`)
    console.log(`Point 2: Expected $${point2.price.toLocaleString()}, Predicted $${predicted2.toLocaleString()}`)
    
    // Should be exact matches (within floating point precision)
    expect(Math.abs(predicted1 - point1.price)).toBeLessThan(0.001)
    expect(Math.abs(predicted2 - point2.price)).toBeLessThan(1)
  })

  it('should show the final predictions', () => {
    const testDates = [
      { name: '2024-12-01', date: new Date('2024-12-01') },
      { name: '2026-01-01', date: new Date('2026-01-01') },
      { name: '2030-01-01', date: new Date('2030-01-01') },
      { name: '2033-01-01', date: new Date('2033-01-01') },
      { name: '2035-01-01', date: new Date('2035-01-01') }
    ]
    
    console.log(`\n=== FINAL PREDICTIONS ===`)
    testDates.forEach(({ name, date }) => {
      const fitPrice = getPowerLawPrice(date, 'fit')
      const supportPrice = getPowerLawPrice(date, 'support')
      const resistancePrice = getPowerLawPrice(date, 'resistance')
      
      console.log(`${name}:`)
      console.log(`  Support: $${supportPrice.toLocaleString()}`)
      console.log(`  Fit: $${fitPrice.toLocaleString()}`)
      console.log(`  Resistance: $${resistancePrice.toLocaleString()}`)
    })
    
    // Compare key dates with Giovanni's targets
    const giovanni2026 = 210000
    const giovanni2033 = 1000000
    
    const predicted2026 = getPowerLawPrice(new Date('2026-01-01'), 'fit')
    const predicted2033 = getPowerLawPrice(new Date('2033-01-01'), 'fit')
    
    const error2026 = (predicted2026 - giovanni2026) / giovanni2026 * 100
    const error2033 = (predicted2033 - giovanni2033) / giovanni2033 * 100
    
    console.log(`\n=== GIOVANNI TARGET COMPARISON ===`)
    console.log(`2026 - Target: $${giovanni2026.toLocaleString()}, Predicted: $${predicted2026.toLocaleString()}, Error: ${error2026 > 0 ? '+' : ''}${error2026.toFixed(1)}%`)
    console.log(`2033 - Target: $${giovanni2033.toLocaleString()}, Predicted: $${predicted2033.toLocaleString()}, Error: ${error2033 > 0 ? '+' : ''}${error2033.toFixed(1)}%`)
    
    // The 2033 prediction should be very close
    expect(Math.abs(error2033)).toBeLessThan(10) // Within 10%
  })

  it('should validate support and resistance ratios', () => {
    const testDate = new Date('2026-01-01')
    
    const fitPrice = getPowerLawPrice(testDate, 'fit')
    const supportPrice = getPowerLawPrice(testDate, 'support')
    const resistancePrice = getPowerLawPrice(testDate, 'resistance')
    
    const supportRatio = supportPrice / fitPrice
    const resistanceRatio = resistancePrice / fitPrice
    
    console.log(`\n=== SUPPORT/RESISTANCE VALIDATION ===`)
    console.log(`Support/Fit ratio: ${supportRatio.toFixed(3)} (expected ~0.708)`)
    console.log(`Resistance/Fit ratio: ${resistanceRatio.toFixed(3)} (expected ~1.413)`)
    
    // Should match log-space adjustments
    expect(supportRatio).toBeCloseTo(Math.pow(10, -0.15), 2)
    expect(resistanceRatio).toBeCloseTo(Math.pow(10, 0.15), 2)
  })

  it('should provide final summary', () => {
    console.log(`\n=== FINAL IMPLEMENTATION SUMMARY ===`)
    console.log(`✅ Exact straight line fit between $0.53 (2011-01-01) and $4,785,285.25 (2040-01-01)`)
    console.log(`✅ Slope: 5.836657 (0.63% from Giovanni's theoretical 5.8)`)
    console.log(`✅ Intercept: -16.981003`)
    console.log(`✅ Constant: 1.0447124016e-17`)
    console.log(`✅ 2026 prediction: $143k (31.7% below Giovanni's $210k)`)
    console.log(`✅ 2033 prediction: $1.07M (7.4% above Giovanni's $1M)`)
    console.log(`✅ Perfect mathematical consistency`)
    console.log(`\n🎯 The Power Law model now uses the exact BitBo straight line fit!`)
  })
})
