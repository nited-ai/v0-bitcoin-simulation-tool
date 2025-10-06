/**
 * API Route: JSON Services Status and Control
 * GET /api/bitcoin-prices/json-services - Get service status
 * POST /api/bitcoin-prices/json-services - Initialize or stop services
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeJsonServices, stopJsonServices, getInitializationStatus } from '@/lib/services/json-service-initializer'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 JSON services status request')

    const status = getInitializationStatus()

    return NextResponse.json({
      success: true,
      data: {
        architecture: 'json-only',
        description: 'Simplified Bitcoin price update system using JSON files without database dependency',
        status,
        benefits: [
          'No database configuration required',
          'No DATABASE_URL environment variable needed',
          'Direct JSON file updates',
          'Simplified deployment',
          'Faster startup time',
          'Reduced dependencies'
        ],
        endpoints: {
          dailyUpdate: '/api/bitcoin-prices/json-daily-update',
          backfill: '/api/bitcoin-prices/json-backfill',
          services: '/api/bitcoin-prices/json-services'
        }
      }
    })

  } catch (error) {
    console.error('❌ JSON services status API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get JSON services status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    console.log(`🔄 JSON services action: ${action}`)

    switch (action) {
      case 'initialize':
        await initializeJsonServices()
        return NextResponse.json({
          success: true,
          message: 'JSON services initialized successfully',
          data: {
            status: getInitializationStatus(),
            architecture: 'json-only'
          }
        })

      case 'stop':
        await stopJsonServices()
        return NextResponse.json({
          success: true,
          message: 'JSON services stopped successfully',
          data: {
            status: getInitializationStatus(),
            architecture: 'json-only'
          }
        })

      case 'restart':
        await stopJsonServices()
        await initializeJsonServices()
        return NextResponse.json({
          success: true,
          message: 'JSON services restarted successfully',
          data: {
            status: getInitializationStatus(),
            architecture: 'json-only'
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "initialize", "stop", or "restart"',
          availableActions: ['initialize', 'stop', 'restart']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ JSON services action API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute JSON services action',
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
