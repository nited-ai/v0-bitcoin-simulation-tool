"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { PieChart as PieChartIcon } from "lucide-react"
import { useMemo } from "react"
import { useSimulation } from "../../context/SimulationContext"
import { getPlatformConfig } from "../../constants/platformPresets"

interface CollateralData {
  name: string
  value: number
  btcAmount: number
  color: string
  percentage: number
  isActive?: boolean
}

interface CollateralMetrics {
  freeCollateralBtc: number
  freeCollateralPercentage: number
  btcLockedAsCollateral: number
  collateralUtilization: number
}

/**
 * Collateral Visualization Card Component
 *
 * Displays collateral distribution using a pie chart with:
 * - Donut chart with thicker locked collateral segment
 * - Percentage labels outside segments
 * - Center text showing BTC values
 */

export function CollateralVisualizationCard() {
  const { params } = useSimulation()
  const platformConfig = getPlatformConfig(params.platform)

  // Calculate collateral metrics (same logic as CollateralAnalysisCard)
  const metrics: CollateralMetrics = useMemo(() => {
    // Total BTC stack value
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    
    // Current loan amount based on percentage setting
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    
    // Origination fee calculation
    const originationFee = currentLoanAmount * (platformConfig.originationFeePercent / 100)
    
    // Calculate BTC locked as collateral for current loan
    const btcLockedAsCollateral = (currentLoanAmount + originationFee) / (params.riskManagement.targetLtv / 100) / params.initialBtcPrice
    
    // Calculate remaining free BTC
    const freeBtcAmount = Math.max(0, params.btcAmount - btcLockedAsCollateral)
    
    // Calculate percentages
    const freeCollateralPercentage = params.btcAmount > 0 ? (freeBtcAmount / params.btcAmount) * 100 : 0
    const collateralUtilization = params.btcAmount > 0 ? (btcLockedAsCollateral / params.btcAmount) * 100 : 0

    return {
      freeCollateralBtc: freeBtcAmount,
      freeCollateralPercentage,
      btcLockedAsCollateral,
      collateralUtilization
    }
  }, [params, platformConfig])

  // Prepare data for pie chart - Locked Collateral first to start at 12:00
  const chartData: CollateralData[] = useMemo(() => {
    return [
      {
        name: "Locked",
        value: metrics.collateralUtilization,
        btcAmount: metrics.btcLockedAsCollateral,
        color: "#ef4444", // Red
        percentage: metrics.collateralUtilization,
        isActive: true // Make locked collateral the active segment
      },
      {
        name: "Free",
        value: metrics.freeCollateralPercentage,
        btcAmount: metrics.freeCollateralBtc,
        color: "#22c55e", // Green instead of Bitcoin orange
        percentage: metrics.freeCollateralPercentage,
        isActive: false
      }
    ]
  }, [metrics])



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-primary" />
          Collateral Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show message if no BTC amount */}
        {params.btcAmount === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Set BTC amount to view collateral distribution</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {/* Pie Chart Container */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Main pie chart */}
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value, cx, cy, midAngle, outerRadius, index }) => {
                      if (!value || value < 5 || !cx || !cy || !midAngle || !outerRadius || index === undefined) return null

                      const RADIAN = Math.PI / 180
                      const radius = outerRadius + 25
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)
                      const color = chartData[index]?.color || '#374151'

                      return (
                        <text
                          x={x}
                          y={y}
                          fill={color}
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          className="text-sm font-medium"
                          style={{ fontSize: '14px', fontWeight: '500' }}
                        >
                          {`${value.toFixed(1)}%`}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>

                  {/* Overlay for thicker locked collateral */}
                  <Pie
                    data={[chartData[0]]}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={90 - (chartData[0].value * 3.6)}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell
                      fill={chartData[0].color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text with Color Coding */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-sm font-medium mb-1">BTC</div>
                <div className="text-sm font-medium text-center">
                  <span style={{ color: "#22c55e" }}>
                    {metrics.freeCollateralBtc.toFixed(3)}
                  </span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span style={{ color: "#ef4444" }}>
                    {metrics.btcLockedAsCollateral.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend with USD values */}
        {params.btcAmount > 0 && (
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
              <span className="text-sm font-medium text-green-600">
                ${(metrics.freeCollateralBtc * params.initialBtcPrice).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
              <span className="text-sm">Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-sm font-medium text-red-600">
                ${(metrics.btcLockedAsCollateral * params.initialBtcPrice).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
              <span className="text-sm">Locked</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
