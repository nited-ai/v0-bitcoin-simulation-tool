"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { CreditCard } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSimulation } from "../../context/SimulationContext"
import { useLoanCalculations } from "../../hooks/useCalculationsIntegration"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"

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
  const { t } = useTranslation()
  const { params } = useSimulation()
  const loanData = useLoanCalculations()

  // Convert centralized calculations to component format
  const metrics: LoanMetrics = useMemo(() => {
    if (!loanData) {
      // Fallback values when calculations are not available
      return {
        currentLoanAmount: 0,
        maxLoanCapacity: 0,
        availableBorrowingCapacity: 0,
        loanUtilizationPercentage: 0,
        availableCapacityPercentage: 100
      }
    }

    // Use centralized calculations
    return {
      currentLoanAmount: loanData.initialCurrentLoanAmount,
      maxLoanCapacity: loanData.initialMaxLoanCapacity,
      availableBorrowingCapacity: loanData.initialAvailableBorrowingCapacity,
      loanUtilizationPercentage: loanData.initialLoanUtilizationPercent,
      availableCapacityPercentage: loanData.initialAvailableCapacityPercent
    }
  }, [loanData])

  // Prepare data for pie chart - Used capacity first to start at 12:00
  const chartData: LoanData[] = useMemo(() => {
    return [
      {
        name: t('LoanUsageVisualization.used', 'Used'),
        value: metrics.loanUtilizationPercentage,
        usdAmount: metrics.currentLoanAmount,
        color: "#ef4444", // Red
        percentage: metrics.loanUtilizationPercentage,
        isActive: true // Make used capacity the active segment
      },
      {
        name: t('LoanUsageVisualization.available', 'Available'),
        value: metrics.availableCapacityPercentage,
        usdAmount: metrics.availableBorrowingCapacity,
        color: "#22c55e", // Green
        percentage: metrics.availableCapacityPercentage,
        isActive: false
      }
    ]
  }, [metrics])

  return (
    <CalculationsErrorBoundary>
      <Card className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Loan Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {params.initialBtcAmount === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No BTC amount specified</p>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {/* Pie Chart Container */}
            <div className="relative w-96 h-72 sm:w-96 sm:h-80">
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
                      
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          className="text-sm font-medium fill-foreground"
                          style={{ fontSize: '14px', fontWeight: '500' }}
                        >
                          ${chartData[index]?.usdAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
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
                      stroke="none"
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text with Platform Name and Max Loan Capacity */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-muted-foreground">{params.platform.charAt(0).toUpperCase() + params.platform.slice(1)}</div>
                <div className="text-xs text-muted-foreground">Max Loan Amount</div>
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
        {params.initialBtcAmount > 0 && (
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
              <span className="text-sm font-medium text-green-600">
                {metrics.availableCapacityPercentage.toFixed(1)}%
              </span>
              <span className="text-sm">{t('LoanUsageVisualization.loanAvailable', 'Loan Available')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
              <span className="text-sm font-medium text-red-600">
                {metrics.loanUtilizationPercentage.toFixed(1)}%
              </span>
              <span className="text-sm">{t('LoanUsageVisualization.loanTaken', 'Loan Taken')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </CalculationsErrorBoundary>
  )
}
