/**
 * Centralized Data Hook
 * 
 * React hook that provides access to the centralized data service.
 * Replaces the old useHistoricalData hook and eliminates redundant data loading.
 * 
 * Features:
 * - Single source of truth for all Bitcoin price data
 * - Automatic subscription to data service state changes
 * - No redundant API calls or caching conflicts
 * - Shared data across all components and price models
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  centralizedDataService,
  type DataServiceState
} from '@/lib/services/centralized-data-service'
import type { HistoricalDataPoint, CurrentPriceData } from '@/src/modules/price-data/types'
import { useSimulation } from '../context/SimulationContext'

/**
 * Hook return type
 */
export interface UseCentralizedDataReturn {
  // Historical data
  historicalData: HistoricalDataPoint[]
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  
  // Current price
  currentPrice: CurrentPriceData | null
  
  // Actions
  refreshHistoricalData: () => Promise<void>
  refreshCurrentPrice: () => Promise<void>
  
  // State
  errors: string[]
  lastUpdated: number
}

/**
 * Centralized data hook with lazy loading support
 *
 * This hook should be used by components that need Bitcoin price data.
 * It automatically subscribes to the centralized data service and provides
 * reactive updates when data changes.
 *
 * **Note**: When used with DataServiceProvider, the data service is already
 * initialized at the app level, so the `enabled` parameter is less critical.
 * The hook will still work correctly and receive data from the provider.
 *
 * @param enabled - Whether to enable data loading (default: false for lazy loading)
 *                  With DataServiceProvider, this parameter is optional as initialization
 *                  happens at the app level.
 */
export function useCentralizedData(enabled: boolean = false): UseCentralizedDataReturn {
  const { t } = useTranslation()
  const {
    setIsLoading,
    setErrors,
    setHistoricalPriceData,
    setParams,
    setInitialDataLoaded,
  } = useSimulation()

  // Local state for data service state
  const [dataServiceState, setDataServiceState] = useState<DataServiceState>(() => {
    const initialState = centralizedDataService.getState()
    return initialState
  })
  
  // Subscribe to data service state changes with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const unsubscribe = centralizedDataService.subscribe((state: DataServiceState) => {
      // Debounce rapid state changes to prevent excessive re-renders
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        setDataServiceState(state)

        // Update simulation context with new data (only when data actually changes)
        if (state.isHistoricalDataLoaded && state.historicalData.length > 0) {
          setHistoricalPriceData(state.historicalData)
          setInitialDataLoaded(true)

          // Set initial BTC price from latest historical data or current price
          const latestHistoricalPrice = state.historicalData[state.historicalData.length - 1]?.close
          const currentPriceValue = state.currentPrice?.price
          const initialPrice = currentPriceValue || latestHistoricalPrice

          if (initialPrice) {
            setParams((prev) => {
              // Only update if price actually changed to prevent infinite loops
              if (prev.initialBtcPrice !== initialPrice) {
                return { ...prev, initialBtcPrice: initialPrice }
              }
              return prev
            })
          }
        }

        // Update loading state
        setIsLoading(state.isLoadingHistoricalData)

        // Update errors
        if (state.errors.length > 0) {
          setErrors(state.errors)
        } else {
          setErrors([])
        }
      }, 100) // 100ms debounce
    })

    return () => {
      console.log('🔌 Unsubscribing from centralized data service')
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      unsubscribe()
    }
  }, []) // Empty dependency array to prevent re-subscription
  
  // Initialize data service on first mount (only if enabled)
  // Note: With DataServiceProvider, this initialization is redundant but harmless
  useEffect(() => {
    // Skip if not enabled (lazy loading)
    if (!enabled) {
      console.log('⚡ Historical data loading disabled - lazy loading mode')
      return
    }

    const initializeDataService = async () => {
      try {
        // Check if already initialized (e.g., by DataServiceProvider)
        if (dataServiceState.isHistoricalDataLoaded) {
          console.log('✅ Data service already initialized by provider')
          return
        }

        await centralizedDataService.initialize()
      } catch (error) {
        console.error('❌ Failed to initialize data service:', error)
        setErrors([t('Errors.failedToLoadHistoricalData')])
      }
    }

    // Only initialize if not already loaded
    if (!dataServiceState.isHistoricalDataLoaded && !dataServiceState.isLoadingHistoricalData) {
      initializeDataService()
    }
  }, [enabled, t]) // Removed dataServiceState dependencies to prevent re-initialization loops
  
  // Refresh historical data
  const refreshHistoricalData = useCallback(async (interval: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    try {
      console.log(`🔄 Refreshing historical data (${interval})...`)
      await centralizedDataService.loadHistoricalData(true, interval) // Force reload with interval
    } catch (error) {
      console.error('❌ Failed to refresh historical data:', error)
    }
  }, [])
  
  // Refresh current price
  const refreshCurrentPrice = useCallback(async () => {
    try {
      console.log('🔄 Refreshing current price...')
      await centralizedDataService.getCurrentPrice()
    } catch (error) {
      console.error('❌ Failed to refresh current price:', error)
    }
  }, [])
  
  return {
    // Historical data
    historicalData: dataServiceState.historicalData,
    isHistoricalDataLoaded: dataServiceState.isHistoricalDataLoaded,
    isLoadingHistoricalData: dataServiceState.isLoadingHistoricalData,
    
    // Current price
    currentPrice: dataServiceState.currentPrice,
    
    // Actions
    refreshHistoricalData,
    refreshCurrentPrice,
    
    // State
    errors: dataServiceState.errors,
    lastUpdated: dataServiceState.lastHistoricalDataLoad,
  }
}

/**
 * Hook for components that only need historical data
 * Lighter version that doesn't trigger current price fetching
 *
 * @param enabled - Whether to enable data loading (default: true for backward compatibility)
 * @param interval - Data interval to load (default: 'weekly' for performance)
 */
export function useHistoricalDataOnly(enabled: boolean = true, interval: 'daily' | 'weekly' | 'monthly' = 'weekly'): {
  historicalData: HistoricalDataPoint[]
  isLoaded: boolean
  isLoading: boolean
} {
  const [dataServiceState, setDataServiceState] = useState<DataServiceState>(() =>
    centralizedDataService.getState()
  )

  useEffect(() => {
    const unsubscribe = centralizedDataService.subscribe(setDataServiceState)
    return unsubscribe
  }, [])
  
  // Ensure historical data is loaded (only if enabled)
  useEffect(() => {
    // Skip if not enabled (lazy loading)
    if (!enabled) {
      console.log('⚡ Historical data loading disabled - lazy loading mode')
      return
    }

    if (!dataServiceState.isHistoricalDataLoaded && !dataServiceState.isLoadingHistoricalData) {
      centralizedDataService.loadHistoricalData(false, interval).catch(error => {
        console.error('❌ Failed to load historical data:', error)
      })
    }
  }, [enabled, interval, dataServiceState.isHistoricalDataLoaded, dataServiceState.isLoadingHistoricalData])
  
  return {
    historicalData: dataServiceState.historicalData,
    isLoaded: dataServiceState.isHistoricalDataLoaded,
    isLoading: dataServiceState.isLoadingHistoricalData,
  }
}

/**
 * Hook for components that only need current price
 * Lighter version that doesn't load historical data
 *
 * **Note**: When used with DataServiceProvider, the current price is already
 * available from the app-level initialization. This hook simply subscribes
 * to updates and provides a refresh function.
 */
export function useCurrentPriceOnly(): {
  currentPrice: CurrentPriceData | null
  refreshPrice: () => Promise<void>
  isLoading: boolean
} {
  const [dataServiceState, setDataServiceState] = useState<DataServiceState>(() => 
    centralizedDataService.getState()
  )
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  
  useEffect(() => {
    const unsubscribe = centralizedDataService.subscribe(setDataServiceState)
    return unsubscribe
  }, [])
  
  const refreshPrice = useCallback(async () => {
    setIsLoadingPrice(true)
    try {
      await centralizedDataService.getCurrentPrice()
    } catch (error) {
      console.error('❌ Failed to refresh current price:', error)
    } finally {
      setIsLoadingPrice(false)
    }
  }, [])
  
  return {
    currentPrice: dataServiceState.currentPrice,
    refreshPrice,
    isLoading: isLoadingPrice,
  }
}
