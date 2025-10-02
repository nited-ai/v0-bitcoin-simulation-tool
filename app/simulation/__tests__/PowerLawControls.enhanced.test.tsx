/**
 * Tests for enhanced PowerLawControls component with volatility support
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PowerLawControls } from '../tabs/price-projection/power-law/PowerLawControls'
import { SimulationProvider } from '../context/SimulationContext'
import type { SimulationParams } from '../types/simulation'

// Mock simulation context with Power Law settings
const mockSimulationParams: SimulationParams = {
  priceModel: 'powerLaw',
  simulationMonths: 12,
  initialBtcPrice: 50000,
  powerLawSettings: {
    prognosisLine: 'fit',
    controlMode: 'unified',
    unifiedSlope: 5.844,
    unifiedIntercept: -17.01,
    individualParams: {
      fit: { slope: 5.844, intercept: -17.01 },
      support: { slope: 5.844, intercept: -17.46 },
      resistance: { slope: 5.06, intercept: -13.5 }
    }
  }
}

const MockSimulationProvider = ({ children, initialParams = mockSimulationParams }: { 
  children: React.ReactNode
  initialParams?: SimulationParams 
}) => {
  const [params, setParams] = React.useState(initialParams)
  
  return (
    <SimulationProvider value={{ params, setParams }}>
      {children}
    </SimulationProvider>
  )
}

describe('Enhanced PowerLawControls', () => {
  describe('Volatility Toggle Section', () => {
    it('should render volatility toggle control', () => {
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByText(/cycle repeat volatility/i)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /enable cycle repeat volatility/i })).toBeInTheDocument()
    })

    it('should enable volatility controls when toggle is checked', async () => {
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const toggle = screen.getByRole('checkbox', { name: /enable cycle repeat volatility/i })
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(screen.getByText(/pattern length/i)).toBeInTheDocument()
        expect(screen.getByText(/diminishing factor/i)).toBeInTheDocument()
      })
    })

    it('should hide volatility controls when toggle is unchecked', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const toggle = screen.getByRole('checkbox', { name: /enable cycle repeat volatility/i })
      fireEvent.click(toggle) // Disable

      await waitFor(() => {
        expect(screen.queryByText(/pattern length/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/diminishing factor/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Pattern Length Slider', () => {
    it('should render pattern length slider with default value (96 months)', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByText(/pattern length/i)).toBeInTheDocument()
      expect(screen.getByText('96')).toBeInTheDocument() // Default value display
    })

    it('should update pattern length when slider changes', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const slider = screen.getByRole('slider', { name: /pattern length/i })
      fireEvent.change(slider, { target: { value: '48' } })

      await waitFor(() => {
        expect(screen.getByText('48')).toBeInTheDocument()
      })
    })
  })

  describe('Diminishing Factor Slider', () => {
    it('should render diminishing factor slider with default value (1.0)', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByText(/diminishing factor/i)).toBeInTheDocument()
      expect(screen.getByText('1.00')).toBeInTheDocument() // Default value display
    })

    it('should update diminishing factor when slider changes', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const slider = screen.getByRole('slider', { name: /diminishing factor/i })
      fireEvent.change(slider, { target: { value: '0.75' } })

      await waitFor(() => {
        expect(screen.getByText('0.75')).toBeInTheDocument()
      })
    })
  })

  describe('Apply to Price Projection Button', () => {
    it('should render "Apply to Price Projection" button', () => {
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByRole('button', { name: /apply to price projection/i })).toBeInTheDocument()
    })

    it('should copy Fit line parameters to price projection when clicked', async () => {
      const setParamsMock = jest.fn()
      
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const button = screen.getByRole('button', { name: /apply to price projection/i })
      fireEvent.click(button)

      // Should trigger parameter update with price projection params
      await waitFor(() => {
        expect(setParamsMock).toHaveBeenCalled()
      })
    })
  })

  describe('Price Projection Parameter Display', () => {
    it('should show current price projection parameters when set', () => {
      const paramsWithProjection = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          priceProjectionParams: {
            slope: 6.0,
            intercept: -18.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithProjection}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByText(/price projection parameters/i)).toBeInTheDocument()
      expect(screen.getByText('6.000')).toBeInTheDocument() // Slope
      expect(screen.getByText('-18.000')).toBeInTheDocument() // Intercept
    })

    it('should show "Using Fit line" when no custom parameters set', () => {
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      expect(screen.getByText(/using fit line/i)).toBeInTheDocument()
    })
  })

  describe('Informational Tooltips', () => {
    it('should show tooltip explaining volatility affects price projection only', async () => {
      render(
        <MockSimulationProvider>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const infoIcon = screen.getByRole('button', { name: /volatility info/i })
      fireEvent.mouseEnter(infoIcon)

      await waitFor(() => {
        expect(screen.getByText(/affects price projection line only/i)).toBeInTheDocument()
        expect(screen.getByText(/regression lines remain pure mathematical curves/i)).toBeInTheDocument()
      })
    })

    it('should show tooltip for pattern length parameter', async () => {
      const paramsWithVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled: true,
            patternLengthMonths: 96,
            diminishingFactor: 1.0
          }
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      const infoIcon = screen.getByRole('button', { name: /pattern length info/i })
      fireEvent.mouseEnter(infoIcon)

      await waitFor(() => {
        expect(screen.getByText(/months of historical data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Default Values', () => {
    it('should set correct default values on component initialization', () => {
      const paramsWithoutVolatility = {
        ...mockSimulationParams,
        powerLawSettings: {
          ...mockSimulationParams.powerLawSettings!
          // No volatility settings
        }
      }

      render(
        <MockSimulationProvider initialParams={paramsWithoutVolatility}>
          <PowerLawControls />
        </MockSimulationProvider>
      )

      // Volatility should be disabled by default
      const toggle = screen.getByRole('checkbox', { name: /enable cycle repeat volatility/i })
      expect(toggle).not.toBeChecked()
    })
  })
})
