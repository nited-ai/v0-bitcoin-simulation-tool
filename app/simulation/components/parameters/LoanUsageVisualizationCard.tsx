"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { CreditCard } from "lucide-react"
import { useMemo } from "react"
import { useSimulation } from "../../context/SimulationContext"
import { getPlatformConfig } from "../../constants/platformPresets"

interface LoanData {
  name: string
  value: number
  usdAmount: number
  color: string
  percentage: number
  isActive?: boolean
}

interface LoanMetrics {
  currentLoanAmount: number
  maxLoanCapacity: number
  availableBorrowingCapacity: number
  loanUtilizationPercentage: number
  availableCapacityPercentage: number
}

/**
 * Loan Usage Visualization Card Component
 * 
 * Displays loan capacity utilization using a pie chart with:
 * - Donut chart with thicker used capacity segment
 * - Percentage labels outside segments
 * - Legend showing USD values
 */

export function LoanUsageVisualizationCard() {
  const { params } = useSimulation()
  const platformConfig = getPlatformConfig(params.platform)

  // Calculate loan metrics
  const metrics: LoanMetrics = useMemo(() => {
    // Total BTC stack value
    const totalStackValue = params.btcAmount * params.initialBtcPrice
    
    // Current loan amount based on percentage setting
    const currentLoanAmount = (params.loanAmountPercent / 100) * totalStackValue
    
    // Calculate maximum loan capacity based on initial LTV
    const maxLoanCapacity = totalStackValue * (platformConfig.maxInitialLtv / 100)
    
    // Available borrowing capacity
    const availableBorrowingCapacity = Math.max(0, maxLoanCapacity - currentLoanAmount)
    
    // Calculate percentages
    const loanUtilizationPercentage = maxLoanCapacity > 0 ? (currentLoanAmount / maxLoanCapacity) * 100 : 0
    const availableCapacityPercentage = maxLoanCapacity > 0 ? (availableBorrowingCapacity / maxLoanCapacity) * 100 : 100

    return {
      currentLoanAmount,
      maxLoanCapacity,
      availableBorrowingCapacity,
      loanUtilizationPercentage,
      availableCapacityPercentage
    }
  }, [params, platformConfig])

  // Prepare data for pie chart - Used capacity first to start at 12:00
  const chartData: LoanData[] = useMemo(() => {
    return [
      {
        name: "Used",
        value: metrics.loanUtilizationPercentage,
        usdAmount: metrics.currentLoanAmount,
        color: "#ef4444", // Red
        percentage: metrics.loanUtilizationPercentage,
        isActive: true // Make used capacity the active segment
      },
      {
        name: "Available",
        value: metrics.availableCapacityPercentage,
        usdAmount: metrics.availableBorrowingCapacity,
        color: "#22c55e", // Green
        percentage: metrics.availableCapacityPercentage,
        isActive: false
      }
    ]
  }, [metrics])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Loan Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {params.btcAmount === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No BTC amount specified</p>
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

                  {/* Overlay for thicker used capacity */}
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

              {/* Center Text with Max Loan Capacity */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-muted-foreground">Max Capacity</div>
                <div className="text-sm font-medium text-center">
                  ${metrics.maxLoanCapacity.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
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
                ${metrics.availableBorrowingCapacity.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-sm font-medium text-red-600">
                ${metrics.currentLoanAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
              <span className="text-sm">Used</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
