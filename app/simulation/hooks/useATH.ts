/**
 * useATH Hook
 * 
 * React hook for accessing current Bitcoin ATH (All-Time High) data
 * from the server-side JSON file with fallback to constant.
 */

import { useState, useEffect, useCallback } from 'react'
import { athService } from '../../../lib/services/ath-service'

export interface UseATHReturn {
  ath: number
  athData: any | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to get current Bitcoin ATH value
 */
export function useATH(): UseATHReturn {
  const [ath, setATH] = useState<number>(124277.98) // Fallback value
  const [athData, setATHData] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchATH = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current ATH value
      const currentATH = await athService.getCurrentATH()
      setATH(currentATH)

      // Get full ATH data if available
      const fullATHData = await athService.getATHData()
      setATHData(fullATHData)

      console.log(`📊 ATH loaded: $${currentATH}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ATH data'
      setError(errorMessage)
      console.warn('⚠️ Failed to load ATH, using fallback:', errorMessage)
      
      // Keep fallback value on error
      setATH(124277.98)
      setATHData(null)

    } finally {
      setLoading(false)
    }
  }, [])

  // Load ATH on mount
  useEffect(() => {
    fetchATH()
  }, [fetchATH])

  return {
    ath,
    athData,
    loading,
    error,
    refetch: fetchATH
  }
}
