/**
 * API Route: JSON-Only Daily Update Service Control
 * GET /api/bitcoin-prices/json-daily-update - Get service status
 * POST /api/bitcoin-prices/json-daily-update - Start/stop service or trigger manual update
 */

import { NextRequest, NextResponse } from 'next/server'
import { jsonOnlyDailyUpdateService } from '@/lib/services/json-only-daily-update-service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 JSON-only daily update service status request')

    const status = jsonOnlyDailyUpdateService.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        service: status,
        architecture: 'json-only',
        description: 'Simplified service that updates JSON files directly without database dependency',
        endpoints: {
          start: 'POST /api/bitcoin-prices/json-daily-update with { "action": "start" }',
          stop: 'POST /api/bitcoin-prices/json-daily-update with { "action": "stop" }',
          update: 'POST /api/bitcoin-prices/json-daily-update with { "action": "update" }',
          status: 'GET /api/bitcoin-prices/json-daily-update'
        }
      }
    })

  } catch (error) {
    console.error('❌ JSON-only daily update status API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get JSON-only daily update service status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    console.log(`🔄 JSON-only daily update service action: ${action}`)

    switch (action) {
      case 'start':
        await jsonOnlyDailyUpdateService.start()
        return NextResponse.json({
          success: true,
          message: 'JSON-only daily update service started',
          data: {
            status: jsonOnlyDailyUpdateService.getStatus(),
            architecture: 'json-only'
          }
        })

      case 'stop':
        await jsonOnlyDailyUpdateService.stop()
        return NextResponse.json({
          success: true,
          message: 'JSON-only daily update service stopped',
          data: {
            status: jsonOnlyDailyUpdateService.getStatus(),
            architecture: 'json-only'
          }
        })

      case 'update':
        const updateResult = await jsonOnlyDailyUpdateService.performUpdate()
        return NextResponse.json({
          success: updateResult.success,
          message: `JSON-only manual update completed: ${updateResult.jsonFilesUpdated.length} files updated`,
          data: {
            updateResult,
            serviceStatus: jsonOnlyDailyUpdateService.getStatus(),
            architecture: 'json-only'
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
    console.error('❌ JSON-only daily update action API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute JSON-only daily update action',
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
