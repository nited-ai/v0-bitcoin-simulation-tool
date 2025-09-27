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
import { getPowerLawPrice, getDaysSinceGenesis } from '@/src/modules/price-data/models/powerLaw'
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
  const [isLogLogScale, setIsLogLogScale] = useState(false) // Log-log scale for Power Law visualization
  const [hasInitialProjection, setHasInitialProjection] = useState(false) // Track if initial projection is generated

  // Legend visibility state for interactive controls
  const [showImmediateLiquidation, setShowImmediateLiquidation] = useState(true)
  const [showLiquidationWithTopUp, setShowLiquidationWithTopUp] = useState(true)

  // Power Law line visibility controls (only for Power Law model)
  const [showPLSupport, setShowPLSupport] = useState(true)
  const [showPLFit, setShowPLFit] = useState(true)
  const [showPLResistance, setShowPLResistance] = useState(true)

  // Debug counter to track useEffect calls
  const effectCallCount = useRef(0)

  // Ensure Power Law settings are initialized when Power Law model is selected
  useEffect(() => {
    if (params.priceModel === 'powerLaw' && !params.powerLawSettings) {
      console.log('🔧 Initializing missing Power Law settings...')
      setParams(prev => ({
        ...prev,
        powerLawSettings: {
          prognosisLine: 'fit',
          controlMode: 'unified',
          unifiedSlope: 5.844,
          unifiedIntercept: -17.01,
          individualParams: {
            fit: { slope: 5.844, intercept: -17.01 },
            support: { slope: 5.844, intercept: -17.46 },
            resistance: { slope: 5.06, intercept: -13.5 }
          }
        }
      }))
    }
  }, [params.priceModel, params.powerLawSettings, setParams])



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
    JSON.stringify(params.powerLawSettings?.controlMode), // Power Law control mode changes
    JSON.stringify(params.powerLawSettings?.unifiedSlope), // Unified slope changes
    JSON.stringify(params.powerLawSettings?.unifiedIntercept), // Unified intercept changes
    JSON.stringify(params.powerLawSettings?.individualParams), // Individual parameter changes
    params.diminishingReturnsUpdated, // Trigger recalculation when diminishing returns params change
    // params.logarithmicCurveUpdated, // Trigger recalculation when logarithmic curve params change
    params.lastUpdated, // General trigger for any parameter updates
    searchParams, // Add searchParams to detect tab changes
  ])

  // Calculate liquidation prices first (needed for chart data)
  const liquidationPrices = useMemo(() => {
    if (!liquidationData) {
      return null
    }

    const immediateLiquidationUsd = liquidationData.initialImmediateLiquidationPrice
    const trueLiquidationUsd = liquidationData.initialTrueLiquidationPrice
    const hasActiveLoan = immediateLiquidationUsd > 0

    if (!hasActiveLoan) {
      return null
    }

    return {
      immediate: Math.round(immediateLiquidationUsd),
      withTopUp: Math.round(trueLiquidationUsd),
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    }
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
        // Add liquidation prices if available
        immediateLiquidation: liquidationPrices?.immediate,
        liquidationWithTopUp: liquidationPrices?.hasFreeBtc ? liquidationPrices.withTopUp : undefined,
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
          // Add liquidation prices if available
          immediateLiquidation: liquidationPrices?.immediate,
          liquidationWithTopUp: liquidationPrices?.hasFreeBtc ? liquidationPrices.withTopUp : undefined,
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
  }, [historicalData, projection, liquidationPrices])

  // Generate model-specific overlay data (optimized for performance)
  const chartDataWithOverlays = useMemo(() => {
    if (chartData.length === 0) return []

    let processedData = chartData

    // Only add Power Law lines if Power Law model is selected
    if (params.priceModel === 'powerLaw') {
      try {
        console.log('📈 Generating Power Law lines for chart overlay...')
        console.log('   🔧 Power Law settings:', params.powerLawSettings)

        // Performance optimization: Sample data points to avoid blocking the main thread
        // For charts with many data points, we only calculate Power Law lines for a subset
        const maxPoints = 500 // Limit to 500 points for smooth performance
        const sampleInterval = Math.max(1, Math.floor(chartData.length / maxPoints))

        console.log(`   📊 Sampling ${chartData.length} points with interval ${sampleInterval} (max ${maxPoints} points)`)

        // Generate Power Law lines for sampled points only
        const sampledData = chartData.filter((_, index) => index % sampleInterval === 0)

        processedData = sampledData.map((point, index) => {
          try {
            const date = new Date(point.timestamp)

            // Validate date
            if (isNaN(date.getTime())) {
              console.warn(`⚠️ Invalid date for point ${index}:`, point.timestamp)
              return {
                ...point,
                plSupport: null,
                plFit: null,
                plResistance: null
              }
            }

            // Calculate Power Law prices for this date using custom parameters if available
            const powerLawParams = params.powerLawSettings ? {
              controlMode: params.powerLawSettings.controlMode,
              unifiedSlope: params.powerLawSettings.unifiedSlope,
              unifiedIntercept: params.powerLawSettings.unifiedIntercept,
              individualParams: params.powerLawSettings.individualParams
            } : undefined

            const supportPrice = getPowerLawPrice(date, 'support', powerLawParams)
            const fitPrice = getPowerLawPrice(date, 'fit', powerLawParams)
            const resistancePrice = getPowerLawPrice(date, 'resistance', powerLawParams)

            // Validate calculated prices
            if (isNaN(supportPrice) || isNaN(fitPrice) || isNaN(resistancePrice)) {
              console.warn(`⚠️ Invalid Power Law prices for ${date.toISOString()}:`, { supportPrice, fitPrice, resistancePrice })
              return {
                ...point,
                plSupport: null,
                plFit: null,
                plResistance: null
              }
            }

            return {
              ...point,
              plSupport: Math.round(supportPrice),
              plFit: Math.round(fitPrice),
              plResistance: Math.round(resistancePrice)
            }
          } catch (error) {
            console.error(`❌ Error calculating Power Law for point ${index}:`, error)
            return {
              ...point,
              plSupport: null,
              plFit: null,
              plResistance: null
            }
          }
        })

        // Log sample of generated Power Law data for verification
        if (processedData.length > 0) {
          const firstPoint = processedData[0]
          const lastPoint = processedData[processedData.length - 1]
          console.log('   ✅ Power Law lines generated successfully')
          console.log(`   📊 First point PL prices:`, {
            support: firstPoint.plSupport,
            fit: firstPoint.plFit,
            resistance: firstPoint.plResistance
          })
          console.log(`   📊 Last point PL prices:`, {
            support: lastPoint.plSupport,
            fit: lastPoint.plFit,
            resistance: lastPoint.plResistance
          })
        }
      } catch (error) {
        console.error('❌ Critical error generating Power Law lines:', error)
        // Fallback: return original data without Power Law lines
        processedData = chartData
      }
    }

    // Apply log-log time transformation if enabled (BitBo-style compression)
    if (isLogLogScale) {
      const genesisDate = new Date('2009-01-03').getTime() // Bitcoin genesis block

      return processedData.map(point => {
        // Calculate days since genesis
        const daysSinceGenesis = Math.max(1, (point.timestamp - genesisDate) / (1000 * 60 * 60 * 24))

        // Use log transformation for time compression (like BitBo)
        const logTime = Math.log10(daysSinceGenesis)

        return {
          ...point,
          // Store both original timestamp and log-transformed time
          originalTimestamp: point.timestamp,
          timestamp: logTime * 1000000 // Scale up to avoid precision issues
        }
      })
    }

    return processedData
  }, [chartData, params.priceModel, isLogLogScale])

  // Calculate liquidation prices for reference lines (after chartData is available)
  const liquidationPricesForChart = useMemo(() => {
    if (!liquidationData || !chartData.length) {
      console.log('🔍 No liquidation data or chart data available')
      return null
    }

    // No currency conversion needed - data is already in USD
    const immediateLiquidationUsd = liquidationData.initialImmediateLiquidationPrice
    const trueLiquidationUsd = liquidationData.initialTrueLiquidationPrice

    console.log('💰 Liquidation prices:', {
      immediate: immediateLiquidationUsd,
      withTopUp: trueLiquidationUsd,
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    })

    // Only show liquidation lines if user has an active loan (liquidation prices > 0)
    const hasActiveLoan = immediateLiquidationUsd > 0
    if (!hasActiveLoan) {
      console.log('⚠️ No active loan, hiding liquidation lines')
      return null
    }

    const maxChartPrice = Math.max(...chartData.map(d => d.price))
    const minChartPrice = Math.min(...chartData.map(d => d.price))

    console.log('📊 Chart price range:', { min: minChartPrice, max: maxChartPrice })

    // Show lines if they're within 3x the chart range (reasonable visibility)
    const isWithinBounds = immediateLiquidationUsd >= minChartPrice * 0.1 &&
                          immediateLiquidationUsd <= maxChartPrice * 3

    if (!isWithinBounds) {
      console.log('📏 Liquidation prices outside chart bounds, hiding lines')
      return null
    }

    console.log('✅ Showing liquidation lines')
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
    // Handle Power Law line toggles (only for Power Law model)
    else if (params.priceModel === 'powerLaw') {
      if (dataKey === 'plSupport') {
        setShowPLSupport(prev => !prev)
      } else if (dataKey === 'plFit') {
        setShowPLFit(prev => !prev)
      } else if (dataKey === 'plResistance') {
        setShowPLResistance(prev => !prev)
      }
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
                variant={!isLogScale && !isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(false)
                  setIsLogLogScale(false)
                }}
                title="Linear scale for both axes"
                className="flex-1 md:flex-none"
              >
                Linear
              </Button>
              <Button
                variant={isLogScale && !isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(true)
                  setIsLogLogScale(false)
                }}
                title="Logarithmic Y-axis, linear time axis"
                className="flex-1 md:flex-none"
              >
                Log
              </Button>
              <Button
                variant={isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(true)
                  setIsLogLogScale(true)
                }}
                title="Logarithmic scale for both axes - Power Law lines appear straight"
                className="flex-1 md:flex-none"
              >
                Log-Log
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
                variant={!isLogScale && !isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(false)
                  setIsLogLogScale(false)
                }}
                title="Linear scale for both axes"
                className="flex-1 md:flex-none"
              >
                Linear
              </Button>
              <Button
                variant={isLogScale && !isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(true)
                  setIsLogLogScale(false)
                }}
                title="Logarithmic Y-axis, linear time axis"
                className="flex-1 md:flex-none"
              >
                Log
              </Button>
              <Button
                variant={isLogLogScale ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsLogScale(true)
                  setIsLogLogScale(true)
                }}
                title="Logarithmic scale for both axes - Power Law lines appear straight"
                className="flex-1 md:flex-none"
              >
                Log-Log
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
              variant={!isLogScale && !isLogLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsLogScale(false)
                setIsLogLogScale(false)
              }}
              title="Linear scale for both axes"
              className="flex-1 md:flex-none"
            >
              Linear
            </Button>
            <Button
              variant={isLogScale && !isLogLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsLogScale(true)
                setIsLogLogScale(false)
              }}
              title="Logarithmic Y-axis, linear time axis"
              className="flex-1 md:flex-none"
            >
              Log
            </Button>
            <Button
              variant={isLogLogScale ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsLogScale(true)
                setIsLogLogScale(true)
              }}
              title="Logarithmic scale for both axes - Power Law lines appear straight"
              className="flex-1 md:flex-none"
            >
              Log-Log
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              disabled={isDownloading || chartDataWithOverlays.length === 0}
              className="flex-1 md:flex-none"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>



      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataWithOverlays}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale={isLogLogScale ? "linear" : "time"}
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => {
                  if (isLogLogScale) {
                    // Convert back from log-transformed time to days since genesis
                    const logDays = timestamp / 1000000
                    const daysSinceGenesis = Math.pow(10, logDays)

                    // Convert days back to actual date
                    const genesisDate = new Date('2009-01-03').getTime()
                    const actualDate = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)

                    // Show years for log-log scale (BitBo style)
                    return actualDate.getFullYear().toString()
                  }

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
                scale={isLogScale || isLogLogScale ? "log" : "linear"}
                type="number"
                domain={isLogScale || isLogLogScale ? ['dataMin * 0.5', 'dataMax * 2'] : ['dataMin * 0.9', 'dataMax * 1.1']}
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
                    name === 'powerLawSupport' ? 'Power Law Support' :
                    name === 'powerLawFit' ? 'Power Law Fit' :
                    name === 'powerLawResistance' ? 'Power Law Resistance' :
                    name === 'support' ? 'Support Line' :
                    name === 'resistance' ? 'Resistance Line' :
                    name === 'immediateLiquidation' ? 'Immediate Liquidation' :
                    name === 'liquidationWithTopUp' ? 'Liquidation with Top-up' : name
                  ]

                  // Add Power Law context
                  if (name.startsWith('pl')) {
                    if (name === 'plSupport') {
                      baseFormat.push('📉 Calibrated to 2022 bottom')
                    } else if (name === 'plFit') {
                      baseFormat.push('📊 Industry standard fair value')
                    } else if (name === 'plResistance') {
                      baseFormat.push('📈 Calibrated to 2013 peak')
                    }
                  }

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
                  let date: Date

                  if (isLogLogScale) {
                    // Convert back from log-transformed time to actual date
                    const logDays = timestamp / 1000000
                    const daysSinceGenesis = Math.pow(10, logDays)
                    const genesisDate = new Date('2009-01-03').getTime()
                    date = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)
                  } else {
                    date = new Date(timestamp)
                  }

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

              {/* Power Law Lines - Only shown when Power Law model is selected */}
              {params.priceModel === 'powerLaw' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="plSupport"
                    stroke={showPLSupport ? "#10b981" : "#9ca3af"}
                    strokeWidth={2}
                    dot={false}
                    name="PL Support"
                    connectNulls={false}
                    strokeDasharray="5 5"
                    strokeOpacity={showPLSupport ? 1 : 0.3}
                    hide={!showPLSupport}
                  />

                  <Line
                    type="monotone"
                    dataKey="plFit"
                    stroke={showPLFit ? "#3b82f6" : "#9ca3af"}
                    strokeWidth={2}
                    dot={false}
                    name="PL Fit"
                    connectNulls={false}
                    strokeDasharray="3 3"
                    strokeOpacity={showPLFit ? 1 : 0.3}
                    hide={!showPLFit}
                  />

                  <Line
                    type="monotone"
                    dataKey="plResistance"
                    stroke={showPLResistance ? "#ef4444" : "#9ca3af"}
                    strokeWidth={2}
                    dot={false}
                    name="PL Resistance"
                    connectNulls={false}
                    strokeDasharray="5 5"
                    strokeOpacity={showPLResistance ? 1 : 0.3}
                    hide={!showPLResistance}
                  />
                </>
              )}

              {/* Invisible Line components for liquidation legend entries */}
              {liquidationPricesForChart && (
                <>
                  {/* Immediate Liquidation Legend Entry */}
                  <Line
                    type="monotone"
                    dataKey="immediateLiquidation"
                    stroke={showImmediateLiquidation ? "#eab308" : "#9ca3af"}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    name="Immediate Liquidation"
                    connectNulls={false}
                    strokeOpacity={showImmediateLiquidation ? 1 : 0.3}
                    hide={!showImmediateLiquidation}
                  />

                  {/* Liquidation with Top-up Legend Entry */}
                  {liquidationPricesForChart.hasFreeBtc && liquidationPricesForChart.withTopUp !== liquidationPricesForChart.immediate && (
                    <Line
                      type="monotone"
                      dataKey="liquidationWithTopUp"
                      stroke={showLiquidationWithTopUp ? "#22c55e" : "#9ca3af"}
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      dot={false}
                      name="Liquidation with Top-up"
                      connectNulls={false}
                      strokeOpacity={showLiquidationWithTopUp ? 1 : 0.3}
                      hide={!showLiquidationWithTopUp}
                    />
                  )}
                </>
              )}

              {/* Liquidation Price Reference Lines */}
              {liquidationPricesForChart && (
                <>
                  {/* Immediate Liquidation Price - Amber Line (visible in both themes) */}
                  {showImmediateLiquidation && (
                    <ReferenceLine
                      y={liquidationPricesForChart.immediate}
                      stroke="#eab308"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                  )}

                  {/* Liquidation with Top-up - Green Line (only show if free BTC available) */}
                  {showLiquidationWithTopUp && liquidationPricesForChart.hasFreeBtc && liquidationPricesForChart.withTopUp !== liquidationPricesForChart.immediate && (
                    <ReferenceLine
                      y={liquidationPricesForChart.withTopUp}
                      stroke="#22c55e"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(UnifiedPriceChart)
