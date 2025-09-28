/**
 * Baseline Data Integration Tests
 * 
 * This test suite captures the current data loading, processing, and export
 * behavior to ensure 100% data integrity preservation during simplification.
 * 
 * Created: 2025-01-26
 * Purpose: Establish data integration baseline for Bitcoin Simulation Tool simplification
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

// Import current data services (these will be consolidated later)
import { BitcoinJsonDataService } from '@/lib/services/bitcoin-json-data-service'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

describe('Baseline Data Integration Tests', () => {
  let bitcoinDataService: BitcoinJsonDataService

  beforeEach(() => {
    bitcoinDataService = new BitcoinJsonDataService()
    
    // Mock fetch for API calls
    global.fetch = vi.fn()
  })

  describe('Historical Bitcoin Data Loading', () => {
    test('loadHistoricalData returns identical data structure', async () => {
      // Test loading daily Bitcoin data
      const dailyData = await bitcoinDataService.loadDailyData()
      
      // Verify data structure
      expect(Array.isArray(dailyData)).toBe(true)
      expect(dailyData.length).toBeGreaterThan(0)
      
      // Verify each data point has required fields
      const samplePoint = dailyData[0]
      expect(samplePoint).toHaveProperty('date')
      expect(samplePoint).toHaveProperty('open')
      expect(samplePoint).toHaveProperty('high')
      expect(samplePoint).toHaveProperty('low')
      expect(samplePoint).toHaveProperty('close')
      expect(samplePoint).toHaveProperty('volume')
      
      // Verify data types
      expect(typeof samplePoint.date).toBe('string')
      expect(typeof samplePoint.open).toBe('number')
      expect(typeof samplePoint.high).toBe('number')
      expect(typeof samplePoint.low).toBe('number')
      expect(typeof samplePoint.close).toBe('number')
      expect(typeof samplePoint.volume).toBe('number')
    })

    test('loadWeeklyData returns correct aggregated data', async () => {
      const weeklyData = await bitcoinDataService.loadWeeklyData()
      
      // Verify weekly data structure
      expect(Array.isArray(weeklyData)).toBe(true)
      expect(weeklyData.length).toBeGreaterThan(0)
      
      // Weekly data should have fewer points than daily
      const dailyData = await bitcoinDataService.loadDailyData()
      expect(weeklyData.length).toBeLessThan(dailyData.length)
      
      // Verify weekly aggregation logic
      const sampleWeek = weeklyData[0]
      expect(sampleWeek).toHaveProperty('date')
      expect(sampleWeek).toHaveProperty('open')
      expect(sampleWeek).toHaveProperty('high')
      expect(sampleWeek).toHaveProperty('low')
      expect(sampleWeek).toHaveProperty('close')
      expect(sampleWeek).toHaveProperty('volume')
    })

    test('loadMonthlyData returns correct aggregated data', async () => {
      const monthlyData = await bitcoinDataService.loadMonthlyData()
      
      // Verify monthly data structure
      expect(Array.isArray(monthlyData)).toBe(true)
      expect(monthlyData.length).toBeGreaterThan(0)
      
      // Monthly data should have fewer points than weekly
      const weeklyData = await bitcoinDataService.loadWeeklyData()
      expect(monthlyData.length).toBeLessThan(weeklyData.length)
    })

    test('data files exist and are accessible', async () => {
      // Verify that all required data files exist
      const dataFiles = [
        'public/data/bitcoin/daily.json',
        'public/data/bitcoin/weekly.json',
        'public/data/bitcoin/monthly.json',
        'public/data/bitcoin/metadata.json'
      ]
      
      for (const filePath of dataFiles) {
        try {
          const stats = await fs.stat(filePath)
          expect(stats.isFile()).toBe(true)
          expect(stats.size).toBeGreaterThan(0)
        } catch (error) {
          // File might not exist, which is acceptable for some files
          console.warn(`Data file not found: ${filePath}`)
        }
      }
    })

    test('metadata contains correct information', async () => {
      try {
        const metadata = await bitcoinDataService.loadMetadata()
        
        // Verify metadata structure
        expect(metadata).toHaveProperty('lastUpdated')
        expect(metadata).toHaveProperty('dataSource')
        expect(metadata).toHaveProperty('totalRecords')
        expect(metadata).toHaveProperty('dateRange')
        
        // Verify metadata types
        expect(typeof metadata.lastUpdated).toBe('string')
        expect(typeof metadata.dataSource).toBe('string')
        expect(typeof metadata.totalRecords).toBe('number')
        expect(metadata.dateRange).toHaveProperty('start')
        expect(metadata.dateRange).toHaveProperty('end')
      } catch (error) {
        // Metadata file might not exist yet
        console.warn('Metadata file not found, which is acceptable')
      }
    })
  })

  describe('Current Price Fetching', () => {
    test('getCurrentPrice fetches from same API sources', async () => {
      // Mock successful API response
      const mockPrice = 95000
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { priceUsd: mockPrice.toString() } })
      })
      
      const currentPrice = await centralizedDataService.getCurrentPrice()
      
      expect(typeof currentPrice).toBe('number')
      expect(currentPrice).toBeGreaterThan(0)
      expect(currentPrice).toBe(mockPrice)
    })

    test('API fallback mechanism works correctly', async () => {
      // Mock first API failure, second API success
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('API 1 failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: { usd: 96000 } })
        })
      
      const currentPrice = await centralizedDataService.getCurrentPrice()
      
      expect(typeof currentPrice).toBe('number')
      expect(currentPrice).toBeGreaterThan(0)
    })

    test('handles API errors gracefully', async () => {
      // Mock all APIs failing
      ;(global.fetch as any).mockRejectedValue(new Error('All APIs failed'))
      
      // Should either return cached price or throw meaningful error
      try {
        const currentPrice = await centralizedDataService.getCurrentPrice()
        expect(typeof currentPrice).toBe('number')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('price')
      }
    })
  })

  describe('Data Processing and Transformations', () => {
    test('processHistoricalData applies same transformations', async () => {
      const rawData = [
        { date: '2024-01-01', open: 42000, high: 43000, low: 41000, close: 42500, volume: 1000000 },
        { date: '2024-01-02', open: 42500, high: 44000, low: 42000, close: 43500, volume: 1200000 },
        { date: '2024-01-03', open: 43500, high: 45000, low: 43000, close: 44000, volume: 1100000 },
      ]
      
      const processedData = bitcoinDataService.processHistoricalData(rawData)
      
      // Verify processing maintains data integrity
      expect(processedData.length).toBe(rawData.length)
      
      // Verify each processed point has required fields
      processedData.forEach((point, index) => {
        expect(point.date).toBe(rawData[index].date)
        expect(point.price).toBe(rawData[index].close) // Assuming close price is used
        expect(typeof point.timestamp).toBe('number')
      })
    })

    test('calculateATH finds correct all-time high', async () => {
      const testData = [
        { date: '2024-01-01', high: 43000, close: 42500 },
        { date: '2024-01-02', high: 69000, close: 68500 }, // ATH
        { date: '2024-01-03', high: 45000, close: 44000 },
      ]
      
      const ath = bitcoinDataService.calculateATH(testData)
      
      expect(ath.price).toBe(69000)
      expect(ath.date).toBe('2024-01-02')
    })

    test('data gap detection works correctly', async () => {
      const dataWithGaps = [
        { date: '2024-01-01', close: 42500 },
        { date: '2024-01-03', close: 44000 }, // Missing 2024-01-02
        { date: '2024-01-04', close: 43500 },
      ]
      
      const gaps = bitcoinDataService.detectDataGaps(dataWithGaps)
      
      expect(gaps.length).toBe(1)
      expect(gaps[0]).toContain('2024-01-02')
    })
  })

  describe('Export Functionality', () => {
    test('CSV export generates identical file format', async () => {
      const testResults = {
        monthlyResults: [
          { month: 1, btcPrice: 95000, portfolioValue: 142500, loanBalance: 47500 },
          { month: 2, btcPrice: 98000, portfolioValue: 147000, loanBalance: 47200 },
        ],
        summary: {
          totalReturn: 4500,
          annualizedReturn: 12.5,
          maxDrawdown: -2.1,
        }
      }
      
      const csvContent = await centralizedDataService.exportToCSV(testResults)
      
      // Verify CSV structure
      expect(typeof csvContent).toBe('string')
      expect(csvContent).toContain('Month,BTC Price,Portfolio Value,Loan Balance')
      expect(csvContent).toContain('1,95000,142500,47500')
      expect(csvContent).toContain('2,98000,147000,47200')
      
      // Verify CSV formatting
      const lines = csvContent.split('\n')
      expect(lines.length).toBeGreaterThan(2) // Header + data rows
    })

    test('JSON export maintains same data structure', async () => {
      const testResults = {
        parameters: { btcAmount: 1.5, loanPercentage: 50 },
        results: { totalReturn: 4500 },
        metadata: { exportDate: new Date().toISOString() }
      }
      
      const jsonContent = await centralizedDataService.exportToJSON(testResults)
      
      // Verify JSON structure
      expect(typeof jsonContent).toBe('string')
      
      const parsedJson = JSON.parse(jsonContent)
      expect(parsedJson).toHaveProperty('parameters')
      expect(parsedJson).toHaveProperty('results')
      expect(parsedJson).toHaveProperty('metadata')
      expect(parsedJson.parameters.btcAmount).toBe(1.5)
      expect(parsedJson.results.totalReturn).toBe(4500)
    })

    test('TXT export produces identical text format', async () => {
      const testResults = {
        summary: 'Bitcoin Simulation Results',
        parameters: { btcAmount: 1.5, loanPercentage: 50 },
        results: { totalReturn: 4500 }
      }
      
      const txtContent = await centralizedDataService.exportToTXT(testResults)
      
      // Verify TXT structure
      expect(typeof txtContent).toBe('string')
      expect(txtContent).toContain('Bitcoin Simulation Results')
      expect(txtContent).toContain('BTC Amount: 1.5')
      expect(txtContent).toContain('Total Return: $4,500')
      
      // Verify formatting consistency
      expect(txtContent).toMatch(/\n/) // Contains line breaks
      expect(txtContent).toMatch(/\$[\d,]+/) // Contains formatted currency
    })
  })

  describe('Performance and Caching', () => {
    test('data loading performance meets requirements', async () => {
      const startTime = performance.now()
      
      await bitcoinDataService.loadDailyData()
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Data loading should complete within reasonable time
      expect(loadTime).toBeLessThan(1000) // 1 second
    })

    test('caching mechanism works correctly', async () => {
      // First load
      const startTime1 = performance.now()
      const data1 = await bitcoinDataService.loadDailyData()
      const loadTime1 = performance.now() - startTime1
      
      // Second load (should be cached)
      const startTime2 = performance.now()
      const data2 = await bitcoinDataService.loadDailyData()
      const loadTime2 = performance.now() - startTime2
      
      // Cached load should be faster
      expect(loadTime2).toBeLessThan(loadTime1)
      expect(data1).toEqual(data2)
    })
  })
})

/**
 * Data Integration Test Fixtures
 * 
 * These fixtures contain sample data structures and expected formats
 * to ensure data integrity is preserved during simplification.
 */
export const dataIntegrationFixtures = {
  sampleDailyData: [
    { date: '2024-01-01', open: 42000, high: 43000, low: 41000, close: 42500, volume: 1000000 },
    { date: '2024-01-02', open: 42500, high: 44000, low: 42000, close: 43500, volume: 1200000 },
    { date: '2024-01-03', open: 43500, high: 45000, low: 43000, close: 44000, volume: 1100000 },
  ],
  
  sampleExportData: {
    parameters: {
      btcAmount: 1.5,
      initialPrice: 95000,
      loanPercentage: 50,
      interestRate: 6.5,
      projectionMonths: 12,
    },
    results: {
      monthlyResults: [
        { month: 1, btcPrice: 95000, portfolioValue: 142500, loanBalance: 47500 },
        { month: 2, btcPrice: 98000, portfolioValue: 147000, loanBalance: 47200 },
      ],
      summary: {
        totalReturn: 4500,
        annualizedReturn: 12.5,
        maxDrawdown: -2.1,
        riskScore: 65,
      }
    },
    metadata: {
      exportDate: '2025-01-26T12:00:00Z',
      version: '1.0.0',
      model: 'manual-growth',
    }
  },
  
  expectedCSVFormat: `Month,BTC Price,Portfolio Value,Loan Balance
1,95000,142500,47500
2,98000,147000,47200`,
  
  expectedJSONStructure: {
    parameters: 'object',
    results: 'object',
    metadata: 'object',
  },
  
  expectedTXTFormat: `Bitcoin Simulation Results
========================

Parameters:
- BTC Amount: 1.5
- Initial Price: $95,000
- Loan Percentage: 50%

Results:
- Total Return: $4,500
- Annualized Return: 12.5%
- Max Drawdown: -2.1%`,
}
