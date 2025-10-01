"use client"

/**
 * DataServiceProvider Component
 *
 * App-level provider that initializes the centralized data service
 * before any tab components render. Ensures consistent Bitcoin price
 * data availability across all tabs and components.
 *
 * Features:
 * - Initializes centralized data service on mount
 * - Provides initialization status through React Context
 * - Shows loading state during initialization
 * - Handles initialization errors gracefully
 * - Prevents multiple simultaneous initializations
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { centralizedDataService, type DataServiceState } from '@/lib/services/centralized-data-service'

/**
 * Context value interface
 */
export interface DataServiceContextValue {
  isInitialized: boolean
  isInitializing: boolean
  error: string | null
  dataServiceState: DataServiceState
}

/**
 * Create context with default values
 */
const DataServiceContext = createContext<DataServiceContextValue>({
  isInitialized: false,
  isInitializing: false,
  error: null,
  dataServiceState: {
    historicalData: [],
    currentPrice: null,
    isHistoricalDataLoaded: false,
    isLoadingHistoricalData: false,
    lastHistoricalDataLoad: 0,
    errors: [],
    isInitializing: false
  }
})

/**
 * Hook to access data service context
 */
export function useDataServiceContext(): DataServiceContextValue {
  const context = useContext(DataServiceContext)
  if (!context) {
    throw new Error('useDataServiceContext must be used within DataServiceProvider')
  }
  return context
}

/**
 * Provider component props
 */
interface DataServiceProviderProps {
  children: ReactNode
}

/**
 * DataServiceProvider Component
 * 
 * Wraps the simulation app and initializes the centralized data service
 * before rendering any child components.
 */
export function DataServiceProvider({ children }: DataServiceProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataServiceState, setDataServiceState] = useState<DataServiceState>(() => 
    centralizedDataService.getState()
  )

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | null = null

    const initializeDataService = async () => {
      // Prevent multiple initializations
      if (isInitializing || isInitialized) {
        return
      }

      console.log('🚀 DataServiceProvider: Starting initialization...')
      setIsInitializing(true)
      setError(null)

      try {
        // Initialize the centralized data service
        await centralizedDataService.initialize()

        if (isMounted) {
          console.log('✅ DataServiceProvider: Initialization complete')
          setIsInitialized(true)
          setIsInitializing(false)
          
          // Get initial state
          const initialState = centralizedDataService.getState()
          setDataServiceState(initialState)
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize data service'
          console.error('❌ DataServiceProvider: Initialization failed:', errorMessage)
          setError(errorMessage)
          setIsInitializing(false)
        }
      }
    }

    // Subscribe to data service state changes
    unsubscribe = centralizedDataService.subscribe((newState) => {
      if (isMounted) {
        setDataServiceState(newState)
      }
    })

    // Start initialization
    initializeDataService()

    // Cleanup on unmount
    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Context value
  const contextValue: DataServiceContextValue = {
    isInitialized,
    isInitializing,
    error,
    dataServiceState
  }

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing Bitcoin data service...</p>
        </div>
      </div>
    )
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-destructive text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Initialization Error</h2>
          <p className="text-muted-foreground">
            Failed to initialize the data service. Please check your network connection and try again.
          </p>
          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Render children with context once initialized
  return (
    <DataServiceContext.Provider value={contextValue}>
      {children}
    </DataServiceContext.Provider>
  )
}

