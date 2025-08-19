/**
 * API Route: Historical Bitcoin Price Data
 * GET /api/bitcoin-prices/historical
 *
 * Query Parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to earliest available)
 * - endDate: YYYY-MM-DD (optional, defaults to latest available)
 * - limit: number (optional, defaults to all records)
 * - format: 'json' | 'csv' (optional, defaults to json)
 * - interval: 'daily' | 'weekly' | 'monthly' (optional, defaults to daily)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../../../lib/database/connection-manager'

// Use the connection manager for better error handling
const prisma = getPrismaClient()

export async function GET(request: NextRequest) {
  // Extract query parameters outside try block for error handling access
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = searchParams.get('limit')
  const format = searchParams.get('format') || 'json'
  const interval = searchParams.get('interval') || 'daily'

  try {
    // Test Prisma Client connection first
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (prismaError) {
      console.error('❌ Prisma Client initialization error:', prismaError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: 'Prisma Client not properly initialized. Please ensure prisma generate has been run.',
        prismaError: prismaError instanceof Error ? prismaError.message : String(prismaError)
      }, { status: 500 })
    }

    console.log(`📊 Historical data request: ${startDate || 'earliest'} to ${endDate || 'latest'}, limit: ${limit || 'all'}, interval: ${interval}`)

    // Build query conditions
    const whereConditions: any = {}
    
    if (startDate || endDate) {
      whereConditions.date = {}
      if (startDate) whereConditions.date.gte = startDate
      if (endDate) whereConditions.date.lte = endDate
    }

    // Execute query with interval support
    let records: any[]

    if (interval === 'weekly' || interval === 'monthly') {
      // For weekly/monthly data, use raw SQL to get one record per period
      const truncFunction = interval === 'weekly' ? 'week' : 'month'
      let intervalQuery = `
        SELECT
          date,
          timestamp,
          open,
          high,
          low,
          close,
          volume,
          source,
          ROW_NUMBER() OVER (
            PARTITION BY DATE_TRUNC('${truncFunction}', date::date)
            ORDER BY date ASC
          ) as period_rank
        FROM bitcoin_prices
      `

      // Add WHERE conditions if needed
      const conditions = []
      if (startDate) conditions.push(`date >= '${startDate}'`)
      if (endDate) conditions.push(`date <= '${endDate}'`)

      if (conditions.length > 0) {
        intervalQuery += ` WHERE ${conditions.join(' AND ')}`
      }

      intervalQuery += ` ORDER BY date ASC`

      console.log(`📊 Executing ${interval} query:`, intervalQuery)

      try {
        const allRecords = await prisma.$queryRawUnsafe(intervalQuery)
        console.log(`📊 Raw query returned ${(allRecords as any[]).length} records`)

        // Filter to get only the first record of each period (handle BigInt type)
        records = (allRecords as any[]).filter(record => {
          const periodRank = Number(record.period_rank)
          return periodRank === 1
        })
        console.log(`📊 Filtered to ${records.length} ${interval} records`)

        if (limit) {
          records = records.slice(0, parseInt(limit))
          console.log(`📊 Limited to ${records.length} records`)
        }
      } catch (sqlError) {
        console.error(`❌ ${interval} SQL query failed:`, sqlError)
        throw new Error(`${interval} data query failed: ${sqlError instanceof Error ? sqlError.message : String(sqlError)}`)
      }
    } else {
      // Daily data (default)
      const queryOptions: any = {
        where: whereConditions,
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
      }

      if (limit) {
        queryOptions.take = parseInt(limit)
      }

      records = await prisma.bitcoinPrice.findMany(queryOptions)
    }

    // Convert BigInt timestamps to numbers for JSON serialization and clean up interval query fields
    const processedRecords = records.map(record => {
      const { period_rank, week_rank, ...cleanRecord } = record // Remove ranking fields if they exist
      return {
        ...cleanRecord,
        timestamp: Number(cleanRecord.timestamp)
      }
    })

    console.log(`✅ Retrieved ${processedRecords.length} historical records`)

    // Handle different response formats
    if (format === 'csv') {
      // Generate CSV response
      const csvHeader = 'Date,Timestamp,Open,High,Low,Close,Volume,Source\n'
      const csvRows = processedRecords.map(record => 
        `${record.date},${record.timestamp},${record.open},${record.high},${record.low},${record.close},${record.volume || ''},${record.source}`
      ).join('\n')
      
      const csvContent = csvHeader + csvRows

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="bitcoin-prices-${startDate || 'all'}-to-${endDate || 'latest'}.csv"`
        }
      })
    }

    // JSON response (default)
    return NextResponse.json({
      success: true,
      data: processedRecords,
      metadata: {
        count: processedRecords.length,
        startDate: processedRecords[0]?.date,
        endDate: processedRecords[processedRecords.length - 1]?.date,
        query: {
          startDate,
          endDate,
          limit: limit ? parseInt(limit) : null,
          interval
        }
      }
    })

  } catch (error) {
    console.error('❌ Historical data API error:', error)

    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error stack:', error.stack)
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch historical data',
      details: error instanceof Error ? error.message : String(error),
      interval: interval,
      query: {
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : null
      }
    }, { status: 500 })
  }
}

// Handle CORS for client-side requests
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
