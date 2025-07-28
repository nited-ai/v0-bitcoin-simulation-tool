/**
 * Data Gap Detection and Filling Service
 * Identifies missing date ranges in the database and fills them with API data
 */

import { bitcoinApiService, type DateRange, type BitcoinPriceData } from '../api/BitcoinApiService'
import { sqlDatabaseManager } from './SqlDatabaseManager'

export interface DataGap {
  start: string         // YYYY-MM-DD format
  end: string           // YYYY-MM-DD format
  dayCount: number
  priority: 'high' | 'medium' | 'low'
}

export interface GapFillResult {
  success: boolean
  gapsFilled: number
  recordsAdded: number
  errors: string[]
  summary: string
}

/**
 * Service for detecting and filling data gaps in Bitcoin price history
 */
export class DataGapService {
  private static instance: DataGapService

  static getInstance(): DataGapService {
    if (!DataGapService.instance) {
      DataGapService.instance = new DataGapService()
    }
    return DataGapService.instance
  }

  /**
   * Detect all data gaps in the database
   */
  async detectDataGaps(): Promise<DataGap[]> {
    console.log('🔍 Detecting data gaps in Bitcoin price database...')

    try {
      // Get all dates from database
      const existingDates = await sqlDatabaseManager.getAllDates()
      
      if (existingDates.length === 0) {
        // No data at all - need everything from 2013 to present
        const today = new Date().toISOString().split('T')[0]
        return [{
          start: '2013-10-01',
          end: today,
          dayCount: this.calculateDaysBetween('2013-10-01', today),
          priority: 'high'
        }]
      }

      // Sort dates
      existingDates.sort()
      
      const gaps: DataGap[] = []
      const today = new Date().toISOString().split('T')[0]
      const earliestDate = '2013-10-01'

      // Check for gap before first date
      if (existingDates[0] > earliestDate) {
        const dayCount = this.calculateDaysBetween(earliestDate, existingDates[0])
        gaps.push({
          start: earliestDate,
          end: this.subtractDays(existingDates[0], 1),
          dayCount,
          priority: 'medium'
        })
      }

      // Check for gaps between consecutive dates
      for (let i = 0; i < existingDates.length - 1; i++) {
        const currentDate = existingDates[i]
        const nextDate = existingDates[i + 1]
        
        const expectedNext = this.addDays(currentDate, 1)
        
        if (expectedNext < nextDate) {
          const dayCount = this.calculateDaysBetween(expectedNext, nextDate)
          gaps.push({
            start: expectedNext,
            end: this.subtractDays(nextDate, 1),
            dayCount,
            priority: dayCount > 30 ? 'high' : 'medium'
          })
        }
      }

      // Check for gap after last date (most important - recent data)
      const lastDate = existingDates[existingDates.length - 1]
      if (lastDate < today) {
        const dayCount = this.calculateDaysBetween(lastDate, today)
        gaps.push({
          start: this.addDays(lastDate, 1),
          end: today,
          dayCount,
          priority: 'high' // Recent data is high priority
        })
      }

      console.log(`📊 Found ${gaps.length} data gaps:`)
      gaps.forEach(gap => {
        console.log(`  - ${gap.start} to ${gap.end} (${gap.dayCount} days, ${gap.priority} priority)`)
      })

      return gaps

    } catch (error) {
      console.error('❌ Error detecting data gaps:', error)
      return []
    }
  }

  /**
   * Fill all detected data gaps
   */
  async fillAllDataGaps(): Promise<GapFillResult> {
    console.log('🔧 Starting comprehensive data gap filling...')

    const gaps = await this.detectDataGaps()
    
    if (gaps.length === 0) {
      return {
        success: true,
        gapsFilled: 0,
        recordsAdded: 0,
        errors: [],
        summary: 'No data gaps detected'
      }
    }

    // Sort gaps by priority (high first) and then by date
    gaps.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.start.localeCompare(b.start)
    })

    let totalRecordsAdded = 0
    let gapsFilled = 0
    const errors: string[] = []

    for (const gap of gaps) {
      try {
        console.log(`🔄 Filling gap: ${gap.start} to ${gap.end} (${gap.dayCount} days)`)
        
        const result = await this.fillDataGap(gap)
        
        if (result.success) {
          totalRecordsAdded += result.recordsAdded
          gapsFilled++
          console.log(`✅ Gap filled: ${result.recordsAdded} records added`)
        } else {
          errors.push(`Failed to fill gap ${gap.start} to ${gap.end}: ${result.error}`)
          console.error(`❌ Failed to fill gap: ${result.error}`)
        }

        // Add delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        const errorMsg = `Error filling gap ${gap.start} to ${gap.end}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error('❌', errorMsg)
      }
    }

    const summary = `Filled ${gapsFilled}/${gaps.length} gaps, added ${totalRecordsAdded} records`
    
    return {
      success: gapsFilled > 0,
      gapsFilled,
      recordsAdded: totalRecordsAdded,
      errors,
      summary
    }
  }

  /**
   * Fill a specific data gap
   */
  async fillDataGap(gap: DataGap): Promise<{ success: boolean; recordsAdded: number; error?: string }> {
    try {
      // For large gaps, split into smaller chunks
      const maxChunkSize = 90 // days
      const dateRanges = this.splitGapIntoChunks(gap, maxChunkSize)

      let totalRecordsAdded = 0

      for (const range of dateRanges) {
        const apiResult = await bitcoinApiService.fetchHistoricalData(range)
        
        if (apiResult.success && apiResult.data.length > 0) {
          // Insert data into database
          const insertResult = await sqlDatabaseManager.insertBatchPriceData(apiResult.data)
          
          if (insertResult.success) {
            totalRecordsAdded += insertResult.recordsAdded
            console.log(`📥 Inserted ${insertResult.recordsAdded} records for ${range.start} to ${range.end}`)
          } else {
            console.warn(`⚠️ Failed to insert data for ${range.start} to ${range.end}: ${insertResult.error}`)
          }
        } else {
          console.warn(`⚠️ No data received for ${range.start} to ${range.end}: ${apiResult.error}`)
        }

        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return {
        success: totalRecordsAdded > 0,
        recordsAdded: totalRecordsAdded
      }

    } catch (error) {
      return {
        success: false,
        recordsAdded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get the most critical data gap (usually the most recent one)
   */
  async getMostCriticalGap(): Promise<DataGap | null> {
    const gaps = await this.detectDataGaps()
    
    if (gaps.length === 0) return null

    // Find the gap with highest priority that's most recent
    const highPriorityGaps = gaps.filter(gap => gap.priority === 'high')
    
    if (highPriorityGaps.length > 0) {
      // Return the most recent high priority gap
      return highPriorityGaps.sort((a, b) => b.start.localeCompare(a.start))[0]
    }

    // If no high priority gaps, return the most recent gap
    return gaps.sort((a, b) => b.start.localeCompare(a.start))[0]
  }

  /**
   * Check if database needs updating (has recent data)
   */
  async needsUpdate(): Promise<boolean> {
    try {
      const lastDate = await sqlDatabaseManager.getLastDate()
      
      if (!lastDate) return true // No data at all

      const today = new Date().toISOString().split('T')[0]
      const daysSinceLastUpdate = this.calculateDaysBetween(lastDate, today)

      // Need update if last data is more than 1 day old
      return daysSinceLastUpdate > 1

    } catch (error) {
      console.error('❌ Error checking if update needed:', error)
      return true // Assume update needed on error
    }
  }

  /**
   * Split a large gap into smaller chunks for API calls
   */
  private splitGapIntoChunks(gap: DataGap, maxChunkSize: number): DateRange[] {
    const chunks: DateRange[] = []
    let currentStart = gap.start

    while (currentStart <= gap.end) {
      const currentEnd = this.addDays(currentStart, maxChunkSize - 1)
      const actualEnd = currentEnd > gap.end ? gap.end : currentEnd

      chunks.push({
        start: currentStart,
        end: actualEnd
      })

      if (actualEnd === gap.end) break
      
      currentStart = this.addDays(actualEnd, 1)
    }

    return chunks
  }

  /**
   * Date utility functions
   */
  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  private subtractDays(dateStr: string, days: number): string {
    const date = new Date(dateStr)
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }
}

export const dataGapService = DataGapService.getInstance()
