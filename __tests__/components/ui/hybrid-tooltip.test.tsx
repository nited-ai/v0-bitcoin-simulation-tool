import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TouchProvider, useTouch, HybridTooltip, HybridTooltipTrigger, HybridTooltipContent, HybridTooltipProvider } from '@/components/ui/hybrid-tooltip'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

beforeEach(() => {
  // Reset the mock before each test
  mockMatchMedia.mockClear()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TouchProvider', () => {
  it('should detect touch devices using CSS media query', () => {
    // Mock touch device
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const TestComponent = () => {
      const isTouch = useTouch()
      return <div data-testid="touch-status">{isTouch ? 'touch' : 'no-touch'}</div>
    }

    render(
      <TouchProvider>
        <TestComponent />
      </TouchProvider>
    )

    expect(mockMatchMedia).toHaveBeenCalledWith('(pointer: coarse)')
    expect(screen.getByTestId('touch-status')).toHaveTextContent('touch')
  })

  it('should detect non-touch devices using CSS media query', () => {
    // Mock non-touch device
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const TestComponent = () => {
      const isTouch = useTouch()
      return <div data-testid="touch-status">{isTouch ? 'touch' : 'no-touch'}</div>
    }

    render(
      <TouchProvider>
        <TestComponent />
      </TouchProvider>
    )

    expect(mockMatchMedia).toHaveBeenCalledWith('(pointer: coarse)')
    expect(screen.getByTestId('touch-status')).toHaveTextContent('no-touch')
  })

  it('should handle undefined state during initial render', () => {
    // Mock initial undefined state
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const TestComponent = () => {
      const isTouch = useTouch()
      return <div data-testid="touch-status">{isTouch === undefined ? 'undefined' : isTouch ? 'touch' : 'no-touch'}</div>
    }

    render(
      <TouchProvider>
        <TestComponent />
      </TouchProvider>
    )

    // Should eventually resolve to non-touch
    expect(screen.getByTestId('touch-status')).toHaveTextContent('no-touch')
  })

  it('should update touch detection when device capabilities change', async () => {
    const mockAddEventListener = vi.fn()
    const mockRemoveEventListener = vi.fn()
    
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    })

    const TestComponent = () => {
      const isTouch = useTouch()
      return <div data-testid="touch-status">{isTouch ? 'touch' : 'no-touch'}</div>
    }

    const { unmount } = render(
      <TouchProvider>
        <TestComponent />
      </TouchProvider>
    )

    // Should set up event listener for media query changes
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    // Cleanup should remove event listener
    unmount()
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})

describe('HybridTooltip', () => {
  it('should render Popover component on touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="touch-trigger">Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p>Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    // Should render popover trigger (button should be clickable)
    const trigger = screen.getByTestId('touch-trigger')
    expect(trigger).toBeInTheDocument()
  })

  it('should render EnhancedTooltip component on non-touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="desktop-trigger">Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p>Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    // Should render enhanced tooltip trigger
    const trigger = screen.getByTestId('desktop-trigger')
    expect(trigger).toBeInTheDocument()
  })
})

describe('HybridTooltipTrigger', () => {
  it('should render PopoverTrigger on touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Touch Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p>Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')
    expect(trigger).toBeInTheDocument()
    
    // Click should work for popover
    fireEvent.click(trigger)
    // Popover content should appear
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should render EnhancedTooltipTrigger on non-touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Desktop Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p>Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')
    expect(trigger).toBeInTheDocument()
  })
})

describe('HybridTooltipContent', () => {
  it('should render PopoverContent on touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button>Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Popover Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    // Click to open popover
    fireEvent.click(screen.getByRole('button'))
    
    // Should render popover content
    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByText('Popover Content')).toBeInTheDocument()
  })

  it('should render TooltipContent component on non-touch devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Tooltip Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')

    // Should render trigger correctly (tooltip content is not visible until hover/click)
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('data-state', 'closed')

    // Content should not be visible initially
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})

describe('EnhancedTooltipTrigger (Desktop Dual Functionality)', () => {
  beforeEach(() => {
    // Mock non-touch device for all enhanced tooltip tests
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('should render enhanced tooltip trigger correctly', () => {
    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Enhanced Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Enhanced Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')

    // Should render trigger correctly
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('data-state', 'closed')

    // Content should not be visible initially
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('should support click interaction for persistent tooltip display', async () => {
    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Click Me</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Click Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')

    // Click should show persistent tooltip
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    // Mouse leave should NOT hide persistent tooltip
    fireEvent.mouseLeave(trigger)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  it('should coordinate hover and click interactions without conflicts', async () => {
    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Dual Interaction</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Dual Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')

    // Start with hover
    fireEvent.mouseEnter(trigger)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    // Click while hovering should make it persistent
    fireEvent.click(trigger)

    // Mouse leave should not hide it (now persistent)
    fireEvent.mouseLeave(trigger)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    // Second click should close persistent tooltip
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('should handle click-outside dismissal for persistent tooltips', async () => {
    render(
      <div>
        <TouchProvider>
          <HybridTooltipProvider>
            <HybridTooltip>
              <HybridTooltipTrigger asChild>
                <button data-testid="trigger">Persistent Trigger</button>
              </HybridTooltipTrigger>
              <HybridTooltipContent>
                <p data-testid="content">Persistent Content</p>
              </HybridTooltipContent>
            </HybridTooltip>
          </HybridTooltipProvider>
        </TouchProvider>
        <button data-testid="outside">Outside Button</button>
      </div>
    )

    const trigger = screen.getByTestId('trigger')
    const outsideButton = screen.getByTestId('outside')

    // Click to show persistent tooltip
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    // Click outside should close persistent tooltip
    fireEvent.click(outsideButton)
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('should handle keyboard navigation (Enter, Space, Escape)', async () => {
    render(
      <TouchProvider>
        <HybridTooltipProvider>
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <button data-testid="trigger">Keyboard Trigger</button>
            </HybridTooltipTrigger>
            <HybridTooltipContent>
              <p data-testid="content">Keyboard Content</p>
            </HybridTooltipContent>
          </HybridTooltip>
        </HybridTooltipProvider>
      </TouchProvider>
    )

    const trigger = screen.getByTestId('trigger')
    trigger.focus()

    // Enter should open tooltip
    fireEvent.keyDown(trigger, { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    // Escape should close tooltip
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })

    // Space should also open tooltip
    fireEvent.keyDown(trigger, { key: ' ' })
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })
})
