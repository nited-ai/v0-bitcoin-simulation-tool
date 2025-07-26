'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useSimulation } from '../../context/SimulationContext'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { loadHistoricalData, convertToEur } from '../../data/historicalDataLoader'
import type { PriceProjectionResult } from '../../price-models/types'
import type { HistoricalDataPoint } from '../../data/historicalDataLoader'

interface ChartDataPoint {
  date: string
  timestamp: number
  historicalPrice?: number
  projectedPrice?: number
  support?: number
  resistance?: number
  fit?: number
  isHistorical: boolean
}

interface UnifiedPriceChartProps {
  className?: string
}

export function UnifiedPriceChart({ className }: UnifiedPriceChartProps) {
  const { params } = useSimulation()
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load historical data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        console.log('📊 Loading historical data for unified chart...')
        
        let data = await loadHistoricalData()
        data = convertToEur(data, 0.92) // Convert to EUR
        
        // Limit to last 2 years for performance
        const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)
        data = data.filter(point => point.timestamp >= twoYearsAgo)
        
        setHistoricalData(data)
        console.log(`✅ Historical data loaded: ${data.length} points`)
        
      } catch (err) {
        console.error('❌ Error loading historical data:', err)
        setError('Failed to load historical data')
      }
    }

    loadData()
  }, [])

  // Generate projection when model or parameters change
  useEffect(() => {
    const generateProjection = async () => {
      if (historicalData.length === 0) return
      
      try {
        setLoading(true)
        setError(null)
        
        console.log(`🚀 Generating projection for unified chart: ${params.priceModel}`)
        
        // Prepare model parameters
        const modelParams = {
          startPrice: params.initialBtcPrice,
          projectionMonths: params.simulationMonths,
          modelSpecificParams: {}
        }
        
        // Add model-specific parameters
        if (params.priceModel === 'manual') {
          modelParams.modelSpecificParams = {
            annualGrowthRates: params.annualGrowthRates
          }
        } else if (params.priceModel === 'powerLaw') {
          modelParams.modelSpecificParams = {
            prognosisLine: params.powerLawSettings.prognosisLine
          }
        }
        
        const result = await priceModelRegistry.generateProjection(
          params.priceModel,
          historicalData,
          modelParams
        )
        
        setProjection(result)
        console.log(`✅ Projection generated: ${result.projectionPoints.length} points`)

      } catch (err) {
        console.error('❌ Error generating projection:', err)
        setError('Failed to generate price projection')
      } finally {
        setLoading(false)
      }
    }

    generateProjection()
  }, [historicalData, params.priceModel, params.initialBtcPrice, params.simulationMonths, params.annualGrowthRates, params.powerLawSettings])

  // Merge historical and projection data
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []
    const currentDate = new Date()
    
    // Add historical data (left side of chart)
    historicalData.forEach(point => {
      data.push({
        date: new Date(point.timestamp).toLocaleDateString('de-DE', { 
          year: 'numeric', 
          month: 'short' 
        }),
        timestamp: point.timestamp,
        historicalPrice: Math.round(point.close),
        isHistorical: true
      })
    })
    
    // Add projection data (right side of chart)
    if (projection) {
      projection.projectionPoints.forEach(point => {
        data.push({
          date: new Date(point.timestamp).toLocaleDateString('de-DE', { 
            year: 'numeric', 
            month: 'short' 
          }),
          timestamp: point.timestamp,
          projectedPrice: Math.round(point.price),
          support: point.support ? Math.round(point.support) : undefined,
          resistance: point.resistance ? Math.round(point.resistance) : undefined,
          fit: point.price ? Math.round(point.price) : undefined,
          isHistorical: false
        })
      })
    }
    
    // Sort by timestamp
    return data.sort((a, b) => a.timestamp - b.timestamp)
  }, [historicalData, projection])

  // Find current date for separator
  const currentDateIndex = useMemo(() => {
    const currentTime = Date.now()
    return chartData.findIndex(point => point.timestamp > currentTime)
  }, [chartData])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bitcoin Price Forecast</CardTitle>
          <CardDescription>Historical and projected Bitcoin price based on the selected model.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading chart data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bitcoin Price Forecast</CardTitle>
          <CardDescription>Error loading chart data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <span>{error}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bitcoin Price Forecast</CardTitle>
        <CardDescription>
          Historical and projected Bitcoin price based on the selected model.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="date" 
                minTickGap={50}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              
              <YAxis 
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                domain={['dataMin * 0.9', 'dataMax * 1.1']}
              />
              
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `€${value.toLocaleString('de-DE')}`, 
                  name === 'historicalPrice' ? 'Historical Price' :
                  name === 'projectedPrice' ? 'Projected Price' :
                  name === 'support' ? 'Support Line' :
                  name === 'resistance' ? 'Resistance Line' : 'Fit Line'
                ]}
                labelFormatter={(date: string) => `Date: ${date}`}
              />
              
              <Legend />
              
              {/* Current date separator */}
              {currentDateIndex > 0 && (
                <ReferenceLine 
                  x={chartData[currentDateIndex]?.date} 
                  stroke="#666" 
                  strokeDasharray="5 5"
                  label="Current Date"
                />
              )}
              
              {/* Historical price line */}
              <Line
                type="monotone"
                dataKey="historicalPrice"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                name="Historical Price"
                connectNulls={false}
              />
              
              {/* Projected price line */}
              <Line
                type="monotone"
                dataKey="projectedPrice"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Projected Price"
                connectNulls={false}
              />
              
              {/* Support line */}
              <Line
                type="monotone"
                dataKey="support"
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Support Line"
                connectNulls={false}
              />
              
              {/* Resistance line */}
              <Line
                type="monotone"
                dataKey="resistance"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Resistance Line"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
