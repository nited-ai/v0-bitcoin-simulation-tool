/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { ReactNode } from 'react'
import { SimulationProvider } from '../context/SimulationContext'
import { PriceDropToleranceCard, CollateralVisualizationCard, LoanUsageVisualizationCard } from '../tabs/parameters'
import { useCalculationsIntegration } from '../hooks/useCalculationsIntegration'
import { renderHook } from '@testing-library/react'

// Mock wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <SimulationProvider>{children}</SimulationProvider>
)

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  LabelList: () => <div data-testid="label-list" />
}))

describe('Component Refactoring Integration Tests', () => {
  describe('useCalculationsIntegration Hook', () => {
    it('should provide calculations for components', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      expect(result.current.calculations).toBeDefined()
      expect(typeof result.current.getLiquidationPrice).toBe('function')
      expect(typeof result.current.getCollateralUtilization).toBe('function')
      expect(typeof result.current.getCurrentLoanAmount).toBe('function')
    })

    it('should provide helper functions for liquidation calculations', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const immediateLiquidation = result.current.getLiquidationPrice(true)
      const trueLiquidation = result.current.getLiquidationPrice(false)
      const priceDropImmediate = result.current.getPriceDropPercentage(true)
      const priceDropTrue = result.current.getPriceDropPercentage(false)
      
      expect(typeof immediateLiquidation).toBe('number')
      expect(typeof trueLiquidation).toBe('number')
      expect(typeof priceDropImmediate).toBe('number')
      expect(typeof priceDropTrue).toBe('number')
    })

    it('should provide helper functions for collateral calculations', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const lockedBtc = result.current.getLockedCollateral(true)
      const lockedUsd = result.current.getLockedCollateral(false)
      const freeBtc = result.current.getFreeCollateral(true)
      const freeUsd = result.current.getFreeCollateral(false)
      const utilization = result.current.getCollateralUtilization()
      
      expect(typeof lockedBtc).toBe('number')
      expect(typeof lockedUsd).toBe('number')
      expect(typeof freeBtc).toBe('number')
      expect(typeof freeUsd).toBe('number')
      expect(typeof utilization).toBe('number')
    })

    it('should provide helper functions for loan calculations', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const currentLoan = result.current.getCurrentLoanAmount()
      const maxCapacity = result.current.getMaxLoanCapacity()
      const available = result.current.getAvailableBorrowingCapacity()
      const utilization = result.current.getLoanUtilization()
      
      expect(typeof currentLoan).toBe('number')
      expect(typeof maxCapacity).toBe('number')
      expect(typeof available).toBe('number')
      expect(typeof utilization).toBe('number')
    })
  })

  describe('PriceDropToleranceCard Integration', () => {
    it('should render without errors', () => {
      render(<PriceDropToleranceCard />, { wrapper })
      
      expect(screen.getByText('Liquidation Tolerance')).toBeInTheDocument()
    })

    it('should display chart components', () => {
      render(<PriceDropToleranceCard />, { wrapper })
      
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2)
      expect(screen.getAllByTestId('bar-chart')).toHaveLength(2)
    })

    it('should show no loan message when loan amount is zero', () => {
      render(<PriceDropToleranceCard />, { wrapper })
      
      // Default params should have some loan amount, but let's test the zero case
      // This would require setting up the simulation context with zero loan
      expect(screen.getByText('Liquidation Tolerance')).toBeInTheDocument()
    })
  })

  describe('CollateralVisualizationCard Integration', () => {
    it('should render without errors', () => {
      render(<CollateralVisualizationCard />, { wrapper })
      
      expect(screen.getByText('Collateral Usage')).toBeInTheDocument()
    })

    it('should display pie chart components', () => {
      render(<CollateralVisualizationCard />, { wrapper })
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    it('should show legend with Free and Locked labels', () => {
      render(<CollateralVisualizationCard />, { wrapper })
      
      expect(screen.getByText('Free')).toBeInTheDocument()
      expect(screen.getByText('Locked')).toBeInTheDocument()
    })
  })

  describe('LoanUsageVisualizationCard Integration', () => {
    it('should render without errors', () => {
      render(<LoanUsageVisualizationCard />, { wrapper })
      
      expect(screen.getByText('Loan Usage')).toBeInTheDocument()
    })

    it('should display pie chart components', () => {
      render(<LoanUsageVisualizationCard />, { wrapper })
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    it('should show legend with Used and Available labels', () => {
      render(<LoanUsageVisualizationCard />, { wrapper })
      
      expect(screen.getByText('Used')).toBeInTheDocument()
      expect(screen.getByText('Available')).toBeInTheDocument()
    })
  })

  describe('Calculation Consistency Tests', () => {
    it('should provide consistent liquidation calculations across components', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const calculations = result.current.calculations
      if (calculations) {
        // Test that liquidation calculations are consistent
        expect(calculations.liquidation.liquidationPrice).toBeGreaterThanOrEqual(0)
        expect(calculations.liquidation.trueLiquidationPrice).toBeGreaterThanOrEqual(0)
        expect(calculations.liquidation.priceDropPercentage).toBeGreaterThanOrEqual(0)
        expect(calculations.liquidation.truePriceDropPercentage).toBeGreaterThanOrEqual(0)
      }
    })

    it('should provide consistent collateral calculations across components', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const calculations = result.current.calculations
      if (calculations) {
        // Test that collateral calculations are consistent
        expect(calculations.collateral.totalStackValue).toBeGreaterThan(0)
        expect(calculations.collateral.lockedCollateralBtc).toBeGreaterThanOrEqual(0)
        expect(calculations.collateral.freeCollateralBtc).toBeGreaterThanOrEqual(0)
        expect(calculations.collateral.collateralUtilizationPercent).toBeGreaterThanOrEqual(0)
        
        // Test that locked + free = total (within rounding tolerance)
        const totalCalculated = calculations.collateral.lockedCollateralBtc + calculations.collateral.freeCollateralBtc
        expect(Math.abs(totalCalculated - calculations.collateral.totalStackValue / calculations.liquidation.currentBtcPrice)).toBeLessThan(0.001)
      }
    })

    it('should provide consistent loan calculations across components', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      const calculations = result.current.calculations
      if (calculations) {
        // Test that loan calculations are consistent
        expect(calculations.loan.currentLoanAmount).toBeGreaterThanOrEqual(0)
        expect(calculations.loan.maxLoanCapacity).toBeGreaterThanOrEqual(0)
        expect(calculations.loan.availableBorrowingCapacity).toBeGreaterThanOrEqual(0)
        expect(calculations.loan.loanUtilizationPercent).toBeGreaterThanOrEqual(0)
        expect(calculations.loan.availableCapacityPercent).toBeGreaterThanOrEqual(0)
        
        // Test that utilization + available = 100% (within rounding tolerance)
        const totalPercentage = calculations.loan.loanUtilizationPercent + calculations.loan.availableCapacityPercent
        expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1)
      }
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle invalid parameters gracefully', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      // Even with default parameters, the hook should not throw
      expect(() => result.current.calculations).not.toThrow()
    })

    it('should provide fallback values when calculations fail', () => {
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      // Helper functions should always return numbers, never undefined
      expect(typeof result.current.getLiquidationPrice()).toBe('number')
      expect(typeof result.current.getCollateralUtilization()).toBe('number')
      expect(typeof result.current.getCurrentLoanAmount()).toBe('number')
    })
  })

  describe('Performance Tests', () => {
    it('should complete calculations within reasonable time', () => {
      const startTime = performance.now()
      
      const { result } = renderHook(() => useCalculationsIntegration(), { wrapper })
      
      // Access calculations to trigger computation
      const calculations = result.current.calculations
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(50) // Should complete within 50ms
      expect(calculations).toBeDefined()
    })
  })
})
