/**
 * DataServiceProvider Integration Tests
 * 
 * Tests for app-level data service initialization and integration
 * with the simulation app components.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DataServiceProvider } from '../../providers/DataServiceProvider'
import { SimulationProvider } from '../../context/SimulationContext'
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

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

describe('DataServiceProvider Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(centralizedDataService.getState as any).mockReturnValue({
      historicalData: [
        { timestamp: 1000, close: 50000, high: 51000, low: 49000, open: 50000 }
      ],
      currentPrice: { price: 50000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    })
    ;(centralizedDataService.subscribe as any).mockReturnValue(() => {})
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)
  })

  it('should initialize data service before rendering children', async () => {
    ;(centralizedDataService.initialize as any).mockResolvedValue(undefined)

    const TestComponent = () => {
      return <div>Test Component</div>
    }

    render(
      <DataServiceProvider>
        <SimulationProvider>
          <TestComponent />
        </SimulationProvider>
      </DataServiceProvider>
    )

    // Wait for initialization to complete and children to render
    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    // Verify initialization was called
    expect(centralizedDataService.initialize).toHaveBeenCalled()
  })

  it('should provide initialized data to all child components', async () => {
    const TestConsumer = () => {
      const state = centralizedDataService.getState()
      return (
        <div>
          <div>Price: {state.currentPrice?.price}</div>
          <div>Data Loaded: {state.isHistoricalDataLoaded ? 'Yes' : 'No'}</div>
        </div>
      )
    }

    render(
      <DataServiceProvider>
        <TestConsumer />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Price: 50000/)).toBeInTheDocument()
      expect(screen.getByText(/Data Loaded: Yes/)).toBeInTheDocument()
    })
  })

  it('should handle initialization before any tab components render', async () => {
    let tabComponentRendered = false
    
    const TabComponent = () => {
      React.useEffect(() => {
        tabComponentRendered = true
        // At this point, data service should be initialized
        const state = centralizedDataService.getState()
        expect(state.isHistoricalDataLoaded).toBe(true)
      }, [])
      return <div>Tab Content</div>
    }

    render(
      <DataServiceProvider>
        <TabComponent />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Tab Content')).toBeInTheDocument()
      expect(tabComponentRendered).toBe(true)
    })
  })

  it('should maintain data service state across component re-renders', async () => {
    const TestComponent = ({ count }: { count: number }) => {
      const state = centralizedDataService.getState()
      return <div>Render {count}: Price {state.currentPrice?.price}</div>
    }

    const { rerender } = render(
      <DataServiceProvider>
        <TestComponent count={1} />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Render 1: Price 50000/)).toBeInTheDocument()
    })

    // Re-render with different props
    rerender(
      <DataServiceProvider>
        <TestComponent count={2} />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Render 2: Price 50000/)).toBeInTheDocument()
    })

    // Should only initialize once
    expect(centralizedDataService.initialize).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple child components accessing data simultaneously', async () => {
    const Component1 = () => {
      const state = centralizedDataService.getState()
      return <div>Component 1: {state.currentPrice?.price}</div>
    }

    const Component2 = () => {
      const state = centralizedDataService.getState()
      return <div>Component 2: {state.historicalData.length} points</div>
    }

    const Component3 = () => {
      const state = centralizedDataService.getState()
      return <div>Component 3: {state.isHistoricalDataLoaded ? 'Loaded' : 'Loading'}</div>
    }

    render(
      <DataServiceProvider>
        <Component1 />
        <Component2 />
        <Component3 />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Component 1: 50000/)).toBeInTheDocument()
      expect(screen.getByText(/Component 2: 1 points/)).toBeInTheDocument()
      expect(screen.getByText(/Component 3: Loaded/)).toBeInTheDocument()
    })
  })

  it('should propagate data service state updates to all subscribers', async () => {
    const callbacks: any[] = []

    ;(centralizedDataService.subscribe as any).mockImplementation((callback: any) => {
      callbacks.push(callback)
      // Immediately call with initial state
      callback(centralizedDataService.getState())
      return () => {}
    })

    const TestComponent = () => {
      const [price, setPrice] = React.useState<number | null>(null)

      React.useEffect(() => {
        const unsubscribe = centralizedDataService.subscribe((state) => {
          setPrice(state.currentPrice?.price || null)
        })
        return unsubscribe
      }, [])

      return <div>Current Price: {price || 'Loading'}</div>
    }

    render(
      <DataServiceProvider>
        <TestComponent />
      </DataServiceProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Current Price: 50000/)).toBeInTheDocument()
    })

    // Simulate state update by calling all callbacks
    const newState = {
      historicalData: [],
      currentPrice: { price: 55000, timestamp: Date.now() / 1000, source: 'test' },
      isHistoricalDataLoaded: true,
      isLoadingHistoricalData: false,
      lastHistoricalDataLoad: Date.now(),
      errors: [],
      isInitializing: false
    }

    callbacks.forEach(cb => cb(newState))

    await waitFor(() => {
      expect(screen.getByText(/Current Price: 55000/)).toBeInTheDocument()
    })
  })
})

