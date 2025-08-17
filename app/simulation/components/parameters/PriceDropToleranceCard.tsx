"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts"
import { Shield } from "lucide-react"
import { useMemo } from "react"
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
    
    // Calculate liquidation price
    let liquidationPrice = 0
    let priceDropPercentage = 0
    let priceDropAmount = 0
    let remainingPricePercentage = 100

    if (currentLoanAmount > 0 && params.btcAmount > 0 && btcLockedAsCollateral > 0) {
      // Liquidation price calculation: (loan amount + origination fee) / (liquidation LTV / 100) / collateral BTC amount
      liquidationPrice = (currentLoanAmount + originationFee) / (params.riskManagement.liquidationLtv / 100) / btcLockedAsCollateral
      
      // Calculate price drop percentage and amount
      priceDropPercentage = Math.max(0, ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100)
      priceDropAmount = params.initialBtcPrice - liquidationPrice
      remainingPricePercentage = 100 - priceDropPercentage
    } else {
      // No loan = no liquidation risk
      liquidationPrice = 0
      priceDropPercentage = 0
      priceDropAmount = 0
      remainingPricePercentage = 100
    }

    return {
      currentBtcPrice: params.initialBtcPrice,
      liquidationPrice,
      priceDropAmount,
      priceDropPercentage,
      remainingPricePercentage
    }
  }, [params, platformConfig])

  // ATH metrics calculation
  const athMetrics = useMemo(() => {
    const athPrice = 125000 // Hardcoded ATH value for now
    const liquidationPrice = metrics.liquidationPrice // Same liquidation price
    const athPriceDropAmount = athPrice - liquidationPrice
    const athPriceDropPercentage = liquidationPrice > 0 ? Math.max(0, ((athPrice - liquidationPrice) / athPrice) * 100) : 0
    const athRemainingPricePercentage = liquidationPrice > 0 ? 100 - athPriceDropPercentage : 100

    return {
      athPrice,
      liquidationPrice,
      athPriceDropAmount,
      athPriceDropPercentage,
      athRemainingPricePercentage
    }
  }, [metrics.liquidationPrice])

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

  // Custom label renderer for current BTC price (positioned above chart)
  const renderCurrentPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm"
          fill="black"
        >
          From Current Price
        </text>
        <text
          x={centerX}
          y={labelY + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${metrics.currentBtcPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
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

  // Custom label renderer for ATH price (positioned above ATH chart)
  const renderAthPriceLabel = (props: any) => {
    const { x, y, width } = props

    // Position label above the chart
    const centerX = x + width / 2
    const labelY = y - 20

    return (
      <g>
        <text
          x={centerX}
          y={labelY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm"
          fill="black"
        >
          From Last ATH
        </text>
        <text
          x={centerX}
          y={labelY + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold"
          fill="black"
        >
          ${athMetrics.athPrice.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
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
            {/* Two Charts Container */}
            <div className="flex flex-row items-center justify-center">
              {/* ATH Price Chart (moved to left) */}
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

              {/* Current Price Chart (moved to right) */}
              <div className="relative w-56 h-80 sm:w-60 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 60, right: 20, left: -80, bottom: 20 }}
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
            </div>
          </div>
        )}

        {/* Legend */}
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
      </CardContent>
    </Card>
  )
}
