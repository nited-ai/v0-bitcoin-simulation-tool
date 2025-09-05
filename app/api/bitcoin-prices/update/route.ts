/**
 * API Route: Automated Bitcoin Price Updates
 * POST /api/bitcoin-prices/update
 * 
 * Triggers automated update process to fill data gaps and fetch latest prices
 * 
 * Body Parameters:
 * - maxGaps: number (optional, max gaps to fill, defaults to 50)
 * - forceUpdate: boolean (optional, force update even if recent data exists)
 * - targetDate: string (optional, update up to specific date)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { enhancedBitcoinApiService } from '@/lib/services/bitcoin-api-service'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { maxGaps = 50, forceUpdate = false, targetDate } = body

    console.log(`🔄 Automated update request: maxGaps=${maxGaps}, force=${forceUpdate}, target=${targetDate || 'latest'}`)

    const updateResults = {
      gapsFilled: 0,
      currentPriceUpdated: false,
      errors: [] as string[],
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0
    }

    const startTime = Date.now()

    try {
      // Step 1: Check if update is needed
      if (!forceUpdate) {
        const latestRecord = await prisma.bitcoinPrice.findFirst({
          orderBy: { date: 'desc' }
        })

        if (latestRecord) {
          const latestDate = new Date(latestRecord.date)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          if (latestDate >= yesterday) {
            console.log('✅ Data is up to date, skipping update')
            
            updateResults.endTime = new Date().toISOString()
            updateResults.duration = Date.now() - startTime

            return NextResponse.json({
              success: true,
              message: 'Data is already up to date',
              data: updateResults
            })
          }
        }
      }

      // Step 2: Fill data gaps
      console.log('🔧 Starting gap filling process...')
      const gapFillResult = await enhancedBitcoinApiService.fillDataGaps(maxGaps)
      
      updateResults.gapsFilled = gapFillResult.gapsFilled
      updateResults.errors.push(...gapFillResult.errors)

      console.log(`✅ Gap filling completed: ${gapFillResult.gapsFilled} gaps filled`)

      // Step 3: Update current price
      console.log('💰 Updating current price...')
      try {
        const currentPriceResponse = await enhancedBitcoinApiService.fetchCurrentPrice()
        
        if (currentPriceResponse.success && currentPriceResponse.data.length > 0) {
          const currentPrice = currentPriceResponse.data[0]
          const today = new Date().toISOString().split('T')[0]
          
          // Check if today's price already exists
          const existingToday = await prisma.bitcoinPrice.findUnique({
            where: { date: today }
          })

          if (!existingToday) {
            await prisma.bitcoinPrice.create({
              data: {
                date: today,
                timestamp: currentPrice.timestamp,
                open: currentPrice.close, // Use current price as open for today
                high: currentPrice.close,
                low: currentPrice.close,
                close: currentPrice.close,
                volume: currentPrice.volume,
                source: currentPriceResponse.source
              }
            })
            
            updateResults.currentPriceUpdated = true
            console.log(`✅ Current price updated: $${currentPrice.close}`)
          } else {
            console.log('ℹ️ Today\'s price already exists in database')
          }
        } else {
          const error = 'Failed to fetch current price'
          updateResults.errors.push(error)
          console.error(`❌ ${error}`)
        }
      } catch (currentPriceError) {
        const error = `Current price update failed: ${currentPriceError}`
        updateResults.errors.push(error)
        console.error(`❌ ${error}`)
      }

      // Step 4: Log the update operation
      await prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded: updateResults.gapsFilled + (updateResults.currentPriceUpdated ? 1 : 0),
          recordsUpdated: 0,
          source: 'AUTOMATED_UPDATE',
          status: updateResults.errors.length === 0 ? 'success' : 'partial',
          errorMessage: updateResults.errors.length > 0 ? updateResults.errors.join('; ') : null
        }
      })

      updateResults.endTime = new Date().toISOString()
      updateResults.duration = Date.now() - startTime

      console.log(`✅ Automated update completed in ${updateResults.duration}ms`)

      return NextResponse.json({
        success: updateResults.errors.length === 0,
        message: `Update completed: ${updateResults.gapsFilled} gaps filled, current price ${updateResults.currentPriceUpdated ? 'updated' : 'unchanged'}`,
        data: updateResults
      })

    } catch (updateError) {
      console.error('❌ Automated update failed:', updateError)
      
      updateResults.errors.push(updateError instanceof Error ? updateError.message : String(updateError))
      updateResults.endTime = new Date().toISOString()
      updateResults.duration = Date.now() - startTime

      // Log the failed operation
      try {
        await prisma.dataUpdate.create({
          data: {
            updateDate: new Date().toISOString().split('T')[0],
            recordsAdded: updateResults.gapsFilled,
            recordsUpdated: 0,
            source: 'AUTOMATED_UPDATE',
            status: 'failed',
            errorMessage: updateResults.errors.join('; ')
          }
        })
      } catch (logError) {
        console.error('❌ Failed to log update error:', logError)
      }

      return NextResponse.json({
        success: false,
        message: 'Automated update failed',
        data: updateResults
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Update API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process update request',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
