import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DiminishingReturnsControls } from './DiminishingReturnsControls'

// jsdom polyfills required by Radix primitives
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverStub

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// Mock simulation context — return enhancedCycleRepeat so the component renders
const mockSimulationContext = {
  params: {
    priceModel: 'enhancedCycleRepeat',
  },
  setParams: vi.fn(),
}

vi.mock('../../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext,
}))

const STORAGE_KEY = 'bitcoin-sim-diminishing-returns-params'

// Conservative and Optimistic presets — kept in sync with the component.
// We assert against diminishingFactor as a stable identifier per preset.
const CONSERVATIVE_DIMINISHING_FACTOR = 0.8
const OPTIMISTIC_DIMINISHING_FACTOR = 0.2
const MODERATE_DIMINISHING_FACTOR = 0.5

function renderControls() {
  return render(
    <TooltipProvider>
      <DiminishingReturnsControls />
    </TooltipProvider>
  )
}

function getPresetCard(name: string): Element {
  const card = screen.getByText(name).closest('div[class*="cursor-pointer"]')
  if (!card) throw new Error(`Preset card not found: ${name}`)
  return card
}

describe('DiminishingReturnsControls — preset selection (stale-closure regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('saves OPTIMISTIC params to sessionStorage when Conservative then Optimistic is clicked', () => {
    vi.useFakeTimers()
    try {
      renderControls()

      fireEvent.click(getPresetCard('Conservative'))
      fireEvent.click(getPresetCard('Optimistic'))

      // Flush any pending setTimeouts (the buggy code uses setTimeout(100))
      // — the LAST timer to fire should not overwrite with stale params.
      act(() => {
        vi.runAllTimers()
      })

      const stored = sessionStorage.getItem(STORAGE_KEY)
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      expect(parsed.diminishingFactor).toBe(OPTIMISTIC_DIMINISHING_FACTOR)
    } finally {
      vi.useRealTimers()
    }
  })

  it('saves the LAST clicked preset when multiple presets are clicked in rapid succession', () => {
    vi.useFakeTimers()
    try {
      renderControls()

      // Rapid succession — all clicks within one synchronous batch,
      // no microtask flush in between, so each setTimeout in the buggy
      // code captures the same stale customParams closure.
      act(() => {
        fireEvent.click(getPresetCard('Conservative'))
        fireEvent.click(getPresetCard('Optimistic'))
        fireEvent.click(getPresetCard('Moderate'))
        fireEvent.click(getPresetCard('Optimistic'))
      })

      act(() => {
        vi.runAllTimers()
      })

      const stored = sessionStorage.getItem(STORAGE_KEY)
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored as string)
      // Last click was Optimistic — sessionStorage must match.
      expect(parsed.diminishingFactor).toBe(OPTIMISTIC_DIMINISHING_FACTOR)
    } finally {
      vi.useRealTimers()
    }
  })

  it('triggers setParams synchronously on preset click (no setTimeout)', () => {
    renderControls()

    mockSimulationContext.setParams.mockClear()
    fireEvent.click(getPresetCard('Conservative'))

    // The fix removes setTimeout — setParams must be called synchronously.
    expect(mockSimulationContext.setParams).toHaveBeenCalled()

    const updater = mockSimulationContext.setParams.mock.calls[
      mockSimulationContext.setParams.mock.calls.length - 1
    ][0]
    const result = updater({ priceModel: 'enhancedCycleRepeat' })
    expect(result.diminishingReturnsUpdated).toEqual(expect.any(Number))
    expect(result.lastUpdated).toEqual(expect.any(Number))
  })
})

describe('DiminishingReturnsControls — slider preset semantics & commit behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('Conservative preset stores diminishingFactor=0.8 and cycleDegradation=0.05 (LOW threshold = heavy dampening)', () => {
    renderControls()
    fireEvent.click(getPresetCard('Conservative'))

    const stored = sessionStorage.getItem(STORAGE_KEY)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored as string)
    expect(parsed.diminishingFactor).toBe(0.8)
    expect(parsed.cycleDegradation).toBe(0.05)
  })

  it('Optimistic preset stores diminishingFactor=0.2 and cycleDegradation=0.30 (HIGH threshold = light dampening)', () => {
    renderControls()
    fireEvent.click(getPresetCard('Optimistic'))

    const stored = sessionStorage.getItem(STORAGE_KEY)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored as string)
    expect(parsed.diminishingFactor).toBe(0.2)
    expect(parsed.cycleDegradation).toBe(0.30)
  })

  it('Slider release (onValueCommit) auto-applies parameters via setParams', () => {
    renderControls()

    // Find a slider via its Radix role
    const sliders = document.querySelectorAll('[role="slider"]')
    expect(sliders.length).toBeGreaterThan(0)

    mockSimulationContext.setParams.mockClear()

    // Simulate a parameter change first (sets hasUnappliedChanges)
    // and then a commit. We trigger the commit via the underlying Radix
    // pointerup which fires onValueCommit. Since jsdom can't drag, we
    // exercise the same code path the UI does on release: keyboard nav
    // also triggers onValueCommit on keyup. Use a keydown+keyup sequence.
    const firstSlider = sliders[0] as HTMLElement
    firstSlider.focus()
    fireEvent.keyDown(firstSlider, { key: 'ArrowRight' })
    fireEvent.keyUp(firstSlider, { key: 'ArrowRight' })

    // After keyup, Radix calls onValueCommit which calls applyParameters,
    // which calls setParams. sessionStorage must reflect the committed value.
    const stored = sessionStorage.getItem(STORAGE_KEY)
    expect(stored).toBeTruthy()

    // applyParameters() writes to setParams — confirm it was triggered.
    expect(mockSimulationContext.setParams).toHaveBeenCalled()
  })
})
