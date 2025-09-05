/**
 * API Route: Database Statistics
 * GET /api/bitcoin-prices/stats
 * 
 * Returns comprehensive statistics about the Bitcoin price database
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { enhancedBitcoinApiService } from '@/lib/services/bitcoin-api-service'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Database stats request')

    // Get basic counts
    const [
      totalRecords,
      totalUpdates,
      firstRecord,
      lastRecord,
      sourceCounts
    ] = await Promise.all([
      prisma.bitcoinPrice.count(),
      prisma.dataUpdate.count(),
      prisma.bitcoinPrice.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true, close: true }
      }),
      prisma.bitcoinPrice.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true, close: true }
      }),
      prisma.bitcoinPrice.groupBy({
        by: ['source'],
        _count: { source: true }
      })
    ])

    // Calculate date range and coverage
    let dateRange = null
    let daysCovered = 0
    let totalPossibleDays = 0
    let coveragePercentage = 0

    if (firstRecord && lastRecord) {
      const startDate = new Date(firstRecord.date)
      const endDate = new Date(lastRecord.date)
      const today = new Date()
      
      daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      totalPossibleDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      coveragePercentage = (totalRecords / totalPossibleDays) * 100

      dateRange = {
        start: firstRecord.date,
        end: lastRecord.date,
        daysCovered,
        totalPossibleDays,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100
      }
    }

    // Get recent update activity
    const recentUpdates = await prisma.dataUpdate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        updateDate: true,
        recordsAdded: true,
        recordsUpdated: true,
        source: true,
        status: true,
        createdAt: true
      }
    })

    // Calculate price statistics
    const priceStats = await prisma.bitcoinPrice.aggregate({
      _min: { close: true },
      _max: { close: true },
      _avg: { close: true }
    })

    // Get gap detection info
    let gapInfo = null
    try {
      const gaps = await enhancedBitcoinApiService.detectDataGaps()
      gapInfo = {
        totalGaps: gaps.totalGaps,
        oldestGap: gaps.oldestGap,
        newestGap: gaps.newestGap,
        recentGaps: gaps.gaps.slice(-10) // Last 10 gaps
      }
    } catch (gapError) {
      console.warn('⚠️ Gap detection failed:', gapError)
      gapInfo = { error: 'Gap detection unavailable' }
    }

    // Format source distribution
    const sourceDistribution = sourceCounts.map(item => ({
      source: item.source,
      count: item._count.source,
      percentage: Math.round((item._count.source / totalRecords) * 10000) / 100
    }))

    const stats = {
      database: {
        totalRecords,
        totalUpdates,
        dateRange,
        sourceDistribution
      },
      prices: {
        lowest: priceStats._min.close,
        highest: priceStats._max.close,
        average: Math.round((priceStats._avg.close || 0) * 100) / 100,
        current: lastRecord?.close
      },
      dataQuality: {
        gaps: gapInfo,
        lastUpdate: recentUpdates[0]?.createdAt,
        updateHistory: recentUpdates
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        databaseEngine: 'SQLite', // Will be PostgreSQL in production
        version: '1.0.0'
      }
    }

    console.log(`✅ Generated database stats: ${totalRecords} records, ${gapInfo?.totalGaps || 'unknown'} gaps`)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Database stats API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate database statistics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Handle CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
