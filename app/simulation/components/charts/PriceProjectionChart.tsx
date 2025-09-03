"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { useSimulation } from "../../context/SimulationContext"
import { priceModelRegistry } from "../../price-models/PriceModelRegistry"
import { useHistoricalDataOnly } from "../../hooks/useCentralizedData"
import { useLiquidationCalculations } from "../../hooks/useCalculationsIntegration"
import type { PriceProjectionResult, PriceLineType } from "../../price-models/types"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Price Projection Chart Component
 * 
 * Displays price projections from selected models with support/resistance lines.
 * Users can select which line to use for their strategy.
 */
export function PriceProjectionChart() {
  const { params } = useSimulation()
  const { historicalData, isLoaded } = useHistoricalDataOnly()
  const liquidationData = useLiquidationCalculations()
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('manual')
  const [selectedPriceLine, setSelectedPriceLine] = useState<PriceLineType>('volatile')

  // Convert historical data to EUR for display
  const historicalDataEur = historicalData.map(point => ({
    ...point,
    open: point.open * 0.92,
    high: point.high * 0.92,
    low: point.low * 0.92,
    close: point.close * 0.92
  }))

  // Generate projection when model or parameters change
  const generateProjection = async () => {
    if (!isLoaded || historicalDataEur.length === 0) {
      setError('Historical data not loaded yet')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      

      
      // Get the last historical price as starting point for projections
      const lastHistoricalPrice = historicalDataEur.length > 0
        ? historicalDataEur[historicalDataEur.length - 1].close
        : params.initialBtcPrice

      // Prepare model parameters based on selected model
      let modelParams = {
        startPrice: lastHistoricalPrice,
        projectionMonths: params.simulationMonths,
        modelSpecificParams: {
          riskLevel: params.riskLevel || 'optimistic' // Pass risk level to all models
        }
      }

      // Add model-specific parameters
      if (selectedModel === 'manual') {
        modelParams.modelSpecificParams = {
          ...modelParams.modelSpecificParams,
          // annualGrowthRates: params.annualGrowthRates || [20, 15, 10, 8, 5]
        }
      } else if (selectedModel === 'powerLaw') {
        modelParams.modelSpecificParams = {
          ...modelParams.modelSpecificParams,
          // prognosisLine: 'fit' // Default to fit line
        }
      }
      // cycleRepeat doesn't need specific parameters
      
      const result = await priceModelRegistry.generateProjection(
        selectedModel,
        historicalData,
        modelParams
      )
      
      if (result) {
        setProjection(result)

      } else {
        setError('Failed to generate projection')
      }
      
    } catch (err) {
      console.error('Error generating projection:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate projection')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Get available models
  const availableModels = priceModelRegistry.getModelNames()
  
  // Prepare chart data
  const chartData = projection ? projection.projectionPoints.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short'
    }),
    volatile: Math.round(point.price),
    average: Math.round(point.price), // For now, same as volatile
    support: Math.round(point.support || point.price * 0.8),
    resistance: Math.round(point.resistance || point.price * 1.2),
    timestamp: point.timestamp
  })) : []

  // Calculate liquidation prices with USD to EUR conversion and conditional rendering
  const liquidationPrices = useMemo(() => {
    if (!liquidationData || !chartData.length) return null

    // Convert USD liquidation prices to EUR (using same 0.92 conversion as historical data)
    const eurConversionRate = 0.92
    const immediateLiquidationEur = liquidationData.initialImmediateLiquidationPrice * eurConversionRate
    const trueLiquidationEur = liquidationData.initialTrueLiquidationPrice * eurConversionRate

    // Only show liquidation lines if:
    // 1. User has an active loan (liquidation prices > 0)
    // 2. Liquidation prices are within reasonable chart bounds
    const hasActiveLoan = liquidationData.initialImmediateLiquidationPrice > 0
    if (!hasActiveLoan) return null

    const maxChartPrice = Math.max(...chartData.map(d => d.volatile))
    const minChartPrice = Math.min(...chartData.map(d => d.volatile))

    // Show lines if they're within 3x the chart range (reasonable visibility)
    const isWithinBounds = immediateLiquidationEur >= minChartPrice * 0.1 &&
                          immediateLiquidationEur <= maxChartPrice * 3

    if (!isWithinBounds) return null

    return {
      immediate: Math.round(immediateLiquidationEur),
      withTopUp: Math.round(trueLiquidationEur),
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    }
  }, [liquidationData, chartData])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Price Projection Models</CardTitle>
        <CardDescription>
          Generate price projections using different models and select price line for strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Model Selection and Controls */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium mb-2 block">Price Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select price model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium mb-2 block">Price Line for Strategy</label>
            <Select value={selectedPriceLine} onValueChange={(value) => setSelectedPriceLine(value as PriceLineType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select price line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volatile">Volatile Line (Main Projection)</SelectItem>
                <SelectItem value="average">Average Line (Smoothed)</SelectItem>
                <SelectItem value="support">Support Line (Conservative)</SelectItem>
                <SelectItem value="resistance">Resistance Line (Optimistic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={generateProjection} 
            disabled={isLoading || historicalData.length === 0}
            className="px-6"
          >
            {isLoading ? 'Generating...' : 'Generate Projection'}
          </Button>
        </div>
        
        {/* Model Information */}
        {selectedModel && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              📊 Selected Model: {availableModels.find(m => m.id === selectedModel)?.name}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </p>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">❌ {error}</p>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2">Generating projection...</span>
          </div>
        )}
        
        {/* Chart */}
        {projection && chartData.length > 0 && !isLoading && (
          <>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    minTickGap={30}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const baseFormat = [
                        `€${value.toLocaleString('de-DE')}`,
                        name === 'volatile' ? 'Volatile Price' :
                        name === 'average' ? 'Average Price' :
                        name === 'support' ? 'Support Price' : 'Resistance Price'
                      ]

                      // Add liquidation context if price is near liquidation levels
                      if (liquidationPrices && value <= liquidationPrices.immediate * 1.1) {
                        if (value <= liquidationPrices.immediate) {
                          baseFormat.push('🚨 LIQUIDATION RISK!')
                        } else {
                          baseFormat.push('⚠️ Near Liquidation')
                        }
                      }

                      return baseFormat
                    }}
                    labelFormatter={(date: string) => `Date: ${date}`}
                  />
                  <Legend />
                  
                  {/* Support Line */}
                  <Line
                    type="monotone"
                    dataKey="support"
                    stroke="#10b981"
                    strokeWidth={selectedPriceLine === 'support' ? 3 : 1}
                    strokeDasharray={selectedPriceLine === 'support' ? "0" : "5 5"}
                    dot={false}
                    name="Support Line"
                  />
                  
                  {/* Average Line */}
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#3b82f6"
                    strokeWidth={selectedPriceLine === 'average' ? 3 : 2}
                    strokeDasharray={selectedPriceLine === 'average' ? "0" : "3 3"}
                    dot={false}
                    name="Average Line"
                  />
                  
                  {/* Volatile Line (Main Projection) */}
                  <Line
                    type="monotone"
                    dataKey="volatile"
                    stroke="#f97316"
                    strokeWidth={selectedPriceLine === 'volatile' ? 4 : 2}
                    dot={false}
                    name="Volatile Line"
                  />
                  
                  {/* Resistance Line */}
                  <Line
                    type="monotone"
                    dataKey="resistance"
                    stroke="#ef4444"
                    strokeWidth={selectedPriceLine === 'resistance' ? 3 : 1}
                    strokeDasharray={selectedPriceLine === 'resistance' ? "0" : "5 5"}
                    dot={false}
                    name="Resistance Line"
                  />

                  {/* Liquidation Price Reference Lines */}
                  {liquidationPrices && (
                    <>
                      {/* Immediate Liquidation Price - Yellow/Amber Line (visible in both themes) */}
                      <ReferenceLine
                        y={liquidationPrices.immediate}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: "Immediate Liquidation",
                          position: "topRight",
                          style: {
                            fill: "#f59e0b",
                            fontSize: "12px",
                            fontWeight: "500",
                            textShadow: "0 0 3px rgba(255,255,255,0.8)"
                          }
                        }}
                      />

                      {/* Liquidation with Top-up - Green Line (only show if free BTC available) */}
                      {liquidationPrices.hasFreeBtc && liquidationPrices.withTopUp !== liquidationPrices.immediate && (
                        <ReferenceLine
                          y={liquidationPrices.withTopUp}
                          stroke="#22c55e"
                          strokeDasharray="3 3"
                          strokeWidth={2}
                          label={{
                            value: "Liquidation with Top-up",
                            position: "topLeft",
                            style: {
                              fill: "#22c55e",
                              fontSize: "12px",
                              fontWeight: "500",
                              textShadow: "0 0 3px rgba(255,255,255,0.8)"
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Projection Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  📊 Projection Details
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>Model: <strong>{projection.modelName}</strong></p>
                  <p>Duration: <strong>{projection.metadata.totalMonths} months</strong></p>
                  <p>Data Points: <strong>{projection.projectionPoints.length}</strong></p>
                  <p>Confidence: <strong>{(projection.metadata.confidence * 100).toFixed(0)}%</strong></p>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                  📈 Growth Projection
                </h4>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p>Start Price: <strong>${params.initialBtcPrice.toLocaleString('en-US')}</strong></p>
                  <p>End Price: <strong>${chartData[chartData.length - 1]?.volatile.toLocaleString('en-US')}</strong></p>
                  <p>Total Growth: <strong>{projection.metadata.totalGrowth.toFixed(1)}%</strong></p>
                  <p>Monthly Avg: <strong>{projection.metadata.averageMonthlyGrowth.toFixed(1)}%</strong></p>
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                  🎯 Selected for Strategy
                </h4>
                <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  <p>Price Line: <strong>{selectedPriceLine}</strong></p>
                  <p>Current Value: <strong>${chartData[0]?.[selectedPriceLine]?.toLocaleString('en-US')}</strong></p>
                  <p>Final Value: <strong>${chartData[chartData.length - 1]?.[selectedPriceLine]?.toLocaleString('en-US')}</strong></p>
                  <p>Strategy Ready: <strong>✅ Yes</strong></p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* No Projection State */}
        {!projection && !isLoading && !error && (
          <div className="p-8 border rounded-lg bg-muted/50 text-center">
            <h4 className="font-medium mb-2">📈 Ready to Generate Projection</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Select a price model and click "Generate Projection" to see the price forecast.
            </p>
            <p className="text-xs text-muted-foreground">
              The selected price line will be used for strategy simulations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
