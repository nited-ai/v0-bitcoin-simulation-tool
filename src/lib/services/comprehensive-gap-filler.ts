/**
 * Comprehensive Gap Filling Orchestrator
 * Coordinates gap analysis, data retrieval, validation, and database operations
 */

import { getPrismaClient } from '../database/connection-manager'
import { comprehensiveGapAnalyzer, GapAnalysisResult, GapRange } from './comprehensive-gap-analyzer'
import { multiApiBitcoinService, BitcoinPriceData } from './multi-api-bitcoin-service'

export interface GapFillingProgress {
  totalGaps: number
  processedGaps: number
  totalMissingDays: number
  filledDays: number
  currentGapRange?: GapRange
  percentageComplete: number
  startTime: number
  estimatedTimeRemaining?: number
  apiSuccessRates: Record<string, { attempts: number; successes: number }>
  errors: string[]
}

export interface GapFillingResult {
  success: boolean
  totalGapsFilled: number
  totalDaysFilled: number
  finalCoveragePercentage: number
  duration: number
  apiUsageStats: Record<string, number>
  errors: string[]
  resumePoint?: string
}

export class ComprehensiveGapFiller {
  private get prisma() {
    return getPrismaClient()
  }
  private progress: GapFillingProgress
  private isRunning = false

  constructor() {
    this.progress = this.initializeProgress()
  }

  /**
   * Initialize progress tracking
   */
  private initializeProgress(): GapFillingProgress {
    return {
      totalGaps: 0,
      processedGaps: 0,
      totalMissingDays: 0,
      filledDays: 0,
      percentageComplete: 0,
      startTime: Date.now(),
      apiSuccessRates: {},
      errors: []
    }
  }

  /**
   * Start comprehensive gap filling process
   */
  async fillAllGaps(
    startDate: string = '2021-01-05',
    endDate: string = '2025-07-14',
    batchSize: number = 100,
    resumeFromGap?: number
  ): Promise<GapFillingResult> {
    if (this.isRunning) {
      throw new Error('Gap filling process is already running')
    }

    this.isRunning = true
    this.progress = this.initializeProgress()
    this.progress.startTime = Date.now()

    console.log(`🚀 Starting comprehensive gap filling from ${startDate} to ${endDate}`)
    console.log(`📦 Batch size: ${batchSize} records per operation`)

    try {
      // Step 1: Comprehensive Gap Analysis
      console.log('\n📊 STEP 1: Comprehensive Gap Analysis')
      const gapAnalysis = await comprehensiveGapAnalyzer.analyzeGaps(startDate, endDate)
      
      this.progress.totalGaps = gapAnalysis.totalGaps
      this.progress.totalMissingDays = gapAnalysis.totalMissingDays

      console.log(await comprehensiveGapAnalyzer.getGapSummary(gapAnalysis))

      if (gapAnalysis.totalGaps === 0) {
        console.log('🎉 No gaps found! Database is already complete.')
        return this.createSuccessResult(0, 0, gapAnalysis.coveragePercentage)
      }

      // Step 2: Process Each Gap Range
      console.log('\n🔧 STEP 2: Processing Gap Ranges')
      
      const startFromGap = resumeFromGap || 0
      const gapsToProcess = gapAnalysis.gapRanges.slice(startFromGap)

      for (let i = 0; i < gapsToProcess.length; i++) {
        const gapIndex = startFromGap + i
        const gap = gapsToProcess[i]
        
        this.progress.currentGapRange = gap
        this.progress.processedGaps = gapIndex

        console.log(`\n📍 Processing Gap ${gapIndex + 1}/${gapAnalysis.totalGaps}:`)
        console.log(`   Range: ${gap.startDate} to ${gap.endDate} (${gap.dayCount} days)`)
        console.log(`   Priority: ${gap.priority}`)

        try {
          // Fetch data for this gap range
          const apiResponse = await multiApiBitcoinService.fetchPriceData(gap.startDate, gap.endDate)

          if (!apiResponse.success || apiResponse.data.length === 0) {
            const error = `Failed to fetch data for gap ${gap.startDate} to ${gap.endDate}: ${apiResponse.error}`
            console.error(`❌ ${error}`)
            this.progress.errors.push(error)
            
            // Track API failure
            this.updateApiStats(apiResponse.source, false)
            continue
          }

          // Track API success
          this.updateApiStats(apiResponse.source, true)

          console.log(`✅ Retrieved ${apiResponse.data.length} records from ${apiResponse.source}`)

          // Step 3: Validate and Process Data
          const validatedData = this.validatePriceData(apiResponse.data)
          console.log(`✅ Validated ${validatedData.length} records`)

          // Step 4: Batch Insert to Database
          const insertedCount = await this.batchInsertData(validatedData, batchSize)
          console.log(`✅ Inserted ${insertedCount} records to database`)

          this.progress.filledDays += insertedCount

          // Update progress
          this.updateProgress()

          // Log progress
          console.log(`📊 Progress: ${this.progress.percentageComplete.toFixed(2)}% complete`)
          console.log(`⏱️ Estimated time remaining: ${this.getEstimatedTimeRemaining()}`)

          // Small delay to avoid overwhelming APIs
          await this.delay(1000)

        } catch (error) {
          const errorMsg = `Error processing gap ${gap.startDate} to ${gap.endDate}: ${error}`
          console.error(`❌ ${errorMsg}`)
          this.progress.errors.push(errorMsg)
        }
      }

      // Step 5: Final Verification
      console.log('\n✅ STEP 3: Final Verification')
      const finalAnalysis = await comprehensiveGapAnalyzer.analyzeGaps(startDate, endDate)
      
      console.log(`🎉 Gap filling completed!`)
      console.log(`   - Gaps filled: ${this.progress.totalGaps - finalAnalysis.totalGaps}`)
      console.log(`   - Days filled: ${this.progress.filledDays}`)
      console.log(`   - Final coverage: ${finalAnalysis.coveragePercentage}%`)

      return this.createSuccessResult(
        this.progress.totalGaps - finalAnalysis.totalGaps,
        this.progress.filledDays,
        finalAnalysis.coveragePercentage
      )

    } catch (error) {
      console.error('❌ Gap filling process failed:', error)
      return {
        success: false,
        totalGapsFilled: 0,
        totalDaysFilled: this.progress.filledDays,
        finalCoveragePercentage: 0,
        duration: Date.now() - this.progress.startTime,
        apiUsageStats: this.getApiUsageStats(),
        errors: [...this.progress.errors, error instanceof Error ? error.message : String(error)],
        resumePoint: this.progress.currentGapRange?.startDate
      }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Validate price data for reasonableness
   */
  private validatePriceData(data: BitcoinPriceData[]): BitcoinPriceData[] {
    return data.filter(record => {
      // Basic validation checks
      if (!record.date || !record.close || record.close <= 0) {
        console.warn(`⚠️ Invalid record: missing or invalid price data for ${record.date}`)
        return false
      }

      // Reasonable price range check (Bitcoin has never been below $1 or above $100,000 as of 2025)
      if (record.close < 1 || record.close > 200000) {
        console.warn(`⚠️ Suspicious price: ${record.close} for ${record.date}`)
        return false
      }

      // OHLC consistency check
      if (record.high < record.low || record.close > record.high || record.close < record.low) {
        console.warn(`⚠️ OHLC inconsistency for ${record.date}`)
        return false
      }

      return true
    })
  }

  /**
   * Batch insert data to database
   */
  private async batchInsertData(data: BitcoinPriceData[], batchSize: number): Promise<number> {
    let insertedCount = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      
      try {
        // Check for existing records to avoid duplicates
        const existingDates = await this.prisma.bitcoinPrice.findMany({
          where: {
            date: {
              in: batch.map(record => record.date)
            }
          },
          select: { date: true }
        })

        const existingDatesSet = new Set(existingDates.map(r => r.date))
        const newRecords = batch.filter(record => !existingDatesSet.has(record.date))

        if (newRecords.length > 0) {
          await this.prisma.bitcoinPrice.createMany({
            data: newRecords.map(record => ({
              date: record.date,
              timestamp: BigInt(record.timestamp),
              open: record.open,
              high: record.high,
              low: record.low,
              close: record.close,
              volume: record.volume,
              source: record.source
            })),
            skipDuplicates: true
          })

          insertedCount += newRecords.length
        }

        // Log batch progress
        if (batch.length > 10) {
          console.log(`   📦 Batch ${Math.floor(i / batchSize) + 1}: ${newRecords.length} new records inserted`)
        }

      } catch (error) {
        console.error(`❌ Batch insert error:`, error)
        throw error
      }
    }

    // Log the operation
    await this.logDataUpdate(insertedCount, data[0]?.source || 'unknown')

    return insertedCount
  }

  /**
   * Log data update operation
   */
  private async logDataUpdate(recordsAdded: number, source: string): Promise<void> {
    try {
      await this.prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded,
          recordsUpdated: 0,
          source: `COMPREHENSIVE_GAP_FILL_${source.toUpperCase()}`,
          status: 'success'
        }
      })
    } catch (error) {
      console.error('❌ Failed to log data update:', error)
    }
  }

  /**
   * Update API success/failure statistics
   */
  private updateApiStats(source: string, success: boolean): void {
    if (!this.progress.apiSuccessRates[source]) {
      this.progress.apiSuccessRates[source] = { attempts: 0, successes: 0 }
    }

    this.progress.apiSuccessRates[source].attempts++
    if (success) {
      this.progress.apiSuccessRates[source].successes++
    }
  }

  /**
   * Update progress calculations
   */
  private updateProgress(): void {
    this.progress.percentageComplete = (this.progress.filledDays / this.progress.totalMissingDays) * 100
  }

  /**
   * Get estimated time remaining
   */
  private getEstimatedTimeRemaining(): string {
    const elapsed = Date.now() - this.progress.startTime
    const rate = this.progress.filledDays / elapsed // days per ms
    const remaining = this.progress.totalMissingDays - this.progress.filledDays
    
    if (rate > 0) {
      const estimatedMs = remaining / rate
      const hours = Math.floor(estimatedMs / (1000 * 60 * 60))
      const minutes = Math.floor((estimatedMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    }

    return 'calculating...'
  }

  /**
   * Create success result
   */
  private createSuccessResult(gapsFilled: number, daysFilled: number, coverage: number): GapFillingResult {
    return {
      success: true,
      totalGapsFilled: gapsFilled,
      totalDaysFilled: daysFilled,
      finalCoveragePercentage: coverage,
      duration: Date.now() - this.progress.startTime,
      apiUsageStats: this.getApiUsageStats(),
      errors: this.progress.errors
    }
  }

  /**
   * Get API usage statistics
   */
  private getApiUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [source, data] of Object.entries(this.progress.apiSuccessRates)) {
      stats[source] = data.successes
    }
    return stats
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current progress
   */
  getProgress(): GapFillingProgress {
    return { ...this.progress }
  }

  /**
   * Check if process is running
   */
  isProcessRunning(): boolean {
    return this.isRunning
  }

  /**
   * Close database connection (no-op with shared connection)
   */
  async disconnect(): Promise<void> {
    // Connection is managed by connection manager
  }
}

// Export singleton instance
export const comprehensiveGapFiller = new ComprehensiveGapFiller()
