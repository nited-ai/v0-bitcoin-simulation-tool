/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { SimulationProvider, useSimulation } from '../context/SimulationContext'
import { DEFAULT_PARAMS } from '../types/simulation'

// Mock wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulationProvider>{children}</SimulationProvider>
)

describe('SimulationContext', () => {
  it('should provide default simulation parameters', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    expect(result.current.params).toEqual(DEFAULT_PARAMS)
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errors).toEqual([])
  })

  it('should update parameters correctly', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    act(() => {
      result.current.setParams({
        ...DEFAULT_PARAMS,
        btcAmount: 2,
        initialBtcPrice: 50000,
      })
    })

    expect(result.current.params.btcAmount).toBe(2)
    expect(result.current.params.initialBtcPrice).toBe(50000)
  })

  it('should manage loading state', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.setIsLoading(true)
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should manage errors correctly', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    expect(result.current.errors).toEqual([])

    act(() => {
      result.current.addError('Test error')
    })

    expect(result.current.errors).toEqual(['Test error'])

    act(() => {
      result.current.clearErrors()
    })

    expect(result.current.errors).toEqual([])
  })

  it('should reset parameters to defaults', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    // Modify parameters
    act(() => {
      result.current.setParams({
        ...DEFAULT_PARAMS,
        btcAmount: 5,
        initialBtcPrice: 75000,
      })
    })

    expect(result.current.params.btcAmount).toBe(5)

    // Reset parameters
    act(() => {
      result.current.resetParams()
    })

    expect(result.current.params).toEqual(DEFAULT_PARAMS)
  })

  it('should manage pagination state', () => {
    const { result } = renderHook(() => useSimulation(), { wrapper })

    expect(result.current.currentPage).toBe(1)

    act(() => {
      result.current.setCurrentPage(3)
    })

    expect(result.current.currentPage).toBe(3)
  })
})

describe('SimulationContext Error Handling', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useSimulation())
    }).toThrow('useSimulation must be used within a SimulationProvider')

    consoleSpy.mockRestore()
  })
})
