"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Shield } from "lucide-react"
import { useMemo } from "react"
import { useSimulation } from "../../context/SimulationContext"

interface CollateralMetrics {
  freeCollateralAmount: number
  freeCollateralBtc: number
  priceDropTolerance: number
  priceAfterDrop: number
  maxLoanCapacity: number
  availableBorrowingCapacity: number
  collateralUtilization: number
  btcLockedAsCollateral: number
  isCollateralSufficient: boolean
  collateralValidationError?: string
}

/**
 * Collateral Analysis Card Component
 * 
 * Displays key collateral statistics including free collateral amount,
 * price drop tolerance, and maximum loan capacity based on platform settings.
 */
export function CollateralAnalysisCard() {
  const { params } = useSimulation()

  // Calculate collateral metrics
  const metrics: CollateralMetrics = useMemo(() => {
    // Total BTC stack value
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    
    // Current max loan amount based on percentage setting
    const currentMaxLoanAmount = (params.maxLoanAmountPercent / 100) * totalStackValue
    
    // Platform-specific LTV limits
    const platformLtvLimits: Record<string, number> = {
      firefish: 50, // 50% LTV for Firefish
      strike: 70,   // 70% LTV for Strike
      custom: params.riskManagement.targetLtv // Use target LTV for custom
    }

    const platformLtv = platformLtvLimits[params.platform] || params.riskManagement.targetLtv
    
    // Max loan capacity based on platform LTV
    const maxLoanCapacity = totalStackValue * (platformLtv / 100)

    // Current loan amount based on Max Loan Amount % setting
    const currentLoanAmount = (params.maxLoanAmountPercent / 100) * totalStackValue

    // Calculate BTC locked as collateral for current loan
    const btcLockedAsCollateral = currentLoanAmount / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice

    // Validate collateral sufficiency
    const isCollateralSufficient = btcLockedAsCollateral <= params.btcAmount
    let collateralValidationError: string | undefined

    if (!isCollateralSufficient) {
      const shortfall = btcLockedAsCollateral - params.btcAmount
      collateralValidationError = `Insufficient collateral: Need ${btcLockedAsCollateral.toFixed(4)} BTC but only have ${params.btcAmount.toFixed(4)} BTC available (shortfall: ${shortfall.toFixed(4)} BTC)`
    }

    // Calculate remaining free BTC
    const freeBtcAmount = Math.max(0, params.btcAmount - btcLockedAsCollateral)

    // Free collateral amount in USD (for display)
    const freeCollateralAmount = freeBtcAmount * params.initialBtcPrice

    // Price drop tolerance calculation (CORRECTED)
    // Calculate liquidation price: price at which the loan would be liquidated
    // Liquidation occurs when: loan amount = liquidation LTV × total BTC stack value
    // Liquidation price = loan amount ÷ (liquidation LTV ÷ 100) ÷ total BTC amount
    let priceDropTolerance = 0
    let priceAfterDrop = 0

    if (currentLoanAmount > 0 && params.btcAmount > 0) {
      const liquidationPrice = currentLoanAmount / (params.riskManagement.liquidationLtv / 100) / params.btcAmount
      priceDropTolerance = Math.max(0, ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100)
      priceAfterDrop = params.initialBtcPrice * (1 - priceDropTolerance / 100)
    } else {
      // No loan = no liquidation risk
      priceDropTolerance = 100
      priceAfterDrop = 0
    }

    // Calculate available borrowing capacity
    const availableBorrowingCapacity = Math.max(0, maxLoanCapacity - currentLoanAmount)

    // Calculate collateral utilization percentage
    const collateralUtilization = params.btcAmount > 0 ? (btcLockedAsCollateral / params.btcAmount) * 100 : 0

    return {
      freeCollateralAmount,
      freeCollateralBtc: freeBtcAmount,
      priceDropTolerance,
      priceAfterDrop,
      maxLoanCapacity,
      availableBorrowingCapacity,
      collateralUtilization,
      btcLockedAsCollateral,
      isCollateralSufficient,
      collateralValidationError
    }
  }, [params])

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  // Format BTC amounts
  const formatBtc = (value: number): string => {
    return `${value.toFixed(3)} BTC`
  }

  // Format combined BTC/USD display
  const formatBtcUsd = (btc: number, usd: number): string => {
    return `${formatCurrency(usd)} / ${formatBtc(btc)}`
  }

  // Format percentage with price display
  const formatPercentageWithPrice = (percentage: number, price: number): string => {
    return `${formatCurrency(price)} / ${formatPercentage(percentage)}`
  }

  // Format percentage with BTC amount display
  const formatPercentageWithBtc = (percentage: number, btc: number): string => {
    return `${formatPercentage(percentage)} / ${formatBtc(btc)}`
  }



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Collateral Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Enhanced grid with 5 containers: Free Collateral, Price Drop Tolerance, Liquidation Price, Max Loan Capacity, Collateral Utilization */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-4 bg-blue-50 rounded-lg cursor-help">
                <div className="text-lg font-bold text-blue-600">
                  {formatBtcUsd(metrics.freeCollateralBtc, metrics.freeCollateralAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Free Collateral</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Free Collateral:</strong> BTC value not locked as collateral</p>
              <p>Formula: Total BTC Value - Locked Collateral</p>
              <p>Available for additional loans or withdrawals</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-4 bg-green-50 rounded-lg cursor-help">
                <div className={`text-lg font-bold ${metrics.priceDropTolerance >= 20 ? 'text-green-600' : metrics.priceDropTolerance >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatPercentageWithPrice(metrics.priceDropTolerance, metrics.priceAfterDrop)}
                </div>
                <div className="text-sm text-muted-foreground">Price Drop Tolerance</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Price Drop Tolerance:</strong> Maximum BTC price drop before liquidation</p>
              <p>Formula: (Current Price - Liquidation Price) / Current Price</p>
              <p>Higher values indicate safer positions</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-4 bg-emerald-50 rounded-lg cursor-help">
                <div className={`text-lg font-bold ${metrics.availableBorrowingCapacity >= metrics.maxLoanCapacity * 0.5 ? 'text-emerald-600' : metrics.availableBorrowingCapacity >= metrics.maxLoanCapacity * 0.2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.availableBorrowingCapacity)}
                </div>
                <div className="text-sm text-muted-foreground">Available Borrowing</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Available Borrowing Capacity:</strong> Additional loan amount you can borrow</p>
              <p>Formula: Max Loan Capacity - Current Loan Amount</p>
              <p>Higher values indicate more borrowing power available</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-4 bg-purple-50 rounded-lg cursor-help">
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(metrics.maxLoanCapacity)}
                </div>
                <div className="text-sm text-muted-foreground">Max Loan Capacity</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Max Loan Capacity:</strong> Maximum loan amount based on platform LTV limits</p>
              <p>Formula: Total BTC Value × Platform Max LTV</p>
              <p>Platform-specific lending capacity constraint</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-4 bg-orange-50 rounded-lg cursor-help">
                <div className={`text-lg font-bold ${metrics.collateralUtilization <= 30 ? 'text-green-600' : metrics.collateralUtilization <= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatPercentageWithBtc(metrics.collateralUtilization, metrics.btcLockedAsCollateral)}
                </div>
                <div className="text-sm text-muted-foreground">Collateral Utilization</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Collateral Utilization:</strong> Percentage and amount of BTC stack used as collateral</p>
              <p>Formula: (Locked Collateral ÷ Total BTC) × 100</p>
              <p>Lower values indicate more available collateral capacity</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
