/**
 * JSON Historical Backfill Service
 * 
 * Backfills missing historical Bitcoin price data directly to JSON files
 * without database dependency. Fetches data from external APIs and populates
 * the JSON files for the missing date range.
 */

import { enhancedBitcoinApiService } from './bitcoin-api-service'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface BackfillResult {
  success: boolean
  recordsAdded: number
  dateRange: {
    startDate: string
    endDate: string
  }
  athUpdated: boolean
  newATH?: number
  errors: string[]
  duration: number
}

export interface OptimizedBitcoinData {
  meta: {
    startDate: string
    endDate: string
    interval: 'daily' | 'weekly' | 'monthly'
    count: number
    lastUpdated: string
  }
  data: [number, number][] // [timestamp, close]
}

export class JsonHistoricalBackfillService {
  private readonly dataDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')

  /**
   * Backfill historical data for a specific date range
   */
  async backfillDateRange(startDate: string, endDate: string): Promise<BackfillResult> {
    const startTime = Date.now()
    const result: BackfillResult = {
      success: false,
      recordsAdded: 0,
      dateRange: { startDate, endDate },
      athUpdated: false,
      errors: [],
      duration: 0
    }

    try {
      console.log(`🔄 Starting historical backfill from ${startDate} to ${endDate}...`)

      // Ensure data directory exists
      await this.ensureDataDirectory()

      // Fetch historical data from external APIs
      const historicalData = await this.fetchHistoricalDataFromAPIs(startDate, endDate)
      
      if (historicalData.length === 0) {
        result.errors.push('No historical data retrieved from APIs')
        return result
      }

      console.log(`📊 Retrieved ${historicalData.length} historical records`)

      // Load existing daily data
      const existingData = await this.loadExistingDailyData()

      // Merge new data with existing data
      const mergedData = this.mergeHistoricalData(existingData, historicalData)
      result.recordsAdded = mergedData.length - existingData.length

      // Update daily JSON file
      await this.updateDailyJsonFile(mergedData)

      // Update aggregated files
      await this.updateAggregatedJsonFiles(mergedData)

      // Check for new ATH in the backfilled data
      const athResult = await this.checkForNewATHInData(historicalData)
      result.athUpdated = athResult.updated
      result.newATH = athResult.newATH

      result.success = true
      result.duration = Date.now() - startTime

      console.log(`✅ Historical backfill completed: ${result.recordsAdded} records added`)
      if (result.athUpdated) {
        console.log(`🚀 New ATH found during backfill: $${result.newATH}`)
      }

      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMsg)
      result.duration = Date.now() - startTime
      console.error('❌ Historical backfill failed:', errorMsg)
      return result
    }
  }

  /**
   * Backfill missing data from August 19, 2025 to current date
   */
  async backfillMissingData(): Promise<BackfillResult> {
    const startDate = '2025-08-19'
    const endDate = new Date().toISOString().split('T')[0]
    
    console.log(`🔄 Backfilling missing data from ${startDate} to ${endDate}`)
    return this.backfillDateRange(startDate, endDate)
  }

  /**
   * Fetch historical data from external APIs
   */
  private async fetchHistoricalDataFromAPIs(startDate: string, endDate: string): Promise<Array<{
    timestamp: number
    date: string
    close: number
    high: number
  }>> {
    try {
      console.log(`📡 Fetching historical data from ${startDate} to ${endDate}...`)

      // Use the enhanced Bitcoin API service to fetch historical data
      const response = await enhancedBitcoinApiService.fetchHistoricalData(startDate, endDate)

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error('Failed to fetch historical data from external APIs')
      }

      // Convert API response to our format
      const historicalData = response.data.map(record => ({
        timestamp: record.timestamp || new Date(record.date).getTime(),
        date: record.date,
        close: record.close,
        high: record.high || record.close
      }))

      // Sort by date
      historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      console.log(`✅ Fetched ${historicalData.length} historical records from ${response.source}`)
      return historicalData

    } catch (error) {
      console.error('❌ Failed to fetch historical data from APIs:', error)
      throw error
    }
  }

  /**
   * Load existing daily data from JSON file
   */
  private async loadExistingDailyData(): Promise<[number, number][]> {
    try {
      const dailyFilePath = path.join(this.dataDir, 'daily.json')
      const content = await fs.readFile(dailyFilePath, 'utf8')
      const data: OptimizedBitcoinData = JSON.parse(content)
      return data.data || []
    } catch (error) {
      console.log('📊 No existing daily data found, starting fresh')
      return []
    }
  }

  /**
   * Merge new historical data with existing data
   */
  private mergeHistoricalData(
    existingData: [number, number][],
    newData: Array<{ timestamp: number; date: string; close: number }>
  ): [number, number][] {
    // Create a map of existing data by date for quick lookup
    const existingMap = new Map<string, number>()
    existingData.forEach(([timestamp, close]) => {
      const date = new Date(timestamp).toISOString().split('T')[0]
      existingMap.set(date, close)
    })

    // Add new data, avoiding duplicates
    const mergedData: [number, number][] = [...existingData]
    let addedCount = 0

    newData.forEach(record => {
      if (!existingMap.has(record.date)) {
        mergedData.push([record.timestamp, record.close])
        addedCount++
      }
    })

    // Sort by timestamp
    mergedData.sort((a, b) => a[0] - b[0])

    console.log(`📊 Merged data: ${existingData.length} existing + ${addedCount} new = ${mergedData.length} total`)
    return mergedData
  }

  /**
   * Update daily JSON file with merged data
   */
  private async updateDailyJsonFile(data: [number, number][]): Promise<void> {
    const dailyFilePath = path.join(this.dataDir, 'daily.json')

    const dailyData: OptimizedBitcoinData = {
      meta: {
        startDate: data.length > 0 ? new Date(data[0][0]).toISOString().split('T')[0] : '',
        endDate: data.length > 0 ? new Date(data[data.length - 1][0]).toISOString().split('T')[0] : '',
        interval: 'daily',
        count: data.length,
        lastUpdated: new Date().toISOString()
      },
      data
    }

    await fs.writeFile(dailyFilePath, JSON.stringify(dailyData, null, 2))
    console.log(`✅ Updated daily.json: ${data.length} records`)
  }

  /**
   * Update aggregated JSON files (weekly, monthly)
   */
  private async updateAggregatedJsonFiles(dailyData: [number, number][]): Promise<void> {
    // Generate weekly data (sample every 7th day)
    const weeklyData = this.generateAggregatedData(dailyData, 'weekly')
    const weeklyFilePath = path.join(this.dataDir, 'weekly.json')
    await fs.writeFile(weeklyFilePath, JSON.stringify(weeklyData, null, 2))

    // Generate monthly data (sample every 30th day)
    const monthlyData = this.generateAggregatedData(dailyData, 'monthly')
    const monthlyFilePath = path.join(this.dataDir, 'monthly.json')
    await fs.writeFile(monthlyFilePath, JSON.stringify(monthlyData, null, 2))

    console.log(`✅ Updated aggregated files: weekly (${weeklyData.meta.count}), monthly (${monthlyData.meta.count})`)
  }

  /**
   * Generate aggregated data from daily data
   */
  private generateAggregatedData(dailyData: [number, number][], interval: 'weekly' | 'monthly'): OptimizedBitcoinData {
    const step = interval === 'weekly' ? 7 : 30
    const aggregatedData: [number, number][] = []

    for (let i = 0; i < dailyData.length; i += step) {
      aggregatedData.push(dailyData[i])
    }

    // Always include the last data point if it's not already included
    if (dailyData.length > 0 && aggregatedData[aggregatedData.length - 1][0] !== dailyData[dailyData.length - 1][0]) {
      aggregatedData.push(dailyData[dailyData.length - 1])
    }

    return {
      meta: {
        startDate: dailyData.length > 0 ? new Date(dailyData[0][0]).toISOString().split('T')[0] : '',
        endDate: dailyData.length > 0 ? new Date(dailyData[dailyData.length - 1][0]).toISOString().split('T')[0] : '',
        interval,
        count: aggregatedData.length,
        lastUpdated: new Date().toISOString()
      },
      data: aggregatedData
    }
  }

  /**
   * Check for new ATH in the backfilled data
   */
  private async checkForNewATHInData(data: Array<{ timestamp: number; date: string; close: number; high: number }>): Promise<{
    updated: boolean
    newATH?: number
  }> {
    try {
      // Load current ATH
      const athFilePath = path.join(this.dataDir, 'ath.json')
      let currentATH = 124277.98 // Fallback value

      try {
        const athContent = await fs.readFile(athFilePath, 'utf8')
        const athData = JSON.parse(athContent)
        currentATH = athData.ath?.value || currentATH
      } catch (error) {
        console.log('📊 No existing ATH file found, using fallback value')
      }

      // Find highest price in the backfilled data
      let highestPrice = 0
      let highestDate = ''

      data.forEach(record => {
        const price = Math.max(record.close, record.high)
        if (price > highestPrice) {
          highestPrice = price
          highestDate = record.date
        }
      })

      // Check if we found a new ATH
      if (highestPrice > currentATH) {
        console.log(`🚀 New ATH found in backfilled data: $${highestPrice} on ${highestDate}`)
        
        // Update ATH file
        await this.updateATHJsonFile(highestPrice, highestDate)
        
        return { updated: true, newATH: highestPrice }
      }

      return { updated: false }

    } catch (error) {
      console.error('❌ Error checking for new ATH:', error)
      return { updated: false }
    }
  }

  /**
   * Update ATH JSON file
   */
  private async updateATHJsonFile(newATHValue: number, date: string): Promise<void> {
    const athFilePath = path.join(this.dataDir, 'ath.json')

    const athData = {
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'historical_backfill_service',
        version: '1.0.0',
        description: 'Bitcoin All-Time High (ATH) data - automatically updated when new highs are detected'
      },
      ath: {
        value: newATHValue,
        date: date,
        timestamp: new Date(date).getTime(),
        source: 'historical_backfill'
      }
    }

    await fs.writeFile(athFilePath, JSON.stringify(athData, null, 2))
    console.log(`📁 ATH JSON file updated: $${newATHValue} on ${date}`)
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      console.log(`📁 Data directory ensured: ${this.dataDir}`)
    } catch (error) {
      console.error('❌ Failed to create data directory:', error)
      throw error
    }
  }
}

// Export singleton instance
export const jsonHistoricalBackfillService = new JsonHistoricalBackfillService()
