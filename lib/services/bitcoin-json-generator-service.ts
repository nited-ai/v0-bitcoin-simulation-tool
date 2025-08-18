/**
 * Bitcoin JSON Generator Service
 * 
 * Service for automatically regenerating Bitcoin price JSON files
 * when database updates occur. Integrates with the daily update service
 * to keep JSON files synchronized with the latest database data.
 */

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '../generated/prisma'

export interface BitcoinPriceRecord {
  date: string
  timestamp: number
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

export interface JsonGenerationResult {
  success: boolean
  filesGenerated: string[]
  recordsProcessed: number
  dateRange: {
    startDate: string
    endDate: string
  }
  duration: number
  error?: string
}

export class BitcoinJsonGeneratorService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }

  /**
   * Generate all JSON files from current database data
   */
  async generateJsonFiles(): Promise<JsonGenerationResult> {
    const startTime = Date.now()
    const result: JsonGenerationResult = {
      success: false,
      filesGenerated: [],
      recordsProcessed: 0,
      dateRange: { startDate: '', endDate: '' },
      duration: 0
    }

    try {
      console.log('🔄 Starting automatic JSON file generation...')

      // Step 1: Fetch all data from database
      const databaseRecords = await this.fetchDatabaseData()
      
      if (databaseRecords.length === 0) {
        throw new Error('No data found in database')
      }

      result.recordsProcessed = databaseRecords.length
      result.dateRange = {
        startDate: databaseRecords[0].date,
        endDate: databaseRecords[databaseRecords.length - 1].date
      }

      console.log(`📊 Processing ${databaseRecords.length} records from ${result.dateRange.startDate} to ${result.dateRange.endDate}`)

      // Step 2: Convert to optimized formats
      const dailyData = this.convertToOptimizedFormat(databaseRecords, 'daily')
      const weeklyData = this.generateWeeklyData(dailyData)
      const monthlyData = this.generateMonthlyData(dailyData)

      // Step 3: Validate data integrity
      this.validateDataIntegrity(dailyData)
      this.validateDataIntegrity(weeklyData)
      this.validateDataIntegrity(monthlyData)

      // Step 4: Write JSON files
      const files = [
        { name: 'daily.json', data: dailyData },
        { name: 'weekly.json', data: weeklyData },
        { name: 'monthly.json', data: monthlyData }
      ]

      await this.writeJsonFiles(files)
      result.filesGenerated = files.map(f => f.name)

      result.success = true
      result.duration = Date.now() - startTime

      console.log(`✅ JSON generation completed successfully in ${result.duration}ms`)
      console.log(`📁 Generated files: ${result.filesGenerated.join(', ')}`)

      return result

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
      result.duration = Date.now() - startTime
      
      console.error('❌ JSON generation failed:', result.error)
      return result

    } finally {
      await this.prisma.$disconnect()
    }
  }

  /**
   * Fetch all Bitcoin price data from database
   */
  private async fetchDatabaseData(): Promise<BitcoinPriceRecord[]> {
    try {
      const dbRecords = await this.prisma.bitcoinPrice.findMany({
        orderBy: { date: 'asc' },
        select: {
          date: true,
          timestamp: true,
          open: true,
          high: true,
          low: true,
          close: true,
          volume: true,
          source: true
        }
      })

      // Convert to BitcoinPriceRecord format
      return dbRecords.map(record => ({
        date: record.date,
        timestamp: Number(record.timestamp),
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume || 0,
        source: record.source
      }))

    } catch (error) {
      throw new Error(`Failed to fetch data from database: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Convert records to optimized format
   */
  private convertToOptimizedFormat(records: BitcoinPriceRecord[], interval: 'daily' | 'weekly' | 'monthly'): OptimizedBitcoinData {
    if (records.length === 0) {
      return {
        meta: {
          startDate: '',
          endDate: '',
          interval,
          count: 0,
          lastUpdated: new Date().toISOString()
        },
        data: []
      }
    }

    const data: [number, number][] = records.map(record => [
      record.timestamp,
      record.close
    ])

    return {
      meta: {
        startDate: records[0].date,
        endDate: records[records.length - 1].date,
        interval,
        count: records.length,
        lastUpdated: new Date().toISOString()
      },
      data
    }
  }

  /**
   * Generate weekly data (every 7th record)
   */
  private generateWeeklyData(dailyData: OptimizedBitcoinData): OptimizedBitcoinData {
    const weeklyPoints = dailyData.data.filter((_, index) => index % 7 === 0)
    
    return {
      meta: {
        ...dailyData.meta,
        interval: 'weekly',
        count: weeklyPoints.length
      },
      data: weeklyPoints
    }
  }

  /**
   * Generate monthly data (every 30th record)
   */
  private generateMonthlyData(dailyData: OptimizedBitcoinData): OptimizedBitcoinData {
    const monthlyPoints = dailyData.data.filter((_, index) => index % 30 === 0)
    
    return {
      meta: {
        ...dailyData.meta,
        interval: 'monthly',
        count: monthlyPoints.length
      },
      data: monthlyPoints
    }
  }

  /**
   * Validate data integrity
   */
  private validateDataIntegrity(data: OptimizedBitcoinData): void {
    if (data.meta.count !== data.data.length) {
      throw new Error(`Data integrity error: count mismatch (${data.meta.count} vs ${data.data.length})`)
    }

    if (data.data.length > 0) {
      // Check for valid timestamps and prices
      for (const [timestamp, price] of data.data) {
        if (!Number.isFinite(timestamp) || !Number.isFinite(price) || price <= 0) {
          throw new Error(`Invalid data point: [${timestamp}, ${price}]`)
        }
      }
    }
  }

  /**
   * Write JSON files to disk
   */
  private async writeJsonFiles(files: Array<{ name: string; data: OptimizedBitcoinData }>): Promise<void> {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log('📁 Created output directory:', outputDir)
    }

    // Write each file
    for (const file of files) {
      const filePath = path.join(outputDir, file.name)
      const jsonContent = JSON.stringify(file.data, null, 2)
      
      fs.writeFileSync(filePath, jsonContent)
      
      const sizeKB = Math.round(jsonContent.length / 1024)
      console.log(`✅ Generated ${file.name}: ${file.data.data.length} points, ${sizeKB}KB`)
    }
  }
}

// Export singleton instance
export const bitcoinJsonGeneratorService = new BitcoinJsonGeneratorService()
