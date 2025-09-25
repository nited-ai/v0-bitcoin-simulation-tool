'use client'

import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { AlertCircle, Loader2, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSimulation } from '../../context/SimulationContext'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { useCentralizedData } from '../../hooks/useCentralizedData'
import { useLiquidationCalculations } from '../../hooks/useCalculationsIntegration'
import type { PriceProjectionResult, PriceModelParams } from '../../price-models/types'
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
  // Liquidation price lines for legend integration
  immediateLiquidation?: number
  liquidationWithTopUp?: number
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
  const liquidationData = useLiquidationCalculations()
  const searchParams = useSearchParams()



  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingProjection, setIsGeneratingProjection] = useState(false)
  const [isLogScale, setIsLogScale] = useState(true) // Default to log scale for Bitcoin analysis
  const [hasInitialProjection, setHasInitialProjection] = useState(false) // Track if initial projection is generated

  // Legend visibility state for interactive controls
  const [showImmediateLiquidation, setShowImmediateLiquidation] = useState(true)
  const [showLiquidationWithTopUp, setShowLiquidationWithTopUp] = useState(true)

  // Support/Resistance line visibility with model-based defaults
  const [showSupportLine, setShowSupportLine] = useState(() => params.priceModel === 'powerLaw')
  const [showResistanceLine, setShowResistanceLine] = useState(() => params.priceModel === 'powerLaw')

  // Debug counter to track useEffect calls
  const effectCallCount = useRef(0)

  // Update support/resistance line visibility when model changes
  useEffect(() => {
    const isPowerLawModel = params.priceModel === 'powerLaw'
    setShowSupportLine(isPowerLawModel)
    setShowResistanceLine(isPowerLawModel)
  }, [params.priceModel])

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

  // Calculate liquidation prices first (needed for chart data)
  const liquidationPrices = useMemo(() => {
    console.log('🔍 LIQUIDATION PRICES CALCULATION:', {
      hasLiquidationData: !!liquidationData,
      liquidationData: liquidationData
    })

    if (!liquidationData) {
      console.log('⚠️ No liquidation data available')
      return null
    }

    const immediateLiquidationUsd = liquidationData.initialImmediateLiquidationPrice
    const trueLiquidationUsd = liquidationData.initialTrueLiquidationPrice
    const hasActiveLoan = immediateLiquidationUsd > 0

    console.log('💰 Calculated liquidation prices:', {
      immediate: immediateLiquidationUsd,
      withTopUp: trueLiquidationUsd,
      hasFreeBtc: liquidationData.initialHasFreeCollateral,
      hasActiveLoan
    })

    if (!hasActiveLoan) {
      console.log('⚠️ No active loan detected')
      return null
    }

    const result = {
      immediate: Math.round(immediateLiquidationUsd),
      withTopUp: Math.round(trueLiquidationUsd),
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    }

    console.log('✅ Returning liquidation prices:', result)
    return result
  }, [liquidationData])

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
        // Add liquidation prices if available (constant horizontal lines)
        immediateLiquidation: liquidationPrices?.immediate || null,
        liquidationWithTopUp: liquidationPrices?.hasFreeBtc ? liquidationPrices.withTopUp : null,
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
          // Add liquidation prices if available (constant horizontal lines)
          immediateLiquidation: liquidationPrices?.immediate || null,
          liquidationWithTopUp: liquidationPrices?.hasFreeBtc ? liquidationPrices.withTopUp : null,
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

      // Debug liquidation data in chart
      const sampleWithLiquidation = sortedData.find(d => d.immediateLiquidation !== undefined)
      console.log('🔍 CHART DATA LIQUIDATION DEBUG:', {
        hasLiquidationPrices: !!liquidationPrices,
        liquidationPrices: liquidationPrices,
        samplePointWithLiquidation: sampleWithLiquidation,
        immediateLiquidationValue: sampleWithLiquidation?.immediateLiquidation,
        liquidationWithTopUpValue: sampleWithLiquidation?.liquidationWithTopUp,
        totalPointsWithLiquidation: sortedData.filter(d => d.immediateLiquidation !== null).length,
        totalPointsWithImmediateLiquidation: sortedData.filter(d => d.immediateLiquidation !== undefined).length,
        totalPointsWithTopUpLiquidation: sortedData.filter(d => d.liquidationWithTopUp !== undefined).length
      })
    } else {
      console.log('📊 No chart data available')
    }

    return sortedData
  }, [historicalData, projection, liquidationPrices])

  // Calculate liquidation prices for reference lines (after chartData is available)
  const liquidationPricesForChart = useMemo(() => {
    if (!liquidationData || !chartData.length) {
      return null
    }

    // No currency conversion needed - data is already in USD
    const immediateLiquidationUsd = liquidationData.initialImmediateLiquidationPrice
    const trueLiquidationUsd = liquidationData.initialTrueLiquidationPrice

    // Only show liquidation lines if user has an active loan (liquidation prices > 0)
    const hasActiveLoan = immediateLiquidationUsd > 0
    if (!hasActiveLoan) {
      return null
    }

    const maxChartPrice = Math.max(...chartData.map(d => d.price))
    const minChartPrice = Math.min(...chartData.map(d => d.price))

    // Show lines if they're within 3x the chart range (reasonable visibility)
    const isWithinBounds = immediateLiquidationUsd >= minChartPrice * 0.1 &&
                          immediateLiquidationUsd <= maxChartPrice * 3

    if (!isWithinBounds) {
      return null
    }

    return {
      immediate: Math.round(immediateLiquidationUsd),
      withTopUp: Math.round(trueLiquidationUsd),
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    }
  }, [liquidationData, chartData])

  // Find current date for separator
  const currentDateIndex = useMemo(() => {
    const currentTime = Date.now()
    return chartData.findIndex(point => point.timestamp > currentTime)
  }, [chartData])

  // Legend click handler for interactive controls
  const handleLegendClick = useCallback((data: any) => {
    const { dataKey } = data

    // Handle liquidation line toggles
    if (dataKey === 'immediateLiquidation') {
      setShowImmediateLiquidation(prev => !prev)
    } else if (dataKey === 'liquidationWithTopUp') {
      setShowLiquidationWithTopUp(prev => !prev)
    }
    // Handle support/resistance line toggles
    else if (dataKey === 'support') {
      setShowSupportLine(prev => !prev)
    } else if (dataKey === 'resistance') {
      setShowResistanceLine(prev => !prev)
    }

    // Note: Price line should always be visible as it's the core chart element
  }, [])

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
                className="flex-1 md:flex-none"
              >
                <Download className="h-4 w-4" />
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
                className="flex-1 md:flex-none"
              >
                <Download className="h-4 w-4" />
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
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              disabled={isDownloading || chartData.length === 0}
              className="flex-1 md:flex-none"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-96 w-full relative">
          {/* Custom SVG overlay for liquidation lines */}
          {liquidationPrices && (showImmediateLiquidation || showLiquidationWithTopUp) && chartData.length > 0 && (() => {
            // Calculate actual chart data range for accurate positioning
            const minPrice = Math.min(...chartData.map(d => d.price));
            const maxPrice = Math.max(...chartData.map(d => d.price));

            // Use Y-axis domain calculation similar to the chart (with margins for log scale)
            const yAxisMin = isLogScale ? minPrice * 0.5 : minPrice * 0.9;
            const yAxisMax = isLogScale ? maxPrice * 2 : maxPrice * 1.1;

            // Calculate Y position for liquidation lines using actual chart range
            const calculateYPosition = (price) => {
              if (isLogScale) {
                // Logarithmic scale positioning
                const logPrice = Math.log10(price);
                const logMin = Math.log10(yAxisMin);
                const logMax = Math.log10(yAxisMax);
                const normalizedPosition = (logPrice - logMin) / (logMax - logMin);
                return 20 + (100 - normalizedPosition * 80); // 20% top margin, 80% chart area
              } else {
                // Linear scale positioning
                const normalizedPosition = (price - yAxisMin) / (yAxisMax - yAxisMin);
                return 20 + (100 - normalizedPosition * 80); // 20% top margin, 80% chart area
              }
            };

            return (
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg width="100%" height="100%" className="absolute inset-0">
                  {/* Immediate Liquidation Line */}
                  {showImmediateLiquidation && (() => {
                    const yPos = calculateYPosition(liquidationPrices.immediate);
                    console.log('🟡 RENDERING CORRECTED IMMEDIATE LIQUIDATION LINE:', {
                      y: liquidationPrices.immediate,
                      chartRange: `$${Math.round(minPrice)} - $${Math.round(maxPrice)}`,
                      yAxisRange: `$${Math.round(yAxisMin)} - $${Math.round(yAxisMax)}`,
                      yPosition: `${yPos}%`,
                      isLogScale
                    });
                    return (
                      <>
                        <line
                          x1="5%"
                          x2="95%"
                          y1={`${yPos}%`}
                          y2={`${yPos}%`}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.9"
                        />
                        <text
                          x="6%"
                          y={`${yPos - 2}%`}
                          fill="#f59e0b"
                          fontSize="11"
                          fontWeight="500"
                        >
                          Immediate Liquidation (${liquidationPrices.immediate.toLocaleString()})
                        </text>
                      </>
                    );
                  })()}

                  {/* Liquidation with Top-up Line */}
                  {showLiquidationWithTopUp && liquidationPrices.hasFreeBtc && liquidationPrices.withTopUp !== liquidationPrices.immediate && (() => {
                    const yPos = calculateYPosition(liquidationPrices.withTopUp);
                    console.log('🟢 RENDERING CORRECTED LIQUIDATION WITH TOP-UP LINE:', {
                      y: liquidationPrices.withTopUp,
                      chartRange: `$${Math.round(minPrice)} - $${Math.round(maxPrice)}`,
                      yAxisRange: `$${Math.round(yAxisMin)} - $${Math.round(yAxisMax)}`,
                      yPosition: `${yPos}%`,
                      isLogScale
                    });
                    return (
                      <>
                        <line
                          x1="5%"
                          x2="95%"
                          y1={`${yPos}%`}
                          y2={`${yPos}%`}
                          stroke="#22c55e"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.9"
                        />
                        <text
                          x="6%"
                          y={`${yPos - 2}%`}
                          fill="#22c55e"
                          fontSize="11"
                          fontWeight="500"
                        >
                          Liquidation with Top-up (${liquidationPrices.withTopUp.toLocaleString()})
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            );
          })()}

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
                domain={(() => {
                  // Calculate domain including liquidation prices
                  if (liquidationPrices) {
                    const minLiquidation = Math.min(liquidationPrices.immediate, liquidationPrices.withTopUp || Infinity)

                    if (isLogScale) {
                      // For log scale, ensure liquidation prices are visible by extending the lower bound
                      return [(dataMin, dataMax) => Math.min(dataMin * 0.5, minLiquidation * 0.5), 'dataMax * 2']
                    } else {
                      // For linear scale, ensure liquidation prices are visible by extending the lower bound
                      return [(dataMin, dataMax) => Math.min(dataMin * 0.9, minLiquidation * 0.8), 'dataMax * 1.1']
                    }
                  }

                  // Default domain if no liquidation prices
                  return isLogScale ? ['dataMin * 0.5', 'dataMax * 2'] : ['dataMin * 0.9', 'dataMax * 1.1']
                })()}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
                allowDataOverflow
              />
              
              <Tooltip
                formatter={(value: number, name: string) => {
                  const baseFormat = [
                    `$${value.toLocaleString('en-US')}`,
                    name === 'price' ? 'Bitcoin Price' :
                    name === 'support' ? 'Support Line' :
                    name === 'resistance' ? 'Resistance Line' :
                    name === 'immediateLiquidation' ? 'Immediate Liquidation' :
                    name === 'liquidationWithTopUp' ? 'Liquidation with Top-up' : name
                  ]

                  // Add liquidation context if price is near liquidation levels
                  if (liquidationPricesForChart && name === 'price') {
                    if (value <= liquidationPricesForChart.immediate) {
                      baseFormat.push('🚨 LIQUIDATION RISK!')
                    } else if (value <= liquidationPricesForChart.immediate * 1.1) {
                      baseFormat.push('⚠️ Near Liquidation')
                    }
                  }

                  return baseFormat
                }}
                labelFormatter={(timestamp: number) => {
                  const date = new Date(timestamp)
                  return `Date: ${date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}`
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  color: '#000'
                }}
              />
              
              <Legend
                onClick={handleLegendClick}
                wrapperStyle={{ cursor: 'pointer' }}
              />
              
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
                stroke={showSupportLine ? "#10b981" : "#9ca3af"}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Support Line"
                connectNulls={false}
                strokeOpacity={showSupportLine ? 1 : 0.3}
                hide={!showSupportLine}
              />

              {/* Resistance line */}
              <Line
                type="monotone"
                dataKey="resistance"
                stroke={showResistanceLine ? "#ef4444" : "#9ca3af"}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="Resistance Line"
                connectNulls={false}
                strokeOpacity={showResistanceLine ? 1 : 0.3}
                hide={!showResistanceLine}
              />

              {/* Liquidation lines are now rendered as custom SVG overlay above the chart */}

              {/* Note: ReferenceLine components removed - using Line components instead for better compatibility */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(UnifiedPriceChart)
