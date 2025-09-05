/**
 * Historical Data Service
 * 
 * Service for managing historical price data storage and retrieval.
 * Handles JSON file storage, data validation, and cleanup operations.
 */

import type {
  IHistoricalDataService,
  HistoricalDataPoint
} from '../types'
import type { ValidationResult } from '@/modules/shared/types'
import fs from 'fs/promises'
import path from 'path'

/**
 * Historical Data Service Implementation
 */
export class HistoricalDataService implements IHistoricalDataService {
  private dataDirectory: string

  constructor(dataDirectory: string = 'data/historical') {
    this.dataDirectory = dataDirectory
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData(symbol: string, interval: string): Promise<HistoricalDataPoint[]> {
    try {
      const filePath = this.getFilePath(symbol, interval)
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(fileContent)
      
      // Validate and sort data
      if (Array.isArray(data)) {
        return data.sort((a, b) => a.time - b.time)
      }
      
      return []
    } catch (error) {
      // File doesn't exist or is corrupted
      return []
    }
  }

  /**
   * Save historical data to storage
   */
  async saveHistoricalData(symbol: string, interval: string, data: HistoricalDataPoint[]): Promise<boolean> {
    try {
      // Ensure directory exists
      await this.ensureDirectoryExists()
      
      // Sort data by timestamp
      const sortedData = [...data].sort((a, b) => a.time - b.time)
      
      const filePath = this.getFilePath(symbol, interval)
      const fileContent = JSON.stringify(sortedData, null, 2)
      
      await fs.writeFile(filePath, fileContent, 'utf-8')
      return true
    } catch (error) {
      console.error(`Failed to save historical data for ${symbol}-${interval}:`, error)
      return false
    }
  }

  /**
   * Update historical data with new points
   */
  async updateHistoricalData(symbol: string, interval: string, newData: HistoricalDataPoint[]): Promise<boolean> {
    try {
      if (newData.length === 0) {
        return true // Nothing to update
      }

      // Load existing data
      const existingData = await this.loadHistoricalData(symbol, interval)
      
      // Create a map for efficient lookups and updates
      const dataMap = new Map<number, HistoricalDataPoint>()
      
      // Add existing data
      existingData.forEach(point => {
        dataMap.set(point.time, point)
      })
      
      // Add/update with new data
      newData.forEach(point => {
        dataMap.set(point.time, point)
      })
      
      // Convert back to array and sort
      const mergedData = Array.from(dataMap.values()).sort((a, b) => a.time - b.time)
      
      // Save merged data
      return await this.saveHistoricalData(symbol, interval, mergedData)
    } catch (error) {
      console.error(`Failed to update historical data for ${symbol}-${interval}:`, error)
      return false
    }
  }

  /**
   * Get data range (start and end dates)
   */
  async getDataRange(symbol: string, interval: string): Promise<{ start: Date; end: Date } | null> {
    try {
      const data = await this.loadHistoricalData(symbol, interval)
      
      if (data.length === 0) {
        return null
      }
      
      const sortedData = data.sort((a, b) => a.time - b.time)
      
      return {
        start: new Date(sortedData[0].time),
        end: new Date(sortedData[sortedData.length - 1].time)
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Clean up old data files
   */
  async cleanupOldData(retentionDays: number): Promise<number> {
    try {
      await this.ensureDirectoryExists()
      
      const files = await fs.readdir(this.dataDirectory)
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
      let cleanedCount = 0
      
      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue
        }
        
        const filePath = path.join(this.dataDirectory, file)
        
        try {
          const stats = await fs.stat(filePath)
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath)
            cleanedCount++
            console.log(`🗑️ Cleaned up old data file: ${file}`)
          }
        } catch (error) {
          // Skip files that can't be accessed
          continue
        }
      }
      
      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
      return 0
    }
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency(symbol: string, interval: string): Promise<ValidationResult> {
    try {
      const data = await this.loadHistoricalData(symbol, interval)
      const errors: string[] = []

      if (data.length === 0) {
        errors.push('No data found for validation')
        return { isValid: false, errors }
      }

      // Check for valid data points
      data.forEach((point, index) => {
        if (typeof point.time !== 'number' || point.time <= 0) {
          errors.push(`Point ${index}: Invalid timestamp`)
        }
        
        if (typeof point.close !== 'number' || point.close <= 0) {
          errors.push(`Point ${index}: Invalid close price`)
        }
        
        if (point.high !== undefined && (typeof point.high !== 'number' || point.high <= 0)) {
          errors.push(`Point ${index}: Invalid high price`)
        }
        
        if (point.low !== undefined && (typeof point.low !== 'number' || point.low <= 0)) {
          errors.push(`Point ${index}: Invalid low price`)
        }
        
        if (point.open !== undefined && (typeof point.open !== 'number' || point.open <= 0)) {
          errors.push(`Point ${index}: Invalid open price`)
        }
      })

      // Check for proper sorting
      for (let i = 1; i < data.length; i++) {
        if (data[i].time < data[i - 1].time) {
          errors.push('Data is not sorted by timestamp')
          break
        }
      }

      // Check for gaps (basic check for daily data)
      if (interval === 'daily' && data.length > 2) {
        const expectedInterval = 24 * 60 * 60 * 1000 // 1 day in milliseconds

        for (let i = 1; i < data.length; i++) {
          const timeDiff = data[i].time - data[i - 1].time

          // Allow for some flexibility (weekends, holidays)
          if (timeDiff > expectedInterval * 4) { // More than 4 days gap
            errors.push(`Large time gap detected between points ${i - 1} and ${i}`)
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`]
      }
    }
  }

  /**
   * Get file path for symbol and interval
   */
  private getFilePath(symbol: string, interval: string): string {
    const filename = `${symbol}-${interval}.json`
    return path.join(this.dataDirectory, filename)
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.dataDirectory, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }
}

// Export singleton instance
export const historicalDataService = new HistoricalDataService()
