/**
 * API Route: Current Bitcoin Price
 * GET /api/bitcoin-prices/current
 * 
 * Returns the most recent Bitcoin price from database and optionally fetches live price
 * 
 * Query Parameters:
 * - live: boolean (optional, fetches live price from external APIs)
 * - source: string (optional, preferred API source)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { enhancedBitcoinApiService } from '@/lib/services/bitcoin-api-service'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fetchLive = searchParams.get('live') === 'true'
    const preferredSource = searchParams.get('source')

    console.log(`💰 Current price request: live=${fetchLive}, source=${preferredSource || 'any'}`)

    // Get latest price from database
    const latestDbRecord = await prisma.bitcoinPrice.findFirst({
      orderBy: { date: 'desc' },
      select: {
        date: true,
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
        source: true,
        createdAt: true
      }
    })

    if (!latestDbRecord) {
      return NextResponse.json({
        success: false,
        error: 'No price data available in database'
      }, { status: 404 })
    }

    const dbPrice = {
      ...latestDbRecord,
      timestamp: Number(latestDbRecord.timestamp)
    }

    // If live price is not requested, return database price
    if (!fetchLive) {
      console.log(`✅ Returning database price: $${dbPrice.close} (${dbPrice.date})`)
      
      return NextResponse.json({
        success: true,
        data: {
          current: dbPrice,
          isLive: false,
          lastUpdated: dbPrice.createdAt
        }
      })
    }

    // Fetch live price from external APIs
    try {
      console.log('📡 Fetching live Bitcoin price...')
      const liveResponse = await enhancedBitcoinApiService.fetchCurrentPrice()
      
      if (liveResponse.success && liveResponse.data.length > 0) {
        const livePrice = liveResponse.data[0]
        
        console.log(`✅ Live price: $${livePrice.close} from ${liveResponse.source}`)
        
        // Calculate price change
        const priceChange = livePrice.close - dbPrice.close
        const priceChangePercent = ((priceChange / dbPrice.close) * 100)
        
        return NextResponse.json({
          success: true,
          data: {
            current: livePrice,
            database: dbPrice,
            isLive: true,
            source: liveResponse.source,
            priceChange: {
              absolute: priceChange,
              percentage: priceChangePercent
            },
            lastUpdated: new Date().toISOString()
          }
        })
      } else {
        // Fallback to database price if live fetch fails
        console.log('⚠️ Live price fetch failed, returning database price')
        
        return NextResponse.json({
          success: true,
          data: {
            current: dbPrice,
            isLive: false,
            lastUpdated: dbPrice.createdAt,
            warning: 'Live price unavailable, showing database price'
          }
        })
      }
    } catch (liveError) {
      console.error('❌ Live price fetch error:', liveError)
      
      // Return database price with error info
      return NextResponse.json({
        success: true,
        data: {
          current: dbPrice,
          isLive: false,
          lastUpdated: dbPrice.createdAt,
          error: 'Failed to fetch live price'
        }
      })
    }

  } catch (error) {
    console.error('❌ Current price API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch current price',
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
