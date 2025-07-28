/**
 * Database Initialization Service
 * Handles first-time database setup and CSV data integration
 */

import { sqlDatabaseManager } from './SqlDatabaseManager'

export interface InitializationResult {
  success: boolean
  message: string
  recordsLoaded: number
  error?: string
}

export class DatabaseInitializer {
  private isInitialized = false

  /**
   * Initialize the database with historical data on first run
   */
  async initializeDatabase(): Promise<InitializationResult> {
    if (this.isInitialized) {
      return {
        success: true,
        message: 'Database already initialized',
        recordsLoaded: 0
      }
    }

    try {
      console.log('🚀 Starting database initialization...')

      // Step 1: Initialize SQL database connection
      await sqlDatabaseManager.initialize()

      // Step 2: Check if database already has data
      const stats = await sqlDatabaseManager.getStats()
      
      if (stats.totalRecords > 0) {
        console.log(`✅ Database already contains ${stats.totalRecords} records`)
        this.isInitialized = true
        return {
          success: true,
          message: `Database already initialized with ${stats.totalRecords} records`,
          recordsLoaded: stats.totalRecords
        }
      }

      // Step 3: Load historical data from CSV
      console.log('📂 Loading historical data from CSV...')
      const historicalData = await sqlDatabaseManager.getHistoricalData()

      // Step 4: Update with current data if needed
      console.log('🔄 Updating with latest price data...')
      await sqlDatabaseManager.updateCurrentPrice()
      await sqlDatabaseManager.updateDatabase()

      // Step 5: Get final stats
      const finalStats = await sqlDatabaseManager.getStats()

      console.log(`✅ Database initialization completed!`)
      console.log(`📊 Total records: ${finalStats.totalRecords}`)
      console.log(`📅 Date range: ${finalStats.dateRange.start} to ${finalStats.dateRange.end}`)
      console.log(`🔗 Data sources: ${finalStats.sources.join(', ')}`)

      this.isInitialized = true

      return {
        success: true,
        message: `Database initialized successfully with ${finalStats.totalRecords} records`,
        recordsLoaded: finalStats.totalRecords
      }

    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      return {
        success: false,
        message: 'Database initialization failed',
        recordsLoaded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if database is properly initialized
   */
  async checkDatabaseHealth(): Promise<{
    isHealthy: boolean
    issues: string[]
    stats: any
  }> {
    const issues: string[] = []

    try {
      // Check database connection
      await sqlDatabaseManager.initialize()

      // Get database statistics
      const stats = await sqlDatabaseManager.getStats()

      // Check for minimum data requirements
      if (stats.totalRecords === 0) {
        issues.push('Database contains no price data')
      }

      // Check date range
      const startDate = new Date(stats.dateRange.start)
      const targetStartDate = new Date('2013-10-01')
      
      if (startDate > targetStartDate) {
        issues.push(`Historical data incomplete - starts from ${stats.dateRange.start} instead of 2013-10-01`)
      }

      // Check if data is recent
      const endDate = new Date(stats.dateRange.end)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const daysDiff = Math.floor((yesterday.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 7) {
        issues.push(`Price data is outdated - last update was ${daysDiff} days ago`)
      }

      // Check data sources
      if (stats.sources.length === 0) {
        issues.push('No data sources recorded')
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        stats
      }

    } catch (error) {
      issues.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        isHealthy: false,
        issues,
        stats: null
      }
    }
  }

  /**
   * Repair database issues
   */
  async repairDatabase(): Promise<InitializationResult> {
    try {
      console.log('🔧 Starting database repair...')

      const health = await this.checkDatabaseHealth()
      
      if (health.isHealthy) {
        return {
          success: true,
          message: 'Database is already healthy',
          recordsLoaded: health.stats?.totalRecords || 0
        }
      }

      console.log(`🔍 Found ${health.issues.length} issues to repair:`)
      health.issues.forEach(issue => console.log(`  - ${issue}`))

      // Attempt to repair by re-initializing
      this.isInitialized = false
      const result = await this.initializeDatabase()

      if (result.success) {
        console.log('✅ Database repair completed successfully')
      }

      return result

    } catch (error) {
      console.error('❌ Database repair failed:', error)
      return {
        success: false,
        message: 'Database repair failed',
        recordsLoaded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): {
    isInitialized: boolean
    timestamp: string
  } {
    return {
      isInitialized: this.isInitialized,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Force re-initialization (use with caution)
   */
  async forceReinitialize(): Promise<InitializationResult> {
    console.log('⚠️ Forcing database re-initialization...')
    this.isInitialized = false
    return this.initializeDatabase()
  }
}

// Export singleton instance
export const databaseInitializer = new DatabaseInitializer()

/**
 * Convenience function to ensure database is initialized
 * Call this before using any database operations
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  const result = await databaseInitializer.initializeDatabase()
  
  if (!result.success) {
    throw new Error(`Database initialization failed: ${result.error || result.message}`)
  }
}

/**
 * Auto-initialize database on module load (for server-side usage)
 */
if (typeof window === 'undefined') {
  // Server-side: auto-initialize
  ensureDatabaseInitialized().catch(error => {
    console.error('❌ Auto-initialization failed:', error)
  })
}
