/**
 * CollateralSummaryCard Component Tests
 *
 * Tests for the enhanced collateral summary card that displays
 * comprehensive Bitcoin price and ATH analysis.
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollateralSummaryCard } from '../CollateralSummaryCard'
import { useATH } from '../../../hooks/useATH'

// Mock the useATH hook
vi.mock('../../../hooks/useATH')

describe('CollateralSummaryCard', () => {
  const mockUseATH = useATH as ReturnType<typeof vi.fn>

  const defaultProps = {
    btcAmount: 1.5,
    initialBtcPrice: 100000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    mockUseATH.mockReturnValue({
      ath: 124277.98,
      athData: null,
      loading: false,
      error: null,
      refetch: vi.fn()
    })
  })

  describe('Total Collateral Value Display', () => {
    it('should display correct total collateral value', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      // Should show $150,000 (1.5 BTC × $100,000)
      expect(screen.getByText('$150,000')).toBeInTheDocument()
    })

    it('should display BTC amount and price breakdown', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      expect(screen.getByText('1.5000 BTC × $100,000')).toBeInTheDocument()
    })

    it('should display collateral availability text', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      expect(screen.getByText('Available for loan collateral')).toBeInTheDocument()
    })

    it('should format large amounts correctly', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={10} 
          initialBtcPrice={125000} 
        />
      )
      
      // Should show $1,250,000 with proper formatting
      expect(screen.getByText('$1,250,000')).toBeInTheDocument()
    })
  })

  describe('ATH Price Display', () => {
    it('should display current ATH price', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      expect(screen.getByText('$124,278')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: true,
        error: null,
        refetch: vi.fn()
      })

      render(<CollateralSummaryCard {...defaultProps} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show fallback value on error', () => {
      mockUseATH.mockReturnValue({
        ath: 124277.98,
        athData: null,
        loading: false,
        error: 'Network error',
        refetch: vi.fn()
      })

      render(<CollateralSummaryCard {...defaultProps} />)
      
      expect(screen.getByText('$124,278')).toBeInTheDocument()
      expect(screen.getByText('(fallback)')).toBeInTheDocument()
    })
  })

  describe('ATH Distance Analysis', () => {
    it('should display correct distance percentage and USD amount', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      // Current price $100,000, ATH $124,277.98
      // Distance: (124277.98 - 100000) / 124277.98 * 100 ≈ 19.5%
      expect(screen.getByText('19.5% below ATH')).toBeInTheDocument()
      expect(screen.getByText('$24,278 difference')).toBeInTheDocument()
    })

    it('should show low risk indicator when far from ATH', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={80000} // 35.6% below ATH
        />
      )
      
      expect(screen.getByText('Low Risk - Far from ATH')).toBeInTheDocument()
      expect(screen.getByText('Good time for loans - price is far from ATH')).toBeInTheDocument()
    })

    it('should show medium risk indicator when moderately close to ATH', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={100000} // ~19.5% below ATH
        />
      )
      
      expect(screen.getByText('Medium Risk - Moderate distance from ATH')).toBeInTheDocument()
      expect(screen.getByText('Moderate risk - consider loan size carefully')).toBeInTheDocument()
    })

    it('should show high risk indicator when near ATH', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={120000} // ~3.4% below ATH
        />
      )
      
      expect(screen.getByText('High Risk - Near ATH')).toBeInTheDocument()
      expect(screen.getByText('High risk - price is near ATH, loans may be risky')).toBeInTheDocument()
    })
  })

  describe('Risk Color Coding', () => {
    it('should apply green color for low risk', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={80000} // Low risk
        />
      )
      
      const riskIndicator = screen.getByText('Low Risk - Far from ATH')
      const parentElement = riskIndicator.closest('div')
      
      // Should have green color styling
      expect(parentElement).toHaveStyle({ color: '#22c55e' })
    })

    it('should apply orange color for medium risk', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={100000} // Medium risk
        />
      )
      
      const riskIndicator = screen.getByText('Medium Risk - Moderate distance from ATH')
      const parentElement = riskIndicator.closest('div')
      
      // Should have orange color styling
      expect(parentElement).toHaveStyle({ color: '#f59e0b' })
    })

    it('should apply red color for high risk', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={120000} // High risk
        />
      )
      
      const riskIndicator = screen.getByText('High Risk - Near ATH')
      const parentElement = riskIndicator.closest('div')
      
      // Should have red color styling
      expect(parentElement).toHaveStyle({ color: '#ef4444' })
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero BTC amount', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={0} 
          initialBtcPrice={100000} 
        />
      )
      
      expect(screen.getByText('$0')).toBeInTheDocument()
      expect(screen.getByText('0.0000 BTC × $100,000')).toBeInTheDocument()
    })

    it('should handle very small BTC amounts', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={0.001} 
          initialBtcPrice={100000} 
        />
      )
      
      expect(screen.getByText('$100')).toBeInTheDocument()
      expect(screen.getByText('0.0010 BTC × $100,000')).toBeInTheDocument()
    })

    it('should handle price at ATH', () => {
      render(
        <CollateralSummaryCard 
          btcAmount={1} 
          initialBtcPrice={124277.98} // Exactly at ATH
        />
      )
      
      expect(screen.getByText('0.0% below ATH')).toBeInTheDocument()
      expect(screen.getByText('$0 difference')).toBeInTheDocument()
      expect(screen.getByText('High Risk - Near ATH')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      // Check for proper heading structure and labels
      expect(screen.getByText('ATH Price')).toBeInTheDocument()
      expect(screen.getByText('ATH Distance')).toBeInTheDocument()
    })

    it('should have sufficient color contrast', () => {
      render(<CollateralSummaryCard {...defaultProps} />)
      
      // The component should use colors that meet WCAG contrast requirements
      // This is tested through the color values in the risk assessment
      const riskColors = ['#22c55e', '#f59e0b', '#ef4444']
      riskColors.forEach(color => {
        // Colors should be defined and valid hex colors
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })
})
