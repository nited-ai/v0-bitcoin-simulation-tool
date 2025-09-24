/**
 * Data Transformers
 * 
 * Utility functions for transforming and converting price data between different formats.
 */

import type {
  HistoricalDataPoint,
  PriceChartDataPoint,
  ExtendedHistoricalDataPoint,
  ProjectionPathPoint
} from '../types'
import { getDaysSinceGenesis } from '../models/powerLaw'

/**
 * Transform raw API data to standardized HistoricalDataPoint format.
 */
export function transformApiDataToHistorical(
  apiData: Array<{
    timestamp?: number
    time?: number
    date?: string
    price?: number
    close?: number
    open?: number
    high?: number
    low?: number
    volume?: number
  }>
): HistoricalDataPoint[] {
  return apiData.map(point => {
    const time = point.timestamp || point.time || 0
    const close = point.price || point.close || 0
    const date = point.date || new Date(time * 1000).toISOString().split('T')[0]

    return {
      time,
      date,
      open: point.open || close,
      high: point.high || close,
      low: point.low || close,
      close,
      volume: point.volume,
      source: 'api'
    }
  })
}

/**
 * Convert HistoricalDataPoint array to PriceChartDataPoint format.
 */
export function convertHistoricalToChartData(
  historicalData: HistoricalDataPoint[]
): PriceChartDataPoint[] {
  return historicalData.map((point, index) => ({
    date: point.date,
    days: getDaysSinceGenesis(new Date(point.date)),
    historicalPrice: point.close
  }))
}

/**
 * Convert ProjectionPathPoint array to chart data format.
 */
export function convertProjectionToChartData(
  projectionPath: ProjectionPathPoint[]
): PriceChartDataPoint[] {
  return projectionPath.map(point => ({
    date: point.date.toISOString().split('T')[0],
    days: getDaysSinceGenesis(point.date),
    simulationPath: point.price
  }))
}

/**
 * Merge historical and projection data into unified chart format.
 */
export function mergeHistoricalAndProjectionData(
  historical: HistoricalDataPoint[],
  projection: ProjectionPathPoint[]
): PriceChartDataPoint[] {
  const dataMap = new Map<string, PriceChartDataPoint>()

  // Add historical data
  historical.forEach(point => {
    dataMap.set(point.date, {
      date: point.date,
      days: getDaysSinceGenesis(new Date(point.date)),
      historicalPrice: point.close
    })
  })

  // Add projection data
  projection.forEach(point => {
    const dateString = point.date.toISOString().split('T')[0]
    const existing = dataMap.get(dateString) || {
      date: dateString,
      days: getDaysSinceGenesis(point.date)
    }

    dataMap.set(dateString, {
      ...existing,
      simulationPath: point.price
    })
  })

  return Array.from(dataMap.values()).sort((a, b) => a.days - b.days)
}

/**
 * Resample data to reduce density while preserving key points.
 */
export function resampleChartData(
  data: PriceChartDataPoint[],
  maxPoints: number,
  preserveExtremes: boolean = true
): PriceChartDataPoint[] {
  if (data.length <= maxPoints) {
    return data
  }

  const step = Math.ceil(data.length / maxPoints)
  const resampled: PriceChartDataPoint[] = []

  // Always include first point
  if (data.length > 0) {
    resampled.push(data[0])
  }

  // Sample intermediate points
  for (let i = step; i < data.length - step; i += step) {
    resampled.push(data[i])
  }

  // Always include last point
  if (data.length > 1 && resampled[resampled.length - 1] !== data[data.length - 1]) {
    resampled.push(data[data.length - 1])
  }

  // Preserve extreme values if requested
  if (preserveExtremes && data.length > 2) {
    const prices = data.map(point => point.historicalPrice || point.simulationPath || 0)
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)

    const maxIndex = prices.indexOf(maxPrice)
    const minIndex = prices.indexOf(minPrice)

    if (maxIndex !== -1 && !resampled.includes(data[maxIndex])) {
      resampled.push(data[maxIndex])
    }

    if (minIndex !== -1 && !resampled.includes(data[minIndex])) {
      resampled.push(data[minIndex])
    }

    // Re-sort after adding extremes
    resampled.sort((a, b) => a.days - b.days)
  }

  return resampled
}

/**
 * Filter chart data by date range.
 */
export function filterChartDataByDateRange(
  data: PriceChartDataPoint[],
  startDate: Date,
  endDate: Date
): PriceChartDataPoint[] {
  const startDateString = startDate.toISOString().split('T')[0]
  const endDateString = endDate.toISOString().split('T')[0]

  return data.filter(point => 
    point.date >= startDateString && point.date <= endDateString
  )
}

/**
 * Calculate price statistics for a dataset.
 */
export function calculatePriceStatistics(data: PriceChartDataPoint[]): {
  min: number
  max: number
  average: number
  median: number
  volatility: number
  totalPoints: number
} {
  const prices = data
    .map(point => point.historicalPrice || point.simulationPath)
    .filter((price): price is number => price !== undefined && price > 0)

  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      volatility: 0,
      totalPoints: 0
    }
  }

  const sortedPrices = [...prices].sort((a, b) => a - b)
  const min = sortedPrices[0]
  const max = sortedPrices[sortedPrices.length - 1]
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)]

  // Calculate volatility (standard deviation)
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length
  const volatility = Math.sqrt(variance)

  return {
    min,
    max,
    average,
    median,
    volatility,
    totalPoints: prices.length
  }
}

/**
 * Convert price data to different time intervals (daily, weekly, monthly).
 */
export function aggregateByTimeInterval(
  data: HistoricalDataPoint[],
  interval: 'daily' | 'weekly' | 'monthly'
): HistoricalDataPoint[] {
  if (interval === 'daily') {
    return data // Already daily
  }

  const grouped = new Map<string, HistoricalDataPoint[]>()

  data.forEach(point => {
    const date = new Date(point.date)
    let key: string

    if (interval === 'weekly') {
      // Group by week (Monday as start of week)
      const monday = new Date(date)
      monday.setDate(date.getDate() - date.getDay() + 1)
      key = monday.toISOString().split('T')[0]
    } else { // monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    }

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(point)
  })

  // Aggregate each group
  return Array.from(grouped.entries()).map(([key, points]) => {
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    const high = Math.max(...points.map(p => p.high))
    const low = Math.min(...points.map(p => p.low))
    const volume = points.reduce((sum, p) => sum + (p.volume || 0), 0)

    return {
      time: new Date(key).getTime() / 1000,
      date: key,
      open: firstPoint.open,
      high,
      low,
      close: lastPoint.close,
      volume,
      source: 'aggregated'
    }
  }).sort((a, b) => a.time - b.time)
}

/**
 * Calculate moving averages for price data.
 */
export function calculateMovingAverages(
  data: PriceChartDataPoint[],
  periods: number[]
): PriceChartDataPoint[] {
  return data.map((point, index) => {
    const result = { ...point }

    periods.forEach(period => {
      if (index >= period - 1) {
        const slice = data.slice(index - period + 1, index + 1)
        const prices = slice.map(p => p.historicalPrice || p.simulationPath || 0)
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
        
        // Add moving average as a dynamic property
        ;(result as any)[`ma${period}`] = average
      }
    })

    return result
  })
}

// getDaysSinceGenesis is imported from powerLaw model to avoid duplication

/**
 * Format price for display with appropriate precision.
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  if (price >= 1000000) {
    return `${currency === 'USD' ? '$' : ''}${(price / 1000000).toFixed(2)}M`
  } else if (price >= 1000) {
    return `${currency === 'USD' ? '$' : ''}${(price / 1000).toFixed(1)}K`
  } else {
    return `${currency === 'USD' ? '$' : ''}${price.toFixed(2)}`
  }
}

/**
 * Calculate percentage change between two prices.
 */
export function calculatePercentageChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0
  return ((newPrice - oldPrice) / oldPrice) * 100
}

/**
 * Validate and clean price data.
 */
export function cleanPriceData(data: any[]): HistoricalDataPoint[] {
  return data
    .filter(point => 
      point && 
      typeof point === 'object' &&
      (point.close || point.price) &&
      (point.time || point.timestamp || point.date)
    )
    .map(point => ({
      time: point.time || point.timestamp || new Date(point.date).getTime() / 1000,
      date: point.date || new Date((point.time || point.timestamp) * 1000).toISOString().split('T')[0],
      open: point.open || point.close || point.price,
      high: point.high || point.close || point.price,
      low: point.low || point.close || point.price,
      close: point.close || point.price,
      volume: point.volume,
      source: point.source || 'unknown'
    }))
    .filter(point => point.close > 0 && point.time > 0)
    .sort((a, b) => a.time - b.time)
}
