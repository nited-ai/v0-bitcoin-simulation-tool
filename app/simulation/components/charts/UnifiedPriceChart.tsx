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
  const { historicalData, isHistoricalDataLoaded: isLoaded, isLoadingHistoricalData: isLoading, refreshHistoricalData } = useCentralizedData(true) // Enable loading with weekly data
  const searchParams = useSearchParams()

  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingProjection, setIsGeneratingProjection] = useState(false)
  const [isLogScale, setIsLogScale] = useState(true) // Default to log scale for Bitcoin analysis
  const [hasInitialProjection, setHasInitialProjection] = useState(false) // Track if initial projection is generated

  // Debug counter to track useEffect calls
  const effectCallCount = useRef(0)

  // Generate initial projection when data becomes available (fixes race condition)
  useEffect(() => {
    const generateInitialProjection = async () => {
      // Only generate initial projection once, when data is ready
      if (hasInitialProjection || historicalData.length === 0 || isLoading || !isLoaded) {
        return
      }

      console.log('🎯 Generating initial projection to prevent race condition')
      setIsGeneratingProjection(true)
      setError(null)

      try {
        // Use the same logic as the main projection generation
        const modelParams: PriceModelParams = {
          startPrice: params.initialBtcPrice,
          projectionMonths: params.simulationMonths,
          modelSpecificParams: {}
        }

        // Add model-specific parameters
        if (params.priceModel === 'manual') {
          modelParams.modelSpecificParams = {
            annualGrowthRates: params.annualGrowthRates || [20, 15, 10, 8, 5]
          }
        } else if (params.priceModel === 'powerLaw') {
          modelParams.modelSpecificParams = {
            prognosisLine: params.powerLawSettings?.prognosisLine || 'fit'
          }
        } else if (params.priceModel === 'enhancedCycleRepeat') {
          // Load diminishing returns parameters from sessionStorage
          let diminishingReturns = null
          try {
            const saved = sessionStorage.getItem('bitcoin-sim-diminishing-returns-params')
            if (saved) {
              diminishingReturns = JSON.parse(saved)
            }
          } catch (error) {
            console.warn('Failed to load diminishing returns params:', error)
          }

          // Use default moderate parameters if none are saved
          if (!diminishingReturns) {
            diminishingReturns = {
              diminishingFactor: 0.25,
              maturityThreshold: 2_000_000_000_000,
              cycleDegradation: 0.15,
              adoptionCurveType: 'sigmoid',
              institutionalSaturation: 0.4,
              regulatoryMaturity: 0.5,
              liquidityConstraint: 0.4,
              competitionFactor: 0.3
            }
          }

          modelParams.modelSpecificParams = {
            diminishingReturns
          }
        }

        const result = await priceModelRegistry.generateProjection(
          params.priceModel,
          historicalData,
          modelParams
        )

        if (result) {
          setProjection(result)
          setHasInitialProjection(true)
          if (onProjectionChange) {
            onProjectionChange(result)
          }
        }
      } catch (err) {
        console.error('Error generating initial projection:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate projection')
      } finally {
        setIsGeneratingProjection(false)
      }
    }

    generateInitialProjection()
  }, [
    hasInitialProjection,
    historicalData.length,
    isLoaded,
    isLoading,
    params.priceModel,
    params.initialBtcPrice,
    params.simulationMonths,
    onProjectionChange
  ])

  // Set loading state based on centralized data service and projection generation
  const loading = isLoading || !isLoaded || isGeneratingProjection

  // Debug logging
  console.log(`🎨 UnifiedPriceChart component rendered - Model: ${params.priceModel}`)
  console.log(`📊 Data state - Loaded: ${isLoaded}, Loading: ${isLoading}, Data points: ${historicalData.length}`)

  // Manual data loading function for debugging
  const loadDataManually = async () => {
    console.log('🔄 Manual data load triggered')
    try {
      await refreshHistoricalData()
      console.log('✅ Manual data load completed')
    } catch (error) {
      console.error('❌ Manual data load failed:', error)
    }
  }

  // Generate projection when model or parameters change
  useEffect(() => {
    const generateProjection = async () => {
      // Wait for historical data to be loaded and data loading to complete
      if (historicalData.length === 0 || isLoading || !isLoaded) {
        return
      }

      // Always generate projections when data is available and component is mounted
      // This ensures the chart works regardless of tab state or race conditions
      const currentTab = searchParams.get('tab') || 'parameters'

      // Generate projections when on price-projection tab or when component is first loaded
      // This fixes the issue where model selection wasn't working properly
      if (currentTab !== 'price-projection' && hasInitialProjection) {
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
        } else if (params.priceModel === 'enhancedCycleRepeat') {
          // Get diminishing returns parameters from sessionStorage or use defaults
          const savedParams = sessionStorage.getItem('bitcoin-sim-diminishing-returns-params')
          let diminishingReturns = null

          if (savedParams) {
            try {
              diminishingReturns = JSON.parse(savedParams)
            } catch (error) {
              console.warn('Failed to parse saved diminishing returns params:', error)
            }
          }

          // Use default moderate parameters if none are saved
          if (!diminishingReturns) {
            diminishingReturns = {
              diminishingFactor: 0.25,
              maturityThreshold: 2_000_000_000_000,
              cycleDegradation: 0.15,
              adoptionCurveType: 'sigmoid',
              institutionalSaturation: 0.4,
              regulatoryMaturity: 0.5,
              liquidityConstraint: 0.4,
              competitionFactor: 0.3
            }
            console.log('🔧 Using default moderate diminishing returns parameters')
          }

          modelParams.modelSpecificParams = {
            diminishingReturns
          }
        }

        
        console.log(`🎯 Generating projection with model: ${params.priceModel}`)
        console.log(`📊 Model parameters:`, modelParams)


        const result = await priceModelRegistry.generateProjection(
          params.priceModel,
          historicalData,
          modelParams
        )

        console.log(`✅ Projection generated successfully:`, result)
        console.log(`📈 Projection points: ${result?.projectionPoints?.length || 0}`)

        setProjection(result)
        setHasInitialProjection(true) // Mark that we have generated a projection
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
    params.diminishingReturnsUpdated, // Trigger recalculation when diminishing returns params change
    // params.logarithmicCurveUpdated, // Trigger recalculation when logarithmic curve params change
    params.lastUpdated, // General trigger for any parameter updates
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

    // Debug logging for chart data
    if (sortedData.length > 0) {
      console.log(`📊 Chart data prepared: ${sortedData.length} points`)
      console.log('📊 First data point:', sortedData[0])
      console.log('📊 Last data point:', sortedData[sortedData.length - 1])
      console.log('📊 Sample price values:', sortedData.slice(0, 5).map(d => d.price))
    } else {
      console.log('📊 No chart data available')
    }

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
          {/* Responsive header layout: stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bitcoin Price Forecast
              </CardTitle>
              <CardDescription>Historical and projected Bitcoin price based on the selected model.</CardDescription>
            </div>
            {/* Button group - full width on mobile, auto width on desktop */}
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={isLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLogScale(!isLogScale)}
                title={isLogScale ? "Switch to Linear Scale" : "Switch to Logarithmic Scale"}
                className="flex-1 md:flex-none"
              >
                {isLogScale ? "Log Scale" : "Linear"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={true}
                className="flex items-center gap-2 text-xs flex-1 md:flex-none"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
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
          {/* Responsive header layout: stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Bitcoin Price Forecast
              </CardTitle>
              <CardDescription>Error loading chart data</CardDescription>
            </div>
            {/* Button group - full width on mobile, auto width on desktop */}
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={isLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLogScale(!isLogScale)}
                title={isLogScale ? "Switch to Linear Scale" : "Switch to Logarithmic Scale"}
                className="flex-1 md:flex-none"
              >
                {isLogScale ? "Log Scale" : "Linear"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={true}
                className="flex items-center gap-2 text-xs flex-1 md:flex-none"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
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
        {/* Responsive header layout: stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Bitcoin Price Forecast
            </CardTitle>
            <CardDescription>
              Historical and projected Bitcoin price based on the selected model.
            </CardDescription>
          </div>
          {/* Button group - full width on mobile, auto width on desktop */}
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant={isLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLogScale(!isLogScale)}
              title={isLogScale ? "Switch to Linear Scale" : "Switch to Logarithmic Scale"}
              className="flex-1 md:flex-none"
            >
              {isLogScale ? "Log Scale" : "Linear"}
            </Button>
            <Button
              onClick={loadDataManually}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Load Data'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              disabled={isDownloading || chartData.length === 0}
              className="flex items-center gap-2 text-xs bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 flex-1 md:flex-none"
            >
              <Download className="h-3 w-3" />
              {isDownloading ? 'Downloading...' : 'CSV'}
            </Button>
          </div>
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
                scale={isLogScale ? "log" : "linear"}
                type="number"
                domain={isLogScale ? ['dataMin * 0.5', 'dataMax * 2'] : ['dataMin * 0.9', 'dataMax * 1.1']}
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
