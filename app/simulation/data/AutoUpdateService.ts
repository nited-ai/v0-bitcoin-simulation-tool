/**
 * Automatic Update Service for Bitcoin Price Data
 * Handles scheduled updates, background processing, and data synchronization
 */

import { databaseManager, type UpdateResult } from './database/DatabaseManager'

export interface UpdateSchedule {
  enabled: boolean
  intervalMinutes: number
  lastRun: string
  nextRun: string
  runCount: number
}

export interface UpdateStatus {
  isRunning: boolean
  lastResult: UpdateResult | null
  schedule: UpdateSchedule
  stats: {
    totalRecords: number
    dateRange: { start: string; end: string }
    lastUpdate: string
    sources: string[]
  }
}

export class AutoUpdateService {
  private updateTimer: NodeJS.Timeout | null = null
  private isRunning = false
  private lastResult: UpdateResult | null = null
  private schedule: UpdateSchedule = {
    enabled: true,
    intervalMinutes: 60, // Update every hour
    lastRun: '',
    nextRun: '',
    runCount: 0
  }

  constructor() {
    this.loadScheduleFromStorage()
    this.calculateNextRun()
  }

  /**
   * Start the automatic update service with current price update
   */
  async start(): Promise<void> {
    if (this.updateTimer) {
      console.log('⚠️ Auto-update service already running')
      return
    }

    console.log('🚀 Starting automatic update service...')
    console.log(`⏰ Update interval: ${this.schedule.intervalMinutes} minutes`)

    // Run current price update first (silent)
    await this.performCurrentPriceUpdate()

    // Run initial full update
    await this.performUpdate()

    // Schedule recurring updates
    this.scheduleNextUpdate()

    console.log('✅ Auto-update service started')
  }

  /**
   * Silent current price update (runs on every page load)
   */
  private async performCurrentPriceUpdate(): Promise<void> {
    try {
      const result = await databaseManager.updateCurrentPrice()
      if (result.success && result.recordsAdded > 0) {
        console.log(`💰 Current price updated silently: ${result.lastDate} from ${result.source}`)
      }
    } catch (error) {
      // Silent failure - don't disrupt user experience
      console.log('💰 Current price update skipped (silent failure)')
    }
  }

  /**
   * Stop the automatic update service
   */
  stop(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
      console.log('🛑 Auto-update service stopped')
    }
  }

  /**
   * Perform immediate update
   */
  async performUpdate(): Promise<UpdateResult> {
    if (this.isRunning) {
      console.log('⏳ Update already in progress')
      return this.lastResult || {
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        lastDate: '',
        source: 'none',
        error: 'Update already in progress'
      }
    }

    this.isRunning = true
    
    try {
      console.log('🔄 Performing automatic database update...')
      
      const result = await databaseManager.performAutomaticUpdate()
      
      this.lastResult = result
      this.schedule.lastRun = new Date().toISOString()
      this.schedule.runCount++
      this.calculateNextRun()
      this.saveScheduleToStorage()
      
      if (result.success) {
        console.log(`✅ Update completed: ${result.recordsAdded} records added from ${result.source}`)
      } else {
        console.error(`❌ Update failed: ${result.error}`)
      }
      
      return result
      
    } catch (error) {
      const errorResult: UpdateResult = {
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        lastDate: '',
        source: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      this.lastResult = errorResult
      console.error('❌ Auto-update failed:', error)
      
      return errorResult
      
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get current update status
   */
  async getStatus(): Promise<UpdateStatus> {
    const stats = await databaseManager.getStats()
    
    return {
      isRunning: this.isRunning,
      lastResult: this.lastResult,
      schedule: { ...this.schedule },
      stats
    }
  }

  /**
   * Update schedule configuration
   */
  updateSchedule(config: Partial<UpdateSchedule>): void {
    this.schedule = {
      ...this.schedule,
      ...config
    }
    
    this.calculateNextRun()
    this.saveScheduleToStorage()
    
    // Restart timer with new interval
    if (this.updateTimer && config.intervalMinutes) {
      this.stop()
      this.scheduleNextUpdate()
    }
    
    console.log(`⚙️ Update schedule updated: ${this.schedule.intervalMinutes} minutes`)
  }

  /**
   * Force immediate update (bypass schedule)
   */
  async forceUpdate(): Promise<UpdateResult> {
    console.log('🚨 Force update triggered')
    return await this.performUpdate()
  }

  /**
   * Schedule next update
   */
  private scheduleNextUpdate(): void {
    if (!this.schedule.enabled) {
      console.log('⏸️ Auto-updates disabled')
      return
    }

    const intervalMs = this.schedule.intervalMinutes * 60 * 1000
    
    this.updateTimer = setTimeout(async () => {
      await this.performUpdate()
      this.scheduleNextUpdate() // Schedule next update
    }, intervalMs)
    
    console.log(`⏰ Next update scheduled for: ${this.schedule.nextRun}`)
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(): void {
    const nextRun = new Date()
    nextRun.setMinutes(nextRun.getMinutes() + this.schedule.intervalMinutes)
    this.schedule.nextRun = nextRun.toISOString()
  }

  /**
   * Load schedule from storage
   */
  private loadScheduleFromStorage(): void {
    const stored = localStorage.getItem('auto_update_schedule')
    if (stored) {
      try {
        this.schedule = { ...this.schedule, ...JSON.parse(stored) }
      } catch (error) {
        console.warn('⚠️ Failed to load schedule from storage:', error)
      }
    }
  }

  /**
   * Save schedule to storage
   */
  private saveScheduleToStorage(): void {
    try {
      localStorage.setItem('auto_update_schedule', JSON.stringify(this.schedule))
    } catch (error) {
      console.warn('⚠️ Failed to save schedule to storage:', error)
    }
  }

  /**
   * Get update history
   */
  getUpdateHistory(): any[] {
    const updates = localStorage.getItem('data_updates')
    return updates ? JSON.parse(updates) : []
  }

  /**
   * Clear update history
   */
  clearUpdateHistory(): void {
    localStorage.removeItem('data_updates')
    console.log('🗑️ Update history cleared')
  }

  /**
   * Health check - verify service is working correctly
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error'
    message: string
    details: any
  }> {
    try {
      const status = await this.getStatus()
      const now = new Date()
      const lastRun = status.schedule.lastRun ? new Date(status.schedule.lastRun) : null
      
      // Check if last update was too long ago
      if (lastRun) {
        const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
        const expectedInterval = status.schedule.intervalMinutes / 60
        
        if (hoursSinceLastRun > expectedInterval * 2) {
          return {
            status: 'warning',
            message: `Last update was ${Math.round(hoursSinceLastRun)} hours ago`,
            details: status
          }
        }
      }
      
      // Check if last update failed
      if (status.lastResult && !status.lastResult.success) {
        return {
          status: 'error',
          message: `Last update failed: ${status.lastResult.error}`,
          details: status
        }
      }
      
      return {
        status: 'healthy',
        message: 'Auto-update service is running normally',
        details: status
      }
      
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: null
      }
    }
  }
}

// Export singleton instance
export const autoUpdateService = new AutoUpdateService()

// Auto-start the service when module loads
if (typeof window !== 'undefined') {
  // Only start in browser environment
  autoUpdateService.start().catch(error => {
    console.error('❌ Failed to start auto-update service:', error)
  })
}
