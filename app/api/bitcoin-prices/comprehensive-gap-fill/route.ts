/**
 * API Route: Comprehensive Gap Filling Control
 * POST /api/bitcoin-prices/comprehensive-gap-fill - Start comprehensive gap filling
 * GET /api/bitcoin-prices/comprehensive-gap-fill - Get gap filling status
 */

import { NextRequest, NextResponse } from 'next/server'
import { comprehensiveGapFiller } from '../../../../lib/services/comprehensive-gap-filler'
import { comprehensiveGapAnalyzer } from '../../../../lib/services/comprehensive-gap-analyzer'
import { multiApiBitcoinService } from '../../../../lib/services/multi-api-bitcoin-service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Comprehensive gap filling status request')

    // Get current progress if running
    const progress = comprehensiveGapFiller.getProgress()
    const isRunning = comprehensiveGapFiller.isProcessRunning()

    // Get API provider status
    const providerStatus = multiApiBitcoinService.getProviderStatus()

    // Get quick gap analysis for current status
    const quickAnalysis = await comprehensiveGapAnalyzer.analyzeGaps('2021-01-05', '2025-07-14')

    return NextResponse.json({
      success: true,
      data: {
        isRunning,
        progress: isRunning ? progress : null,
        currentGapAnalysis: {
          totalGaps: quickAnalysis.totalGaps,
          totalMissingDays: quickAnalysis.totalMissingDays,
          coveragePercentage: quickAnalysis.coveragePercentage,
          analysisDate: quickAnalysis.analysisDate
        },
        apiProviders: providerStatus,
        endpoints: {
          start: 'POST /api/bitcoin-prices/comprehensive-gap-fill with { "action": "start" }',
          analyze: 'POST /api/bitcoin-prices/comprehensive-gap-fill with { "action": "analyze" }',
          status: 'GET /api/bitcoin-prices/comprehensive-gap-fill'
        }
      }
    })

  } catch (error) {
    console.error('❌ Comprehensive gap filling status API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get comprehensive gap filling status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      action, 
      startDate = '2021-01-05', 
      endDate = '2025-07-14',
      batchSize = 100,
      resumeFromGap
    } = body

    console.log(`🔄 Comprehensive gap filling action: ${action}`)

    switch (action) {
      case 'analyze':
        console.log('📊 Starting comprehensive gap analysis...')
        
        const analysis = await comprehensiveGapAnalyzer.analyzeGaps(startDate, endDate)
        const summary = await comprehensiveGapAnalyzer.getGapSummary(analysis)

        return NextResponse.json({
          success: true,
          message: 'Gap analysis completed',
          data: {
            analysis,
            summary,
            recommendations: {
              estimatedDuration: `${Math.ceil(analysis.totalMissingDays / 100)} - ${Math.ceil(analysis.totalMissingDays / 50)} minutes`,
              batchSize: analysis.totalMissingDays > 1000 ? 200 : 100,
              priorityGaps: analysis.gapRanges.filter(gap => gap.priority <= 2).length
            }
          }
        })

      case 'start':
        console.log('🚀 Starting comprehensive gap filling process...')

        // Check if already running
        if (comprehensiveGapFiller.isProcessRunning()) {
          return NextResponse.json({
            success: false,
            error: 'Gap filling process is already running',
            data: {
              currentProgress: comprehensiveGapFiller.getProgress()
            }
          }, { status: 409 })
        }

        // Start the gap filling process (non-blocking)
        const gapFillingPromise = comprehensiveGapFiller.fillAllGaps(
          startDate,
          endDate,
          batchSize,
          resumeFromGap
        )

        // Don't await - let it run in background
        gapFillingPromise.then(result => {
          console.log('🎉 Comprehensive gap filling completed:', result)
        }).catch(error => {
          console.error('❌ Comprehensive gap filling failed:', error)
        })

        return NextResponse.json({
          success: true,
          message: 'Comprehensive gap filling started',
          data: {
            startDate,
            endDate,
            batchSize,
            resumeFromGap,
            initialProgress: comprehensiveGapFiller.getProgress(),
            statusEndpoint: '/api/bitcoin-prices/comprehensive-gap-fill'
          }
        })

      case 'stop':
        return NextResponse.json({
          success: false,
          error: 'Stop functionality not implemented yet',
          message: 'Gap filling process cannot be stopped once started'
        }, { status: 501 })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "analyze", "start", or "stop"',
          availableActions: ['analyze', 'start', 'stop']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Comprehensive gap filling action API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute comprehensive gap filling action',
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
