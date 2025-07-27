import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabNavigation } from './TabNavigation'

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}))

describe('TabNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all four tabs', () => {
    render(<TabNavigation />)
    
    expect(screen.getByRole('tab', { name: /parameters/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /price projection/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /strategy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument()
  })

  it('has parameters tab selected by default', () => {
    render(<TabNavigation />)
    
    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    expect(parametersTab).toHaveAttribute('data-state', 'active')
  })

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)
    
    expect(priceProjectionTab).toHaveAttribute('data-state', 'active')
  })

  it('displays correct tab content when switching', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    // Check initial content
    expect(screen.getByText(/parameters content/i)).toBeInTheDocument()
    
    // Switch to price projection tab
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)
    
    expect(screen.getByText(/price projection content/i)).toBeInTheDocument()
    expect(screen.queryByText(/parameters content/i)).not.toBeInTheDocument()
  })

  it('supports keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    parametersTab.focus()
    
    // Navigate to next tab with right arrow
    await user.keyboard('{ArrowRight}')
    
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    expect(priceProjectionTab).toHaveFocus()
  })

  it('supports keyboard navigation with tab key', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    // Tab through the navigation
    await user.tab()
    
    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    expect(parametersTab).toHaveFocus()
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(<TabNavigation />)
    
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()
    
    const tabs = screen.getAllByRole('tab')
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-selected')
      expect(tab).toHaveAttribute('aria-controls')
    })
    
    const tabPanels = screen.getAllByRole('tabpanel')
    tabPanels.forEach(panel => {
      expect(panel).toHaveAttribute('aria-labelledby')
    })
  })

  it('updates URL when tab changes', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    const strategyTab = screen.getByRole('tab', { name: /strategy/i })
    await user.click(strategyTab)
    
    expect(mockReplace).toHaveBeenCalledWith('?tab=strategy')
  })

  it('preserves data when switching between tabs', async () => {
    const user = userEvent.setup()
    render(<TabNavigation />)
    
    // Switch to price projection and back to parameters
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)
    
    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    await user.click(parametersTab)
    
    // Data should be preserved (this will be tested with actual form data later)
    expect(screen.getByText(/parameters content/i)).toBeInTheDocument()
  })
})
