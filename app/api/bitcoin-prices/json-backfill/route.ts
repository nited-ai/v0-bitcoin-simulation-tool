/**
 * API Route: JSON Historical Backfill Service
 * POST /api/bitcoin-prices/json-backfill - Backfill missing historical data to JSON files
 * GET /api/bitcoin-prices/json-backfill - Get backfill service information
 */

import { NextRequest, NextResponse } from 'next/server'
import { jsonHistoricalBackfillService } from '@/lib/services/json-historical-backfill-service'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        service: 'JSON Historical Backfill Service',
        description: 'Backfills missing historical Bitcoin price data directly to JSON files without database dependency',
        architecture: 'json-only',
        endpoints: {
          backfillMissing: 'POST /api/bitcoin-prices/json-backfill with { "action": "backfill-missing" }',
          backfillRange: 'POST /api/bitcoin-prices/json-backfill with { "action": "backfill-range", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }',
          info: 'GET /api/bitcoin-prices/json-backfill'
        },
        defaultMissingRange: {
          startDate: '2025-08-19',
          endDate: new Date().toISOString().split('T')[0],
          description: 'Default range covers the period when the daily update service was not running'
        }
      }
    })

  } catch (error) {
    console.error('❌ JSON backfill info API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get JSON backfill service information',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, startDate, endDate } = body

    console.log(`🔄 JSON backfill service action: ${action}`)

    switch (action) {
      case 'backfill-missing':
        console.log('🔄 Starting backfill of missing data from August 19, 2025 to present...')
        
        const missingDataResult = await jsonHistoricalBackfillService.backfillMissingData()
        
        return NextResponse.json({
          success: missingDataResult.success,
          message: `Missing data backfill completed: ${missingDataResult.recordsAdded} records added`,
          data: {
            backfillResult: missingDataResult,
            architecture: 'json-only'
          }
        })

      case 'backfill-range':
        if (!startDate || !endDate) {
          return NextResponse.json({
            success: false,
            error: 'startDate and endDate are required for backfill-range action',
            example: {
              action: 'backfill-range',
              startDate: '2025-08-19',
              endDate: '2025-10-06'
            }
          }, { status: 400 })
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD format',
            example: {
              startDate: '2025-08-19',
              endDate: '2025-10-06'
            }
          }, { status: 400 })
        }

        console.log(`🔄 Starting backfill for date range: ${startDate} to ${endDate}...`)
        
        const rangeResult = await jsonHistoricalBackfillService.backfillDateRange(startDate, endDate)
        
        return NextResponse.json({
          success: rangeResult.success,
          message: `Date range backfill completed: ${rangeResult.recordsAdded} records added`,
          data: {
            backfillResult: rangeResult,
            architecture: 'json-only'
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "backfill-missing" or "backfill-range"',
          availableActions: [
            {
              action: 'backfill-missing',
              description: 'Backfill missing data from August 19, 2025 to present'
            },
            {
              action: 'backfill-range',
              description: 'Backfill data for a specific date range',
              requiredParams: ['startDate', 'endDate']
            }
          ]
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ JSON backfill action API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute JSON backfill action',
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
