/**
 * Price Projection Adapter
 * 
 * Provides standardized conversion utilities between different price projection formats.
 * This adapter enables gradual migration from legacy formats to the new standard format.
 * 
 * STANDARD FORMAT (app/simulation/price-models/types.ts):
 * - PriceProjectionResult with ProjectionPoint[]
 * - Used by all new price models
 * - Microservices-compatible architecture
 * 
 * @module PriceProjectionAdapter
 */

import type { 
  PriceProjectionResult as NewPriceProjectionResult,
  ProjectionPoint,
  PriceModelParams
} from "../../../../app/simulation/price-models/types"
import type { PriceProjectionResult as OldPriceProjectionResult } from "../../price-projection/types"
import type { PriceChartDataPoint, HistoricalDataPoint } from "../../price-data/types"

/**
 * Strategy-compatible price data format
 * Simplified format optimized for strategy execution
 */
export interface StrategyPriceData {
  /** Array of price points for strategy decisions */
  pricePoints: Array<{
    timestamp: number
    price: number
    date: string
    support?: number
    resistance?: number
  }>
  /** Metadata about the projection */
  metadata: {
    modelName: string
    totalMonths: number
    startPrice: number
    endPrice: number
    confidence: number
  }
}

/**
 * Results-compatible price data format
 * Extended format with additional analysis data
 */
export interface ResultsPriceData extends StrategyPriceData {
  /** Additional metrics for results analysis */
  analytics: {
    totalGrowth: number
    averageMonthlyGrowth: number
    maxDecline?: number
    volatility?: number
  }
}

/**
 * Price Projection Adapter Class
 * Provides conversion methods between different price projection formats
 */
export class PriceProjectionAdapter {
  
  /**
   * Convert new standard format to strategy-compatible format
   * This is the primary conversion method for strategy execution
   */
  static toStrategyFormat(
    projection: NewPriceProjectionResult,
    selectedPriceLine: 'price' | 'support' | 'resistance' = 'price'
  ): StrategyPriceData {
    const pricePoints = projection.projectionPoints.map(point => {
      // Select the appropriate price based on user preference
      let selectedPrice = point.price
      if (selectedPriceLine === 'support' && point.support !== undefined) {
        selectedPrice = point.support
      } else if (selectedPriceLine === 'resistance' && point.resistance !== undefined) {
        selectedPrice = point.resistance
      }
      
      return {
        timestamp: point.timestamp,
        price: selectedPrice,
        date: new Date(point.timestamp).toISOString().split('T')[0],
        support: point.support,
        resistance: point.resistance
      }
    })
    
    return {
      pricePoints,
      metadata: {
        modelName: projection.modelName,
        totalMonths: projection.metadata.totalMonths,
        startPrice: pricePoints[0]?.price || 0,
        endPrice: pricePoints[pricePoints.length - 1]?.price || 0,
        confidence: projection.metadata.confidence
      }
    }
  }
  
  /**
   * Convert new standard format to results-compatible format
   * Includes additional analytics for results visualization
   */
  static toResultsFormat(projection: NewPriceProjectionResult): ResultsPriceData {
    const strategyData = this.toStrategyFormat(projection)
    
    return {
      ...strategyData,
      analytics: {
        totalGrowth: projection.metadata.totalGrowth,
        averageMonthlyGrowth: projection.metadata.averageMonthlyGrowth,
        maxDecline: projection.metadata.maxDecline,
        volatility: projection.metadata.volatility
      }
    }
  }
  
  /**
   * Convert old format to new standard format
   * Used for backward compatibility during migration
   */
  static fromOldFormat(oldProjection: OldPriceProjectionResult): NewPriceProjectionResult {
    const projectionPoints: ProjectionPoint[] = oldProjection.projectionPoints.map(point => ({
      timestamp: point.timestamp,
      price: point.price,
      confidence: 1.0, // Old format doesn't have confidence
      metadata: {}
    }))
    
    return {
      modelName: oldProjection.metadata.model,
      modelVersion: oldProjection.metadata.version,
      projectionPoints,
      metadata: {
        totalMonths: oldProjection.metadata.totalMonths,
        totalGrowth: 0, // Calculate if needed
        averageMonthlyGrowth: 0, // Calculate if needed
        confidence: 1.0,
        generatedAt: oldProjection.metadata.generatedAt
      }
    }
  }
  
  /**
   * Convert legacy PriceChartDataPoint[] to new standard format
   * Used for ProjectionGenerator output conversion
   */
  static fromLegacyFormat(
    chartData: PriceChartDataPoint[],
    modelName: string = 'Legacy Model',
    historicalData?: HistoricalDataPoint[]
  ): NewPriceProjectionResult {
    // Separate historical and projection data (projection data has simulationPath)
    const projectionData = chartData.filter(point => point.simulationPath !== undefined)

    const projectionPoints: ProjectionPoint[] = projectionData.map(point => {
      // Calculate timestamp from date string
      const timestamp = new Date(point.date).getTime()

      return {
        timestamp,
        price: point.simulationPath || point.historicalPrice || 0,
        support: point.support,
        resistance: point.resistance,
        confidence: 1.0, // Legacy format doesn't have confidence
        metadata: {
          days: point.days,
          date: point.date
        }
      }
    })
    
    // Calculate metadata
    const startPrice = projectionPoints[0]?.price || 0
    const endPrice = projectionPoints[projectionPoints.length - 1]?.price || 0
    const totalGrowth = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0
    const totalMonths = Math.floor(projectionPoints.length / 30) // Approximate
    const averageMonthlyGrowth = totalMonths > 0 ? totalGrowth / totalMonths : 0
    
    return {
      modelName,
      modelVersion: '1.0.0',
      projectionPoints,
      metadata: {
        totalMonths,
        totalGrowth,
        averageMonthlyGrowth,
        confidence: 1.0,
        generatedAt: new Date().toISOString()
      }
    }
  }
  
  /**
   * Convert new standard format back to legacy format
   * Used for components that still expect PriceChartDataPoint[]
   */
  static toLegacyFormat(
    projection: NewPriceProjectionResult,
    historicalData?: HistoricalDataPoint[]
  ): PriceChartDataPoint[] {
    const chartData: PriceChartDataPoint[] = []

    // Add historical data if provided
    if (historicalData) {
      historicalData.forEach((point, index) => {
        chartData.push({
          date: point.date,
          days: index,
          historicalPrice: point.close
        })
      })
    }

    // Add projection data
    const historicalLength = historicalData?.length || 0
    projection.projectionPoints.forEach((point, index) => {
      const date = new Date(point.timestamp)
      chartData.push({
        date: date.toISOString().split('T')[0],
        days: historicalLength + index,
        simulationPath: point.price,
        support: point.support,
        resistance: point.resistance,
        fit: point.price // For Power Law compatibility
      })
    })

    return chartData
  }
  
  /**
   * Get price at specific month index
   * Handles monthly-to-daily conversion for strategy execution
   */
  static getPriceAtMonth(
    projection: NewPriceProjectionResult | StrategyPriceData,
    monthIndex: number,
    daysPerMonth: number = 30
  ): number {
    const points = 'projectionPoints' in projection 
      ? projection.projectionPoints 
      : projection.pricePoints
    
    const dailyIndex = Math.min(monthIndex * daysPerMonth, points.length - 1)
    const point = points[dailyIndex]
    
    return point?.price || 0
  }
  
  /**
   * Validate projection data integrity
   */
  static validate(projection: NewPriceProjectionResult): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!projection.modelName) {
      errors.push('Missing modelName')
    }
    
    if (!projection.projectionPoints || projection.projectionPoints.length === 0) {
      errors.push('No projection points')
    }
    
    if (!projection.metadata) {
      errors.push('Missing metadata')
    }
    
    // Validate projection points
    projection.projectionPoints.forEach((point, index) => {
      if (typeof point.timestamp !== 'number') {
        errors.push(`Invalid timestamp at index ${index}`)
      }
      if (typeof point.price !== 'number' || point.price < 0) {
        errors.push(`Invalid price at index ${index}`)
      }
    })
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Type guard to check if object is new standard format
 */
export function isNewPriceProjectionResult(obj: any): obj is NewPriceProjectionResult {
  return (
    obj &&
    typeof obj.modelName === 'string' &&
    typeof obj.modelVersion === 'string' &&
    Array.isArray(obj.projectionPoints) &&
    obj.metadata &&
    typeof obj.metadata.totalMonths === 'number'
  )
}

/**
 * Type guard to check if object is old format
 */
export function isOldPriceProjectionResult(obj: any): obj is OldPriceProjectionResult {
  return (
    obj &&
    Array.isArray(obj.projectedPrices) &&
    Array.isArray(obj.projectionPoints) &&
    obj.metadata &&
    typeof obj.metadata.model === 'string'
  )
}

