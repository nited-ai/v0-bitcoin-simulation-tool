/**
 * Comprehensive Gap Analysis System
 * Identifies all missing Bitcoin price data between specified date ranges
 */

import { getPrismaClient } from '../database/connection-manager'

export interface GapRange {
  startDate: string
  endDate: string
  dayCount: number
  priority: number // 1 = highest (most recent), 5 = lowest (oldest)
}

export interface GapAnalysisResult {
  totalGaps: number
  totalMissingDays: number
  gapRanges: GapRange[]
  analysisDate: string
  targetStartDate: string
  targetEndDate: string
  coveragePercentage: number
}

export class ComprehensiveGapAnalyzer {
  private get prisma() {
    return getPrismaClient()
  }

  constructor() {
    // No longer creating individual Prisma client instances
  }

  /**
   * Perform comprehensive gap analysis for specified date range
   */
  async analyzeGaps(
    startDate: string = '2021-01-05',
    endDate: string = '2025-07-14'
  ): Promise<GapAnalysisResult> {
    console.log(`🔍 Starting comprehensive gap analysis from ${startDate} to ${endDate}`)

    try {
      // Get all existing dates in the target range
      const existingRecords = await this.prisma.bitcoinPrice.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          date: true
        },
        orderBy: {
          date: 'asc'
        }
      })

      console.log(`📊 Found ${existingRecords.length} existing records in target range`)

      // Generate complete date range
      const allDates = this.generateDateRange(startDate, endDate)
      console.log(`📅 Target range contains ${allDates.length} total days`)

      // Find missing dates
      const existingDatesSet = new Set(existingRecords.map(r => r.date))
      const missingDates = allDates.filter(date => !existingDatesSet.has(date))

      console.log(`❌ Found ${missingDates.length} missing dates`)

      // Group consecutive missing dates into ranges
      const gapRanges = this.groupConsecutiveDates(missingDates)

      // Calculate priority for each gap range (recent dates = higher priority)
      const prioritizedGaps = this.assignPriorities(gapRanges, endDate)

      // Calculate coverage percentage
      const coveragePercentage = ((allDates.length - missingDates.length) / allDates.length) * 100

      const result: GapAnalysisResult = {
        totalGaps: gapRanges.length,
        totalMissingDays: missingDates.length,
        gapRanges: prioritizedGaps,
        analysisDate: new Date().toISOString().split('T')[0],
        targetStartDate: startDate,
        targetEndDate: endDate,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100
      }

      console.log(`✅ Gap analysis complete:`)
      console.log(`   - Total gap ranges: ${result.totalGaps}`)
      console.log(`   - Total missing days: ${result.totalMissingDays}`)
      console.log(`   - Coverage: ${result.coveragePercentage}%`)

      return result

    } catch (error) {
      console.error('❌ Gap analysis failed:', error)
      throw error
    }
  }

  /**
   * Generate array of all dates between start and end (inclusive)
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  /**
   * Group consecutive missing dates into ranges
   */
  private groupConsecutiveDates(missingDates: string[]): GapRange[] {
    if (missingDates.length === 0) return []

    const ranges: GapRange[] = []
    let currentStart = missingDates[0]
    let currentEnd = missingDates[0]

    for (let i = 1; i < missingDates.length; i++) {
      const currentDate = new Date(missingDates[i])
      const previousDate = new Date(missingDates[i - 1])
      
      // Check if dates are consecutive (1 day apart)
      const dayDifference = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (dayDifference === 1) {
        // Consecutive date, extend current range
        currentEnd = missingDates[i]
      } else {
        // Non-consecutive date, close current range and start new one
        ranges.push({
          startDate: currentStart,
          endDate: currentEnd,
          dayCount: this.calculateDaysBetween(currentStart, currentEnd) + 1,
          priority: 0 // Will be assigned later
        })
        
        currentStart = missingDates[i]
        currentEnd = missingDates[i]
      }
    }

    // Add the final range
    ranges.push({
      startDate: currentStart,
      endDate: currentEnd,
      dayCount: this.calculateDaysBetween(currentStart, currentEnd) + 1,
      priority: 0 // Will be assigned later
    })

    return ranges
  }

  /**
   * Assign priorities to gap ranges (recent dates = higher priority)
   */
  private assignPriorities(gapRanges: GapRange[], referenceEndDate: string): GapRange[] {
    const referenceDate = new Date(referenceEndDate)

    return gapRanges.map(range => {
      const rangeEndDate = new Date(range.endDate)
      const daysSinceEnd = (referenceDate.getTime() - rangeEndDate.getTime()) / (1000 * 60 * 60 * 24)

      // Assign priority based on recency
      let priority: number
      if (daysSinceEnd <= 30) priority = 1      // Last 30 days = highest priority
      else if (daysSinceEnd <= 90) priority = 2  // Last 90 days = high priority
      else if (daysSinceEnd <= 365) priority = 3 // Last year = medium priority
      else if (daysSinceEnd <= 730) priority = 4 // Last 2 years = low priority
      else priority = 5                          // Older = lowest priority

      return {
        ...range,
        priority
      }
    }).sort((a, b) => {
      // Sort by priority first, then by end date (most recent first)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    })
  }

  /**
   * Calculate number of days between two dates
   */
  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Get detailed gap information for logging
   */
  async getGapSummary(analysis: GapAnalysisResult): Promise<string> {
    const summary = [
      `📊 COMPREHENSIVE GAP ANALYSIS SUMMARY`,
      `${'='.repeat(50)}`,
      `Target Range: ${analysis.targetStartDate} to ${analysis.targetEndDate}`,
      `Analysis Date: ${analysis.analysisDate}`,
      ``,
      `📈 COVERAGE STATISTICS:`,
      `- Total Missing Days: ${analysis.totalMissingDays.toLocaleString()}`,
      `- Total Gap Ranges: ${analysis.totalGaps}`,
      `- Coverage Percentage: ${analysis.coveragePercentage}%`,
      ``,
      `🎯 GAP RANGES BY PRIORITY:`
    ]

    analysis.gapRanges.forEach((gap, index) => {
      const priorityLabel = ['', 'HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'][gap.priority]
      summary.push(
        `${index + 1}. ${gap.startDate} to ${gap.endDate} (${gap.dayCount} days) - Priority: ${priorityLabel}`
      )
    })

    return summary.join('\n')
  }

  /**
   * Close database connection (no-op with shared connection)
   */
  async disconnect(): Promise<void> {
    // Connection is managed by connection manager
  }
}

// Export singleton instance
export const comprehensiveGapAnalyzer = new ComprehensiveGapAnalyzer()
