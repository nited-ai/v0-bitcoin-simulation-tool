"use client"

import React from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { useLocaleNumberFormat } from "@/shared/utils/localeNumberFormat"

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
  const { formatCurrency } = useLocaleNumberFormat()

  // Calculate total collateral value
  const totalCollateralValue = btcAmount * initialBtcPrice

  return (
    <Alert className={`bg-transparent border-none ${className}`}>
      <AlertTitle className="text-4xl font-bold text-orange-600" suppressHydrationWarning>
        {formatCurrency(totalCollateralValue)}
      </AlertTitle>
    </Alert>
  )
}
