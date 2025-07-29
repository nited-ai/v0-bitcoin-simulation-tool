/**
 * API Route: Historical Bitcoin Price Data
 * GET /api/bitcoin-prices/historical
 * 
 * Query Parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to earliest available)
 * - endDate: YYYY-MM-DD (optional, defaults to latest available)
 * - limit: number (optional, defaults to all records)
 * - format: 'json' | 'csv' (optional, defaults to json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const format = searchParams.get('format') || 'json'

    console.log(`📊 Historical data request: ${startDate || 'earliest'} to ${endDate || 'latest'}, limit: ${limit || 'all'}`)

    // Build query conditions
    const whereConditions: any = {}
    
    if (startDate || endDate) {
      whereConditions.date = {}
      if (startDate) whereConditions.date.gte = startDate
      if (endDate) whereConditions.date.lte = endDate
    }

    // Execute query
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

    const records = await prisma.bitcoinPrice.findMany(queryOptions)

    // Convert BigInt timestamps to numbers for JSON serialization
    const processedRecords = records.map(record => ({
      ...record,
      timestamp: Number(record.timestamp)
    }))

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
          limit: limit ? parseInt(limit) : null
        }
      }
    })

  } catch (error) {
    console.error('❌ Historical data API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch historical data',
      details: error instanceof Error ? error.message : String(error)
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
