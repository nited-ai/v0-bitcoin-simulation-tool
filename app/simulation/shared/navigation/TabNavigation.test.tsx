import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabNavigation } from './TabNavigation'
import { SimulationProvider } from '../../context/SimulationContext'

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

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}))

// Test wrapper with SimulationProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SimulationProvider>
    {children}
  </SimulationProvider>
)

// Helper function to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper })
}

describe('TabNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    vi.stubGlobal('localStorage', localStorageMock)
  })

  it('renders all four tabs', () => {
    renderWithProviders(<TabNavigation />)

    expect(screen.getByRole('tab', { name: /parameters/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /price projection/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /strategy/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument()
  })

  it('has parameters tab selected by default', () => {
    renderWithProviders(<TabNavigation />)

    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    expect(parametersTab).toHaveAttribute('data-state', 'active')
  })

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TabNavigation />)

    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)

    expect(priceProjectionTab).toHaveAttribute('data-state', 'active')
  })

  it('displays correct tab content when switching', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TabNavigation />)

    // Check initial content - look for actual content that exists
    expect(screen.getByText(/basic parameters/i)).toBeInTheDocument()

    // Switch to price projection tab
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)

    expect(screen.getByText(/price model selector/i)).toBeInTheDocument()
    expect(screen.queryByText(/basic parameters/i)).not.toBeInTheDocument()
  })

  it('supports keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TabNavigation />)

    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    parametersTab.focus()

    // Navigate to next tab with right arrow
    await user.keyboard('{ArrowRight}')

    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    expect(priceProjectionTab).toHaveFocus()
  })

  it('supports keyboard navigation with tab key', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TabNavigation />)

    // Tab through the navigation
    await user.tab()

    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    expect(parametersTab).toHaveFocus()
  })

  it('has proper ARIA attributes for accessibility', () => {
    renderWithProviders(<TabNavigation />)

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
    renderWithProviders(<TabNavigation />)

    const strategyTab = screen.getByRole('tab', { name: /strategy/i })
    await user.click(strategyTab)

    expect(mockReplace).toHaveBeenCalledWith('?tab=strategy')
  })

  it('preserves data when switching between tabs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TabNavigation />)

    // Switch to price projection and back to parameters
    const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
    await user.click(priceProjectionTab)

    const parametersTab = screen.getByRole('tab', { name: /parameters/i })
    await user.click(parametersTab)

    // Data should be preserved - look for actual content that exists
    expect(screen.getByText(/basic parameters/i)).toBeInTheDocument()
  })

  describe('Strategy and Results Tab Activation', () => {
    it('enables strategy tab and removes coming soon badge', () => {
      renderWithProviders(<TabNavigation />)

      const strategyTab = screen.getByRole('tab', { name: /strategy/i })
      expect(strategyTab).toBeInTheDocument()
      expect(strategyTab).not.toBeDisabled()
      expect(strategyTab).not.toHaveAttribute('disabled')

      // Should not have "Coming Soon" badge
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    })

    it('enables results tab and removes coming soon badge', () => {
      renderWithProviders(<TabNavigation />)

      const resultsTab = screen.getByRole('tab', { name: /results/i })
      expect(resultsTab).toBeInTheDocument()
      expect(resultsTab).not.toBeDisabled()
      expect(resultsTab).not.toHaveAttribute('disabled')

      // Should not have "Coming Soon" badge
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    })

    it('allows navigation to strategy tab', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TabNavigation />)

      const strategyTab = screen.getByRole('tab', { name: /strategy/i })
      await user.click(strategyTab)

      expect(strategyTab).toHaveAttribute('data-state', 'active')
      expect(mockReplace).toHaveBeenCalledWith('?tab=strategy')
    })

    it('allows navigation to results tab', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TabNavigation />)

      const resultsTab = screen.getByRole('tab', { name: /results/i })
      await user.click(resultsTab)

      expect(resultsTab).toHaveAttribute('data-state', 'active')
      expect(mockReplace).toHaveBeenCalledWith('?tab=results')
    })

    it('displays strategy tab content when selected', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TabNavigation />)

      const strategyTab = screen.getByRole('tab', { name: /strategy/i })
      await user.click(strategyTab)

      // Should display strategy content
      expect(screen.getByText(/strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/choose and configure your bitcoin lending strategy/i)).toBeInTheDocument()
    })

    it('displays results tab content when selected', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TabNavigation />)

      const resultsTab = screen.getByRole('tab', { name: /results/i })
      await user.click(resultsTab)

      // Should display results content (placeholder for now)
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })

    it('supports keyboard navigation to all four tabs', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TabNavigation />)

      const parametersTab = screen.getByRole('tab', { name: /parameters/i })
      parametersTab.focus()

      // Navigate through all tabs with arrow keys
      await user.keyboard('{ArrowRight}')
      const priceProjectionTab = screen.getByRole('tab', { name: /price projection/i })
      expect(priceProjectionTab).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      const strategyTab = screen.getByRole('tab', { name: /strategy/i })
      expect(strategyTab).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      const resultsTab = screen.getByRole('tab', { name: /results/i })
      expect(resultsTab).toHaveFocus()
    })
  })
})
