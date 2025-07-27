'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TrendingUp, BarChart3, Settings, MousePointer, Calendar } from 'lucide-react'
import { ManualGrowthControls } from './ManualGrowthControls'
import { InteractiveProjectionChart } from './InteractiveProjectionChart'
import { SimulationLengthControl } from '../SimulationLengthControl'
import { useSimulation } from '../../../context/SimulationContext'

interface ManualGrowthModelInterfaceProps {
  historicalData: Array<{
    timestamp: number
    date: string
    close: number
  }>
  onProjectionChange?: (projection: any) => void
  className?: string
}

// Default growth rates (Aggressive preset)
const DEFAULT_GROWTH_RATES = [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110]

export function ManualGrowthModelInterface({
  historicalData,
  onProjectionChange,
  className
}: ManualGrowthModelInterfaceProps) {
  const { params } = useSimulation()
  const [growthRates, setGrowthRates] = useState<number[]>(DEFAULT_GROWTH_RATES)
  const [projectionData, setProjectionData] = useState<Array<{
    timestamp: number
    date: string
    price: number
  }>>([])

  // Get starting price from last historical data point
  const startingPrice = historicalData[historicalData.length - 1]?.close || 100000
  const startingDate = new Date(historicalData[historicalData.length - 1]?.timestamp || Date.now())

  // Calculate simulation years from months
  const simulationYears = Math.round(params.simulationMonths / 12)

  // Calculate projection data based on growth rates
  const calculateProjection = useCallback((rates: number[]) => {
    const projectionMonths = params.simulationMonths
    const projection: Array<{
      timestamp: number
      date: string
      price: number
    }> = []

    let currentPrice = startingPrice
    let currentDate = new Date(startingDate)

    for (let month = 1; month <= projectionMonths; month++) {
      // Move to next month
      currentDate = new Date(currentDate)
      currentDate.setMonth(currentDate.getMonth() + 1)

      // Get annual growth rate for current year
      const yearIndex = Math.floor((month - 1) / 12)
      const annualGrowthRate = rates[yearIndex % rates.length] || 0

      // Apply monthly compound growth
      const monthlyGrowthRate = Math.pow(1 + (annualGrowthRate / 100), 1 / 12) - 1
      currentPrice = currentPrice * (1 + monthlyGrowthRate)

      projection.push({
        timestamp: currentDate.getTime(),
        date: currentDate.toISOString().split('T')[0],
        price: Math.round(currentPrice)
      })
    }

    return projection
  }, [startingPrice, startingDate, params.simulationMonths])

  // Update projection when growth rates change
  useEffect(() => {
    const newProjection = calculateProjection(growthRates)
    setProjectionData(newProjection)
    
    // Notify parent component
    if (onProjectionChange) {
      onProjectionChange({
        data: newProjection,
        growthRates,
        startingPrice,
        totalGrowth: ((newProjection[newProjection.length - 1]?.price || startingPrice) / startingPrice - 1) * 100
      })
    }
  }, [growthRates, calculateProjection, onProjectionChange, startingPrice])

  // Handle growth rates change
  const handleGrowthRatesChange = (newRates: number[]) => {
    setGrowthRates(newRates)
  }

  // Format historical data for chart
  const chartHistoricalData = historicalData.map(point => ({
    timestamp: point.timestamp,
    date: point.date,
    price: point.close
  }))

  // Calculate statistics
  const finalPrice = projectionData[projectionData.length - 1]?.price || startingPrice
  const totalGrowth = ((finalPrice / startingPrice) - 1) * 100
  const avgAnnualGrowth = growthRates.reduce((acc, rate) => acc + rate, 0) / growthRates.length

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Manual Growth Rate Model
            <Badge variant="secondary" className="ml-2">Interactive</Badge>
          </CardTitle>
          <CardDescription>
            Customize Bitcoin price projections with user-defined annual growth rates
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="length" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="length" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Length
              </TabsTrigger>
              <TabsTrigger value="controls" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Controls
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Interactive Chart
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="length" className="space-y-4">
              <SimulationLengthControl />
            </TabsContent>

            <TabsContent value="controls" className="space-y-4">
              <ManualGrowthControls
                growthRates={growthRates}
                onGrowthRatesChange={handleGrowthRatesChange}
                simulationYears={simulationYears}
              />
            </TabsContent>

            <TabsContent value="chart" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border">
                  <MousePointer className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Interactive Chart Mode</h4>
                    <p className="text-sm text-blue-700">
                      Drag the blue dots on the projection line to visually adjust annual growth rates
                    </p>
                  </div>
                </div>

                <InteractiveProjectionChart
                  historicalData={chartHistoricalData}
                  projectionData={projectionData}
                  growthRates={growthRates}
                  onGrowthRatesChange={handleGrowthRatesChange}
                  startingPrice={startingPrice}
                />
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {/* Projection Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Starting Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ${startingPrice.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current Bitcoin price
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Final Price (2037)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ${finalPrice.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      12-year projection
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Total Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {totalGrowth.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cumulative return
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Growth Rate Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Growth Rate Analysis</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold">
                      {avgAnnualGrowth.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Annual</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {Math.max(...growthRates)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Peak Growth</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">
                      {Math.min(...growthRates)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Max Decline</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {growthRates.filter(rate => rate > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Bull Years</div>
                  </div>
                </div>

                {/* Year-by-year breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium">Year-by-Year Growth Rates</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {growthRates.map((rate, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded text-center text-sm ${
                          rate > 100 ? 'bg-green-100 text-green-800' :
                          rate > 0 ? 'bg-green-50 text-green-600' :
                          rate > -20 ? 'bg-orange-50 text-orange-600' :
                          'bg-red-50 text-red-600'
                        }`}
                      >
                        <div className="font-medium">Year {index + 1}</div>
                        <div className="text-xs">{rate > 0 ? '+' : ''}{rate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
