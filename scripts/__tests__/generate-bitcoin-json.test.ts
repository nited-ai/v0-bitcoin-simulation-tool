/**
 * Tests for Bitcoin JSON data generation script
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { 
  convertBackupDataToOptimized,
  generateWeeklyData,
  generateMonthlyData,
  validateDataIntegrity,
  generateMetadata,
  type OptimizedBitcoinData,
  type BitcoinPriceRecord
} from '../generate-bitcoin-json'

describe('Bitcoin JSON Data Generation', () => {
  const mockBackupData: BitcoinPriceRecord[] = [
    {
      date: '2024-01-01',
      timestamp: 1704067200000,
      open: 42000,
      high: 43000,
      low: 41000,
      close: 42500,
      volume: 1000,
      source: 'test'
    },
    {
      date: '2024-01-02',
      timestamp: 1704153600000,
      open: 42500,
      high: 44000,
      low: 42000,
      close: 43000,
      volume: 1200,
      source: 'test'
    },
    {
      date: '2024-01-08',
      timestamp: 1704672000000,
      open: 43000,
      high: 45000,
      low: 42500,
      close: 44000,
      volume: 1500,
      source: 'test'
    },
    {
      date: '2024-02-01',
      timestamp: 1706745600000,
      open: 44000,
      high: 46000,
      low: 43500,
      close: 45000,
      volume: 1800,
      source: 'test'
    }
  ]

  describe('convertBackupDataToOptimized', () => {
    it('should convert backup data to optimized format', () => {
      const result = convertBackupDataToOptimized(mockBackupData)
      
      expect(result.data).toHaveLength(4)
      expect(result.data[0]).toEqual([1704067200000, 42500])
      expect(result.data[1]).toEqual([1704153600000, 43000])
      expect(result.data[2]).toEqual([1704672000000, 44000])
      expect(result.data[3]).toEqual([1706745600000, 45000])
    })

    it('should generate correct metadata', () => {
      const result = convertBackupDataToOptimized(mockBackupData)
      
      expect(result.meta.startDate).toBe('2024-01-01')
      expect(result.meta.endDate).toBe('2024-02-01')
      expect(result.meta.interval).toBe('daily')
      expect(result.meta.count).toBe(4)
      expect(result.meta.lastUpdated).toBeDefined()
    })

    it('should handle empty data', () => {
      const result = convertBackupDataToOptimized([])
      
      expect(result.data).toHaveLength(0)
      expect(result.meta.count).toBe(0)
      expect(result.meta.startDate).toBe('')
      expect(result.meta.endDate).toBe('')
    })
  })

  describe('generateWeeklyData', () => {
    it('should aggregate daily data to weekly', () => {
      const dailyData: OptimizedBitcoinData = {
        meta: {
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          interval: 'daily',
          count: 4,
          lastUpdated: new Date().toISOString()
        },
        data: [
          [1704067200000, 42500], // 2024-01-01 (Monday)
          [1704153600000, 43000], // 2024-01-02 (Tuesday)
          [1704672000000, 44000], // 2024-01-08 (Monday)
          [1706745600000, 45000]  // 2024-02-01 (Thursday)
        ]
      }

      const result = generateWeeklyData(dailyData)
      
      expect(result.meta.interval).toBe('weekly')
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.length).toBeLessThan(dailyData.data.length)
    })
  })

  describe('generateMonthlyData', () => {
    it('should aggregate daily data to monthly', () => {
      const dailyData: OptimizedBitcoinData = {
        meta: {
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          interval: 'daily',
          count: 4,
          lastUpdated: new Date().toISOString()
        },
        data: [
          [1704067200000, 42500], // 2024-01-01
          [1704153600000, 43000], // 2024-01-02
          [1704672000000, 44000], // 2024-01-08
          [1706745600000, 45000]  // 2024-02-01
        ]
      }

      const result = generateMonthlyData(dailyData)
      
      expect(result.meta.interval).toBe('monthly')
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.length).toBeLessThan(dailyData.data.length)
    })
  })

  describe('validateDataIntegrity', () => {
    it('should validate correct data format', () => {
      const validData: OptimizedBitcoinData = {
        meta: {
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          interval: 'daily',
          count: 2,
          lastUpdated: new Date().toISOString()
        },
        data: [
          [1704067200000, 42500],
          [1704153600000, 43000]
        ]
      }

      expect(() => validateDataIntegrity(validData)).not.toThrow()
    })

    it('should throw error for invalid data format', () => {
      const invalidData = {
        meta: {
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          interval: 'daily',
          count: 2,
          lastUpdated: new Date().toISOString()
        },
        data: [
          [1704067200000], // Missing close price
          [1704153600000, 43000]
        ]
      } as OptimizedBitcoinData

      expect(() => validateDataIntegrity(invalidData)).toThrow()
    })

    it('should throw error for count mismatch', () => {
      const invalidData: OptimizedBitcoinData = {
        meta: {
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          interval: 'daily',
          count: 5, // Wrong count
          lastUpdated: new Date().toISOString()
        },
        data: [
          [1704067200000, 42500],
          [1704153600000, 43000]
        ]
      }

      expect(() => validateDataIntegrity(invalidData)).toThrow()
    })
  })

  describe('generateMetadata', () => {
    it('should generate correct metadata from data array', () => {
      const data: [number, number][] = [
        [1704067200000, 42500],
        [1704153600000, 43000],
        [1704672000000, 44000]
      ]

      const result = generateMetadata(data, 'weekly')
      
      expect(result.startDate).toBe('2024-01-01')
      expect(result.endDate).toBe('2024-01-08')
      expect(result.interval).toBe('weekly')
      expect(result.count).toBe(3)
      expect(result.lastUpdated).toBeDefined()
    })

    it('should handle empty data array', () => {
      const result = generateMetadata([], 'daily')
      
      expect(result.startDate).toBe('')
      expect(result.endDate).toBe('')
      expect(result.count).toBe(0)
    })
  })
})
