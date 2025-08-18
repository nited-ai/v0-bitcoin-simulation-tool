"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts"
import { Shield } from "lucide-react"
import { useMemo, useState } from "react"
import { useSimulation } from "../../context/SimulationContext"
import { getPlatformConfig } from "../../constants/platformPresets"

interface PriceDropData {
  name: string
  value: number
  usdAmount: number
  color: string
  percentage: number
  isActive?: boolean
}

interface PriceDropMetrics {
  currentBtcPrice: number
  liquidationPrice: number
  priceDropAmount: number
  priceDropPercentage: number
  remainingPricePercentage: number
  // Enhanced metrics with free collateral
  trueLiquidationPrice: number
  truePriceDropPercentage: number
  trueRemainingPricePercentage: number
  freeBtcAmount: number
  hasFreeCollateral: boolean
}

/**
 * Price Drop Tolerance Card Component
 * 
 * Displays liquidation risk using a stacked bar chart with:
 * - Single vertical bar with two segments
 * - Red segment (top): Price drop tolerance percentage
 * - Green segment (bottom): Remaining price after drop
 * - Center text showing liquidation price
 */

export function PriceDropToleranceCard() {
  const { params } = useSimulation()
  const platformConfig = getPlatformConfig(params.platform)

  // Toggle state for view selection (default to "From Current Price")
  const [viewMode, setViewMode] = useState<'current' | 'ath'>('current')

  // Calculate price drop metrics (same logic as CollateralAnalysisCard)
  const metrics: PriceDropMetrics = useMemo(() => {
    // Total BTC stack value
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    
    // Current loan amount based on percentage setting
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    
    // Origination fee calculation
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    
    // Calculate BTC locked as collateral for current loan
    const btcLockedAsCollateral = (currentLoanAmount + originationFee) / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice
    
    // Calculate immediate liquidation price (without top-up)
    let liquidationPrice = 0
    let priceDropPercentage = 0
    let priceDropAmount = 0
    let remainingPricePercentage = 100

    // Calculate free collateral available for top-up
    const freeBtcAmount = Math.max(0, params.btcAmount - btcLockedAsCollateral)
    const hasFreeCollateral = freeBtcAmount > 0

    // Calculate true liquidation price (with free collateral top-up)
    let trueLiquidationPrice = 0
    let truePriceDropPercentage = 0
    let trueRemainingPricePercentage = 100

    if (currentLoanAmount > 0 && params.btcAmount > 0 && btcLockedAsCollateral > 0) {
      // Immediate liquidation price calculation: (loan amount + origination fee) / (liquidation LTV / 100) / locked collateral BTC amount
      liquidationPrice = (currentLoanAmount + originationFee) / (params.riskManagement.liquidationLtv / 100) / btcLockedAsCollateral

      // Calculate immediate price drop percentage and amount
      priceDropPercentage = Math.max(0, ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100)
      priceDropAmount = params.initialBtcPrice - liquidationPrice
      remainingPricePercentage = 100 - priceDropPercentage

      // True liquidation price calculation: (loan amount + origination fee) / (liquidation LTV / 100) / total BTC amount
      trueLiquidationPrice = hasFreeCollateral
        ? (currentLoanAmount + originationFee) / (params.riskManagement.liquidationLtv / 100) / params.btcAmount
        : liquidationPrice // Same as immediate liquidation if no free collateral

      // Calculate true price drop percentage
      truePriceDropPercentage = Math.max(0, ((params.initialBtcPrice - trueLiquidationPrice) / params.initialBtcPrice) * 100)
      trueRemainingPricePercentage = 100 - truePriceDropPercentage
    } else {
      // No loan = no liquidation risk
      liquidationPrice = 0
      priceDropPercentage = 0
      priceDropAmount = 0
      remainingPricePercentage = 100
      trueLiquidationPrice = 0
      truePriceDropPercentage = 0
      trueRemainingPricePercentage = 100
    }

    return {
      currentBtcPrice: params.initialBtcPrice,
      liquidationPrice,
      priceDropAmount,
      priceDropPercentage,
      remainingPricePercentage,
      // Enhanced metrics with free collateral
      trueLiquidationPrice,
      truePriceDropPercentage,
      trueRemainingPricePercentage,
      freeBtcAmount,
      hasFreeCollateral
    }
  }, [params, platformConfig])

  // Enhanced ATH metrics calculation
  const athMetrics = useMemo(() => {
    const athPrice = 125000 // Hardcoded ATH value for now

    // Immediate liquidation from ATH (existing)
    const liquidationPrice = metrics.liquidationPrice // Same immediate liquidation price
    const athPriceDropAmount = athPrice - liquidationPrice
    const athPriceDropPercentage = liquidationPrice > 0 ? Math.max(0, ((athPrice - liquidationPrice) / athPrice) * 100) : 0
    const athRemainingPricePercentage = liquidationPrice > 0 ? 100 - athPriceDropPercentage : 100

    // True liquidation from ATH with free collateral (new)
    const trueLiquidationPrice = metrics.trueLiquidationPrice
    const trueAthPriceDropAmount = athPrice - trueLiquidationPrice
    const trueAthPriceDropPercentage = trueLiquidationPrice > 0 ? Math.max(0, ((athPrice - trueLiquidationPrice) / athPrice) * 100) : 0
    const trueAthRemainingPricePercentage = trueLiquidationPrice > 0 ? 100 - trueAthPriceDropPercentage : 100

    return {
      athPrice,
      // Immediate liquidation from ATH (existing)
      liquidationPrice,
      athPriceDropAmount,
      athPriceDropPercentage,
      athRemainingPricePercentage,
      // True liquidation from ATH with free collateral (new)
      trueLiquidationPrice,
      trueAthPriceDropAmount,
      trueAthPriceDropPercentage,
      trueAthRemainingPricePercentage
    }
  }, [metrics.liquidationPrice, metrics.trueLiquidationPrice])

  // Prepare data for stacked bar chart
  const chartData = useMemo(() => {
    return [{
      name: "Price",
      priceDrop: metrics.priceDropPercentage,
      remainingPrice: metrics.remainingPricePercentage
    }]
  }, [metrics])

  // Prepare ATH chart data
  const athChartData = useMemo(() => {
    return [{
      name: "ATH Price",
      priceDrop: athMetrics.athPriceDropPercentage,
      remainingPrice: athMetrics.athRemainingPricePercentage
    }]
  }, [athMetrics])

  // Prepare free collateral chart data (new)
  const freeCollateralCurrentData = useMemo(() => {
    return [{
      name: "Current + Free Collateral",
      priceDrop: metrics.truePriceDropPercentage,
      remainingPrice: metrics.trueRemainingPricePercentage
    }]
  }, [metrics])

  const freeCollateralAthData = useMemo(() => {
    return [{
      name: "ATH + Free Collateral",
      priceDrop: athMetrics.trueAthPriceDropPercentage,
      remainingPrice: athMetrics.trueAthRemainingPricePercentage
    }]
  }, [athMetrics])

  // Custom label renderer for red segment (Price Drop Tolerance)
  const renderRedLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!metrics.priceDropPercentage || metrics.priceDropPercentage < 10) return null

    // Position label in center of red segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          <tspan className="text-lg">↓</tspan> -{metrics.priceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for green segment (Liquidation Price)
  const renderGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!metrics.remainingPricePercentage || metrics.remainingPricePercentage < 10) return null

    // Position label in center of green segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${metrics.liquidationPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </text>
      </g>
    )
  }

  // Custom label renderer for immediate liquidation risk (positioned above chart)
  const renderCurrentPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          Immediate
        </text>
      </g>
    )
  }

  // Custom label renderer for ATH red segment (ATH Price Drop)
  const renderAthRedLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!athMetrics.athPriceDropPercentage || athMetrics.athPriceDropPercentage < 10) return null

    // Position label in center of red segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          <tspan className="text-lg">↓</tspan> -{athMetrics.athPriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for ATH green segment (Liquidation Price)
  const renderAthGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!athMetrics.athRemainingPricePercentage || athMetrics.athRemainingPricePercentage < 10) return null

    // Position label in center of green segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${athMetrics.liquidationPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </text>
      </g>
    )
  }

  // Custom label renderer for immediate liquidation risk from ATH (positioned above ATH chart)
  const renderAthPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          Immediate
        </text>
      </g>
    )
  }

  // NEW: Label renderers for free collateral scenarios

  // Custom label renderer for free collateral current red segment
  const renderFreeCollateralCurrentRedLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!metrics.truePriceDropPercentage || metrics.truePriceDropPercentage < 10) return null

    // Position label in center of red segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          <tspan className="text-lg">↓</tspan> -{metrics.truePriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for free collateral current green segment
  const renderFreeCollateralCurrentGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!metrics.trueRemainingPricePercentage || metrics.trueRemainingPricePercentage < 10) return null

    // Position label in center of green segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${metrics.trueLiquidationPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </text>
      </g>
    )
  }

  // Custom label renderer for true liquidation risk with free collateral (positioned above chart)
  const renderFreeCollateralCurrentPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          True (Top-up)
        </text>
      </g>
    )
  }

  // Custom label renderer for free collateral ATH red segment
  const renderFreeCollateralAthRedLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!athMetrics.trueAthPriceDropPercentage || athMetrics.trueAthPriceDropPercentage < 10) return null

    // Position label in center of red segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          <tspan className="text-lg">↓</tspan> -{athMetrics.trueAthPriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for free collateral ATH green segment
  const renderFreeCollateralAthGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Only show label if segment is large enough
    if (!athMetrics.trueAthRemainingPricePercentage || athMetrics.trueAthRemainingPricePercentage < 10) return null

    // Position label in center of green segment
    const centerX = x + width / 2
    const centerY = y + height / 2

    return (
      <g>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${athMetrics.trueLiquidationPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </text>
      </g>
    )
  }

  // Custom label renderer for true liquidation risk from ATH with free collateral (positioned above chart)
  const renderFreeCollateralAthPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          True (Top-up)
        </text>
      </g>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Liquidation Tolerance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {params.btcAmount === 0 || params.loanAmountPercent === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No loan amount specified</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Two Charts Container - Toggle-based View */}
            <div className="flex flex-row items-center justify-center gap-4">
              {viewMode === 'current' ? (
                <>
                  {/* Current Immediate Risk */}
                  <div className="relative w-56 h-80 sm:w-60 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 60, right: -80, left: 20, bottom: 20 }}
                        maxBarSize={80}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} hide />

                        {/* Remaining Price Bar (Green - Bottom) */}
                        <Bar
                          dataKey="remainingPrice"
                          stackId="price"
                          fill="#22c55e"
                          radius={[0, 0, 8, 8]}
                        >
                          <LabelList content={renderGreenLabel} />
                        </Bar>

                        {/* Price Drop Bar (Red - Top) */}
                        <Bar
                          dataKey="priceDrop"
                          stackId="price"
                          fill="#ef4444"
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList content={renderRedLabel} />
                          <LabelList content={renderCurrentPriceLabel}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Current + Free Collateral */}
                  <div className="relative w-56 h-80 sm:w-60 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={freeCollateralCurrentData}
                        margin={{ top: 60, right: 20, left: -80, bottom: 20 }}
                        maxBarSize={80}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} hide />

                        {/* Remaining Price Bar (Green - Bottom) */}
                        <Bar
                          dataKey="remainingPrice"
                          stackId="currentFreeCollateral"
                          fill="#22c55e"
                          radius={[0, 0, 8, 8]}
                        >
                          <LabelList content={renderFreeCollateralCurrentGreenLabel} />
                        </Bar>

                        {/* Price Drop Bar (Red - Top) */}
                        <Bar
                          dataKey="priceDrop"
                          stackId="currentFreeCollateral"
                          fill="#ef4444"
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList content={renderFreeCollateralCurrentRedLabel} />
                          <LabelList content={renderFreeCollateralCurrentPriceLabel}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <>
                  {/* ATH Immediate Risk */}
                  <div className="relative w-56 h-80 sm:w-60 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={athChartData}
                        margin={{ top: 60, right: -80, left: 20, bottom: 20 }}
                        maxBarSize={80}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} hide />

                        {/* Remaining Price Bar (Green - Bottom) */}
                        <Bar
                          dataKey="remainingPrice"
                          stackId="athPrice"
                          fill="#22c55e"
                          radius={[0, 0, 8, 8]}
                        >
                          <LabelList content={renderAthGreenLabel} />
                        </Bar>

                        {/* Price Drop Bar (Red - Top) */}
                        <Bar
                          dataKey="priceDrop"
                          stackId="athPrice"
                          fill="#ef4444"
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList content={renderAthRedLabel} />
                          <LabelList content={renderAthPriceLabel}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ATH + Free Collateral */}
                  <div className="relative w-56 h-80 sm:w-60 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={freeCollateralAthData}
                        margin={{ top: 60, right: 20, left: -80, bottom: 20 }}
                        maxBarSize={80}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} hide />

                        {/* Remaining Price Bar (Green - Bottom) */}
                        <Bar
                          dataKey="remainingPrice"
                          stackId="athFreeCollateral"
                          fill="#22c55e"
                          radius={[0, 0, 8, 8]}
                        >
                          <LabelList content={renderFreeCollateralAthGreenLabel} />
                        </Bar>

                        {/* Price Drop Bar (Red - Top) */}
                        <Bar
                          dataKey="priceDrop"
                          stackId="athFreeCollateral"
                          fill="#ef4444"
                          radius={[8, 8, 0, 0]}
                        >
                          <LabelList content={renderFreeCollateralAthRedLabel} />
                          <LabelList content={renderFreeCollateralAthPriceLabel}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            
          </div>
        )}

        {/* Simplified Legend */}
        {params.btcAmount > 0 && params.loanAmountPercent > 0 && (
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-sm">Price Drop Tolerance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
              <span className="text-sm">Liquidation Price</span>
            </div>
          </div>
        )}
        <div className="flex flex-row items-center justify-center gap-4">
          {/* Toggle Switch - Moved to bottom */}
            <div className="flex items-center gap-4 mt-6 mb-4">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('current')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'current'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  From Current Price
                </button>
                <button
                  onClick={() => setViewMode('ath')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'ath'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  From ATH
                </button>
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
  )
}
