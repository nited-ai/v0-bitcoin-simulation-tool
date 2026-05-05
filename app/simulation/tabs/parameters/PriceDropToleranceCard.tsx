"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts"
import { Shield, InfoIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSimulation } from "../../context/SimulationContext"
import { useLiquidationCalculations } from "../../hooks/useCalculationsIntegration"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"

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
  const { t } = useTranslation()
  const { params } = useSimulation()
  const liquidationData = useLiquidationCalculations()
  // PR4: SWR-backed ATH (replaces useATH)
  const { ath, isLoading: athLoading } = usePriceData()
  const currentATH = ath?.value ?? null

  // Toggle state for view selection (default to "From Current Price")
  const [viewMode, setViewMode] = useState<'current' | 'ath'>('current')

  // Convert centralized calculations to component format
  const metrics: PriceDropMetrics = useMemo(() => {
    if (!liquidationData) {
      // Fallback values when calculations are not available
      return {
        currentBtcPrice: params.initialBtcPrice,
        liquidationPrice: 0,
        priceDropAmount: 0,
        priceDropPercentage: 0,
        remainingPricePercentage: 100,
        trueLiquidationPrice: 0,
        truePriceDropPercentage: 0,
        trueRemainingPricePercentage: 100,
        freeBtcAmount: params.initialBtcAmount,
        hasFreeCollateral: true
      }
    }

    // Use centralized calculations
    const priceDropAmount = liquidationData.initialCurrentBtcPrice - liquidationData.initialImmediateLiquidationPrice
    const truePriceDropAmount = liquidationData.initialCurrentBtcPrice - liquidationData.initialTrueLiquidationPrice

    return {
      currentBtcPrice: liquidationData.initialCurrentBtcPrice,
      liquidationPrice: liquidationData.initialImmediateLiquidationPrice,
      priceDropAmount,
      priceDropPercentage: liquidationData.initialImmediatePriceDropPercentage,
      remainingPricePercentage: 100 - liquidationData.initialImmediatePriceDropPercentage,
      // Enhanced metrics with free collateral
      trueLiquidationPrice: liquidationData.initialTrueLiquidationPrice,
      truePriceDropPercentage: liquidationData.initialTruePriceDropPercentage,
      trueRemainingPricePercentage: 100 - liquidationData.initialTruePriceDropPercentage,
      freeBtcAmount: liquidationData.initialFreeBtcAmount,
      hasFreeCollateral: liquidationData.initialHasFreeCollateral
    }
  }, [liquidationData, params.initialBtcPrice, params.initialBtcAmount])

  // Enhanced ATH metrics calculation using centralized service
  const athMetrics = useMemo(() => {
    if (!liquidationData?.athPrice || !liquidationData?.athMetrics) {
      // Use dynamic ATH from service with fallback
      const athPrice = athLoading || currentATH === null ? 125000 : currentATH
      return {
        athPrice,
        liquidationPrice: metrics.liquidationPrice,
        athPriceDropAmount: athPrice - metrics.liquidationPrice,
        athPriceDropPercentage: metrics.liquidationPrice > 0 ? Math.max(0, ((athPrice - metrics.liquidationPrice) / athPrice) * 100) : 0,
        athRemainingPricePercentage: metrics.liquidationPrice > 0 ? 100 - Math.max(0, ((athPrice - metrics.liquidationPrice) / athPrice) * 100) : 100,
        trueLiquidationPrice: metrics.trueLiquidationPrice,
        trueAthPriceDropAmount: athPrice - metrics.trueLiquidationPrice,
        trueAthPriceDropPercentage: metrics.trueLiquidationPrice > 0 ? Math.max(0, ((athPrice - metrics.trueLiquidationPrice) / athPrice) * 100) : 0,
        trueAthRemainingPricePercentage: metrics.trueLiquidationPrice > 0 ? 100 - Math.max(0, ((athPrice - metrics.trueLiquidationPrice) / athPrice) * 100) : 100
      }
    }

    // Use centralized ATH calculations
    const athPrice = liquidationData.athPrice
    const athPriceDropAmount = athPrice - liquidationData.initialImmediateLiquidationPrice
    const trueAthPriceDropAmount = athPrice - liquidationData.initialTrueLiquidationPrice

    return {
      athPrice,
      // Immediate liquidation from ATH
      liquidationPrice: liquidationData.initialImmediateLiquidationPrice,
      athPriceDropAmount,
      athPriceDropPercentage: liquidationData.athMetrics.priceDropPercentage,
      athRemainingPricePercentage: 100 - liquidationData.athMetrics.priceDropPercentage,
      // True liquidation from ATH with free collateral
      trueLiquidationPrice: liquidationData.initialTrueLiquidationPrice,
      trueAthPriceDropAmount,
      trueAthPriceDropPercentage: liquidationData.athMetrics.truePriceDropPercentage,
      trueAthRemainingPricePercentage: 100 - liquidationData.athMetrics.truePriceDropPercentage
    }
  }, [liquidationData, metrics.liquidationPrice, metrics.trueLiquidationPrice, currentATH, athLoading])

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
          className="text-sm font-semibold fill-foreground"
        >
          <tspan className="text-lg">↓</tspan> -{metrics.priceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for green segment (Liquidation Price)
  const renderGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Always show liquidation price regardless of segment size
    if (!metrics.remainingPricePercentage) return null

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
          className="text-sm font-semibold fill-foreground"
          suppressHydrationWarning
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
          className="text-sm font-semibold fill-foreground"
        >
          {t('PriceDropTolerance.immediate', 'Immediate')}
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
          className="text-sm font-semibold fill-foreground"
        >
          <tspan className="text-lg">↓</tspan> -{athMetrics.athPriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for ATH green segment (Liquidation Price)
  const renderAthGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Always show liquidation price regardless of segment size
    if (!athMetrics.athRemainingPricePercentage) return null

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
          className="text-sm font-semibold fill-foreground"
          suppressHydrationWarning
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
          className="text-sm font-semibold fill-foreground"
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
          className="text-sm font-semibold fill-foreground"
        >
          <tspan className="text-lg">↓</tspan> -{metrics.truePriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for free collateral current green segment
  const renderFreeCollateralCurrentGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Always show liquidation price regardless of segment size
    if (!metrics.trueRemainingPricePercentage) return null

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
          className="text-sm font-semibold fill-foreground"
          suppressHydrationWarning
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
          className="text-sm font-semibold fill-foreground"
        >
          {t('PriceDropTolerance.trueTopUp', 'True (Top-up)')}
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
          className="text-sm font-semibold fill-foreground"
        >
          <tspan className="text-lg">↓</tspan> -{athMetrics.trueAthPriceDropPercentage.toFixed(1)}%
        </text>
      </g>
    )
  }

  // Custom label renderer for free collateral ATH green segment
  const renderFreeCollateralAthGreenLabel = (props: any) => {
    const { x, y, width, height } = props

    // Always show liquidation price regardless of segment size
    if (!athMetrics.trueAthRemainingPricePercentage) return null

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
          className="text-sm font-semibold fill-foreground"
          suppressHydrationWarning
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
          className="text-sm font-semibold fill-foreground"
        >
          {t('PriceDropTolerance.trueTopUp', 'True (Top-up)')}
        </text>
      </g>
    )
  }

  return (
    <CalculationsErrorBoundary>
      <Card className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t('PriceDropTolerance.title', 'Price Drop Tolerance')}
          <HybridTooltip>
            <HybridTooltipTrigger asChild>
              <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
            </HybridTooltipTrigger>
            <HybridTooltipContent className="max-w-md">
              <div className="space-y-3">
                <h4 className="font-semibold">{t('PriceDropTolerance.tooltip.title', 'Understanding Price Drop Tolerance')}</h4>
                <p className="text-sm">{t('PriceDropTolerance.tooltip.description', 'These gauge charts show different liquidation risk scenarios based on Bitcoin price movements.')}</p>
                <div className="space-y-2">
                  <p className="text-sm"><strong>{t('PriceDropTolerance.immediate', 'Immediate')}:</strong> {t('PriceDropTolerance.tooltip.scenarios.immediate', 'Shows liquidation risk without the ability to add more collateral. Critical during rapid price drops.')}</p>
                  <p className="text-sm"><strong>{t('PriceDropTolerance.trueTopUp', 'True (Top-up)')}:</strong> {t('PriceDropTolerance.tooltip.scenarios.trueTopUp', 'Accounts for your ability to add additional collateral to avoid liquidation.')}</p>
                </div>
                <p className="text-sm">{t('PriceDropTolerance.tooltip.interpretation', 'Red areas indicate high liquidation risks. Green areas show safe price levels. Percentages indicate how far Bitcoin price can drop before liquidation occurs.')}</p>
                <p className="text-sm text-muted-foreground">{t('PriceDropTolerance.tooltip.implications', 'Use this information to adjust your loan strategy. Lower LTV ratios provide more protection against price drops.')}</p>
              </div>
            </HybridTooltipContent>
          </HybridTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {params.initialBtcAmount === 0 || params.loanAmountPercent === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>{t('PriceDropTolerance.noLoanAmount', 'No loan amount specified')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Two Charts Container - Toggle-based View */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {viewMode === 'current' ? (
                <>
                  {/* Current Immediate Risk */}
                  <div className="relative w-48 h-64 sm:w-56 sm:h-80 md:w-60 md:h-80">
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
                  <div className="relative w-48 h-64 sm:w-56 sm:h-80 md:w-60 md:h-80">
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
                  <div className="relative w-48 h-64 sm:w-56 sm:h-80 md:w-60 md:h-80">
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
                  <div className="relative w-48 h-64 sm:w-56 sm:h-80 md:w-60 md:h-80">
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
        {params.initialBtcAmount > 0 && params.loanAmountPercent > 0 && (
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-sm">{t('PriceDropTolerance.priceDropTolerance', 'Price Drop Tolerance')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
              <span className="text-sm">{t('PriceDropTolerance.liquidationPrice', 'Liquidation Price')}</span>
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
                  {t('PriceDropTolerance.fromCurrentPrice', 'From Current Price')}
                </button>
                <button
                  onClick={() => setViewMode('ath')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'ath'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('PriceDropTolerance.fromATH', 'From ATH')}
                </button>
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
    </CalculationsErrorBoundary>
  )
}
