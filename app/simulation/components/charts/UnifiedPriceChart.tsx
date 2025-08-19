'use client'

import React, { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { AlertCircle, Loader2, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSimulation } from '../../context/SimulationContext'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { useCentralizedData } from '../../hooks/useCentralizedData'
import type { PriceProjectionResult } from '../../price-models/types'
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'

interface ChartDataPoint {
  date: string
  timestamp: number
  // Single continuous price line
  price: number
  // OHLC data for CSV export
  open?: number
  high?: number
  low?: number
  close: number
  // Model-generated support/resistance lines
  support?: number
  resistance?: number
  // Metadata
  isHistorical: boolean
  confidence?: number
}

interface UnifiedPriceChartProps {
  className?: string
  onProjectionChange?: (projection: PriceProjectionResult | null) => void
}

/**
 * Calculate support line by connecting the lowest bottoms in historical data
 * Returns a straight line in log-log view connecting major bottoms
 */
function calculateSupportLine(historicalData: HistoricalDataPoint[]): { timestamp: number; supportPrice: number }[] {
  if (historicalData.length === 0) return []

  // Find major bottoms (local minima with significant drops)
  const bottoms: { time: number; price: number }[] = []
  const windowSize = 90 // 90-day window for finding bottoms

  for (let i = windowSize; i < historicalData.length - windowSize; i++) {
    const currentPrice = historicalData[i].close
    const isBottom = historicalData.slice(i - windowSize, i + windowSize)
      .every(point => point.close >= currentPrice * 0.95) // Allow 5% tolerance

    if (isBottom && currentPrice > 0) {
      bottoms.push({
        time: historicalData[i].time,
        price: currentPrice
      })
    }
  }

  // If we have at least 2 bottoms, create a support line
  if (bottoms.length >= 2) {
    const firstBottom = bottoms[0]
    const lastBottom = bottoms[bottoms.length - 1]

    // Calculate slope in log space for straight line in log-log view
    const logSlope = (Math.log(lastBottom.price) - Math.log(firstBottom.price)) /
                     (lastBottom.time - firstBottom.time)

    // Generate support line points
    return historicalData.map(point => ({
      timestamp: point.time * 1000, // Convert seconds to milliseconds
      supportPrice: Math.exp(
        Math.log(firstBottom.price) +
        logSlope * (point.time - firstBottom.time)
      )
    }))
  }

  // Fallback: simple trend line from first to last point
  const firstPoint = historicalData[0]
  const lastPoint = historicalData[historicalData.length - 1]
  const logSlope = (Math.log(lastPoint.close) - Math.log(firstPoint.close)) /
                   (lastPoint.time - firstPoint.time)

  return historicalData.map(point => ({
    timestamp: point.time * 1000, // Convert seconds to milliseconds
    supportPrice: Math.exp(
      Math.log(firstPoint.close) +
      logSlope * (point.time - firstPoint.time)
    ) * 0.3 // Support line below main trend
  }))
}

function UnifiedPriceChart({ className, onProjectionChange }: UnifiedPriceChartProps) {
  const { params } = useSimulation()
  const { historicalData, isHistoricalDataLoaded: isLoaded, isLoadingHistoricalData: isLoading } = useCentralizedData(true) // Enable loading with weekly data
  const searchParams = useSearchParams()

  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingProjection, setIsGeneratingProjection] = useState(false)

  // Debug counter to track useEffect calls
  const effectCallCount = useRef(0)

  // Set loading state based on centralized data service and projection generation
  const loading = isLoading || !isLoaded || isGeneratingProjection

  // Removed excessive debug logging for performance

  // Generate projection when model or parameters change
  useEffect(() => {
    const generateProjection = async () => {
      // Only generate projections when on the price-projection tab
      const currentTab = searchParams.get('tab') || 'parameters'
      if (currentTab !== 'price-projection') {
        return
      }

      // Wait for historical data to be loaded and data loading to complete
      if (historicalData.length === 0 || isLoading || !isLoaded) {
        return
      }

      // Removed excessive debug logging for performance

      try {
        setIsGeneratingProjection(true)
        setError(null)
        

        
        // Get the last known price (current price) as starting point for projections
        // This should be the most recent price from our complete historical dataset (CSV + API gap data)
        const lastKnownPrice = historicalData.length > 0
          ? historicalData[historicalData.length - 1].close
          : params.initialBtcPrice




        // Prepare model parameters with current price as starting point
        const modelParams = {
          startPrice: lastKnownPrice,
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
        onProjectionChange?.(result)


      } catch (err) {
        console.error('❌ Error generating projection:', err)
        setError('Failed to generate price projection')
      } finally {
        setIsGeneratingProjection(false)
      }
    }

    generateProjection()
  }, [
    historicalData.length, // Use length instead of full array to prevent unnecessary re-renders
    isLoaded, // Add loading state to ensure data is ready
    isLoading, // Add loading state to prevent race conditions
    params.priceModel,
    params.initialBtcPrice,
    params.simulationMonths,
    JSON.stringify(params.annualGrowthRates || []), // Stable string representation
    params.powerLawSettings?.prognosisLine, // Only the specific property that affects projections
    searchParams, // Add searchParams to detect tab changes
  ])

  // Merge historical and projection data into continuous timeline
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []

    // Add historical data with complete OHLC information
    historicalData.forEach(point => {
      // Convert time (seconds) to timestamp (milliseconds) for chart compatibility
      const timestampMs = point.time * 1000

      data.push({
        date: new Date(timestampMs).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'short'
        }),
        timestamp: timestampMs,
        price: Math.round(point.close),
        // Include OHLC data for CSV export
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        isHistorical: true,
        confidence: 1.0 // Historical data has full confidence
      })
    })

    // Add projection data (continues from historical data)
    if (projection) {
      projection.projectionPoints.forEach((point, index) => {
        // For projected data, calculate OHLC based on price movement
        const prevHistoricalPoint = historicalData[historicalData.length - 1]
        const prevProjectedPoint = index > 0 ? projection.projectionPoints[index - 1] : null
        const prevPrice = prevProjectedPoint ? prevProjectedPoint.price : prevHistoricalPoint?.close || point.price

        // Calculate realistic OHLC for projected data
        const volatility = 0.02 // 2% daily volatility
        const priceChange = (point.price - prevPrice) / prevPrice

        // Open price (close to previous close with small gap)
        const open = prevPrice * (1 + (Math.random() - 0.5) * 0.005)

        // High and Low based on volatility and price direction
        const high = Math.max(open, point.price) * (1 + Math.abs(priceChange) * 0.5 + Math.random() * volatility)
        const low = Math.min(open, point.price) * (1 - Math.abs(priceChange) * 0.5 - Math.random() * volatility)

        data.push({
          date: new Date(point.timestamp).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short'
          }),
          timestamp: point.timestamp,
          price: Math.round(point.price),
          // Calculated OHLC for projected data
          open: open,
          high: high,
          low: low,
          close: point.price,
          support: point.support ? Math.round(point.support) : undefined,
          resistance: point.resistance ? Math.round(point.resistance) : undefined,
          isHistorical: false,
          confidence: point.confidence
        })
      })
    }

    // Sort by timestamp to ensure continuous timeline
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp)
    // Removed excessive debug logging for performance
    return sortedData
  }, [historicalData, projection])

  // Find current date for separator
  const currentDateIndex = useMemo(() => {
    const currentTime = Date.now()
    return chartData.findIndex(point => point.timestamp > currentTime)
  }, [chartData])

  // No currency conversion needed - data is already in USD
  const getUsdRate = async (): Promise<number> => {
    // Since we're now using USD throughout, no conversion is needed
    return 1.0
  }

  // CSV download functionality with complete OHLC data
  const downloadCSV = async () => {
    if (chartData.length === 0) return

    setIsDownloading(true)

    try {
      // No conversion needed - data is already in USD
      const USD_RATE = await getUsdRate()


      // Generate CSV content with complete OHLC data matching original format
      const headers = ['Currency', 'Date', 'Closing Price (USD)', '24h Open (USD)', '24h High (USD)', '24h Low (USD)', 'Data_Type']
      const csvRows = [headers.join(',')]

      chartData.forEach((point, index) => {
        // Convert timestamp to proper YYYY-MM-DD format
        const date = new Date(point.timestamp).toISOString().split('T')[0]

        // Use actual OHLC data if available, otherwise calculate
        let openUSD: number, highUSD: number, lowUSD: number, closeUSD: number

        if (point.isHistorical && point.open && point.high && point.low) {
          // Use actual historical OHLC data (already in USD)
          openUSD = point.open
          highUSD = point.high
          lowUSD = point.low
          closeUSD = point.close
        } else {
          // For projected data or missing historical OHLC, use calculated values
          closeUSD = point.price
          openUSD = point.open || point.price
          highUSD = point.high || point.price
          lowUSD = point.low || point.price

          // Ensure OHLC logic: Low <= Open,Close <= High
          lowUSD = Math.min(lowUSD, openUSD, closeUSD)
          highUSD = Math.max(highUSD, openUSD, closeUSD)
        }

        const row = [
          'BTC',
          date,
          closeUSD.toFixed(2),
          openUSD.toFixed(2),
          highUSD.toFixed(2),
          lowUSD.toFixed(2),
          point.isHistorical ? 'Historical' : 'Projected'
        ]
        csvRows.push(row.join(','))
      })

      const csvContent = csvRows.join('\n')

      // Create and download file with improved method
      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `bitcoin-price-forecast-complete-${params.priceModel}-${currentDate}.csv`

      // Add BOM for proper UTF-8 encoding
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // Use modern download approach
      if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
        // IE/Edge
        (window.navigator as any).msSaveOrOpenBlob(blob, filename)
      } else {
        // Modern browsers
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.href = url
        link.download = filename
        link.style.display = 'none'

        document.body.appendChild(link)
        link.click()

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }, 100)
      }




      // Log data summary
      const historicalCount = chartData.filter(p => p.isHistorical).length
      const projectedCount = chartData.filter(p => !p.isHistorical).length


    } catch (err) {
      console.error('❌ Error generating enhanced CSV:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bitcoin Price Forecast
              </CardTitle>
              <CardDescription>Historical and projected Bitcoin price based on the selected model.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={true}
              className="flex items-center gap-2 text-xs"
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bitcoin Price Forecast
              </CardTitle>
              <CardDescription>Error loading chart data</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={true}
              className="flex items-center gap-2 text-xs"
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Bitcoin Price Forecast
            </CardTitle>
            <CardDescription>
              Historical and projected Bitcoin price based on the selected model.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCSV}
            disabled={isDownloading || chartData.length === 0}
            className="flex items-center gap-2 text-xs bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
          >
            <Download className="h-3 w-3" />
            {isDownloading ? 'Downloading...' : 'CSV'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp)
                  return date.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'short'
                  })
                }}
                minTickGap={50}
                angle={-45}
                textAnchor="end"
                height={60}
              />

              <YAxis
                scale="log"
                type="number"
                domain={['dataMin * 0.5', 'dataMax * 2']}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
                allowDataOverflow
              />
              
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString('en-US')}`,
                  name === 'price' ? 'Bitcoin Price' :
                  name === 'support' ? 'Support Line' :
                  name === 'resistance' ? 'Resistance Line' : name
                ]}
                labelFormatter={(timestamp: number) => {
                  const date = new Date(timestamp)
                  return `Date: ${date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}`
                }}
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
              
              {/* Continuous Bitcoin price line */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Bitcoin Price"
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

// Memoize component to prevent unnecessary re-renders
export default memo(UnifiedPriceChart)
