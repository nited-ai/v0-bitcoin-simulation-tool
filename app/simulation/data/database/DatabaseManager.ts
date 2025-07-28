/**
 * Database Manager for Bitcoin Price Data
 * Proxy to SQL Database Manager - maintains backward compatibility
 */

import { sqlDatabaseManager, type DatabasePricePoint, type UpdateResult } from './SqlDatabaseManager'

// Re-export types for backward compatibility
export type { DatabasePricePoint, UpdateResult }

/**
 * Database Manager - Proxy to SQL Database Manager
 * Maintains backward compatibility while using actual SQL database
 */
export class DatabaseManager {
  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    return sqlDatabaseManager.initialize()
  }

  /**
   * Get all historical price data from database with CSV integration
   */
  async getHistoricalData(): Promise<DatabasePricePoint[]> {
    return sqlDatabaseManager.getHistoricalData()
  }

  /**
   * Daily current price update - ensures database has yesterday's price
   */
  async updateCurrentPrice(): Promise<UpdateResult> {
    return sqlDatabaseManager.updateCurrentPrice()
  }

  /**
   * Automatic database update - fills data gaps
   */
  async updateDatabase(): Promise<UpdateResult> {
    return sqlDatabaseManager.updateDatabase()
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalRecords: number
    dateRange: { start: string; end: string }
    lastUpdate: string
    sources: string[]
  }> {
    return sqlDatabaseManager.getStats()
  }

  /**
   * Cleanup database connection
   */
  async disconnect(): Promise<void> {
    return sqlDatabaseManager.disconnect()
  }

}

// Export singleton instance
export const databaseManager = new DatabaseManager()
