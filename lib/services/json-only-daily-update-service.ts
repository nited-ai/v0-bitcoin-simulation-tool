/**
 * JSON-Only Daily Bitcoin Price Update Service
 * 
 * Simplified service that updates JSON files directly without database dependency.
 * Fetches current Bitcoin price from external APIs and updates JSON files.
 */

import { enhancedBitcoinApiService } from './bitcoin-api-service'
import { athService } from './ath-service'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface JsonUpdateResult {
  success: boolean
  currentPriceUpdated: boolean
  athUpdated: boolean
  jsonFilesUpdated: string[]
  errors: string[]
  duration: number
  currentPrice?: number
  newATH?: number
}

export interface BitcoinPriceData {
  timestamp: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source: string
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

export class JsonOnlyDailyUpdateService {
  private isRunning = false
  private lastUpdateTime?: Date
  private updateInterval?: NodeJS.Timeout
  private readonly dataDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')

  /**
   * Start the daily update service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ JSON-only daily update service is already running')
      return
    }

    console.log('🚀 Starting JSON-only Bitcoin price update service...')
    this.isRunning = true

    // Ensure data directory exists
    await this.ensureDataDirectory()

    // Run initial update
    await this.performUpdate()

    // Schedule daily updates at 00:05 UTC (5 minutes after midnight)
    this.scheduleNextUpdate()

    console.log('✅ JSON-only daily update service started successfully')
  }

  /**
   * Stop the daily update service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ JSON-only daily update service is not running')
      return
    }

    console.log('🛑 Stopping JSON-only daily update service...')
    this.isRunning = false

    if (this.updateInterval) {
      clearTimeout(this.updateInterval)
      this.updateInterval = undefined
    }

    console.log('✅ JSON-only daily update service stopped')
  }

  /**
   * Perform a manual update
   */
  async performUpdate(): Promise<JsonUpdateResult> {
    const startTime = Date.now()
    const result: JsonUpdateResult = {
      success: false,
      currentPriceUpdated: false,
      athUpdated: false,
      jsonFilesUpdated: [],
      errors: [],
      duration: 0
    }

    try {
      console.log('🔄 Starting JSON-only price update...')

      // Step 1: Fetch current Bitcoin price
      const currentPriceResult = await this.fetchCurrentPrice()
      if (!currentPriceResult.success || !currentPriceResult.data) {
        result.errors.push(currentPriceResult.error || 'Failed to fetch current price')
        return result
      }

      const priceData = currentPriceResult.data
      result.currentPrice = priceData.close
      result.currentPriceUpdated = true

      console.log(`💰 Current Bitcoin price: $${priceData.close} from ${priceData.source}`)

      // Step 2: Update daily JSON file
      await this.updateDailyJsonFile(priceData)
      result.jsonFilesUpdated.push('daily.json')

      // Step 3: Update weekly and monthly aggregations
      await this.updateAggregatedJsonFiles()
      result.jsonFilesUpdated.push('weekly.json', 'monthly.json')

      // Step 4: Check and update ATH if needed
      const athCheckResult = await this.checkAndUpdateATH(priceData.close, priceData.date)
      result.athUpdated = athCheckResult.updated
      if (athCheckResult.updated) {
        result.newATH = priceData.close
        result.jsonFilesUpdated.push('ath.json')
      }
      if (athCheckResult.error) {
        result.errors.push(athCheckResult.error)
      }

      // Step 5: Update current price JSON file
      await this.updateCurrentPriceJsonFile(priceData)
      result.jsonFilesUpdated.push('current-price.json')

      result.success = result.errors.length === 0
      result.duration = Date.now() - startTime

      this.lastUpdateTime = new Date()
      this.scheduleNextUpdate()

      const athStatus = result.athUpdated ? `New ATH: $${result.newATH}` : 'ATH unchanged'
      console.log(`✅ JSON-only update completed: $${result.currentPrice}, ${result.jsonFilesUpdated.length} files updated, ${athStatus}`)

      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMsg)
      result.duration = Date.now() - startTime
      console.error('❌ JSON-only update failed:', errorMsg)
      return result
    }
  }

  /**
   * Fetch current Bitcoin price from external APIs
   */
  private async fetchCurrentPrice(): Promise<{ success: boolean; data?: BitcoinPriceData; error?: string }> {
    try {
      const response = await enhancedBitcoinApiService.fetchCurrentPrice()

      if (!response.success || !response.data || response.data.length === 0) {
        return { success: false, error: 'Failed to fetch current price from external APIs' }
      }

      const apiData = response.data[0]
      const today = new Date().toISOString().split('T')[0]

      const priceData: BitcoinPriceData = {
        timestamp: apiData.timestamp || Date.now(),
        date: today,
        open: apiData.open || apiData.close,
        high: apiData.high || apiData.close,
        low: apiData.low || apiData.close,
        close: apiData.close,
        volume: apiData.volume,
        source: response.source
      }

      return { success: true, data: priceData }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * Update daily JSON file with new price data
   */
  private async updateDailyJsonFile(priceData: BitcoinPriceData): Promise<void> {
    const dailyFilePath = path.join(this.dataDir, 'daily.json')
    
    try {
      // Load existing daily data
      let dailyData: OptimizedBitcoinData
      
      try {
        const existingContent = await fs.readFile(dailyFilePath, 'utf8')
        dailyData = JSON.parse(existingContent)
      } catch (error) {
        // File doesn't exist or is invalid, create new structure
        dailyData = {
          meta: {
            startDate: priceData.date,
            endDate: priceData.date,
            interval: 'daily',
            count: 0,
            lastUpdated: new Date().toISOString()
          },
          data: []
        }
      }

      // Check if today's data already exists
      const existingIndex = dailyData.data.findIndex(([timestamp]) => {
        const existingDate = new Date(timestamp).toISOString().split('T')[0]
        return existingDate === priceData.date
      })

      if (existingIndex >= 0) {
        // Update existing entry
        dailyData.data[existingIndex] = [priceData.timestamp, priceData.close]
        console.log(`📊 Updated existing daily entry for ${priceData.date}`)
      } else {
        // Add new entry
        dailyData.data.push([priceData.timestamp, priceData.close])
        dailyData.meta.count = dailyData.data.length
        console.log(`📊 Added new daily entry for ${priceData.date}`)
      }

      // Update metadata
      dailyData.meta.endDate = priceData.date
      dailyData.meta.lastUpdated = new Date().toISOString()

      // Sort data by timestamp
      dailyData.data.sort((a, b) => a[0] - b[0])

      // Update start date
      if (dailyData.data.length > 0) {
        dailyData.meta.startDate = new Date(dailyData.data[0][0]).toISOString().split('T')[0]
      }

      // Write updated data
      await fs.writeFile(dailyFilePath, JSON.stringify(dailyData, null, 2))
      console.log(`✅ Updated daily.json: ${dailyData.meta.count} records`)

    } catch (error) {
      console.error('❌ Failed to update daily.json:', error)
      throw error
    }
  }

  /**
   * Update weekly and monthly aggregated JSON files
   */
  private async updateAggregatedJsonFiles(): Promise<void> {
    try {
      // Load daily data
      const dailyFilePath = path.join(this.dataDir, 'daily.json')
      const dailyContent = await fs.readFile(dailyFilePath, 'utf8')
      const dailyData: OptimizedBitcoinData = JSON.parse(dailyContent)

      // Generate weekly data (sample every 7th day)
      const weeklyData = this.generateAggregatedData(dailyData.data, 'weekly')
      const weeklyFilePath = path.join(this.dataDir, 'weekly.json')
      await fs.writeFile(weeklyFilePath, JSON.stringify(weeklyData, null, 2))

      // Generate monthly data (sample every 30th day)
      const monthlyData = this.generateAggregatedData(dailyData.data, 'monthly')
      const monthlyFilePath = path.join(this.dataDir, 'monthly.json')
      await fs.writeFile(monthlyFilePath, JSON.stringify(monthlyData, null, 2))

      console.log(`✅ Updated aggregated files: weekly (${weeklyData.meta.count}), monthly (${monthlyData.meta.count})`)

    } catch (error) {
      console.error('❌ Failed to update aggregated JSON files:', error)
      throw error
    }
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
   * Check if current price is a new ATH and update ATH JSON file if needed
   */
  private async checkAndUpdateATH(currentPrice: number, date: string): Promise<{ updated: boolean; error?: string }> {
    try {
      // Check if this is a new ATH
      const isNewATH = await athService.checkAndUpdateATH(currentPrice)

      if (isNewATH) {
        console.log(`🎉 New ATH detected! Updating ATH JSON file: $${currentPrice} on ${date}`)

        // Update the ATH JSON file
        const updateSuccess = await this.updateATHJsonFile(currentPrice, date)

        if (updateSuccess) {
          console.log('✅ ATH JSON file updated successfully')
          return { updated: true }
        } else {
          return { updated: false, error: 'Failed to update ATH JSON file' }
        }
      } else {
        console.log(`📊 Current price $${currentPrice} is not a new ATH`)
        return { updated: false }
      }

    } catch (error) {
      console.error('❌ Error checking/updating ATH:', error)
      return { updated: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Update the ATH JSON file with new ATH data
   */
  private async updateATHJsonFile(newATHValue: number, date: string): Promise<boolean> {
    try {
      const athFilePath = path.join(this.dataDir, 'ath.json')

      const athData = {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: 'json_daily_update_service',
          version: '1.0.0',
          description: 'Bitcoin All-Time High (ATH) data - automatically updated when new highs are detected'
        },
        ath: {
          value: newATHValue,
          date: date,
          timestamp: new Date(date).getTime(),
          source: 'daily_price_update'
        }
      }

      await fs.writeFile(athFilePath, JSON.stringify(athData, null, 2))
      console.log(`📁 ATH JSON file updated: $${newATHValue} on ${date}`)

      return true

    } catch (error) {
      console.error('❌ Error updating ATH JSON file:', error)
      return false
    }
  }

  /**
   * Update current price JSON file
   */
  private async updateCurrentPriceJsonFile(priceData: BitcoinPriceData): Promise<void> {
    try {
      const currentPriceFilePath = path.join(this.dataDir, 'current-price.json')

      const currentPriceData = {
        meta: {
          lastUpdated: new Date().toISOString(),
          source: priceData.source,
          version: '1.0.0'
        },
        current: {
          price: priceData.close,
          timestamp: priceData.timestamp,
          date: priceData.date,
          source: priceData.source
        }
      }

      await fs.writeFile(currentPriceFilePath, JSON.stringify(currentPriceData, null, 2))
      console.log(`📁 Current price JSON file updated: $${priceData.close}`)

    } catch (error) {
      console.error('❌ Error updating current price JSON file:', error)
      throw error
    }
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

  /**
   * Schedule the next update
   */
  private scheduleNextUpdate(): void {
    if (!this.isRunning) return

    // Calculate time until next 00:05 UTC
    const now = new Date()
    const nextUpdate = new Date()
    nextUpdate.setUTCHours(0, 5, 0, 0) // 00:05 UTC

    // If it's already past 00:05 today, schedule for tomorrow
    if (now.getTime() >= nextUpdate.getTime()) {
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1)
    }

    const msUntilNextUpdate = nextUpdate.getTime() - now.getTime()

    console.log(`⏰ Next update scheduled for: ${nextUpdate.toISOString()} (in ${Math.round(msUntilNextUpdate / (1000 * 60 * 60))} hours)`)

    if (this.updateInterval) {
      clearTimeout(this.updateInterval)
    }

    this.updateInterval = setTimeout(async () => {
      if (this.isRunning) {
        await this.performUpdate()
      }
    }, msUntilNextUpdate)
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean
    lastUpdateTime?: Date
    nextUpdateTime?: Date
  } {
    const nextUpdate = new Date()
    nextUpdate.setUTCHours(0, 5, 0, 0)
    if (new Date().getTime() >= nextUpdate.getTime()) {
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1)
    }

    return {
      isRunning: this.isRunning,
      lastUpdateTime: this.lastUpdateTime,
      nextUpdateTime: this.isRunning ? nextUpdate : undefined
    }
  }
}

// Export singleton instance
export const jsonOnlyDailyUpdateService = new JsonOnlyDailyUpdateService()
