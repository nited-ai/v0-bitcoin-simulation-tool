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
  type DataServiceState, 
  type HistoricalDataPoint,
  type CurrentPriceData 
} from '@/lib/services/centralized-data-service'
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
 * Centralized data hook
 * 
 * This hook should be used by components that need Bitcoin price data.
 * It automatically subscribes to the centralized data service and provides
 * reactive updates when data changes.
 */
export function useCentralizedData(): UseCentralizedDataReturn {
  const { t } = useTranslation()
  const {
    setIsLoading,
    setErrors,
    setHistoricalPriceData,
    setParams,
    setInitialDataLoaded,
  } = useSimulation()
  
  // Local state for data service state
  const [dataServiceState, setDataServiceState] = useState<DataServiceState>(() => 
    centralizedDataService.getState()
  )
  
  // Subscribe to data service state changes
  useEffect(() => {
    console.log('🔗 Subscribing to centralized data service...')
    
    const unsubscribe = centralizedDataService.subscribe((state: DataServiceState) => {
      setDataServiceState(state)
      
      // Update simulation context with new data
      if (state.isHistoricalDataLoaded && state.historicalData.length > 0) {
        setHistoricalPriceData(state.historicalData)
        setInitialDataLoaded(true)
        
        // Set initial BTC price from latest historical data or current price
        const latestHistoricalPrice = state.historicalData[state.historicalData.length - 1]?.close
        const currentPriceValue = state.currentPrice?.price
        const initialPrice = currentPriceValue || latestHistoricalPrice
        
        if (initialPrice) {
          setParams((prev) => ({ ...prev, initialBtcPrice: initialPrice }))
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
    })
    
    return () => {
      console.log('🔌 Unsubscribing from centralized data service')
      unsubscribe()
    }
  }, [setHistoricalPriceData, setInitialDataLoaded, setParams, setIsLoading, setErrors])
  
  // Initialize data service on first mount
  useEffect(() => {
    const initializeDataService = async () => {
      try {
        console.log('🚀 Initializing centralized data service from hook...')
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
  }, [t, dataServiceState.isHistoricalDataLoaded, dataServiceState.isLoadingHistoricalData, setErrors])
  
  // Refresh historical data
  const refreshHistoricalData = useCallback(async () => {
    try {
      console.log('🔄 Refreshing historical data...')
      await centralizedDataService.loadHistoricalData(true) // Force reload
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
 */
export function useHistoricalDataOnly(): {
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
  
  // Ensure historical data is loaded
  useEffect(() => {
    if (!dataServiceState.isHistoricalDataLoaded && !dataServiceState.isLoadingHistoricalData) {
      centralizedDataService.loadHistoricalData().catch(error => {
        console.error('❌ Failed to load historical data:', error)
      })
    }
  }, [dataServiceState.isHistoricalDataLoaded, dataServiceState.isLoadingHistoricalData])
  
  return {
    historicalData: dataServiceState.historicalData,
    isLoaded: dataServiceState.isHistoricalDataLoaded,
    isLoading: dataServiceState.isLoadingHistoricalData,
  }
}

/**
 * Hook for components that only need current price
 * Lighter version that doesn't load historical data
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
