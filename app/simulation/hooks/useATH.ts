/**
 * useATH Hook
 *
 * React hook for accessing current Bitcoin ATH (All-Time High) data
 * from the centralized data service (provider-initialized).
 *
 * **Note**: This hook now uses the DataServiceProvider for ATH data.
 * The provider ensures ATH data is loaded once at app initialization,
 * eliminating duplicate loading and improving performance.
 */

import { useState, useEffect, useCallback } from 'react'
import { centralizedDataService } from '@/lib/services/centralized-data-service'
import { athService } from '@/lib/services/ath-service'

export interface UseATHReturn {
  ath: number
  athData: any | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to get current Bitcoin ATH value from centralized data service
 */
export function useATH(): UseATHReturn {
  const [ath, setATH] = useState<number>(124277.98) // Fallback value
  const [athData, setATHData] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(false) // Start as false since provider loads it
  const [error, setError] = useState<string | null>(null)

  // Get ATH from centralized data service
  useEffect(() => {
    const state = centralizedDataService.getState()

    if (state.isATHLoaded && state.ath !== null) {
      // Use ATH from provider
      setATH(state.ath)
      setATHData(state.athData)
      setLoading(false)
    } else if (!state.isInitializing) {
      // Provider hasn't loaded ATH yet, set loading state
      setLoading(true)
    }

    // Subscribe to updates
    const unsubscribe = centralizedDataService.subscribe((newState) => {
      if (newState.isATHLoaded && newState.ath !== null) {
        setATH(newState.ath)
        setATHData(newState.athData)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch fresh ATH data
      const currentATH = await athService.getCurrentATH()
      const fullATHData = await athService.getATHData()

      setATH(currentATH)
      setATHData(fullATHData)

      console.log(`📊 ATH refreshed: $${currentATH}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ATH data'
      setError(errorMessage)
      console.warn('⚠️ Failed to refresh ATH, using current value:', errorMessage)

    } finally {
      setLoading(false)
    }
  }, [])

  return {
    ath,
    athData,
    loading,
    error,
    refetch
  }
}
