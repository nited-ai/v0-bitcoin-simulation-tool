"use client"

import React from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"

interface CollateralSummaryCardProps {
  btcAmount: number
  initialBtcPrice: number
  className?: string
}

/**
 * Collateral Summary Card
 *
 * Displays total collateral value using shadcn Alert component format.
 * ATH information has been moved to the ATHAlert component above risk level selector.
 */
export function CollateralSummaryCard({
  btcAmount,
  initialBtcPrice,
  className = ""
}: CollateralSummaryCardProps) {
  // Calculate total collateral value
  const totalCollateralValue = btcAmount * initialBtcPrice

  // Format currency with proper separators
  const formatCurrency = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  return (
    <Alert className={`bg-transparent border-none ${className}`}>
      <AlertTitle className="text-4xl font-bold text-orange-600" suppressHydrationWarning>
        {formatCurrency(totalCollateralValue)}
      </AlertTitle>
    </Alert>
  )
}
