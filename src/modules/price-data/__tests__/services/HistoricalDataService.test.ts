import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HistoricalDataService } from '../../services/HistoricalDataService'
import type { HistoricalDataPoint } from '../../types'
import fs from 'fs/promises'
import path from 'path'

describe('HistoricalDataService', () => {
  let service: HistoricalDataService
  let testDataDir: string
  let mockData: HistoricalDataPoint[]

  beforeEach(async () => {
    testDataDir = path.join(process.cwd(), 'test-data')
    service = new HistoricalDataService(testDataDir)
    
    mockData = [
      {
        time: 1704067200000, // 2024-01-01
        close: 42000,
        high: 43000,
        low: 41000,
        open: 41500,
        volume: 1000000
      },
      {
        time: 1704153600000, // 2024-01-02
        close: 43000,
        high: 44000,
        low: 42000,
        open: 42000,
        volume: 1200000
      },
      {
        time: 1704240000000, // 2024-01-03
        close: 42500,
        high: 43500,
        low: 41500,
        open: 43000,
        volume: 900000
      }
    ]

    // Ensure test directory exists
    try {
      await fs.mkdir(testDataDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist
    }
  })

  describe('Data Storage and Retrieval', () => {
    it('should save and load historical data', async () => {
      const saved = await service.saveHistoricalData('bitcoin', 'daily', mockData)
      expect(saved).toBe(true)
      
      const loaded = await service.loadHistoricalData('bitcoin', 'daily')
      expect(loaded).toHaveLength(3)
      expect(loaded[0].close).toBe(42000)
      expect(loaded[1].close).toBe(43000)
      expect(loaded[2].close).toBe(42500)
    })

    it('should handle non-existent data gracefully', async () => {
      const loaded = await service.loadHistoricalData('nonexistent', 'daily')
      expect(loaded).toHaveLength(0)
    })

    it('should preserve data structure and types', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      const loaded = await service.loadHistoricalData('bitcoin', 'daily')
      
      loaded.forEach((point, index) => {
        const original = mockData[index]
        expect(point.time).toBe(original.time)
        expect(point.close).toBe(original.close)
        expect(point.high).toBe(original.high)
        expect(point.low).toBe(original.low)
        expect(point.open).toBe(original.open)
        expect(point.volume).toBe(original.volume)
      })
    })

    it('should handle different intervals', async () => {
      await service.saveHistoricalData('bitcoin', 'weekly', mockData)
      await service.saveHistoricalData('bitcoin', 'monthly', mockData)
      
      const weeklyData = await service.loadHistoricalData('bitcoin', 'weekly')
      const monthlyData = await service.loadHistoricalData('bitcoin', 'monthly')
      
      expect(weeklyData).toHaveLength(3)
      expect(monthlyData).toHaveLength(3)
    })

    it('should handle different symbols', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      await service.saveHistoricalData('ethereum', 'daily', mockData)
      
      const bitcoinData = await service.loadHistoricalData('bitcoin', 'daily')
      const ethereumData = await service.loadHistoricalData('ethereum', 'daily')
      
      expect(bitcoinData).toHaveLength(3)
      expect(ethereumData).toHaveLength(3)
    })
  })

  describe('Data Updates', () => {
    it('should update existing data with new points', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const newData = [
        {
          time: 1704326400000, // 2024-01-04
          close: 44000,
          high: 45000,
          low: 43000,
          open: 42500,
          volume: 1100000
        }
      ]
      
      const updated = await service.updateHistoricalData('bitcoin', 'daily', newData)
      expect(updated).toBe(true)
      
      const allData = await service.loadHistoricalData('bitcoin', 'daily')
      expect(allData).toHaveLength(4)
      expect(allData[3].close).toBe(44000)
    })

    it('should merge and sort data correctly', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const newData = [
        {
          time: 1704067200000, // Same as first point - should update
          close: 42100,
          high: 43100,
          low: 41100,
          open: 41600,
          volume: 1050000
        },
        {
          time: 1704326400000, // New point
          close: 44000,
          high: 45000,
          low: 43000,
          open: 42500,
          volume: 1100000
        }
      ]
      
      await service.updateHistoricalData('bitcoin', 'daily', newData)
      const allData = await service.loadHistoricalData('bitcoin', 'daily')
      
      expect(allData).toHaveLength(4)
      expect(allData[0].close).toBe(42100) // Updated
      expect(allData[3].close).toBe(44000) // New
    })

    it('should handle empty update data', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const updated = await service.updateHistoricalData('bitcoin', 'daily', [])
      expect(updated).toBe(true)
      
      const data = await service.loadHistoricalData('bitcoin', 'daily')
      expect(data).toHaveLength(3) // Unchanged
    })
  })

  describe('Data Range Information', () => {
    it('should get correct data range', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const range = await service.getDataRange('bitcoin', 'daily')
      
      expect(range).toBeDefined()
      expect(range!.start).toEqual(new Date(1704067200000))
      expect(range!.end).toEqual(new Date(1704240000000))
    })

    it('should return null for non-existent data', async () => {
      const range = await service.getDataRange('nonexistent', 'daily')
      expect(range).toBeNull()
    })

    it('should handle single data point', async () => {
      const singlePoint = [mockData[0]]
      await service.saveHistoricalData('bitcoin', 'daily', singlePoint)
      
      const range = await service.getDataRange('bitcoin', 'daily')
      
      expect(range).toBeDefined()
      expect(range!.start).toEqual(range!.end)
    })
  })

  describe('Data Cleanup', () => {
    it('should clean up old data files', async () => {
      // Create some test files with old timestamps
      const oldFile = path.join(testDataDir, 'bitcoin-daily.json')
      await fs.writeFile(oldFile, JSON.stringify(mockData))
      
      // Set file modification time to 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      await fs.utimes(oldFile, tenDaysAgo, tenDaysAgo)
      
      const cleanedCount = await service.cleanupOldData(5) // 5 days retention
      
      expect(cleanedCount).toBe(1)
      
      // File should be deleted
      try {
        await fs.access(oldFile)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined() // File should not exist
      }
    })

    it('should preserve recent data files', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const cleanedCount = await service.cleanupOldData(5)
      
      expect(cleanedCount).toBe(0)
      
      // Data should still be loadable
      const data = await service.loadHistoricalData('bitcoin', 'daily')
      expect(data).toHaveLength(3)
    })

    it('should handle cleanup errors gracefully', async () => {
      // Try to clean up non-existent directory
      const nonExistentService = new HistoricalDataService('/non/existent/path')
      
      const cleanedCount = await nonExistentService.cleanupOldData(5)
      expect(cleanedCount).toBe(0)
    })
  })

  describe('Data Validation', () => {
    it('should validate consistent data', async () => {
      await service.saveHistoricalData('bitcoin', 'daily', mockData)
      
      const validation = await service.validateDataConsistency('bitcoin', 'daily')
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing data points', async () => {
      const inconsistentData = [
        mockData[0],
        // Create a large gap (more than 4 days)
        {
          time: mockData[0].time + (5 * 24 * 60 * 60 * 1000), // 5 days later
          close: 44000,
          high: 45000,
          low: 43000,
          open: 43500,
          volume: 1100000
        }
      ]

      await service.saveHistoricalData('bitcoin', 'daily', inconsistentData)

      const validation = await service.validateDataConsistency('bitcoin', 'daily')

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('gap'))).toBe(true)
    })

    it('should detect invalid price data', async () => {
      const invalidData = [
        {
          ...mockData[0],
          close: -1000 // Invalid negative price
        },
        mockData[1],
        mockData[2]
      ]
      
      await service.saveHistoricalData('bitcoin', 'daily', invalidData)
      
      const validation = await service.validateDataConsistency('bitcoin', 'daily')
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('price'))).toBe(true)
    })

    it('should detect unsorted data', async () => {
      const unsortedData = [
        mockData[1],
        mockData[0], // Out of order
        mockData[2]
      ]

      // Write unsorted data directly to file to bypass the sorting in saveHistoricalData
      const filePath = path.join(testDataDir, 'bitcoin-daily.json')
      await fs.writeFile(filePath, JSON.stringify(unsortedData, null, 2), 'utf-8')

      const validation = await service.validateDataConsistency('bitcoin', 'daily')

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('sorted'))).toBe(true)
    })

    it('should validate non-existent data', async () => {
      const validation = await service.validateDataConsistency('nonexistent', 'daily')
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('No data found'))).toBe(true)
    })
  })

  describe('File System Operations', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Disk full'))
      
      const saved = await service.saveHistoricalData('bitcoin', 'daily', mockData)
      expect(saved).toBe(false)
    })

    it('should handle corrupted data files', async () => {
      // Create corrupted file
      const corruptedFile = path.join(testDataDir, 'bitcoin-daily.json')
      await fs.writeFile(corruptedFile, 'invalid json content')
      
      const loaded = await service.loadHistoricalData('bitcoin', 'daily')
      expect(loaded).toHaveLength(0)
    })

    it('should create directories as needed', async () => {
      const deepService = new HistoricalDataService(path.join(testDataDir, 'deep', 'nested', 'path'))
      
      const saved = await deepService.saveHistoricalData('bitcoin', 'daily', mockData)
      expect(saved).toBe(true)
      
      const loaded = await deepService.loadHistoricalData('bitcoin', 'daily')
      expect(loaded).toHaveLength(3)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset (1000 points)
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        time: 1704067200000 + (i * 86400000), // Daily intervals
        close: 42000 + (i * 10),
        high: 43000 + (i * 10),
        low: 41000 + (i * 10),
        open: 41500 + (i * 10),
        volume: 1000000 + (i * 1000)
      }))
      
      const startTime = performance.now()
      await service.saveHistoricalData('bitcoin', 'daily', largeData)
      const saveTime = performance.now() - startTime
      
      const loadStartTime = performance.now()
      const loaded = await service.loadHistoricalData('bitcoin', 'daily')
      const loadTime = performance.now() - loadStartTime
      
      expect(loaded).toHaveLength(1000)
      expect(saveTime).toBeLessThan(1000) // Should save within 1 second
      expect(loadTime).toBeLessThan(500) // Should load within 0.5 seconds
    })

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        service.saveHistoricalData(`coin${i}`, 'daily', mockData)
      )
      
      const results = await Promise.all(promises)
      
      results.forEach(result => {
        expect(result).toBe(true)
      })
      
      // Verify all data was saved correctly
      for (let i = 0; i < 5; i++) {
        const data = await service.loadHistoricalData(`coin${i}`, 'daily')
        expect(data).toHaveLength(3)
      }
    })
  })
})
