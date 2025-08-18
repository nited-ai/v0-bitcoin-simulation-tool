/**
 * Daily Bitcoin Price Update Service
 * Handles automated daily updates with error handling and gap detection
 */

import { PrismaClient } from '../generated/prisma'
import { enhancedBitcoinApiService } from './bitcoin-api-service'
import { bitcoinJsonGeneratorService, type JsonGenerationResult } from './bitcoin-json-generator-service'

export interface UpdateResult {
  success: boolean
  recordsAdded: number
  gapsFilled: number
  currentPriceUpdated: boolean
  jsonFilesRegenerated: boolean
  jsonGenerationResult?: JsonGenerationResult
  errors: string[]
  duration: number
  nextUpdateTime?: Date
}

export class DailyUpdateService {
  private prisma: PrismaClient
  private isRunning = false
  private lastUpdateTime?: Date
  private updateInterval?: NodeJS.Timeout

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Start the daily update service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Daily update service is already running')
      return
    }

    console.log('🚀 Starting daily Bitcoin price update service...')
    this.isRunning = true

    // Run initial update
    await this.performUpdate()

    // Schedule daily updates at 00:05 UTC (5 minutes after midnight)
    this.scheduleNextUpdate()

    console.log('✅ Daily update service started successfully')
  }

  /**
   * Stop the daily update service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Daily update service is not running')
      return
    }

    console.log('🛑 Stopping daily update service...')
    this.isRunning = false

    if (this.updateInterval) {
      clearTimeout(this.updateInterval)
      this.updateInterval = undefined
    }

    await this.prisma.$disconnect()
    console.log('✅ Daily update service stopped')
  }

  /**
   * Perform a manual update
   */
  async performUpdate(maxGaps: number = 100): Promise<UpdateResult> {
    const startTime = Date.now()
    const result: UpdateResult = {
      success: false,
      recordsAdded: 0,
      gapsFilled: 0,
      currentPriceUpdated: false,
      jsonFilesRegenerated: false,
      errors: [],
      duration: 0
    }

    try {
      console.log('🔄 Starting daily Bitcoin price update...')

      // Step 1: Check if update is needed
      const needsUpdate = await this.checkIfUpdateNeeded()
      if (!needsUpdate.required) {
        console.log(`✅ Update not needed: ${needsUpdate.reason}`)
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      // Step 2: Fill data gaps
      console.log('🔧 Filling data gaps...')
      const gapFillResult = await enhancedBitcoinApiService.fillDataGaps(maxGaps)
      result.gapsFilled = gapFillResult.gapsFilled
      result.errors.push(...gapFillResult.errors)

      // Step 3: Update current price
      console.log('💰 Updating current price...')
      const currentPriceResult = await this.updateCurrentPrice()
      result.currentPriceUpdated = currentPriceResult.success
      if (!currentPriceResult.success) {
        result.errors.push(currentPriceResult.error || 'Failed to update current price')
      }

      result.recordsAdded = result.gapsFilled + (result.currentPriceUpdated ? 1 : 0)

      // Step 4: Regenerate JSON files if new data was added
      if (result.recordsAdded > 0) {
        console.log('📁 Regenerating JSON files with latest data...')
        const jsonResult = await this.regenerateJsonFiles()
        result.jsonFilesRegenerated = jsonResult.success
        result.jsonGenerationResult = jsonResult

        if (!jsonResult.success) {
          result.errors.push(`JSON generation failed: ${jsonResult.error}`)
          console.error('⚠️ JSON generation failed, but database update succeeded')
        } else {
          console.log(`✅ JSON files regenerated: ${jsonResult.filesGenerated.join(', ')}`)
        }
      } else {
        console.log('📁 Skipping JSON regeneration (no new data added)')
      }

      // Step 5: Log the update operation
      await this.logUpdateOperation(result)

      // Step 6: Schedule next update
      this.scheduleNextUpdate()

      result.success = result.errors.length === 0
      result.duration = Date.now() - startTime

      const jsonStatus = result.jsonFilesRegenerated ? 'JSON files updated' : 'JSON files unchanged'
      console.log(`✅ Daily update completed: ${result.recordsAdded} records added, ${jsonStatus}, ${result.errors.length} errors`)
      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMsg)
      result.duration = Date.now() - startTime

      console.error('❌ Daily update failed:', error)

      // Log the failed operation
      try {
        await this.logUpdateOperation(result)
      } catch (logError) {
        console.error('❌ Failed to log update error:', logError)
      }

      return result
    }
  }

  /**
   * Check if an update is needed
   */
  private async checkIfUpdateNeeded(): Promise<{ required: boolean; reason: string }> {
    try {
      // Get the latest record from database
      const latestRecord = await this.prisma.bitcoinPrice.findFirst({
        orderBy: { date: 'desc' }
      })

      if (!latestRecord) {
        return { required: true, reason: 'No data in database' }
      }

      // Check if we have today's data
      const today = new Date().toISOString().split('T')[0]
      const latestDate = latestRecord.date

      if (latestDate < today) {
        return { required: true, reason: `Latest data is from ${latestDate}, need ${today}` }
      }

      // Check if last update was more than 24 hours ago
      const lastUpdate = await this.prisma.dataUpdate.findFirst({
        where: { source: 'DAILY_UPDATE' },
        orderBy: { createdAt: 'desc' }
      })

      if (!lastUpdate) {
        return { required: true, reason: 'No previous daily update found' }
      }

      const hoursSinceLastUpdate = (Date.now() - lastUpdate.createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastUpdate >= 24) {
        return { required: true, reason: `Last update was ${Math.round(hoursSinceLastUpdate)} hours ago` }
      }

      return { required: false, reason: `Data is up to date (last update: ${Math.round(hoursSinceLastUpdate)} hours ago)` }

    } catch (error) {
      console.error('❌ Error checking update requirement:', error)
      return { required: true, reason: 'Error checking database, forcing update' }
    }
  }

  /**
   * Update current Bitcoin price
   */
  private async updateCurrentPrice(): Promise<{ success: boolean; error?: string }> {
    try {
      const currentPriceResponse = await enhancedBitcoinApiService.fetchCurrentPrice()

      if (!currentPriceResponse.success || currentPriceResponse.data.length === 0) {
        return { success: false, error: 'Failed to fetch current price from APIs' }
      }

      const currentPrice = currentPriceResponse.data[0]
      const today = new Date().toISOString().split('T')[0]

      // Check if today's price already exists
      const existingToday = await this.prisma.bitcoinPrice.findUnique({
        where: { date: today }
      })

      if (existingToday) {
        // Update existing record with latest price
        await this.prisma.bitcoinPrice.update({
          where: { date: today },
          data: {
            close: currentPrice.close,
            high: Math.max(existingToday.high, currentPrice.close),
            low: Math.min(existingToday.low, currentPrice.close),
            volume: currentPrice.volume,
            source: currentPriceResponse.source,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new record for today
        await this.prisma.bitcoinPrice.create({
          data: {
            date: today,
            timestamp: currentPrice.timestamp,
            open: currentPrice.close, // Use current price as open for today
            high: currentPrice.close,
            low: currentPrice.close,
            close: currentPrice.close,
            volume: currentPrice.volume,
            source: currentPriceResponse.source
          }
        })
      }

      return { success: true }

    } catch (error) {
      console.error('❌ Error updating current price:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Log update operation to database
   */
  private async logUpdateOperation(result: UpdateResult): Promise<void> {
    try {
      await this.prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded: result.recordsAdded,
          recordsUpdated: result.currentPriceUpdated ? 1 : 0,
          source: 'DAILY_UPDATE',
          status: result.success ? 'success' : (result.errors.length > 0 ? 'partial' : 'failed'),
          errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null
        }
      })
    } catch (error) {
      console.error('❌ Failed to log update operation:', error)
    }
  }

  /**
   * Regenerate JSON files with latest database data
   */
  private async regenerateJsonFiles(): Promise<JsonGenerationResult> {
    try {
      console.log('🔄 Starting JSON file regeneration...')
      const result = await bitcoinJsonGeneratorService.generateJsonFiles()

      if (result.success) {
        console.log(`✅ JSON regeneration completed: ${result.filesGenerated.length} files, ${result.recordsProcessed} records processed`)
      } else {
        console.error(`❌ JSON regeneration failed: ${result.error}`)
      }

      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ JSON regeneration error:', error)

      return {
        success: false,
        filesGenerated: [],
        recordsProcessed: 0,
        dateRange: { startDate: '', endDate: '' },
        duration: 0,
        error: errorMsg
      }
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
export const dailyUpdateService = new DailyUpdateService()
