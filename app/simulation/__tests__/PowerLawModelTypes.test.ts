/**
 * Tests for PowerLawModelParams interface with enhanced volatility support
 */

import type { PowerLawModelParams, PriceModelParams } from '../price-models/types'

describe('PowerLawModelParams Interface', () => {
  describe('Basic PowerLawModelParams', () => {
    it('should extend PriceModelParams correctly', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }

      expect(params.startPrice).toBe(50000)
      expect(params.projectionMonths).toBe(12)
      expect(params.modelSpecificParams.prognosisLine).toBe('fit')
    })

    it('should accept all valid prognosis lines', () => {
      const validLines: Array<'fit' | 'support' | 'resistance'> = ['fit', 'support', 'resistance']
      
      validLines.forEach(line => {
        const params: PowerLawModelParams = {
          startPrice: 50000,
          projectionMonths: 12,
          modelSpecificParams: {
            prognosisLine: line
          }
        }

        expect(params.modelSpecificParams.prognosisLine).toBe(line)
      })
    })
  })

  describe('Enhanced PowerLawModelParams with Price Projection Parameters', () => {
    it('should accept price projection parameters', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          priceProjectionParams: {
            slope: 6.0,
            intercept: -18.0
          }
        }
      }

      expect(params.modelSpecificParams.priceProjectionParams?.slope).toBe(6.0)
      expect(params.modelSpecificParams.priceProjectionParams?.intercept).toBe(-18.0)
    })

    it('should work without price projection parameters (optional)', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }

      expect(params.modelSpecificParams.priceProjectionParams).toBeUndefined()
    })
  })

  describe('Enhanced PowerLawModelParams with Cycle Repeat Volatility', () => {
    it('should accept cycle repeat volatility settings', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      expect(params.modelSpecificParams.cycleRepeatVolatility?.enabled).toBe(true)
      expect(params.modelSpecificParams.cycleRepeatVolatility?.patternLengthMonths).toBe(96)
      expect(params.modelSpecificParams.cycleRepeatVolatility?.diminishingFactor).toBe(1.0)
    })

    it('should work without volatility settings (optional)', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }

      expect(params.modelSpecificParams.cycleRepeatVolatility).toBeUndefined()
    })

    it('should accept disabled volatility', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit',
          cycleRepeatVolatility: {
            enabled: false,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      expect(params.modelSpecificParams.cycleRepeatVolatility?.enabled).toBe(false)
    })
  })

  describe('Complete PowerLawModelParams with All Features', () => {
    it('should work with both price projection parameters and volatility settings', () => {
      const params: PowerLawModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
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

      expect(params.modelSpecificParams.prognosisLine).toBe('fit')
      expect(params.modelSpecificParams.priceProjectionParams?.slope).toBe(5.844)
      expect(params.modelSpecificParams.priceProjectionParams?.intercept).toBe(-17.01)
      expect(params.modelSpecificParams.cycleRepeatVolatility?.enabled).toBe(true)
      expect(params.modelSpecificParams.cycleRepeatVolatility?.patternLengthMonths).toBe(96)
      expect(params.modelSpecificParams.cycleRepeatVolatility?.diminishingFactor).toBe(1.0)
    })
  })

  describe('Parameter Validation Ranges', () => {
    it('should accept valid pattern length range (24-120 months)', () => {
      const validLengths = [24, 48, 96, 120]
      
      validLengths.forEach(length => {
        const params: PowerLawModelParams = {
          startPrice: 50000,
          projectionMonths: 12,
          modelSpecificParams: {
            prognosisLine: 'fit',
            cycleRepeatVolatility: {
              enabled: true,
              patternLengthMonths: length,
              diminishingFactor: 1.0
            }
          }
        }

        expect(params.modelSpecificParams.cycleRepeatVolatility?.patternLengthMonths).toBe(length)
      })
    })

    it('should accept valid diminishing factor range (0.5-1.0)', () => {
      const validFactors = [0.5, 0.75, 1.0]
      
      validFactors.forEach(factor => {
        const params: PowerLawModelParams = {
          startPrice: 50000,
          projectionMonths: 12,
          modelSpecificParams: {
            prognosisLine: 'fit',
            cycleRepeatVolatility: {
              enabled: true,
              patternLengthMonths: 96,
              diminishingFactor: factor
            }
          }
        }

        expect(params.modelSpecificParams.cycleRepeatVolatility?.diminishingFactor).toBe(factor)
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('should be compatible with generic PriceModelParams', () => {
      const genericParams: PriceModelParams = {
        startPrice: 50000,
        projectionMonths: 12,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }

      // Should be able to use generic params where PowerLawModelParams expected
      const powerLawParams: PowerLawModelParams = {
        ...genericParams,
        modelSpecificParams: {
          prognosisLine: 'fit'
        }
      }

      expect(powerLawParams.startPrice).toBe(50000)
      expect(powerLawParams.modelSpecificParams.prognosisLine).toBe('fit')
    })
  })
})
