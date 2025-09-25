/**
 * Power Law Model Analysis and Correction Test
 * 
 * This test file analyzes the current Power Law implementation,
 * compares it with the reference Giovanni Santostasi model,
 * and validates the corrections needed.
 */

import { describe, it, expect } from 'vitest'

// Import current implementations
import { powerLawModel } from '../app/simulation/price-models/models/PowerLawModel'
import { getPowerLawPrice, getDaysSinceGenesis, GENESIS_DATE } from '../src/modules/price-data/models/powerLaw'

describe('Power Law Model Analysis', () => {
  
  describe('Current Implementation Analysis', () => {
    it('should calculate days since genesis correctly', () => {
      const genesisDate = new Date('2009-01-03')
      const testDate = new Date('2024-01-03') // 15 years later
      const expectedDays = 15 * 365.25 // Approximately 5479 days
      
      const actualDays = getDaysSinceGenesis(testDate)
      
      console.log(`Days since genesis for ${testDate.toISOString()}: ${actualDays}`)
      expect(actualDays).toBeCloseTo(expectedDays, -1) // Within 10 days tolerance
    })

    it('should test current model predictions for key dates', () => {
      // Test dates from Giovanni's predictions
      const jan2026 = new Date('2026-01-01')
      const year2033 = new Date('2033-01-01')
      
      const price2026 = getPowerLawPrice(jan2026, 'fit')
      const price2033 = getPowerLawPrice(year2033, 'fit')
      
      console.log(`Current model predictions:`)
      console.log(`January 2026: $${price2026.toLocaleString()}`)
      console.log(`January 2033: $${price2033.toLocaleString()}`)
      
      // These should be close to $210,000 and $1,000,000 respectively
      // But they're likely incorrect with current parameters
    })
  })

  describe('Reference Model Calculations', () => {
    
    /**
     * Calculate price using Giovanni Santostasi's Power Law formula:
     * Price = constant × (days since Genesis Block)^5.8
     */
    const calculateReferencePowerLawPrice = (date: Date, constant: number): number => {
      const days = getDaysSinceGenesis(date)
      return constant * Math.pow(days, 5.8)
    }

    /**
     * Calculate the constant needed to match reference predictions
     */
    const calculateConstantFromReference = (targetPrice: number, date: Date): number => {
      const days = getDaysSinceGenesis(date)
      return targetPrice / Math.pow(days, 5.8)
    }

    it('should calculate correct constant from Giovanni\'s predictions', () => {
      const jan2026 = new Date('2026-01-01')
      const year2033 = new Date('2033-01-01')
      
      // Calculate constants from both reference points
      const constant2026 = calculateConstantFromReference(210000, jan2026)
      const constant2033 = calculateConstantFromReference(1000000, year2033)
      
      console.log(`Constants calculated from reference points:`)
      console.log(`From $210k in 2026: ${constant2026.toExponential(6)}`)
      console.log(`From $1M in 2033: ${constant2033.toExponential(6)}`)
      
      // These should be approximately equal if the model is consistent
      const tolerance = Math.abs(constant2026 - constant2033) / constant2026
      console.log(`Tolerance between constants: ${(tolerance * 100).toFixed(2)}%`)
      
      // Use average of both constants for the corrected model
      const averageConstant = (constant2026 + constant2033) / 2
      console.log(`Average constant: ${averageConstant.toExponential(6)}`)
      
      // Test the reference model with this constant
      const refPrice2026 = calculateReferencePowerLawPrice(jan2026, averageConstant)
      const refPrice2033 = calculateReferencePowerLawPrice(year2033, averageConstant)
      
      console.log(`Reference model predictions with average constant:`)
      console.log(`January 2026: $${refPrice2026.toLocaleString()}`)
      console.log(`January 2033: $${refPrice2033.toLocaleString()}`)
      
      expect(refPrice2026).toBeCloseTo(210000, -3) // Within $1000
      expect(refPrice2033).toBeCloseTo(1000000, -4) // Within $10000
    })

    it('should convert reference constant to log-log parameters', () => {
      // Calculate the average constant from reference points
      const jan2026 = new Date('2026-01-01')
      const year2033 = new Date('2033-01-01')
      
      const constant2026 = calculateConstantFromReference(210000, jan2026)
      const constant2033 = calculateConstantFromReference(1000000, year2033)
      const averageConstant = (constant2026 + constant2033) / 2
      
      // Convert to log-log parameters used in current implementation
      // Current formula: price = 10^(slope * log10(days) + intercept)
      // Reference formula: price = constant * days^5.8
      // Therefore: slope = 5.8, intercept = log10(constant)
      
      const correctedSlope = 5.8
      const correctedIntercept = Math.log10(averageConstant)
      
      console.log(`Corrected Power Law parameters:`)
      console.log(`Slope: ${correctedSlope}`)
      console.log(`Intercept: ${correctedIntercept}`)
      
      // Test the corrected parameters
      const testPrice2026 = Math.pow(10, correctedSlope * Math.log10(getDaysSinceGenesis(jan2026)) + correctedIntercept)
      const testPrice2033 = Math.pow(10, correctedSlope * Math.log10(getDaysSinceGenesis(year2033)) + correctedIntercept)
      
      console.log(`Corrected model predictions:`)
      console.log(`January 2026: $${testPrice2026.toLocaleString()}`)
      console.log(`January 2033: $${testPrice2033.toLocaleString()}`)
      
      expect(testPrice2026).toBeCloseTo(210000, -3)
      expect(testPrice2033).toBeCloseTo(1000000, -4)
    })
  })

  describe('Current vs Reference Comparison', () => {
    it('should show the difference between current and reference models', () => {
      const testDates = [
        new Date('2025-01-01'),
        new Date('2026-01-01'),
        new Date('2027-01-01'),
        new Date('2030-01-01'),
        new Date('2033-01-01')
      ]
      
      // Calculate reference constant
      const jan2026 = new Date('2026-01-01')
      const year2033 = new Date('2033-01-01')
      const constant2026 = 210000 / Math.pow(getDaysSinceGenesis(jan2026), 5.8)
      const constant2033 = 1000000 / Math.pow(getDaysSinceGenesis(year2033), 5.8)
      const referenceConstant = (constant2026 + constant2033) / 2
      
      console.log('\nComparison of Current vs Reference Model:')
      console.log('Date\t\tCurrent\t\tReference\tDifference')
      console.log('----\t\t-------\t\t---------\t----------')
      
      testDates.forEach(date => {
        const currentPrice = getPowerLawPrice(date, 'fit')
        const referencePrice = referenceConstant * Math.pow(getDaysSinceGenesis(date), 5.8)
        const difference = ((currentPrice - referencePrice) / referencePrice * 100).toFixed(1)
        
        console.log(`${date.getFullYear()}-01-01\t$${currentPrice.toLocaleString().padEnd(12)}\t$${referencePrice.toLocaleString().padEnd(12)}\t${difference}%`)
      })
    })
  })
})
