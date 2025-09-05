/**
 * API Route: Manual JSON File Regeneration
 * POST /api/bitcoin-prices/regenerate-json
 * 
 * Manually triggers JSON file regeneration from current database data.
 * Useful for testing and manual updates when needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { bitcoinJsonGeneratorService } from '@/lib/services/bitcoin-json-generator-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual JSON regeneration request received')

    const startTime = Date.now()
    const result = await bitcoinJsonGeneratorService.generateJsonFiles()

    if (result.success) {
      console.log(`✅ Manual JSON regeneration completed successfully`)
      
      return NextResponse.json({
        success: true,
        message: 'JSON files regenerated successfully',
        data: {
          filesGenerated: result.filesGenerated,
          recordsProcessed: result.recordsProcessed,
          dateRange: result.dateRange,
          duration: result.duration,
          generatedAt: new Date().toISOString()
        }
      })
    } else {
      console.error(`❌ Manual JSON regeneration failed: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        error: 'JSON file regeneration failed',
        details: result.error,
        data: {
          recordsProcessed: result.recordsProcessed,
          duration: result.duration,
          attemptedAt: new Date().toISOString()
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Manual JSON regeneration API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate JSON files',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return information about the JSON regeneration endpoint
    return NextResponse.json({
      success: true,
      message: 'JSON Regeneration API',
      data: {
        endpoint: 'POST /api/bitcoin-prices/regenerate-json',
        description: 'Manually regenerate JSON files from current database data',
        usage: 'Send a POST request to trigger JSON file regeneration',
        files: ['daily.json', 'weekly.json', 'monthly.json'],
        location: 'public/data/bitcoin/',
        note: 'JSON files are automatically regenerated when the daily update service adds new data'
      }
    })

  } catch (error) {
    console.error('❌ JSON regeneration info API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get JSON regeneration info',
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
