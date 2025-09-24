/**
 * Data Transformers Tests
 * 
 * Test suite for data transformation utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  transformApiDataToHistorical,
  convertHistoricalToChartData,
  convertProjectionToChartData,
  mergeHistoricalAndProjectionData,
  resampleChartData,
  filterChartDataByDateRange,
  calculatePriceStatistics,
  aggregateByTimeInterval,
  calculateMovingAverages,
  formatPrice,
  calculatePercentageChange,
  cleanPriceData
} from '../utils/dataTransformers'
import { getDaysSinceGenesis } from '../models/powerLaw'
import type { HistoricalDataPoint, ProjectionPathPoint, PriceChartDataPoint } from '../types'

describe('dataTransformers', () => {
  describe('transformApiDataToHistorical', () => {
    it('should transform API data with timestamp', () => {
      const apiData = [
        {
          timestamp: 1609459200,
          price: 29500,
          volume: 1000000
        }
      ]

      const result = transformApiDataToHistorical(apiData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        time: 1609459200,
        date: '2021-01-01',
        open: 29500,
        high: 29500,
        low: 29500,
        close: 29500,
        volume: 1000000,
        source: 'api'
      })
    })

    it('should transform API data with time field', () => {
      const apiData = [
        {
          time: 1609459200,
          close: 29500,
          open: 29000,
          high: 30000,
          low: 28500
        }
      ]

      const result = transformApiDataToHistorical(apiData)

      expect(result[0]).toEqual({
        time: 1609459200,
        date: '2021-01-01',
        open: 29000,
        high: 30000,
        low: 28500,
        close: 29500,
        volume: undefined,
        source: 'api'
      })
    })

    it('should handle missing fields gracefully', () => {
      const apiData = [
        {
          timestamp: 1609459200
          // Missing price/close
        }
      ]

      const result = transformApiDataToHistorical(apiData)

      expect(result[0].close).toBe(0)
      expect(result[0].open).toBe(0)
      expect(result[0].high).toBe(0)
      expect(result[0].low).toBe(0)
    })
  })

  describe('convertHistoricalToChartData', () => {
    it('should convert historical data to chart format', () => {
      const historicalData: HistoricalDataPoint[] = [
        {
          time: 1609459200,
          date: '2021-01-01',
          open: 29000,
          high: 30000,
          low: 28000,
          close: 29500,
          source: 'test'
        }
      ]

      const result = convertHistoricalToChartData(historicalData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: '2021-01-01',
        days: expect.any(Number),
        historicalPrice: 29500
      })
    })
  })

  describe('convertProjectionToChartData', () => {
    it('should convert projection data to chart format', () => {
      const projectionData: ProjectionPathPoint[] = [
        {
          date: new Date('2021-01-01'),
          price: 35000
        }
      ]

      const result = convertProjectionToChartData(projectionData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: '2021-01-01',
        days: expect.any(Number),
        simulationPath: 35000
      })
    })
  })

  describe('mergeHistoricalAndProjectionData', () => {
    it('should merge historical and projection data', () => {
      const historical: HistoricalDataPoint[] = [
        {
          time: 1609459200,
          date: '2021-01-01',
          open: 29000,
          high: 30000,
          low: 28000,
          close: 29500,
          source: 'test'
        }
      ]

      const projection: ProjectionPathPoint[] = [
        {
          date: new Date('2021-01-02'),
          price: 35000
        }
      ]

      const result = mergeHistoricalAndProjectionData(historical, projection)

      expect(result).toHaveLength(2)
      expect(result[0].historicalPrice).toBe(29500)
      expect(result[1].simulationPath).toBe(35000)
    })

    it('should handle overlapping dates', () => {
      const historical: HistoricalDataPoint[] = [
        {
          time: 1609459200,
          date: '2021-01-01',
          open: 29000,
          high: 30000,
          low: 28000,
          close: 29500,
          source: 'test'
        }
      ]

      const projection: ProjectionPathPoint[] = [
        {
          date: new Date('2021-01-01'), // Same date
          price: 35000
        }
      ]

      const result = mergeHistoricalAndProjectionData(historical, projection)

      expect(result).toHaveLength(1)
      expect(result[0].historicalPrice).toBe(29500)
      expect(result[0].simulationPath).toBe(35000)
    })
  })

  describe('resampleChartData', () => {
    const createTestData = (count: number): PriceChartDataPoint[] => {
      return Array.from({ length: count }, (_, i) => ({
        date: `2021-01-${String(i + 1).padStart(2, '0')}`,
        days: i,
        historicalPrice: 30000 + i * 100
      }))
    }

    it('should resample data to target size', () => {
      const data = createTestData(100)
      const result = resampleChartData(data, 10)

      expect(result.length).toBeLessThanOrEqual(12) // 10 + first + last
      expect(result[0]).toEqual(data[0]) // First point preserved
      expect(result[result.length - 1]).toEqual(data[data.length - 1]) // Last point preserved
    })

    it('should return original data if already small enough', () => {
      const data = createTestData(5)
      const result = resampleChartData(data, 10)

      expect(result).toEqual(data)
    })

    it('should preserve extreme values when requested', () => {
      const data = createTestData(100)
      // Add extreme values
      data[50] = { ...data[50], historicalPrice: 100000 } // Max
      data[25] = { ...data[25], historicalPrice: 1000 } // Min

      const result = resampleChartData(data, 10, true)

      const prices = result.map(p => p.historicalPrice || 0)
      expect(Math.max(...prices)).toBe(100000)
      expect(Math.min(...prices)).toBe(1000)
    })
  })

  describe('filterChartDataByDateRange', () => {
    const testData: PriceChartDataPoint[] = [
      { date: '2021-01-01', days: 0, historicalPrice: 30000 },
      { date: '2021-01-02', days: 1, historicalPrice: 31000 },
      { date: '2021-01-03', days: 2, historicalPrice: 32000 },
      { date: '2021-01-04', days: 3, historicalPrice: 33000 },
      { date: '2021-01-05', days: 4, historicalPrice: 34000 }
    ]

    it('should filter data by date range', () => {
      const startDate = new Date('2021-01-02')
      const endDate = new Date('2021-01-04')

      const result = filterChartDataByDateRange(testData, startDate, endDate)

      expect(result).toHaveLength(3)
      expect(result[0].date).toBe('2021-01-02')
      expect(result[2].date).toBe('2021-01-04')
    })

    it('should return empty array for invalid range', () => {
      const startDate = new Date('2021-01-10')
      const endDate = new Date('2021-01-15')

      const result = filterChartDataByDateRange(testData, startDate, endDate)

      expect(result).toHaveLength(0)
    })
  })

  describe('calculatePriceStatistics', () => {
    const testData: PriceChartDataPoint[] = [
      { date: '2021-01-01', days: 0, historicalPrice: 30000 },
      { date: '2021-01-02', days: 1, historicalPrice: 40000 },
      { date: '2021-01-03', days: 2, historicalPrice: 20000 },
      { date: '2021-01-04', days: 3, simulationPath: 50000 },
      { date: '2021-01-05', days: 4, simulationPath: 10000 }
    ]

    it('should calculate price statistics correctly', () => {
      const result = calculatePriceStatistics(testData)

      expect(result.min).toBe(10000)
      expect(result.max).toBe(50000)
      expect(result.average).toBe(30000) // (30000 + 40000 + 20000 + 50000 + 10000) / 5
      expect(result.totalPoints).toBe(5)
      expect(result.volatility).toBeGreaterThan(0)
    })

    it('should handle empty data', () => {
      const result = calculatePriceStatistics([])

      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      expect(result.average).toBe(0)
      expect(result.median).toBe(0)
      expect(result.volatility).toBe(0)
      expect(result.totalPoints).toBe(0)
    })
  })

  describe('aggregateByTimeInterval', () => {
    const dailyData: HistoricalDataPoint[] = [
      {
        time: 1609459200, // 2021-01-01
        date: '2021-01-01',
        open: 29000,
        high: 30000,
        low: 28000,
        close: 29500,
        volume: 1000,
        source: 'test'
      },
      {
        time: 1609545600, // 2021-01-02
        date: '2021-01-02',
        open: 29500,
        high: 31000,
        low: 29000,
        close: 30500,
        volume: 1200,
        source: 'test'
      }
    ]

    it('should return daily data unchanged', () => {
      const result = aggregateByTimeInterval(dailyData, 'daily')
      expect(result).toEqual(dailyData)
    })

    it('should aggregate to weekly data', () => {
      const result = aggregateByTimeInterval(dailyData, 'weekly')

      expect(result).toHaveLength(1)
      expect(result[0].open).toBe(29000) // First point's open
      expect(result[0].close).toBe(30500) // Last point's close
      expect(result[0].high).toBe(31000) // Max high
      expect(result[0].low).toBe(28000) // Min low
      expect(result[0].volume).toBe(2200) // Sum of volumes
    })

    it('should aggregate to monthly data', () => {
      const result = aggregateByTimeInterval(dailyData, 'monthly')

      expect(result).toHaveLength(1)
      expect(result[0].date).toBe('2021-01-01')
    })
  })

  describe('calculateMovingAverages', () => {
    const testData: PriceChartDataPoint[] = [
      { date: '2021-01-01', days: 0, historicalPrice: 30000 },
      { date: '2021-01-02', days: 1, historicalPrice: 32000 },
      { date: '2021-01-03', days: 2, historicalPrice: 34000 },
      { date: '2021-01-04', days: 3, historicalPrice: 36000 },
      { date: '2021-01-05', days: 4, historicalPrice: 38000 }
    ]

    it('should calculate moving averages', () => {
      const result = calculateMovingAverages(testData, [3])

      expect(result).toHaveLength(5)
      expect((result[2] as any).ma3).toBe(32000) // (30000 + 32000 + 34000) / 3
      expect((result[3] as any).ma3).toBe(34000) // (32000 + 34000 + 36000) / 3
      expect((result[4] as any).ma3).toBe(36000) // (34000 + 36000 + 38000) / 3
    })

    it('should handle multiple periods', () => {
      const result = calculateMovingAverages(testData, [2, 3])

      expect((result[1] as any).ma2).toBe(31000) // (30000 + 32000) / 2
      expect((result[2] as any).ma2).toBe(33000) // (32000 + 34000) / 2
      expect((result[2] as any).ma3).toBe(32000) // (30000 + 32000 + 34000) / 3
    })
  })

  describe('getDaysSinceGenesis', () => {
    it('should calculate days since Bitcoin genesis', () => {
      const genesisDate = new Date('2009-01-03')
      const testDate = new Date('2009-01-04')

      const result = getDaysSinceGenesis(testDate)
      expect(result).toBe(1)
    })

    it('should handle dates before genesis', () => {
      const beforeGenesis = new Date('2009-01-01')
      const result = getDaysSinceGenesis(beforeGenesis)
      expect(result).toBe(-2)
    })
  })

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(1234.56)).toBe('$1.2K')
      expect(formatPrice(1234567)).toBe('$1.23M')
      expect(formatPrice(12345)).toBe('$12.3K')
      expect(formatPrice(999.99)).toBe('$999.99')
    })

    it('should handle different currencies', () => {
      expect(formatPrice(1234.56, 'EUR')).toBe('1.2K')
      expect(formatPrice(999.99, 'EUR')).toBe('999.99')
    })
  })

  describe('calculatePercentageChange', () => {
    it('should calculate percentage change correctly', () => {
      expect(calculatePercentageChange(100, 110)).toBe(10)
      expect(calculatePercentageChange(100, 90)).toBe(-10)
      expect(calculatePercentageChange(0, 100)).toBe(0)
    })
  })

  describe('cleanPriceData', () => {
    it('should clean and validate price data', () => {
      const dirtyData = [
        { close: 30000, time: 1609459200 },
        { price: 31000, timestamp: 1609545600 },
        { close: -100, time: 1609632000 }, // Invalid negative price
        null, // Invalid null entry
        { close: 32000 }, // Missing time
        { close: 33000, time: 1609804800 }
      ]

      const result = cleanPriceData(dirtyData)

      expect(result).toHaveLength(3) // Only valid entries
      expect(result[0].close).toBe(30000)
      expect(result[1].close).toBe(31000)
      expect(result[2].close).toBe(33000)
      
      // Should be sorted by time
      expect(result[0].time).toBeLessThan(result[1].time)
      expect(result[1].time).toBeLessThan(result[2].time)
    })
  })
})
