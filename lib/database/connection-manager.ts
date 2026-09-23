/**
 * Database Connection Manager
 * Manages Prisma client connections to prevent connection pool exhaustion
 */

import { PrismaClient } from '@prisma/client'

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private prismaClient: PrismaClient | null = null

  private constructor() {}

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager()
    }
    return DatabaseConnectionManager.instance
  }

  /**
   * Get shared Prisma client instance - uses single connection
   */
  getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      console.log('🔌 Creating single shared Prisma client connection')

      try {
        this.prismaClient = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          datasources: {
            db: {
              url: process.env.DATABASE_URL
            }
          }
        })

        console.log('✅ Single shared Prisma client created')
      } catch (error) {
        console.error('❌ Failed to create Prisma client:', error)
        throw new Error('Failed to initialize Prisma Client. Make sure DATABASE_URL is set and prisma generate has been run.')
      }
    }

    return this.prismaClient
  }

  /**
   * Disconnect the shared connection
   */
  async disconnect(): Promise<void> {
    if (this.prismaClient) {
      console.log('🔌 Disconnecting shared Prisma client...')
      await this.prismaClient.$disconnect()
      this.prismaClient = null
      console.log('✅ Shared Prisma client disconnected')
    }
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    await this.disconnect()
    this.getPrismaClient()
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean
    connectionCount: number
    maxConnections: number
  } {
    return {
      connected: this.prismaClient !== null,
      connectionCount: this.prismaClient ? 1 : 0,
      maxConnections: 1 // Single shared connection
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = this.getPrismaClient()
      await client.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const dbConnectionManager = DatabaseConnectionManager.getInstance()

// Export convenience function
export function getPrismaClient(): PrismaClient {
  return dbConnectionManager.getPrismaClient()
}
