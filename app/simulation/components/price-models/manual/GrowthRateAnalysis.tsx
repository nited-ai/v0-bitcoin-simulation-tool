'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BarChart3 } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'

interface GrowthRateAnalysisProps {
  className?: string
}

export function GrowthRateAnalysis({ className }: GrowthRateAnalysisProps) {
  const { params } = useSimulation()
  
  // Convert months to years for display
  const simulationYears = Math.round(params.simulationMonths / 12)
  
  // Get current growth rates from params or use default
  const currentGrowthRates = params.annualGrowthRates || [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110]
  
  // Ensure growth rates array matches simulation years
  const adjustedGrowthRates = [...currentGrowthRates]
  while (adjustedGrowthRates.length < simulationYears) {
    adjustedGrowthRates.push(50) // Default 50% growth for new years
  }
  if (adjustedGrowthRates.length > simulationYears) {
    adjustedGrowthRates.splice(simulationYears)
  }

  // Calculate statistics
  const totalGrowth = adjustedGrowthRates.reduce((acc, rate) => acc * (1 + rate / 100), 1) - 1
  const avgGrowth = adjustedGrowthRates.reduce((acc, rate) => acc + rate, 0) / adjustedGrowthRates.length
  const maxGrowth = Math.max(...adjustedGrowthRates)
  const minGrowth = Math.min(...adjustedGrowthRates)

  // Calculate final price (assuming starting price of €108,629)
  const startingPrice = 108629
  const finalPrice = Math.round(startingPrice * (1 + totalGrowth))

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Growth Rate Analysis
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Single horizontal row with 5 containers: Avg Annual, Peak Growth, Max Decline, Final Price, Total Growth */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {avgGrowth.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Annual</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {maxGrowth}%
              </div>
              <div className="text-sm text-muted-foreground">Peak Growth</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {minGrowth}%
              </div>
              <div className="text-sm text-muted-foreground">Max Decline</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                €{finalPrice.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Final Price</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(totalGrowth * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Total Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
