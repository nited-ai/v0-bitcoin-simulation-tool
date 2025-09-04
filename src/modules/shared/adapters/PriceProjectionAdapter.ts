/**
 * Price Projection Adapter
 * 
 * Base adapter class for converting price projection results to strategy-consumable format.
 * Handles price line selection and data transformation between modules.
 */

import type { 
  PriceLineType, 
  StrategyPriceData, 
  StrategyPricePoint,
  PriceLineOptions 
} from '../interfaces/PriceProjectionInterface'
import type { PriceProjectionResult, ProjectionPoint } from '../types'

/**
 * Base Price Projection Adapter
 * 
 * Provides common functionality for converting price projections
 * to strategy-consumable format with price line selection.
 */
export class PriceProjectionAdapter {
  /**
   * Convert PriceProjectionResult to StrategyPriceData
   * 
   * @param projectionResult - Original price projection result
   * @param selectedPriceLine - Which price line to use for strategy decisions
   * @returns Strategy-optimized price data
   */
  static convertForStrategy(
    projectionResult: PriceProjectionResult,
    selectedPriceLine: PriceLineType = 'volatile'
  ): StrategyPriceData {
    const strategyPoints: StrategyPricePoint[] = projectionResult.projectionPoints.map(point => ({
      timestamp: point.timestamp,
      price: this.selectPriceByLine(point, selectedPriceLine),
      supportPrice: point.support,
      resistancePrice: point.resistance,
      confidence: point.confidence
    }))

    return {
      projectionPoints: strategyPoints,
      metadata: {
        ...projectionResult.metadata,
        selectedPriceLine,
        originalModel: projectionResult.modelName
      },
      supportLines: projectionResult.projectionPoints
        .map(p => p.support)
        .filter((price): price is number => price !== undefined),
      resistanceLines: projectionResult.projectionPoints
        .map(p => p.resistance)
        .filter((price): price is number => price !== undefined)
    }
  }

  /**
   * Select appropriate price based on line type
   * 
   * @param point - Original projection point
   * @param lineType - Type of price line to select
   * @returns Selected price value
   */
  private static selectPriceByLine(point: ProjectionPoint, lineType: PriceLineType): number {
    switch (lineType) {
      case 'support':
        return point.support || point.price

      case 'resistance':
        return point.resistance || point.price

      case 'average':
        const prices = [
          point.price,
          point.support || point.price,
          point.resistance || point.price
        ]
        return prices.reduce((sum, price) => sum + price, 0) / prices.length

      case 'volatile':
      default:
        return point.price
    }
  }

  /**
   * Get available price line options for a projection
   * 
   * @param projectionResult - Original projection result
   * @returns Available price line options with descriptions
   */
  static getAvailablePriceLines(projectionResult: PriceProjectionResult): PriceLineOptions {
    const hasSupportLines = projectionResult.projectionPoints.some(p => p.support !== undefined)
    const hasResistanceLines = projectionResult.projectionPoints.some(p => p.resistance !== undefined)

    return {
      volatile: {
        available: true,
        description: 'Main projected price with full volatility'
      },
      average: {
        available: hasSupportLines && hasResistanceLines,
        description: 'Average of volatile, support, and resistance lines'
      },
      support: {
        available: hasSupportLines,
        description: 'Conservative support line estimate'
      },
      resistance: {
        available: hasResistanceLines,
        description: 'Optimistic resistance line estimate'
      }
    }
  }

  /**
   * Validate strategy price data integrity
   * 
   * @param data - Strategy price data to validate
   * @returns Validation result with any errors
   */
  static validateStrategyPriceData(data: StrategyPriceData): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check required fields
    if (!data.projectionPoints || !Array.isArray(data.projectionPoints)) {
      errors.push('projectionPoints must be an array')
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('metadata must be an object')
    }

    // Validate projection points
    if (data.projectionPoints) {
      data.projectionPoints.forEach((point, index) => {
        if (typeof point.timestamp !== 'number') {
          errors.push(`Point ${index}: timestamp must be a number`)
        }

        if (typeof point.price !== 'number' || point.price <= 0) {
          errors.push(`Point ${index}: price must be a positive number`)
        }

        if (typeof point.confidence !== 'number' || point.confidence < 0 || point.confidence > 1) {
          errors.push(`Point ${index}: confidence must be between 0 and 1`)
        }

        if (point.supportPrice !== undefined && (typeof point.supportPrice !== 'number' || point.supportPrice <= 0)) {
          errors.push(`Point ${index}: supportPrice must be a positive number if provided`)
        }

        if (point.resistancePrice !== undefined && (typeof point.resistancePrice !== 'number' || point.resistancePrice <= 0)) {
          errors.push(`Point ${index}: resistancePrice must be a positive number if provided`)
        }
      })
    }

    // Validate metadata
    if (data.metadata) {
      const requiredMetadataFields = ['totalMonths', 'totalGrowth', 'averageMonthlyGrowth', 'confidence', 'generatedAt']
      requiredMetadataFields.forEach(field => {
        if (!(field in data.metadata)) {
          errors.push(`metadata.${field} is required`)
        }
      })

      if (typeof data.metadata.confidence !== 'number' || data.metadata.confidence < 0 || data.metadata.confidence > 1) {
        errors.push('metadata.confidence must be between 0 and 1')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate confidence decay over time
   * 
   * @param baseConfidence - Initial confidence level
   * @param monthsOut - Number of months into the future
   * @param decayRate - Rate of confidence decay (default: 0.02 per month)
   * @returns Adjusted confidence level
   */
  static calculateConfidenceDecay(
    baseConfidence: number,
    monthsOut: number,
    decayRate: number = 0.02
  ): number {
    const decayedConfidence = baseConfidence * Math.exp(-decayRate * monthsOut)
    return Math.max(0.1, Math.min(1.0, decayedConfidence)) // Clamp between 0.1 and 1.0
  }
}
