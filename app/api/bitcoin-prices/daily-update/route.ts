/**
 * API Route: Daily Update Service Control
 * GET /api/bitcoin-prices/daily-update - Get service status
 * POST /api/bitcoin-prices/daily-update - Start/stop service or trigger manual update
 */

import { NextRequest, NextResponse } from 'next/server'
import { dailyUpdateService } from '../../../../lib/services/daily-update-service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Daily update service status request')

    const status = dailyUpdateService.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        service: status,
        endpoints: {
          start: 'POST /api/bitcoin-prices/daily-update with { "action": "start" }',
          stop: 'POST /api/bitcoin-prices/daily-update with { "action": "stop" }',
          update: 'POST /api/bitcoin-prices/daily-update with { "action": "update" }',
          status: 'GET /api/bitcoin-prices/daily-update'
        }
      }
    })

  } catch (error) {
    console.error('❌ Daily update status API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get daily update service status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, maxGaps = 50 } = body

    console.log(`🔄 Daily update service action: ${action}`)

    switch (action) {
      case 'start':
        await dailyUpdateService.start()
        return NextResponse.json({
          success: true,
          message: 'Daily update service started',
          data: dailyUpdateService.getStatus()
        })

      case 'stop':
        await dailyUpdateService.stop()
        return NextResponse.json({
          success: true,
          message: 'Daily update service stopped',
          data: dailyUpdateService.getStatus()
        })

      case 'update':
        const updateResult = await dailyUpdateService.performUpdate(maxGaps)
        return NextResponse.json({
          success: updateResult.success,
          message: `Manual update completed: ${updateResult.recordsAdded} records added`,
          data: {
            updateResult,
            serviceStatus: dailyUpdateService.getStatus()
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "start", "stop", or "update"',
          availableActions: ['start', 'stop', 'update']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Daily update action API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute daily update action',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
