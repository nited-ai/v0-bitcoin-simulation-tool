/**
 * Database Manager for Bitcoin Price Data
 * Handles automatic updates, data persistence, and gap detection
 */

import { bitcoinApiService, type BitcoinPriceData } from '../bitcoinApiService'

export interface DatabasePricePoint {
  id?: number
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source: string
  created_at?: string
  updated_at?: string
}

export interface UpdateResult {
  success: boolean
  recordsAdded: number
  recordsUpdated: number
  lastDate: string
  source: string
  error?: string
}

export class DatabaseManager {
  private db: any = null
  private isInitialized = false
  private updateInProgress = false

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🗄️ Initializing Bitcoin price database...')
      
      // In a real implementation, this would use a proper SQLite driver
      // For now, we'll simulate with localStorage and IndexedDB
      await this.initializeStorage()
      await this.createTables()
      
      this.isInitialized = true
      console.log('✅ Database initialized successfully')
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Get all historical price data from database with CSV integration
   */
  async getHistoricalData(): Promise<DatabasePricePoint[]> {
    await this.initialize()

    try {
      console.log('📊 Loading historical data from database...')

      // Check if database needs CSV data integration
      const data = this.getStoredData()

      if (data.length === 0 || !this.hasCompleteHistoricalData(data)) {
        console.log('📂 Integrating CSV historical data into database...')
        await this.integrateCSVData()

        // Reload data after CSV integration
        const updatedData = this.getStoredData()
        console.log(`✅ Database populated with CSV data: ${updatedData.length} records`)
        return updatedData
      }

      console.log(`✅ Loaded ${data.length} records from database`)
      console.log(`📅 Date range: ${data[0]?.date} to ${data[data.length - 1]?.date}`)

      return data

    } catch (error) {
      console.error('❌ Failed to load historical data:', error)
      throw error
    }
  }

  /**
   * Check if database has complete historical data from 2013
   */
  private hasCompleteHistoricalData(data: DatabasePricePoint[]): boolean {
    if (data.length === 0) return false

    const earliestDate = data[0]?.date
    const targetStartDate = '2013-10-01'

    return earliestDate <= targetStartDate
  }

  /**
   * Integrate CSV historical data into database
   */
  private async integrateCSVData(): Promise<void> {
    try {
      console.log('📥 Loading CSV data for database integration...')

      // Load CSV data
      const response = await fetch('/btc-price-history.csv')
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.status}`)
      }

      const csvText = await response.text()
      const lines = csvText.trim().split('\n')

      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty')
      }

      // Skip header and parse CSV data
      const csvRecords: DatabasePricePoint[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const [currency, date, close, open, high, low] = line.split(',')

        if (currency === 'BTC' && date && close) {
          csvRecords.push({
            date,
            timestamp: new Date(date).getTime(),
            open: parseFloat(open) || parseFloat(close),
            high: parseFloat(high) || parseFloat(close),
            low: parseFloat(low) || parseFloat(close),
            close: parseFloat(close),
            volume: undefined,
            source: 'CSV'
          })
        }
      }

      console.log(`📊 Parsed ${csvRecords.length} records from CSV`)

      // Insert CSV records into database
      const existingData = this.getStoredData()
      const existingDates = new Set(existingData.map(d => d.date))

      let addedCount = 0
      for (const record of csvRecords) {
        if (!existingDates.has(record.date)) {
          this.insertStoredRecord(record)
          addedCount++
        }
      }

      console.log(`💾 Integrated ${addedCount} CSV records into database`)

    } catch (error) {
      console.error('❌ Failed to integrate CSV data:', error)
      throw error
    }
  }

  /**
   * Daily current price update - ensures database has yesterday's price
   */
  async updateCurrentPrice(): Promise<UpdateResult> {
    try {
      console.log('💰 Checking for current price update...')

      await this.initialize()

      const data = this.getStoredData()
      const lastDate = data.length > 0 ? data[data.length - 1].date : '2013-10-01'
      const yesterday = this.getYesterday()

      if (lastDate >= yesterday) {
        console.log('✅ Current price is up to date')
        return {
          success: true,
          recordsAdded: 0,
          recordsUpdated: 0,
          lastDate,
          source: 'none'
        }
      }

      console.log(`📡 Fetching current price for ${yesterday}...`)
      const { bitcoinApiService } = await import('../bitcoinApiService')
      const currentPriceResponse = await bitcoinApiService.fetchCurrentPrice()

      if (!currentPriceResponse.success || currentPriceResponse.data.length === 0) {
        throw new Error('Failed to fetch current price')
      }

      const currentPrice = currentPriceResponse.data[0]
      const priceRecord: DatabasePricePoint = {
        date: yesterday,
        timestamp: new Date(yesterday).getTime(),
        open: currentPrice.close,
        high: currentPrice.close,
        low: currentPrice.close,
        close: currentPrice.close,
        volume: currentPrice.volume,
        source: currentPriceResponse.source
      }

      this.insertStoredRecord(priceRecord)

      console.log(`✅ Current price updated: $${currentPrice.close} (${yesterday})`)

      return {
        success: true,
        recordsAdded: 1,
        recordsUpdated: 0,
        lastDate: yesterday,
        source: currentPriceResponse.source
      }

    } catch (error) {
      console.error('❌ Current price update failed:', error)
      return {
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        lastDate: '',
        source: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Automatic update system - checks for gaps and fills them
   */
  async performAutomaticUpdate(): Promise<UpdateResult> {
    if (this.updateInProgress) {
      console.log('⏳ Update already in progress, skipping...')
      return {
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        lastDate: '',
        source: 'none',
        error: 'Update already in progress'
      }
    }

    this.updateInProgress = true
    
    try {
      console.log('🔄 Starting automatic database update...')
      
      await this.initialize()
      
      // Step 1: Find data gaps
      const gaps = await this.findDataGaps()
      console.log(`🔍 Found ${gaps.length} data gaps to fill`)
      
      if (gaps.length === 0) {
        console.log('✅ Database is up to date')
        return {
          success: true,
          recordsAdded: 0,
          recordsUpdated: 0,
          lastDate: await this.getLastDate(),
          source: 'none'
        }
      }

      // Step 2: Fetch missing data
      const startDate = gaps[0]
      const endDate = gaps[gaps.length - 1]
      
      console.log(`📡 Fetching data from ${startDate} to ${endDate}`)
      const apiResponse = await bitcoinApiService.fetchHistoricalData(startDate, endDate)
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API fetch failed')
      }

      // Step 3: Insert new data
      const insertResult = await this.insertPriceData(apiResponse.data, apiResponse.source)
      
      // Step 4: Log update
      await this.logUpdate({
        recordsAdded: insertResult.recordsAdded,
        recordsUpdated: insertResult.recordsUpdated,
        source: apiResponse.source,
        startDate,
        endDate,
        status: 'success'
      })

      console.log(`✅ Automatic update completed: ${insertResult.recordsAdded} records added`)
      
      return {
        success: true,
        recordsAdded: insertResult.recordsAdded,
        recordsUpdated: insertResult.recordsUpdated,
        lastDate: await this.getLastDate(),
        source: apiResponse.source
      }
      
    } catch (error) {
      console.error('❌ Automatic update failed:', error)
      
      // Log failed update
      await this.logUpdate({
        recordsAdded: 0,
        recordsUpdated: 0,
        source: 'unknown',
        startDate: '',
        endDate: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        lastDate: '',
        source: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
    } finally {
      this.updateInProgress = false
    }
  }

  /**
   * Find gaps in historical data
   */
  private async findDataGaps(): Promise<string[]> {
    const data = this.getStoredData()
    
    if (data.length === 0) {
      // No data, start from 2013
      const startDate = '2013-10-01'
      const endDate = new Date().toISOString().split('T')[0]
      return this.generateDateRange(startDate, endDate)
    }

    const gaps: string[] = []
    const lastDate = data[data.length - 1].date
    const today = new Date().toISOString().split('T')[0]
    
    // Check for gap from last date to today
    if (lastDate < today) {
      const nextDay = this.addDays(lastDate, 1)
      gaps.push(...this.generateDateRange(nextDay, today))
    }

    return gaps
  }

  /**
   * Insert price data into database
   */
  private async insertPriceData(data: BitcoinPriceData[], source: string): Promise<{recordsAdded: number, recordsUpdated: number}> {
    let recordsAdded = 0
    let recordsUpdated = 0
    
    const existingData = this.getStoredData()
    const existingDates = new Set(existingData.map(d => d.date))
    
    for (const point of data) {
      const dbPoint: DatabasePricePoint = {
        date: point.date,
        timestamp: point.timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
        source
      }
      
      if (existingDates.has(point.date)) {
        // Update existing record
        this.updateStoredRecord(dbPoint)
        recordsUpdated++
      } else {
        // Insert new record
        this.insertStoredRecord(dbPoint)
        recordsAdded++
      }
    }
    
    console.log(`💾 Database updated: ${recordsAdded} added, ${recordsUpdated} updated`)
    return { recordsAdded, recordsUpdated }
  }

  /**
   * Storage simulation methods (replace with real SQLite in production)
   */
  private async initializeStorage(): Promise<void> {
    // Initialize localStorage structure
    if (!localStorage.getItem('bitcoin_prices')) {
      localStorage.setItem('bitcoin_prices', JSON.stringify([]))
    }
    if (!localStorage.getItem('data_updates')) {
      localStorage.setItem('data_updates', JSON.stringify([]))
    }
  }

  private async createTables(): Promise<void> {
    // In real implementation, execute schema.sql
    console.log('📋 Database tables ready')
  }

  private getStoredData(): DatabasePricePoint[] {
    const data = localStorage.getItem('bitcoin_prices')
    return data ? JSON.parse(data) : []
  }

  private insertStoredRecord(record: DatabasePricePoint): void {
    const data = this.getStoredData()
    data.push({
      ...record,
      id: data.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    data.sort((a, b) => a.timestamp - b.timestamp)
    localStorage.setItem('bitcoin_prices', JSON.stringify(data))
  }

  private updateStoredRecord(record: DatabasePricePoint): void {
    const data = this.getStoredData()
    const index = data.findIndex(d => d.date === record.date)
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...record,
        updated_at: new Date().toISOString()
      }
      localStorage.setItem('bitcoin_prices', JSON.stringify(data))
    }
  }

  private async getLastDate(): Promise<string> {
    const data = this.getStoredData()
    return data.length > 0 ? data[data.length - 1].date : '2013-10-01'
  }

  private async logUpdate(update: any): Promise<void> {
    const updates = JSON.parse(localStorage.getItem('data_updates') || '[]')
    updates.push({
      ...update,
      id: updates.length + 1,
      update_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    })
    localStorage.setItem('data_updates', JSON.stringify(updates))
  }

  /**
   * Utility methods
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }

  private addDays(dateString: string, days: number): string {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  private getYesterday(): string {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalRecords: number
    dateRange: { start: string; end: string }
    lastUpdate: string
    sources: string[]
  }> {
    const data = this.getStoredData()
    const updates = JSON.parse(localStorage.getItem('data_updates') || '[]')
    
    return {
      totalRecords: data.length,
      dateRange: {
        start: data[0]?.date || 'N/A',
        end: data[data.length - 1]?.date || 'N/A'
      },
      lastUpdate: updates[updates.length - 1]?.created_at || 'Never',
      sources: [...new Set(data.map(d => d.source))]
    }
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager()
