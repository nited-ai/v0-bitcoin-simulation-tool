/**
 * Tests for enhanced PowerLawSettings interface with volatility support
 */

import type { PriceEngineParams, PowerLawLine } from '../types'

describe('Enhanced PowerLawSettings Interface', () => {
  describe('Basic PowerLawSettings', () => {
    it('should accept valid basic power law settings', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit'
        }
      }

      expect(params.powerLawSettings.prognosisLine).toBe('fit')
    })

    it('should accept all valid prognosis lines', () => {
      const validLines: PowerLawLine[] = ['fit', 'support', 'resistance']
      
      validLines.forEach(line => {
        const params: PriceEngineParams = {
          priceModel: 'powerLaw',
          simulationMonths: 12,
          initialBtcPrice: 50000,
          annualGrowthRates: [],
          powerLawSettings: {
            prognosisLine: line
          }
        }

        expect(params.powerLawSettings.prognosisLine).toBe(line)
      })
    })
  })

  describe('Enhanced PowerLawSettings with Volatility', () => {
    it('should accept cycle repeat volatility settings', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      expect(params.powerLawSettings.cycleRepeatVolatility?.enabled).toBe(true)
      expect(params.powerLawSettings.cycleRepeatVolatility?.patternLengthMonths).toBe(96)
      expect(params.powerLawSettings.cycleRepeatVolatility?.diminishingFactor).toBe(1.0)
    })

    it('should accept price projection parameters', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit',
          priceProjectionParams: {
            slope: 6.0,
            intercept: -18.0
          }
        }
      }

      expect(params.powerLawSettings.priceProjectionParams?.slope).toBe(6.0)
      expect(params.powerLawSettings.priceProjectionParams?.intercept).toBe(-18.0)
    })

    it('should work with both volatility and price projection parameters', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit',
          priceProjectionParams: {
            slope: 5.844,
            intercept: -17.01
          },
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      expect(params.powerLawSettings.priceProjectionParams?.slope).toBe(5.844)
      expect(params.powerLawSettings.cycleRepeatVolatility?.enabled).toBe(true)
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without volatility settings (backward compatibility)', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit',
          controlMode: 'unified',
          unifiedSlope: 5.844,
          unifiedIntercept: -17.01
        }
      }

      expect(params.powerLawSettings.cycleRepeatVolatility).toBeUndefined()
      expect(params.powerLawSettings.priceProjectionParams).toBeUndefined()
      expect(params.powerLawSettings.prognosisLine).toBe('fit')
    })

    it('should work with existing individual parameters', () => {
      const params: PriceEngineParams = {
        priceModel: 'powerLaw',
        simulationMonths: 12,
        initialBtcPrice: 50000,
        annualGrowthRates: [],
        powerLawSettings: {
          prognosisLine: 'fit',
          controlMode: 'individual',
          individualParams: {
            fit: { slope: 5.844, intercept: -17.01 },
            support: { slope: 5.844, intercept: -17.46 },
            resistance: { slope: 5.06, intercept: -13.5 }
          }
        }
      }

      expect(params.powerLawSettings.individualParams?.fit.slope).toBe(5.844)
      expect(params.powerLawSettings.cycleRepeatVolatility).toBeUndefined()
    })
  })

  describe('Parameter Validation Ranges', () => {
    it('should accept valid pattern length range (24-120 months)', () => {
      const validLengths = [24, 48, 96, 120]
      
      validLengths.forEach(length => {
        const params: PriceEngineParams = {
          priceModel: 'powerLaw',
          simulationMonths: 12,
          initialBtcPrice: 50000,
          annualGrowthRates: [],
          powerLawSettings: {
            prognosisLine: 'fit',
            cycleRepeatVolatility: {
              enabled: true,
              patternLengthMonths: length,
              diminishingFactor: 1.0
            }
          }
        }

        expect(params.powerLawSettings.cycleRepeatVolatility?.patternLengthMonths).toBe(length)
      })
    })

    it('should accept valid diminishing factor range (0.5-1.0)', () => {
      const validFactors = [0.5, 0.75, 1.0]
      
      validFactors.forEach(factor => {
        const params: PriceEngineParams = {
          priceModel: 'powerLaw',
          simulationMonths: 12,
          initialBtcPrice: 50000,
          annualGrowthRates: [],
          powerLawSettings: {
            prognosisLine: 'fit',
            cycleRepeatVolatility: {
              enabled: true,
              patternLengthMonths: 96,
              diminishingFactor: factor
            }
          }
        }

        expect(params.powerLawSettings.cycleRepeatVolatility?.diminishingFactor).toBe(factor)
      })
    })
  })
})
