/**
 * SQL Database Manager for Bitcoin Price Data
 * Replaces localStorage with actual Prisma-based SQL database operations
 */

import { PrismaClient } from '@/lib/generated/prisma'
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

export class SqlDatabaseManager {
  private prisma: PrismaClient
  private isInitialized = false
  private updateInProgress = false

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Initialize database connection and ensure tables exist
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🗄️ Initializing SQL Bitcoin price database...')
      
      // Test database connection
      await this.prisma.$connect()
      
      this.isInitialized = true
      console.log('✅ SQL Database initialized successfully')
      
    } catch (error) {
      console.error('❌ SQL Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Get all historical price data from SQL database with CSV integration
   */
  async getHistoricalData(): Promise<DatabasePricePoint[]> {
    await this.initialize()

    try {
      console.log('📊 Loading historical data from SQL database...')

      // Get data from SQL database
      const data = await this.prisma.bitcoinPrice.findMany({
        orderBy: { timestamp: 'asc' }
      })

      if (data.length === 0 || !this.hasCompleteHistoricalData(data)) {
        console.log('📂 Integrating CSV historical data into SQL database...')
        await this.integrateCSVData()

        // Reload data after CSV integration
        const updatedData = await this.prisma.bitcoinPrice.findMany({
          orderBy: { timestamp: 'asc' }
        })
        console.log(`✅ SQL Database populated with CSV data: ${updatedData.length} records`)
        return this.convertToDbFormat(updatedData)
      }

      console.log(`✅ Loaded ${data.length} records from SQL database`)
      console.log(`📅 Date range: ${data[0]?.date} to ${data[data.length - 1]?.date}`)

      return this.convertToDbFormat(data)

    } catch (error) {
      console.error('❌ Failed to load historical data from SQL:', error)
      throw error
    }
  }

  /**
   * Check if we have complete historical data (from 2013)
   */
  private hasCompleteHistoricalData(data: any[]): boolean {
    if (data.length === 0) return false
    
    const earliestDate = new Date(data[0].date)
    const targetDate = new Date('2013-10-01')
    
    return earliestDate <= targetDate
  }

  /**
   * Integrate CSV historical data into SQL database
   */
  private async integrateCSVData(): Promise<void> {
    try {
      console.log('📥 Loading CSV data for SQL database integration...')

      // Load CSV data from file system (server-side)
      const fs = await import('fs/promises')
      const path = await import('path')

      const csvPath = path.join(process.cwd(), 'public', 'btc-price-history.csv')
      const csvText = await fs.readFile(csvPath, 'utf-8')
      const lines = csvText.trim().split('\n')

      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty')
      }

      // Parse CSV data (skip header)
      // CSV format: Currency,Date,Closing Price (USD),24h Open (USD),24h High (USD),24h Low (USD)
      const csvRecords: DatabasePricePoint[] = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const [currency, date, close, open, high, low] = line.split(',')

        if (currency === 'BTC' && date && close && open && high && low) {
          const parsedDate = date.trim()
          const timestamp = new Date(parsedDate).getTime()

          // Skip invalid dates
          if (isNaN(timestamp)) {
            console.warn(`Skipping invalid date: ${parsedDate}`)
            continue
          }

          csvRecords.push({
            date: parsedDate,
            timestamp,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: undefined, // No volume data in this CSV
            source: 'csv'
          })
        }
      }

      console.log(`📊 Parsed ${csvRecords.length} records from CSV`)

      // Insert CSV records into SQL database using batch operations
      let addedCount = 0
      const batchSize = 100

      for (let i = 0; i < csvRecords.length; i += batchSize) {
        const batch = csvRecords.slice(i, i + batchSize)
        
        try {
          await this.prisma.$transaction(async (tx) => {
            for (const record of batch) {
              await tx.bitcoinPrice.upsert({
                where: { date: record.date },
                update: {
                  timestamp: BigInt(record.timestamp),
                  open: record.open,
                  high: record.high,
                  low: record.low,
                  close: record.close,
                  volume: record.volume,
                  source: record.source,
                  updatedAt: new Date()
                },
                create: {
                  date: record.date,
                  timestamp: BigInt(record.timestamp),
                  open: record.open,
                  high: record.high,
                  low: record.low,
                  close: record.close,
                  volume: record.volume,
                  source: record.source
                }
              })
              addedCount++
            }
          })
        } catch (error) {
          console.error(`❌ Failed to insert batch ${i}-${i + batchSize}:`, error)
        }
      }

      console.log(`💾 Integrated ${addedCount} CSV records into SQL database`)

    } catch (error) {
      console.error('❌ Failed to integrate CSV data into SQL:', error)
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

      const lastRecord = await this.prisma.bitcoinPrice.findFirst({
        orderBy: { timestamp: 'desc' }
      })
      
      const lastDate = lastRecord?.date || '2013-10-01'
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
      const currentPriceResponse = await bitcoinApiService.fetchCurrentPrice()

      if (!currentPriceResponse.success || currentPriceResponse.data.length === 0) {
        throw new Error('Failed to fetch current price')
      }

      const currentPrice = currentPriceResponse.data[0]
      
      // Insert current price into SQL database
      await this.prisma.bitcoinPrice.create({
        data: {
          date: yesterday,
          timestamp: BigInt(new Date(yesterday).getTime()),
          open: currentPrice.close,
          high: currentPrice.close,
          low: currentPrice.close,
          close: currentPrice.close,
          volume: currentPrice.volume,
          source: currentPriceResponse.source
        }
      })

      // Log the update
      await this.prisma.dataUpdate.create({
        data: {
          updateDate: yesterday,
          recordsAdded: 1,
          recordsUpdated: 0,
          source: currentPriceResponse.source,
          startDate: yesterday,
          endDate: yesterday,
          status: 'success'
        }
      })

      console.log(`💾 Added current price for ${yesterday}`)
      return {
        success: true,
        recordsAdded: 1,
        recordsUpdated: 0,
        lastDate: yesterday,
        source: currentPriceResponse.source
      }

    } catch (error) {
      console.error('❌ Failed to update current price:', error)
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
   * Convert Prisma result to DatabasePricePoint format
   */
  private convertToDbFormat(data: any[]): DatabasePricePoint[] {
    return data.map(record => ({
      id: record.id,
      date: record.date,
      timestamp: Number(record.timestamp),
      open: record.open,
      high: record.high,
      low: record.low,
      close: record.close,
      volume: record.volume,
      source: record.source,
      created_at: record.createdAt?.toISOString(),
      updated_at: record.updatedAt?.toISOString()
    }))
  }

  /**
   * Get yesterday's date in YYYY-MM-DD format
   */
  private getYesterday(): string {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  /**
   * Automatic database update - fills data gaps
   */
  async updateDatabase(): Promise<UpdateResult> {
    if (this.updateInProgress) {
      console.log('⏳ Database update already in progress')
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
      console.log('🔄 Starting automatic SQL database update...')

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

      // Step 3: Insert fetched data
      const result = await this.insertPriceData(apiResponse.data, apiResponse.source)

      // Step 4: Log the update
      await this.prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded: result.recordsAdded,
          recordsUpdated: result.recordsUpdated,
          source: apiResponse.source,
          startDate,
          endDate,
          status: 'success'
        }
      })

      console.log(`✅ Database update completed: ${result.recordsAdded} added, ${result.recordsUpdated} updated`)

      return {
        success: true,
        recordsAdded: result.recordsAdded,
        recordsUpdated: result.recordsUpdated,
        lastDate: await this.getLastDate(),
        source: apiResponse.source
      }

    } catch (error) {
      console.error('❌ Database update failed:', error)

      // Log failed update
      try {
        await this.prisma.dataUpdate.create({
          data: {
            updateDate: new Date().toISOString().split('T')[0],
            recordsAdded: 0,
            recordsUpdated: 0,
            source: 'unknown',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      } catch (logError) {
        console.error('❌ Failed to log update error:', logError)
      }

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
   * Find missing dates in the database
   */
  private async findDataGaps(): Promise<string[]> {
    const lastRecord = await this.prisma.bitcoinPrice.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    if (!lastRecord) {
      return ['2013-10-01'] // Start from Bitcoin's early days
    }

    const gaps: string[] = []
    const lastDate = new Date(lastRecord.date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Find gaps from last date to yesterday
    const currentDate = new Date(lastDate)
    currentDate.setDate(currentDate.getDate() + 1)

    while (currentDate <= yesterday) {
      const dateStr = currentDate.toISOString().split('T')[0]

      // Check if this date exists in database
      const exists = await this.prisma.bitcoinPrice.findUnique({
        where: { date: dateStr }
      })

      if (!exists) {
        gaps.push(dateStr)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return gaps
  }

  /**
   * Insert price data into SQL database
   */
  private async insertPriceData(data: BitcoinPriceData[], source: string): Promise<{recordsAdded: number, recordsUpdated: number}> {
    let recordsAdded = 0
    let recordsUpdated = 0

    const batchSize = 50

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      try {
        await this.prisma.$transaction(async (tx) => {
          for (const point of batch) {
            const result = await tx.bitcoinPrice.upsert({
              where: { date: point.date },
              update: {
                timestamp: BigInt(point.timestamp),
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                volume: point.volume,
                source,
                updatedAt: new Date()
              },
              create: {
                date: point.date,
                timestamp: BigInt(point.timestamp),
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                volume: point.volume,
                source
              }
            })

            // Check if it was an insert or update (Prisma doesn't return this info directly)
            const existing = await tx.bitcoinPrice.findUnique({
              where: { date: point.date },
              select: { createdAt: true, updatedAt: true }
            })

            if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
              recordsAdded++
            } else {
              recordsUpdated++
            }
          }
        })
      } catch (error) {
        console.error(`❌ Failed to insert batch ${i}-${i + batchSize}:`, error)
      }
    }

    console.log(`💾 SQL Database updated: ${recordsAdded} added, ${recordsUpdated} updated`)
    return { recordsAdded, recordsUpdated }
  }

  /**
   * Get the last date in the database
   */
  private async getLastDate(): Promise<string> {
    const lastRecord = await this.prisma.bitcoinPrice.findFirst({
      orderBy: { timestamp: 'desc' }
    })
    return lastRecord?.date || '2013-10-01'
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
    await this.initialize()

    const totalRecords = await this.prisma.bitcoinPrice.count()

    const firstRecord = await this.prisma.bitcoinPrice.findFirst({
      orderBy: { timestamp: 'asc' }
    })

    const lastRecord = await this.prisma.bitcoinPrice.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    const lastUpdate = await this.prisma.dataUpdate.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    const sources = await this.prisma.bitcoinPrice.findMany({
      select: { source: true },
      distinct: ['source']
    })

    return {
      totalRecords,
      dateRange: {
        start: firstRecord?.date || 'N/A',
        end: lastRecord?.date || 'N/A'
      },
      lastUpdate: lastUpdate?.createdAt.toISOString() || 'Never',
      sources: sources.map(s => s.source)
    }
  }

  /**
   * Cleanup database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export singleton instance
export const sqlDatabaseManager = new SqlDatabaseManager()
