/**
 * DataServiceProvider Tests
 *
 * Tests for the app-level data service provider that ensures
 * centralized data service initialization before any components render.
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DataServiceProvider } from '../../providers/DataServiceProvider'
import { centralizedDataService } from '@/lib/services/centralized-data-service'

// Mock the centralized data service
vi.mock('@/lib/services/centralized-data-service', () => ({
  centralizedDataService: {
    initialize: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    reset: vi.fn(),
  }
}))

describe('DataServiceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: null,
      ath: null,
      athData: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      isATHLoaded: false,
      lastHistoricalDataLoad: 0,
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize centralized data service on mount', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(centralizedDataService.initialize).toHaveBeenCalledTimes(1)
    })
  })

  it('should show loading state during initialization', async () => {
    let resolveInit: () => void
    const initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve
    })
    ;(centralizedDataService.initialize as any).mockReturnValue(initPromise)
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: null,
      ath: null,
      athData: null,
      isHistoricalDataLoaded: false,
      isLoadingHistoricalData: false,
      isATHLoaded: false,
      lastHistoricalDataLoad: 0,
      errors: [],
      isInitializing: true
    })

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    // Should show loading state
    expect(screen.getByText(/initializing/i)).toBeInTheDocument()

    // Resolve initialization
    resolveInit!()
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument()
    })
  })

  it('should render children after initialization completes', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      ath: 124277.98,
      athData: null,
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      isATHLoaded: true,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })
  })

  it('should handle initialization errors gracefully', async () => {
    const error = new Error('Failed to initialize')
    ;(centralizedDataService.initialize as any).mockRejectedValue(error)

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should subscribe to data service state changes', async () => {
    const mockSubscribe = vi.fn().mockReturnValue(() => {})
    ;(centralizedDataService.subscribe as any).mockImplementation(mockSubscribe)
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })
  })

  it('should cleanup subscription on unmount', async () => {
    const mockUnsubscribe = vi.fn()
    ;(centralizedDataService.subscribe as any).mockReturnValue(mockUnsubscribe)
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)

    const { unmount } = render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(centralizedDataService.subscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should prevent multiple simultaneous initializations', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)

    const { rerender } = render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    // Force re-render
    rerender(
      <DataServiceProvider>
        <div>Test Child Updated</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      // Should only initialize once despite re-render
      expect(centralizedDataService.initialize).toHaveBeenCalledTimes(1)
    })
  })

  it('should update context when initialization completes', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    
    let stateCallback: any
    ;(centralizedDataService.subscribe as any).mockImplementation((callback: any) => {
      stateCallback = callback
      return () => {}
    })

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(centralizedDataService.initialize).toHaveBeenCalled()
    })

    // Simulate state update
    const newState = {
      historicalData: [{ timestamp: 1000, close: 50000, high: 51000, low: 49000, open: 50000 }],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    }

    if (stateCallback) {
      stateCallback(newState)
    }

    // Context should be updated (children should still be visible)
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should handle network errors during initialization', async () => {
    const networkError = new Error('Network request failed')
    ;(centralizedDataService.initialize as any).mockRejectedValue(networkError)

    render(
      <DataServiceProvider>
        <div>Test Child</div>
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/initialization error/i)).toBeInTheDocument()
      expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
    })
  })

  it('should provide initialization status through context', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      ath: 124277.98,
      athData: null,
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      isATHLoaded: true,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })

    const TestConsumer = () => {
      // This will be implemented when we create the context hook
      return <div>Consumer Component</div>
    }

    render(
      <DataServiceProvider>
        <TestConsumer />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Consumer Component')).toBeInTheDocument()
    })
  })
})

