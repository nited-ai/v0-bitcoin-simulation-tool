/**
 * Bitcoin Prices API Route
 * Server-side API for accessing Bitcoin price data from SQL database
 */

import { NextRequest, NextResponse } from 'next/server'
import { sqlDatabaseManager } from '@/app/simulation/data/database/SqlDatabaseManager'
import { databaseInitializer } from '@/app/simulation/data/database/DatabaseInitializer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'historical'

    switch (action) {
      case 'historical':
        return await getHistoricalData()
      
      case 'current':
        return await getCurrentPrice()
      
      case 'stats':
        return await getDatabaseStats()
      
      case 'health':
        return await checkDatabaseHealth()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: historical, current, stats, or health' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Bitcoin prices API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'update':
        return await updateDatabase()
      
      case 'initialize':
        return await initializeDatabase()
      
      case 'repair':
        return await repairDatabase()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: update, initialize, or repair' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Bitcoin prices API POST error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get historical price data
 */
async function getHistoricalData() {
  try {
    console.log('📊 API: Loading historical data from SQL database...')
    
    // Ensure database is initialized
    await databaseInitializer.initializeDatabase()
    
    // Get historical data
    const data = await sqlDatabaseManager.getHistoricalData()
    
    // Convert to price engine format
    const historicalData = data.map(record => ({
      time: Math.floor(record.timestamp / 1000), // Convert milliseconds to seconds
      close: record.close,
      date: record.date,
      source: record.source
    }))
    
    console.log(`✅ API: Returning ${historicalData.length} historical data points`)
    
    return NextResponse.json({
      success: true,
      data: historicalData,
      count: historicalData.length,
      dateRange: {
        start: data[0]?.date || null,
        end: data[data.length - 1]?.date || null
      }
    })
    
  } catch (error) {
    console.error('❌ API: Failed to get historical data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load historical data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get current Bitcoin price
 */
async function getCurrentPrice() {
  try {
    console.log('💰 API: Getting current Bitcoin price...')
    
    await databaseInitializer.initializeDatabase()
    
    const data = await sqlDatabaseManager.getHistoricalData()
    
    if (data.length === 0) {
      throw new Error('No price data available')
    }
    
    const latestPrice = data[data.length - 1]
    
    console.log(`✅ API: Current Bitcoin price: $${latestPrice.close}`)
    
    return NextResponse.json({
      success: true,
      price: latestPrice.close,
      date: latestPrice.date,
      timestamp: latestPrice.timestamp,
      source: latestPrice.source
    })
    
  } catch (error) {
    console.error('❌ API: Failed to get current price:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get current price',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    await databaseInitializer.initializeDatabase()
    const stats = await sqlDatabaseManager.getStats()
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('❌ API: Failed to get database stats:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get database stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    const health = await databaseInitializer.checkDatabaseHealth()
    
    return NextResponse.json({
      success: true,
      health
    })
    
  } catch (error) {
    console.error('❌ API: Failed to check database health:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check database health',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Update database with latest data
 */
async function updateDatabase() {
  try {
    console.log('🔄 API: Updating database...')
    
    await databaseInitializer.initializeDatabase()
    
    // Update current price
    const currentResult = await sqlDatabaseManager.updateCurrentPrice()
    
    // Fill data gaps
    const updateResult = await sqlDatabaseManager.updateDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Database updated successfully',
      currentPriceUpdate: currentResult,
      dataUpdate: updateResult
    })
    
  } catch (error) {
    console.error('❌ API: Failed to update database:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Initialize database
 */
async function initializeDatabase() {
  try {
    console.log('🚀 API: Initializing database...')
    
    const result = await databaseInitializer.initializeDatabase()
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      recordsLoaded: result.recordsLoaded,
      error: result.error
    })
    
  } catch (error) {
    console.error('❌ API: Failed to initialize database:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Repair database
 */
async function repairDatabase() {
  try {
    console.log('🔧 API: Repairing database...')
    
    const result = await databaseInitializer.repairDatabase()
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      recordsLoaded: result.recordsLoaded,
      error: result.error
    })
    
  } catch (error) {
    console.error('❌ API: Failed to repair database:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to repair database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
