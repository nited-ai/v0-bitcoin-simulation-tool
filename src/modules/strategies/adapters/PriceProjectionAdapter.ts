/**
 * Price Projection Adapter
 * 
 * Converts price projection results to strategy-compatible price data.
 * Handles price line selection and data transformation for strategy consumption.
 */

import type { IPriceProjectionAdapter, StrategyPriceData } from '../types'
import type { ValidationResult } from '@/modules/shared/types'
import type { PriceProjectionResult, ProjectionPoint } from '@/modules/price-projection/types'

/**
 * Price Projection Adapter Implementation
 */
export class PriceProjectionAdapter implements IPriceProjectionAdapter {
  
  /**
   * Convert price projection results to strategy price data
   */
  convertForStrategy(
    projectionData: PriceProjectionResult[], 
    selectedLine: 'volatile' | 'average' | 'support' | 'resistance'
  ): StrategyPriceData[] {
    
    if (!projectionData || projectionData.length === 0) {
      return []
    }

    // Validate price line selection
    if (!['volatile', 'average', 'support', 'resistance'].includes(selectedLine)) {
      throw new Error(`Invalid price line selection: ${selectedLine}`)
    }

    const strategyData: StrategyPriceData[] = []

    // Process each projection result
    for (const projection of projectionData) {
      if (!projection.projectionPoints || projection.projectionPoints.length === 0) {
        continue
      }

      // Convert each projection point
      for (const point of projection.projectionPoints) {
        const strategyPoint = this.convertProjectionPoint(point, selectedLine)
        strategyData.push(strategyPoint)
      }
    }

    // Sort by timestamp to ensure chronological order
    strategyData.sort((a, b) => a.timestamp - b.timestamp)

    return strategyData
  }

  /**
   * Convert a single projection point to strategy price data
   */
  private convertProjectionPoint(
    point: ProjectionPoint, 
    selectedLine: 'volatile' | 'average' | 'support' | 'resistance'
  ): StrategyPriceData {
    
    let price: number

    switch (selectedLine) {
      case 'volatile':
        // Use the main price (most volatile/realistic projection)
        price = point.price
        break
        
      case 'support':
        // Use support line if available, fallback to main price
        price = point.support ?? point.price
        break
        
      case 'resistance':
        // Use resistance line if available, fallback to main price
        price = point.resistance ?? point.price
        break
        
      case 'average':
        // Calculate average of available price lines
        const prices = [point.price]
        if (point.support !== undefined) prices.push(point.support)
        if (point.resistance !== undefined) prices.push(point.resistance)
        price = prices.reduce((sum, p) => sum + p, 0) / prices.length
        break
        
      default:
        price = point.price
    }

    return {
      timestamp: point.timestamp,
      price,
      support: point.support,
      resistance: point.resistance,
      confidence: point.confidence,
      metadata: {
        ...point.metadata,
        selectedLine,
        originalPrice: point.price
      }
    }
  }

  /**
   * Validate projection data before conversion
   */
  validateProjectionData(data: PriceProjectionResult[]): ValidationResult {
    const errors: string[] = []

    if (!data || data.length === 0) {
      errors.push('Projection data cannot be empty')
      return { isValid: false, errors }
    }

    for (let i = 0; i < data.length; i++) {
      const projection = data[i]

      if (!projection.projectionPoints || projection.projectionPoints.length === 0) {
        errors.push(`Projection must contain at least one data point`)
        continue
      }

      // Validate each projection point
      for (let j = 0; j < projection.projectionPoints.length; j++) {
        const point = projection.projectionPoints[j]
        
        if (typeof point.timestamp !== 'number' || point.timestamp <= 0) {
          errors.push(`Projection ${i}, point ${j}: Invalid timestamp`)
        }
        
        if (typeof point.price !== 'number' || point.price <= 0) {
          errors.push(`Projection ${i}, point ${j}: Invalid price`)
        }
        
        if (typeof point.confidence !== 'number' || point.confidence < 0 || point.confidence > 1) {
          errors.push(`Projection ${i}, point ${j}: Invalid confidence (must be between 0 and 1)`)
        }
        
        // Validate optional support/resistance if present
        if (point.support !== undefined && (typeof point.support !== 'number' || point.support <= 0)) {
          errors.push(`Projection ${i}, point ${j}: Invalid support price`)
        }
        
        if (point.resistance !== undefined && (typeof point.resistance !== 'number' || point.resistance <= 0)) {
          errors.push(`Projection ${i}, point ${j}: Invalid resistance price`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get available price lines from projection data
   */
  getAvailablePriceLines(data: PriceProjectionResult[]): string[] {
    const availableLines = ['volatile', 'average'] // Always available
    
    if (!data || data.length === 0) {
      return availableLines
    }

    let hasSupport = false
    let hasResistance = false

    // Check if any projection points have support/resistance data
    for (const projection of data) {
      if (!projection.projectionPoints) continue
      
      for (const point of projection.projectionPoints) {
        if (point.support !== undefined) hasSupport = true
        if (point.resistance !== undefined) hasResistance = true
        
        // Early exit if both are found
        if (hasSupport && hasResistance) break
      }
      
      if (hasSupport && hasResistance) break
    }

    if (hasSupport) availableLines.push('support')
    if (hasResistance) availableLines.push('resistance')

    return availableLines
  }

  /**
   * Get statistics about the projection data
   */
  getProjectionStats(data: PriceProjectionResult[]): {
    totalPoints: number
    dateRange: { start: Date; end: Date } | null
    priceRange: { min: number; max: number } | null
    averageConfidence: number
    hasSupport: boolean
    hasResistance: boolean
  } {
    if (!data || data.length === 0) {
      return {
        totalPoints: 0,
        dateRange: null,
        priceRange: null,
        averageConfidence: 0,
        hasSupport: false,
        hasResistance: false
      }
    }

    let totalPoints = 0
    let minTimestamp = Infinity
    let maxTimestamp = -Infinity
    let minPrice = Infinity
    let maxPrice = -Infinity
    let totalConfidence = 0
    let hasSupport = false
    let hasResistance = false

    for (const projection of data) {
      if (!projection.projectionPoints) continue
      
      totalPoints += projection.projectionPoints.length
      
      for (const point of projection.projectionPoints) {
        // Update timestamp range
        minTimestamp = Math.min(minTimestamp, point.timestamp)
        maxTimestamp = Math.max(maxTimestamp, point.timestamp)
        
        // Update price range
        minPrice = Math.min(minPrice, point.price)
        maxPrice = Math.max(maxPrice, point.price)
        
        if (point.support !== undefined) {
          hasSupport = true
          minPrice = Math.min(minPrice, point.support)
          maxPrice = Math.max(maxPrice, point.support)
        }
        
        if (point.resistance !== undefined) {
          hasResistance = true
          minPrice = Math.min(minPrice, point.resistance)
          maxPrice = Math.max(maxPrice, point.resistance)
        }
        
        // Accumulate confidence
        totalConfidence += point.confidence
      }
    }

    return {
      totalPoints,
      dateRange: totalPoints > 0 ? {
        start: new Date(minTimestamp),
        end: new Date(maxTimestamp)
      } : null,
      priceRange: totalPoints > 0 ? {
        min: minPrice,
        max: maxPrice
      } : null,
      averageConfidence: totalPoints > 0 ? totalConfidence / totalPoints : 0,
      hasSupport,
      hasResistance
    }
  }
}

// Export singleton instance
export const priceProjectionAdapter = new PriceProjectionAdapter()
