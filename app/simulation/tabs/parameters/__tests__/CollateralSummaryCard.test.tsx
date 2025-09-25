/**
 * CollateralSummaryCard Component Tests
 *
 * Tests for the simplified collateral summary card that displays
 * total collateral value only.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollateralSummaryCard } from '../CollateralSummaryCard'

describe('CollateralSummaryCard', () => {
  const defaultProps = {
    btcAmount: 1.5,
    initialBtcPrice: 100000
  }

  describe('Total Collateral Value Display', () => {
    it('should display correct total collateral value', () => {
      render(<CollateralSummaryCard {...defaultProps} />)

      // Should show $150,000 (1.5 BTC × $100,000)
      expect(screen.getByText('$150,000')).toBeInTheDocument()
    })

    it('should calculate collateral value correctly with different amounts', () => {
      render(
        <CollateralSummaryCard
          btcAmount={2.0}
          initialBtcPrice={75000}
        />
      )

      // Should show $150,000 (2.0 BTC × $75,000)
      expect(screen.getByText('$150,000')).toBeInTheDocument()
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

    it('should handle zero amounts', () => {
      render(
        <CollateralSummaryCard
          btcAmount={0}
          initialBtcPrice={100000}
        />
      )

      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('should handle small amounts with proper formatting', () => {
      render(
        <CollateralSummaryCard
          btcAmount={0.001}
          initialBtcPrice={100000}
        />
      )

      expect(screen.getByText('$100')).toBeInTheDocument()
    })
  })

  describe('Component Structure', () => {
    it('should render as an Alert component', () => {
      render(<CollateralSummaryCard {...defaultProps} />)

      const alertElement = screen.getByRole('alert')
      expect(alertElement).toBeInTheDocument()
    })

    it('should apply correct CSS classes', () => {
      render(<CollateralSummaryCard {...defaultProps} />)

      const titleElement = screen.getByText('$150,000')
      expect(titleElement).toHaveClass('text-4xl', 'font-bold', 'text-orange-600')
    })

    it('should accept custom className', () => {
      render(<CollateralSummaryCard {...defaultProps} className="custom-class" />)

      const alertElement = screen.getByRole('alert')
      expect(alertElement).toHaveClass('custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative amounts gracefully', () => {
      render(
        <CollateralSummaryCard
          btcAmount={-1}
          initialBtcPrice={100000}
        />
      )

      expect(screen.getByText('-$100,000')).toBeInTheDocument()
    })

    it('should handle very small decimal amounts', () => {
      render(
        <CollateralSummaryCard
          btcAmount={0.00000001}
          initialBtcPrice={100000}
        />
      )

      expect(screen.getByText('$0')).toBeInTheDocument()
    })

    it('should handle zero price', () => {
      render(
        <CollateralSummaryCard
          btcAmount={1}
          initialBtcPrice={0}
        />
      )

      expect(screen.getByText('$0')).toBeInTheDocument()
    })
  })
})
