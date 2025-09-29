'use client'

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { AlertCircle, Loader2, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSimulation } from '../../context/SimulationContext'
import { useTheme } from 'next-themes'
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
  // Power Law lines (for Power Law model)
  plSupport?: number | null
  plFit?: number | null
  plResistance?: number | null
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
  const { params, setParams } = useSimulation()
  const { historicalData, isHistoricalDataLoaded: isLoaded, isLoadingHistoricalData: isLoading, refreshHistoricalData } = useCentralizedData(true) // Enable loading with weekly data
  const liquidationData = useLiquidationCalculations()
  const searchParams = useSearchParams()
  const { theme } = useTheme()



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

  // Power Law line visibility controls (can be manually toggled on any model)
  const [showPLSupport, setShowPLSupport] = useState(true)
  const [showPLFit, setShowPLFit] = useState(true)
  const [showPLResistance, setShowPLResistance] = useState(true)

  // Track which Power Law lines have been manually enabled on non-Power Law models
  const [manualPLSupport, setManualPLSupport] = useState(false)
  const [manualPLFit, setManualPLFit] = useState(false)
  const [manualPLResistance, setManualPLResistance] = useState(false)



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
    params.simulationMonths
    // Removed onProjectionChange to prevent infinite loops
  ])

  // Set loading state based on centralized data service and projection generation
  const loading = isLoading || !isLoaded || isGeneratingProjection


  // Generate projection when model or parameters change (debounced for performance)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

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
          // Get diminishing returns parameters asynchronously to prevent blocking
          let diminishingReturns = null

          try {
            // Use setTimeout to make sessionStorage access non-blocking
            await new Promise(resolve => {
              setTimeout(() => {
                const savedParams = sessionStorage.getItem('bitcoin-sim-diminishing-returns-params')
                if (savedParams) {
                  try {
                    diminishingReturns = JSON.parse(savedParams)
                  } catch (error) {
                    console.warn('Failed to parse saved diminishing returns params:', error)
                  }
                }
                resolve(void 0)
              }, 0)
            })
          } catch (error) {
            console.warn('Failed to access sessionStorage:', error)
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

    // Debounce projection generation to prevent excessive calls
    timeoutId = setTimeout(() => {
      generateProjection()
    }, 300) // 300ms debounce

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [
    historicalData.length, // Use length instead of full array to prevent unnecessary re-renders
    isLoaded, // Add loading state to ensure data is ready
    isLoading, // Add loading state to prevent race conditions
    params.priceModel,
    params.initialBtcPrice,
    params.simulationMonths,
    params.powerLawSettings?.prognosisLine, // Only the specific property that affects projections
    params.diminishingReturnsUpdated, // Trigger recalculation when diminishing returns params change
    params.lastUpdated, // General trigger for any parameter updates
    JSON.stringify(params.annualGrowthRates), // Manual growth model rates (JSON.stringify for array comparison)
    searchParams.get('tab') // Only depend on the tab value, not the entire searchParams object
    // Removed complex JSON.stringify dependencies that cause infinite loops
  ])

  // Calculate liquidation prices with bounds checking (unified calculation)
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

    const result = {
      immediate: Math.round(immediateLiquidationUsd),
      withTopUp: Math.round(trueLiquidationUsd),
      hasFreeBtc: liquidationData.initialHasFreeCollateral
    }

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
        immediateLiquidation: liquidationPrices?.immediate || undefined,
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
          // Add liquidation prices if available (constant horizontal lines)
          immediateLiquidation: liquidationPrices?.immediate || undefined,
          liquidationWithTopUp: liquidationPrices?.hasFreeBtc ? liquidationPrices.withTopUp : undefined,
          isHistorical: false,
          confidence: point.confidence
        })
      })
    }

    // Sort by timestamp to ensure continuous timeline
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp)



    return sortedData
  }, [historicalData, projection, liquidationPrices])

  // Generate model-specific overlay data (optimized for performance)
  const chartDataWithOverlays = useMemo(() => {
    if (chartData.length === 0) return []

    let processedData = chartData

    console.log('🔍 Chart overlay generation - Model:', params.priceModel)

    // Always generate Power Law lines for cross-model comparison
    // They will be hidden by default on non-Power Law models but can be manually toggled
    if (params.priceModel === 'powerLaw' || manualPLSupport || manualPLFit || manualPLResistance || true) {
      try {
        console.log('📈 Generating Power Law lines for chart overlay...')
        console.log('   🔧 Power Law settings:', params.powerLawSettings)

        // Performance optimization: Sample data points to avoid blocking the main thread
        // For charts with many data points, we only calculate Power Law lines for a subset
        const maxPoints = 500 // Limit to 500 points for smooth performance
        const sampleInterval = Math.max(1, Math.floor(chartData.length / maxPoints))

        console.log(`   📊 Sampling ${chartData.length} points with interval ${sampleInterval} (max ${maxPoints} points)`)

        // Generate Power Law lines for all points, but calculate only for sampled points for performance
        processedData = chartData.map((point, index) => {
          // Only calculate Power Law for sampled points to optimize performance
          const shouldCalculatePowerLaw = index % sampleInterval === 0

          if (!shouldCalculatePowerLaw) {
            // For non-sampled points, just add null Power Law values
            return {
              ...point,
              plSupport: null,
              plFit: null,
              plResistance: null
            }
          }

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
          const sampledPoints = processedData.filter(p => p.plSupport !== null)
          const totalPoints = processedData.length
          const calculatedPoints = sampledPoints.length

          console.log('   ✅ Power Law lines generated successfully')
          console.log(`   📊 Total data points: ${totalPoints}, Power Law calculated for: ${calculatedPoints}`)

          if (sampledPoints.length > 0) {
            const firstSampledPoint = sampledPoints[0]
            const lastSampledPoint = sampledPoints[sampledPoints.length - 1]
            console.log(`   📊 First sampled point PL prices:`, {
              support: firstSampledPoint.plSupport,
              fit: firstSampledPoint.plFit,
              resistance: firstSampledPoint.plResistance
            })
            console.log(`   📊 Last sampled point PL prices:`, {
              support: lastSampledPoint.plSupport,
              fit: lastSampledPoint.plFit,
              resistance: lastSampledPoint.plResistance
            })
          }
        }
      } catch (error) {
        console.error('❌ Critical error generating Power Law lines:', error)
        // Fallback: return original data without Power Law lines
        processedData = chartData
      }
    }

    // Apply log-log time transformation if enabled (BitBo-style compression)
    // Use requestIdleCallback for non-blocking processing
    if (isLogLogScale) {
      const genesisDate = new Date('2009-01-03').getTime() // Bitcoin genesis block

      // Process in chunks to prevent blocking the main thread
      const chunkSize = 100
      const transformedData = []

      for (let i = 0; i < processedData.length; i += chunkSize) {
        const chunk = processedData.slice(i, i + chunkSize)
        const transformedChunk = chunk.map(point => {
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
        transformedData.push(...transformedChunk)
      }

      return transformedData
    }

    // Debug logging for deployment troubleshooting
    if (processedData.length > 0 && params.priceModel === 'powerLaw') {
      const powerLawPoints = processedData.filter(p => p.plSupport !== null || p.plFit !== null || p.plResistance !== null)
      console.log('🔍 Chart data ready for rendering:')
      console.log(`   📊 Total points: ${processedData.length}`)
      console.log(`   📈 Points with Power Law data: ${powerLawPoints.length}`)
      console.log(`   🎯 Sample Power Law values:`, powerLawPoints.slice(0, 3).map(p => ({
        date: new Date(p.timestamp).toISOString().split('T')[0],
        plSupport: p.plSupport,
        plFit: p.plFit,
        plResistance: p.plResistance
      })))
      console.log(`   👁️ Power Law visibility state:`, {
        showPLSupport,
        showPLFit,
        showPLResistance,
        priceModel: params.priceModel
      })
    }

    return processedData
  }, [chartData, params.priceModel, params.powerLawSettings, isLogLogScale, manualPLSupport, manualPLFit, manualPLResistance])

  // Reset manual Power Law overrides when switching models
  useEffect(() => {
    if (params.priceModel === 'powerLaw') {
      // Reset all individual manual overrides when switching to Power Law model
      setManualPLSupport(false)
      setManualPLFit(false)
      setManualPLResistance(false)
    }
  }, [params.priceModel])

  // Enhanced liquidation prices with bounds checking for chart display
  const liquidationPricesForChart = useMemo(() => {
    if (!liquidationPrices || !chartData.length) {
      return null
    }

    const maxChartPrice = Math.max(...chartData.map(d => d.price))
    const minChartPrice = Math.min(...chartData.map(d => d.price))

    console.log('📊 Chart price range:', { min: minChartPrice, max: maxChartPrice })
    console.log('💰 Liquidation price analysis:', {
      immediate: liquidationPrices.immediate,
      withTopUp: liquidationPrices.withTopUp,
      hasFreeBtc: liquidationPrices.hasFreeBtc,
      minBound: minChartPrice * 0.1,
      maxBound: maxChartPrice * 3
    })

    // Show lines if they're within 3x the chart range (reasonable visibility)
    const isWithinBounds = liquidationPrices.immediate >= minChartPrice * 0.1 &&
                          liquidationPrices.immediate <= maxChartPrice * 3

    if (!isWithinBounds) {
      console.log('⚠️ Liquidation lines hidden - outside chart bounds')
      return null
    }

    console.log('✅ Liquidation lines will be displayed')
    return liquidationPrices
  }, [liquidationPrices, chartData])

  // Find current date for separator
  const currentDateIndex = useMemo(() => {
    const currentTime = Date.now()
    return chartData.findIndex(point => point.timestamp > currentTime)
  }, [chartData])

  // Memoized scale button handlers to prevent re-renders
  const handleLinearScale = useCallback(() => {
    requestAnimationFrame(() => {
      setIsLogScale(false)
      setIsLogLogScale(false)
    })
  }, [])

  const handleLogScale = useCallback(() => {
    requestAnimationFrame(() => {
      setIsLogScale(true)
      setIsLogLogScale(false)
    })
  }, [])

  const handleLogLogScale = useCallback(() => {
    requestAnimationFrame(() => {
      setIsLogScale(true)
      setIsLogLogScale(true)
    })
  }, [])

  // Legend click handler for interactive controls (optimized with debouncing)
  const handleLegendClick = useCallback((data: any) => {
    // Debounce rapid clicks to prevent performance issues
    const { dataKey } = data

    // Use requestAnimationFrame to defer state updates and prevent forced reflow
    requestAnimationFrame(() => {
      // Handle liquidation line toggles
      if (dataKey === 'immediateLiquidation') {
        setShowImmediateLiquidation(prev => !prev)
      } else if (dataKey === 'liquidationWithTopUp') {
        setShowLiquidationWithTopUp(prev => !prev)
      }
      // Handle Power Law line toggles (now available on any model)
      else if (dataKey === 'plSupport') {
        if (params.priceModel === 'powerLaw') {
          // On Power Law model, just toggle visibility
          setShowPLSupport(prev => !prev)
        } else {
          // On non-Power Law models, smart toggle logic
          setManualPLSupport(prev => {
            const newManualState = !prev
            if (newManualState) {
              // If enabling manual override, ensure line is visible
              setShowPLSupport(true)
            } else {
              // If disabling manual override, toggle show state
              setShowPLSupport(prev => !prev)
            }
            return newManualState
          })
        }
      } else if (dataKey === 'plFit') {
        if (params.priceModel === 'powerLaw') {
          // On Power Law model, just toggle visibility
          setShowPLFit(prev => !prev)
        } else {
          // On non-Power Law models, smart toggle logic
          setManualPLFit(prev => {
            const newManualState = !prev
            if (newManualState) {
              // If enabling manual override, ensure line is visible
              setShowPLFit(true)
            } else {
              // If disabling manual override, toggle show state
              setShowPLFit(prev => !prev)
            }
            return newManualState
          })
        }
      } else if (dataKey === 'plResistance') {
        if (params.priceModel === 'powerLaw') {
          // On Power Law model, just toggle visibility
          setShowPLResistance(prev => !prev)
        } else {
          // On non-Power Law models, smart toggle logic
          setManualPLResistance(prev => {
            const newManualState = !prev
            if (newManualState) {
              // If enabling manual override, ensure line is visible
              setShowPLResistance(true)
            } else {
              // If disabling manual override, toggle show state
              setShowPLResistance(prev => !prev)
            }
            return newManualState
          })
        }
      }

      // Note: Price line should always be visible as it's the core chart element
    })
  }, [params.priceModel])

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
              onClick={handleLinearScale}
              title="Linear scale for both axes"
              className="flex-1 md:flex-none"
            >
              Linear
            </Button>
            <Button
              variant={isLogScale && !isLogLogScale ? "default" : "outline"}
              size="sm"
              onClick={handleLogScale}
              title="Logarithmic Y-axis, linear time axis"
              className="flex-1 md:flex-none"
            >
              Log
            </Button>
            <Button
              variant={isLogLogScale ? "default" : "outline"}
              size="sm"
              onClick={handleLogLogScale}
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
                domain={isLogScale || isLogLogScale ? ['dataMin * 0.5', 'dataMax * 2'] : ['dataMin * 0.5', 'dataMax * 2']}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value.toFixed(0)}`
                }}
                allowDataOverflow
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null

                  const data = payload[0]?.payload
                  if (!data) return null

                  return (
                    <div className="bg-background/95 border border-border rounded-md p-3 shadow-lg backdrop-blur-sm">
                      <p className="font-medium mb-2 text-foreground">
                        {isLogLogScale ?
                          (() => {
                            const logDays = (label as number) / 1000000
                            const daysSinceGenesis = Math.pow(10, logDays)
                            const genesisDate = new Date('2009-01-03').getTime()
                            const date = new Date(genesisDate + daysSinceGenesis * 24 * 60 * 60 * 1000)
                            return `Date: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                          })() :
                          `Date: ${new Date(label as number).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        }
                      </p>

                      {/* Bitcoin Price */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-foreground">Bitcoin Price: <strong>${data.price?.toLocaleString('en-US')}</strong></span>
                        </div>

                        {/* Power Law Lines (when visible) */}
                        {params.priceModel === 'powerLaw' && (
                          <>
                            {showPLSupport && data.plSupport && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full opacity-70"></div>
                                <span className="text-sm text-foreground">PL Support: <strong>${Math.round(data.plSupport).toLocaleString('en-US')}</strong></span>
                              </div>
                            )}
                            {showPLFit && data.plFit && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full opacity-70"></div>
                                <span className="text-sm text-foreground">PL Fit: <strong>${Math.round(data.plFit).toLocaleString('en-US')}</strong></span>
                              </div>
                            )}
                            {showPLResistance && data.plResistance && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full opacity-70"></div>
                                <span className="text-sm text-foreground">PL Resistance: <strong>${Math.round(data.plResistance).toLocaleString('en-US')}</strong></span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Liquidation Lines (when visible and available) */}
                        {liquidationPrices && (
                          <>
                            {showImmediateLiquidation && data.immediateLiquidation && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-70"></div>
                                <span className="text-sm text-foreground">Immediate Liquidation: <strong>${data.immediateLiquidation.toLocaleString('en-US')}</strong></span>
                              </div>
                            )}
                            {showLiquidationWithTopUp && data.liquidationWithTopUp && liquidationPrices.hasFreeBtc && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full opacity-70"></div>
                                <span className="text-sm text-foreground">Liquidation with Top-up: <strong>${data.liquidationWithTopUp.toLocaleString('en-US')}</strong></span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Liquidation Risk Warning */}
                        {liquidationPrices && data.price <= liquidationPrices.immediate && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                            🚨 <strong>LIQUIDATION RISK!</strong>
                          </div>
                        )}
                        {liquidationPrices && data.price > liquidationPrices.immediate && data.price <= liquidationPrices.immediate * 1.1 && (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                            ⚠️ <strong>Near Liquidation</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )
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
                wrapperStyle={{
                  cursor: 'pointer',
                  paddingTop: '20px',
                  marginTop: '10px'
                }}
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

              {/* Power Law Lines - Always present for legend, can be manually toggled on any model */}
              <Line
                type="monotone"
                dataKey="plSupport"
                stroke={showPLSupport ? "#10b981" : "#9ca3af"}
                strokeWidth={2}
                dot={false}
                name="PL Support"
                connectNulls={true}
                strokeDasharray="5 5"
                strokeOpacity={showPLSupport ? 1 : 0.3}
                hide={
                  params.priceModel === 'powerLaw'
                    ? !showPLSupport
                    : !showPLSupport || !manualPLSupport
                }
              />

              <Line
                type="monotone"
                dataKey="plFit"
                stroke={showPLFit ? "#3b82f6" : "#9ca3af"}
                strokeWidth={2}
                dot={false}
                name="PL Fit"
                connectNulls={true}
                strokeDasharray="3 3"
                strokeOpacity={showPLFit ? 1 : 0.3}
                hide={
                  params.priceModel === 'powerLaw'
                    ? !showPLFit
                    : !showPLFit || !manualPLFit
                }
              />

              <Line
                type="monotone"
                dataKey="plResistance"
                stroke={showPLResistance ? "#ef4444" : "#9ca3af"}
                strokeWidth={2}
                dot={false}
                name="PL Resistance"
                connectNulls={true}
                strokeDasharray="5 5"
                strokeOpacity={showPLResistance ? 1 : 0.3}
                hide={
                  params.priceModel === 'powerLaw'
                    ? !showPLResistance
                    : !showPLResistance || !manualPLResistance
                }
              />

              {/* Liquidation Line components - Always present for legend, but hidden when not applicable */}
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
                hide={!liquidationPrices || !showImmediateLiquidation}
              />

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
                hide={!liquidationPrices || !liquidationPrices?.hasFreeBtc || liquidationPrices?.withTopUp === liquidationPrices?.immediate || !showLiquidationWithTopUp}
              />

              {/* Liquidation Price Reference Lines */}
              {liquidationPricesForChart && showImmediateLiquidation && (
                <ReferenceLine
                  key="liquidation-immediate"
                  y={liquidationPricesForChart.immediate}
                  stroke="#eab308"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              )}
              {liquidationPricesForChart && showLiquidationWithTopUp && liquidationPricesForChart.hasFreeBtc && liquidationPricesForChart.withTopUp !== liquidationPricesForChart.immediate && (
                <ReferenceLine
                  key="liquidation-topup"
                  y={liquidationPricesForChart.withTopUp}
                  stroke="#22c55e"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
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
