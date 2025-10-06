/**
 * JSON-Only Service Initializer
 * 
 * Simplified service initializer that starts the JSON-only daily update service
 * without any database dependencies. This ensures the service starts automatically
 * when the application starts.
 */

import { jsonOnlyDailyUpdateService } from './json-only-daily-update-service'

let isInitialized = false

/**
 * Initialize JSON-only services
 * This function should be called when the application starts
 */
export async function initializeJsonServices(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️ JSON services already initialized')
    return
  }

  try {
    console.log('🚀 Initializing JSON-only services...')

    // Start the JSON-only daily update service
    await jsonOnlyDailyUpdateService.start()

    isInitialized = true
    console.log('✅ JSON-only services initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize JSON-only services:', error)
    throw error
  }
}

/**
 * Stop JSON-only services
 * This function should be called when the application shuts down
 */
export async function stopJsonServices(): Promise<void> {
  if (!isInitialized) {
    console.log('⚠️ JSON services not initialized')
    return
  }

  try {
    console.log('🛑 Stopping JSON-only services...')

    // Stop the JSON-only daily update service
    await jsonOnlyDailyUpdateService.stop()

    isInitialized = false
    console.log('✅ JSON-only services stopped successfully')

  } catch (error) {
    console.error('❌ Failed to stop JSON-only services:', error)
    throw error
  }
}

/**
 * Get initialization status
 */
export function getInitializationStatus(): {
  isInitialized: boolean
  services: {
    jsonOnlyDailyUpdate: boolean
  }
} {
  return {
    isInitialized,
    services: {
      jsonOnlyDailyUpdate: jsonOnlyDailyUpdateService.getStatus().isRunning
    }
  }
}

// Auto-initialize services when this module is imported in a server environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only auto-initialize in server environment (not in browser or tests)
  initializeJsonServices().catch(error => {
    console.error('❌ Auto-initialization of JSON services failed:', error)
  })
}
