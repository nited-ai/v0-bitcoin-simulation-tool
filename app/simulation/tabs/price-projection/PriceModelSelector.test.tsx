import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceModelSelector } from './PriceModelSelector'

// Mock the price model registry
const mockRegistry = {
  getModelNames: vi.fn(),
  getModel: vi.fn(),
  getModelDefaultParams: vi.fn(),
}

vi.mock('../../price-models/PriceModelRegistry', () => ({
  priceModelRegistry: mockRegistry,
}))

// Mock simulation context
const mockSimulationContext = {
  params: {
    priceModel: 'manual',
  },
  setParams: vi.fn(),
}

vi.mock('../../context/SimulationContext', () => ({
  useSimulation: () => mockSimulationContext,
}))

describe('PriceModelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock data
    mockRegistry.getModelNames.mockReturnValue([
      {
        id: 'manual',
        name: 'Manual Growth Rates',
        description: 'User-defined annual growth rates for custom price projections'
      },
      {
        id: 'powerLaw',
        name: 'Power Law Model',
        description: 'Bitcoin price prediction based on logarithmic regression since genesis'
      },
      {
        id: 'cycleRepeat',
        name: 'Cycle Repeat Model',
        description: 'Bitcoin price prediction based on repeating historical cycles'
      }
    ])
  })

  it('renders price model selector with placeholder', () => {
    render(<PriceModelSelector />)
    
    expect(screen.getByText('Choose price prediction model')).toBeInTheDocument()
  })

  it('loads available models from registry', async () => {
    render(<PriceModelSelector />)
    
    expect(mockRegistry.getModelNames).toHaveBeenCalled()
  })

  it('displays all available models when opened', async () => {
    const user = userEvent.setup()
    render(<PriceModelSelector />)
    
    // Open the select dropdown
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    // Check if all models are displayed
    expect(screen.getByText('Manual Growth Rates')).toBeInTheDocument()
    expect(screen.getByText('Power Law Model')).toBeInTheDocument()
    expect(screen.getByText('Cycle Repeat Model')).toBeInTheDocument()
  })

  it('shows model descriptions in dropdown options', async () => {
    const user = userEvent.setup()
    render(<PriceModelSelector />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    expect(screen.getByText('User-defined annual growth rates for custom price projections')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin price prediction based on logarithmic regression since genesis')).toBeInTheDocument()
  })

  it('updates simulation context when model is selected', async () => {
    const user = userEvent.setup()
    render(<PriceModelSelector />)
    
    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    
    const powerLawOption = screen.getByText('Power Law Model')
    await user.click(powerLawOption)
    
    expect(mockSimulationContext.setParams).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it('displays current selected model', () => {
    mockSimulationContext.params.priceModel = 'powerLaw'
    render(<PriceModelSelector />)
    
    expect(screen.getByDisplayValue('powerLaw')).toBeInTheDocument()
  })

  it('handles loading state when models are being fetched', () => {
    mockRegistry.getModelNames.mockReturnValue([])
    render(<PriceModelSelector />)
    
    expect(screen.getByText('Loading models...')).toBeInTheDocument()
  })

  it('handles error state when registry fails', () => {
    mockRegistry.getModelNames.mockImplementation(() => {
      throw new Error('Registry error')
    })
    
    render(<PriceModelSelector />)
    
    expect(screen.getByText('Error loading models')).toBeInTheDocument()
  })

  it('disables selector when no models are available', () => {
    mockRegistry.getModelNames.mockReturnValue([])
    render(<PriceModelSelector />)
    
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<PriceModelSelector />)
    
    const trigger = screen.getByRole('combobox')
    trigger.focus()
    
    // Open with Enter key
    await user.keyboard('{Enter}')
    
    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    
    expect(mockSimulationContext.setParams).toHaveBeenCalled()
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(<PriceModelSelector />)
    
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-expanded')
    expect(trigger).toHaveAttribute('aria-haspopup')
  })
})
