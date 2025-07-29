/**
 * Service Initializer
 * Handles initialization of background services for the Bitcoin simulation tool
 */

import { dailyUpdateService } from './daily-update-service'

let servicesInitialized = false

/**
 * Initialize all background services
 */
export async function initializeServices(): Promise<void> {
  if (servicesInitialized) {
    console.log('⚠️ Services already initialized')
    return
  }

  console.log('🚀 Initializing background services...')

  try {
    // Initialize daily update service
    await dailyUpdateService.start()
    
    servicesInitialized = true
    console.log('✅ All background services initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    throw error
  }
}

/**
 * Shutdown all background services
 */
export async function shutdownServices(): Promise<void> {
  if (!servicesInitialized) {
    console.log('⚠️ Services not initialized')
    return
  }

  console.log('🛑 Shutting down background services...')

  try {
    // Shutdown daily update service
    await dailyUpdateService.stop()
    
    servicesInitialized = false
    console.log('✅ All background services shut down successfully')

  } catch (error) {
    console.error('❌ Failed to shutdown services:', error)
    throw error
  }
}

/**
 * Get initialization status
 */
export function getServicesStatus(): {
  initialized: boolean
  services: {
    dailyUpdate: {
      isRunning: boolean
      lastUpdateTime?: Date
      nextUpdateTime?: Date
    }
  }
} {
  return {
    initialized: servicesInitialized,
    services: {
      dailyUpdate: dailyUpdateService.getStatus()
    }
  }
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT, shutting down services...')
    await shutdownServices()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, shutting down services...')
    await shutdownServices()
    process.exit(0)
  })
}
