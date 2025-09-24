/**
 * useHistoricalData Hook
 * 
 * Specialized React hook for historical Bitcoin price data management.
 * Provides caching, filtering, and data transformation capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { HistoricalDataPoint, DataFetchOptions, HistoricalDataSet } from '../types'
import { priceDataService } from '../services/PriceDataService'

interface UseHistoricalDataOptions extends DataFetchOptions {
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  resamplePoints?: number
  includeVolume?: boolean
}

interface UseHistoricalDataReturn {
  // Data
  data: HistoricalDataPoint[]
  filteredData: HistoricalDataPoint[]
  dataSet: HistoricalDataSet | null
  
  // Loading state
  isLoading: boolean
  error: string | null
  
  // Actions
  loadData: () => Promise<void>
  filterByDateRange: (startDate: Date, endDate: Date) => void
  resampleData: (maxPoints: number) => void
  clearFilter: () => void
  
  // Computed values
  priceRange: { min: number; max: number } | null
  dateRange: { start: Date; end: Date } | null
  totalPoints: number
  averagePrice: number
}

/**
 * Hook for managing historical Bitcoin price data.
 */
export function useHistoricalData(options: UseHistoricalDataOptions = {}): UseHistoricalDataReturn {
  // State
  const [data, setData] = useState<HistoricalDataPoint[]>([])
  const [filteredData, setFilteredData] = useState<HistoricalDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load historical data from service.
   */
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const historicalData = await priceDataService.loadHistoricalData(options)
      setData(historicalData)
      setFilteredData(historicalData)
      console.log(`✅ Historical data loaded: ${historicalData.length} points`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load historical data'
      setError(errorMessage)
      console.error('❌ Failed to load historical data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  /**
   * Filter data by date range.
   */
  const filterByDateRange = useCallback((startDate: Date, endDate: Date) => {
    const startDateString = startDate.toISOString().split('T')[0]
    const endDateString = endDate.toISOString().split('T')[0]

    const filtered = data.filter(point => 
      point.date >= startDateString && point.date <= endDateString
    )

    setFilteredData(filtered)
    console.log(`📊 Data filtered: ${filtered.length} points in range ${startDateString} to ${endDateString}`)
  }, [data])

  /**
   * Resample data to reduce density.
   */
  const resampleData = useCallback((maxPoints: number) => {
    if (data.length <= maxPoints) {
      setFilteredData(data)
      return
    }

    const step = Math.ceil(data.length / maxPoints)
    const resampled: HistoricalDataPoint[] = []

    for (let i = 0; i < data.length; i += step) {
      resampled.push(data[i])
    }

    // Always include the last point
    if (resampled[resampled.length - 1] !== data[data.length - 1]) {
      resampled.push(data[data.length - 1])
    }

    setFilteredData(resampled)
    console.log(`📊 Data resampled: ${resampled.length} points (from ${data.length})`)
  }, [data])

  /**
   * Clear all filters and show original data.
   */
  const clearFilter = useCallback(() => {
    setFilteredData(data)
    console.log('🔄 Data filter cleared')
  }, [data])

  // Apply initial date range filter if provided
  useEffect(() => {
    if (options.dateRange && data.length > 0) {
      filterByDateRange(options.dateRange.startDate, options.dateRange.endDate)
    }
  }, [data, options.dateRange, filterByDateRange])

  // Apply resampling if specified
  useEffect(() => {
    if (options.resamplePoints && filteredData.length > options.resamplePoints) {
      resampleData(options.resamplePoints)
    }
  }, [filteredData.length, options.resamplePoints, resampleData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Computed values
  const priceRange = useMemo(() => {
    if (filteredData.length === 0) return null

    const prices = filteredData.map(point => point.close)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }, [filteredData])

  const dateRange = useMemo(() => {
    if (filteredData.length === 0) return null

    const dates = filteredData.map(point => new Date(point.date))
    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    }
  }, [filteredData])

  const totalPoints = useMemo(() => filteredData.length, [filteredData])

  const averagePrice = useMemo(() => {
    if (filteredData.length === 0) return 0
    
    const sum = filteredData.reduce((acc, point) => acc + point.close, 0)
    return sum / filteredData.length
  }, [filteredData])

  const dataSet = useMemo((): HistoricalDataSet | null => {
    if (filteredData.length === 0 || !dateRange) return null

    return {
      data: filteredData,
      startDate: dateRange.start,
      endDate: dateRange.end,
      totalPoints: filteredData.length,
      source: 'price-data-service',
      lastUpdated: new Date()
    }
  }, [filteredData, dateRange])

  return {
    // Data
    data,
    filteredData,
    dataSet,
    
    // Loading state
    isLoading,
    error,
    
    // Actions
    loadData,
    filterByDateRange,
    resampleData,
    clearFilter,
    
    // Computed values
    priceRange,
    dateRange,
    totalPoints,
    averagePrice
  }
}

/**
 * Hook for historical data with automatic date range filtering.
 */
export function useHistoricalDataWithDateRange(
  startDate: Date,
  endDate: Date,
  options: Omit<UseHistoricalDataOptions, 'dateRange'> = {}
) {
  return useHistoricalData({
    ...options,
    dateRange: { startDate, endDate }
  })
}

/**
 * Hook for recent historical data (last N days).
 */
export function useRecentHistoricalData(
  days: number,
  options: Omit<UseHistoricalDataOptions, 'dateRange'> = {}
) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return useHistoricalData({
    ...options,
    dateRange: { startDate, endDate }
  })
}

/**
 * Hook for historical data with performance optimization.
 */
export function useOptimizedHistoricalData(
  maxPoints: number = 1000,
  options: Omit<UseHistoricalDataOptions, 'resamplePoints'> = {}
) {
  return useHistoricalData({
    ...options,
    resamplePoints: maxPoints
  })
}
