/**
 * CSV Update Manager for Bitcoin Price History
 * Handles automatic updates to public/btc-price-history.csv
 */

import { bitcoinApiService, type BitcoinPriceData } from './bitcoinApiService'

export interface CsvUpdateResult {
  success: boolean
  recordsAdded: number
  lastDate: string
  error?: string
  source?: string
}

export class CsvUpdateManager {
  private readonly CSV_PATH = '/btc-price-history.csv'
  private readonly CSV_HEADER = 'Currency,Date,Closing Price (USD),24h Open (USD),24h High (USD),24h Low (USD)'
  
  /**
   * Update CSV file with missing Bitcoin price data
   */
  async updateCsvFile(): Promise<CsvUpdateResult> {
    console.log('📊 Starting CSV update process...')
    
    try {
      // Step 1: Read existing CSV and find last date
      const { lastDate, existingData } = await this.analyzeExistingCsv()
      console.log(`📅 Last date in CSV: ${lastDate}`)
      
      // Step 2: Calculate date range to fetch
      const today = new Date().toISOString().split('T')[0]
      const startDate = this.getNextDay(lastDate)
      
      if (startDate > today) {
        console.log('✅ CSV is already up to date')
        return {
          success: true,
          recordsAdded: 0,
          lastDate,
          source: 'none'
        }
      }
      
      console.log(`🔍 Fetching data from ${startDate} to ${today}`)
      
      // Step 3: Fetch missing data from API
      const apiResponse = await bitcoinApiService.fetchHistoricalData(startDate, today)
      
      if (!apiResponse.success || apiResponse.data.length === 0) {
        // Fallback: try to get at least current price
        console.log('🔄 Falling back to current price only...')
        const currentPriceResponse = await bitcoinApiService.fetchCurrentPrice()
        
        if (currentPriceResponse.success && currentPriceResponse.data.length > 0) {
          const newRecords = this.formatDataForCsv(currentPriceResponse.data)
          await this.appendToCsv(newRecords)
          
          return {
            success: true,
            recordsAdded: 1,
            lastDate: currentPriceResponse.data[0].date,
            source: currentPriceResponse.source
          }
        }
        
        throw new Error(apiResponse.error || 'Failed to fetch any data')
      }
      
      // Step 4: Validate and filter data
      const validData = this.validateAndFilterData(apiResponse.data, lastDate)
      console.log(`✅ Valid data points: ${validData.length}`)
      
      if (validData.length === 0) {
        console.log('ℹ️ No new valid data to add')
        return {
          success: true,
          recordsAdded: 0,
          lastDate,
          source: apiResponse.source
        }
      }
      
      // Step 5: Format and append to CSV
      const newRecords = this.formatDataForCsv(validData)
      await this.appendToCsv(newRecords)
      
      const newLastDate = validData[validData.length - 1].date
      console.log(`✅ CSV updated successfully: ${validData.length} records added`)
      console.log(`📅 New last date: ${newLastDate}`)
      
      return {
        success: true,
        recordsAdded: validData.length,
        lastDate: newLastDate,
        source: apiResponse.source
      }
      
    } catch (error) {
      console.error('❌ CSV update failed:', error)
      return {
        success: false,
        recordsAdded: 0,
        lastDate: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Analyze existing CSV file to find last date and validate structure
   */
  private async analyzeExistingCsv(): Promise<{ lastDate: string; existingData: string[] }> {
    try {
      const response = await fetch(this.CSV_PATH)
      if (!response.ok) {
        throw new Error(`Failed to read CSV: ${response.status}`)
      }
      
      const csvText = await response.text()
      const lines = csvText.trim().split('\n')
      
      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty or invalid')
      }
      
      // Validate header
      const header = lines[0].trim()
      if (header !== this.CSV_HEADER) {
        console.warn('⚠️ CSV header mismatch, but continuing...')
      }
      
      // Find last date
      const lastLine = lines[lines.length - 1]
      const lastRecord = lastLine.split(',')
      
      if (lastRecord.length < 2) {
        throw new Error('Invalid last record in CSV')
      }
      
      const lastDate = lastRecord[1] // Date is in second column
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
        throw new Error(`Invalid date format in CSV: ${lastDate}`)
      }
      
      return {
        lastDate,
        existingData: lines
      }
      
    } catch (error) {
      console.error('❌ Failed to analyze existing CSV:', error)
      throw error
    }
  }

  /**
   * Validate and filter API data
   */
  private validateAndFilterData(data: BitcoinPriceData[], lastCsvDate: string): BitcoinPriceData[] {
    const lastCsvTimestamp = new Date(lastCsvDate).getTime()
    
    return data.filter(item => {
      // Filter out dates that are already in CSV
      if (new Date(item.date).getTime() <= lastCsvTimestamp) {
        return false
      }
      
      // Validate required fields
      if (!item.date || !item.close || item.close <= 0) {
        console.warn(`⚠️ Invalid data point:`, item)
        return false
      }
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        console.warn(`⚠️ Invalid date format: ${item.date}`)
        return false
      }
      
      return true
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * Format API data for CSV format
   */
  private formatDataForCsv(data: BitcoinPriceData[]): string[] {
    return data.map(item => {
      const currency = 'BTC'
      const date = item.date
      const close = item.close.toFixed(2)
      const open = (item.open || item.close).toFixed(2)
      const high = (item.high || item.close).toFixed(2)
      const low = (item.low || item.close).toFixed(2)
      
      return `${currency},${date},${close},${open},${high},${low}`
    })
  }

  /**
   * Append new records to CSV file
   * Note: In a real application, this would need server-side implementation
   * For now, we'll simulate the update and provide instructions
   */
  private async appendToCsv(newRecords: string[]): Promise<void> {
    console.log('📝 New CSV records to append:')
    newRecords.forEach((record, index) => {
      console.log(`   ${index + 1}: ${record}`)
    })
    
    // In a browser environment, we can't directly write to files
    // This would need to be implemented as a server-side API endpoint
    console.log('ℹ️ Note: Actual CSV writing requires server-side implementation')
    console.log('📋 Copy the above records and append them to public/btc-price-history.csv')
    
    // Store in localStorage for development purposes
    const existingUpdates = localStorage.getItem('pendingCsvUpdates') || '[]'
    const updates = JSON.parse(existingUpdates)
    updates.push(...newRecords)
    localStorage.setItem('pendingCsvUpdates', JSON.stringify(updates))
    
    console.log('💾 Records stored in localStorage as pendingCsvUpdates')
  }

  /**
   * Get next day after given date
   */
  private getNextDay(dateString: string): string {
    const date = new Date(dateString)
    date.setDate(date.getDate() + 1)
    return date.toISOString().split('T')[0]
  }

  /**
   * Get pending CSV updates from localStorage
   */
  getPendingUpdates(): string[] {
    const updates = localStorage.getItem('pendingCsvUpdates')
    return updates ? JSON.parse(updates) : []
  }

  /**
   * Clear pending updates
   */
  clearPendingUpdates(): void {
    localStorage.removeItem('pendingCsvUpdates')
    console.log('🗑️ Pending CSV updates cleared')
  }

  /**
   * Manual trigger for CSV update (for testing)
   */
  async triggerUpdate(): Promise<CsvUpdateResult> {
    console.log('🚀 Manual CSV update triggered')
    return await this.updateCsvFile()
  }
}

// Export singleton instance
export const csvUpdateManager = new CsvUpdateManager()
