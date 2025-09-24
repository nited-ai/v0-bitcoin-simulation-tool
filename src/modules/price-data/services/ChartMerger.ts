/**
 * Chart Merger Service
 * 
 * Efficiently merges historical data with projection data for chart display.
 * Migrated from lib/price-engine/chart-merger.ts
 */

import type { PriceChartDataPoint, PriceEngineParams, ProjectionPathPoint } from '../types'

/**
 * Service for merging historical and projection data into chart-ready format.
 */
export class ChartMerger {

  /**
   * Efficiently merge cached historical chart data with new projection data.
   * This avoids re-processing historical data every time.
   */
  public mergeHistoricalAndProjection(
    historicalChartData: PriceChartDataPoint[],
    projectionPath: ProjectionPathPoint[]
  ): PriceChartDataPoint[] {
    
    const dataMap = new Map<string, PriceChartDataPoint>()
    
    // Add cached historical data (already processed)
    historicalChartData.forEach(point => {
      dataMap.set(point.date, { ...point })
    })
    
    // Add projection data
    projectionPath.forEach(point => {
      const dateString = point.date.toISOString().split("T")[0]
      const existingPoint = dataMap.get(dateString) || {
        date: dateString,
        days: this.getDaysSinceGenesis(point.date),
      }
      dataMap.set(dateString, {
        ...existingPoint,
        simulationPath: point.price,
      })
    })
    
    // Convert back to array and sort by days
    return Array.from(dataMap.values()).sort((a, b) => a.days - b.days)
  }

  /**
   * Add Power Law support/resistance/fit lines to chart data.
   * These lines are available as reference lines in all price models.
   */
  public addPowerLawLines(chartData: PriceChartDataPoint[], params: PriceEngineParams): void {
    console.log(`📊 Adding Power Law reference lines to chart data`)

    chartData.forEach(point => {
      const date = new Date(point.date)
      point.support = this.getPowerLawPrice(date, "support")
      point.resistance = this.getPowerLawPrice(date, "resistance")
      point.fit = this.getPowerLawPrice(date, "fit")
    })
  }

  /**
   * Convert historical data points to chart format.
   */
  public convertHistoricalToChartData(
    historicalData: Array<{
      time: number
      close: number
      date: string
      open?: number
      high?: number
      low?: number
    }>
  ): PriceChartDataPoint[] {
    return historicalData.map((point, index) => ({
      date: point.date,
      days: index,
      historicalPrice: point.close,
    }))
  }

  /**
   * Merge multiple data series into a single chart dataset.
   */
  public mergeMultipleSeries(
    series: Array<{
      name: string
      data: Array<{ date: string; value: number }>
    }>
  ): PriceChartDataPoint[] {
    const dataMap = new Map<string, Partial<PriceChartDataPoint>>()

    // Process each series
    series.forEach(({ name, data }) => {
      data.forEach(point => {
        const existing = dataMap.get(point.date) || {
          date: point.date,
          days: this.getDaysSinceGenesis(new Date(point.date))
        }

        // Map series name to appropriate field
        switch (name.toLowerCase()) {
          case 'historical':
            existing.historicalPrice = point.value
            break
          case 'simulation':
          case 'projection':
            existing.simulationPath = point.value
            break
          case 'support':
            existing.support = point.value
            break
          case 'resistance':
            existing.resistance = point.value
            break
          case 'fit':
            existing.fit = point.value
            break
        }

        dataMap.set(point.date, existing)
      })
    })

    return Array.from(dataMap.values())
      .map(point => point as PriceChartDataPoint)
      .sort((a, b) => a.days - b.days)
  }

  /**
   * Filter chart data by date range.
   */
  public filterByDateRange(
    chartData: PriceChartDataPoint[],
    startDate: Date,
    endDate: Date
  ): PriceChartDataPoint[] {
    const startDateString = startDate.toISOString().split('T')[0]
    const endDateString = endDate.toISOString().split('T')[0]

    return chartData.filter(point => 
      point.date >= startDateString && point.date <= endDateString
    )
  }

  /**
   * Resample chart data to reduce density for performance.
   */
  public resampleData(
    chartData: PriceChartDataPoint[],
    maxPoints: number
  ): PriceChartDataPoint[] {
    if (chartData.length <= maxPoints) {
      return chartData
    }

    const step = Math.ceil(chartData.length / maxPoints)
    const resampled: PriceChartDataPoint[] = []

    for (let i = 0; i < chartData.length; i += step) {
      resampled.push(chartData[i])
    }

    // Always include the last point
    if (resampled[resampled.length - 1] !== chartData[chartData.length - 1]) {
      resampled.push(chartData[chartData.length - 1])
    }

    return resampled
  }

  /**
   * Calculate days since Bitcoin genesis block (January 3, 2009).
   */
  private getDaysSinceGenesis(date: Date): number {
    const genesisDate = new Date('2009-01-03')
    const diffTime = date.getTime() - genesisDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Calculate Power Law price for a given date and line type.
   * Placeholder - will be replaced with actual Power Law implementation.
   */
  private getPowerLawPrice(date: Date, lineType: "support" | "resistance" | "fit"): number {
    const daysSinceGenesis = this.getDaysSinceGenesis(date)
    
    // Placeholder Power Law calculation
    // This will be replaced with the actual implementation
    const basePrice = 0.01
    const exponent = 5.8
    const coefficient = 10 ** -17

    let multiplier = 1
    switch (lineType) {
      case 'support':
        multiplier = 0.5
        break
      case 'resistance':
        multiplier = 2
        break
      case 'fit':
      default:
        multiplier = 1
        break
    }

    return coefficient * Math.pow(daysSinceGenesis, exponent) * multiplier
  }

  /**
   * Validate chart data integrity.
   */
  public validateChartData(chartData: PriceChartDataPoint[]): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!Array.isArray(chartData)) {
      errors.push('Chart data must be an array')
      return { isValid: false, errors }
    }

    if (chartData.length === 0) {
      errors.push('Chart data cannot be empty')
      return { isValid: false, errors }
    }

    chartData.forEach((point, index) => {
      if (!point.date) {
        errors.push(`Point ${index}: Missing date`)
      }
      
      if (typeof point.days !== 'number') {
        errors.push(`Point ${index}: Invalid days value`)
      }

      if (point.historicalPrice !== undefined && (typeof point.historicalPrice !== 'number' || point.historicalPrice <= 0)) {
        errors.push(`Point ${index}: Invalid historical price`)
      }

      if (point.simulationPath !== undefined && (typeof point.simulationPath !== 'number' || point.simulationPath <= 0)) {
        errors.push(`Point ${index}: Invalid simulation path price`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
