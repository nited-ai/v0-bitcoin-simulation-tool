'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { AlertCircle, Loader2, TrendingUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSimulation } from '../../context/SimulationContext'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { loadHistoricalData, convertToEur } from '../../data/historicalDataLoader'
import type { PriceProjectionResult } from '../../price-models/types'
import type { HistoricalDataPoint } from '../../data/historicalDataLoader'

interface ChartDataPoint {
  date: string
  timestamp: number
  // Single continuous price line
  price: number
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
  const bottoms: { timestamp: number; price: number }[] = []
  const windowSize = 90 // 90-day window for finding bottoms

  for (let i = windowSize; i < historicalData.length - windowSize; i++) {
    const currentPrice = historicalData[i].close
    const isBottom = historicalData.slice(i - windowSize, i + windowSize)
      .every(point => point.close >= currentPrice * 0.95) // Allow 5% tolerance

    if (isBottom && currentPrice > 0) {
      bottoms.push({
        timestamp: historicalData[i].timestamp,
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
                     (lastBottom.timestamp - firstBottom.timestamp)

    // Generate support line points
    return historicalData.map(point => ({
      timestamp: point.timestamp,
      supportPrice: Math.exp(
        Math.log(firstBottom.price) +
        logSlope * (point.timestamp - firstBottom.timestamp)
      )
    }))
  }

  // Fallback: simple trend line from first to last point
  const firstPoint = historicalData[0]
  const lastPoint = historicalData[historicalData.length - 1]
  const logSlope = (Math.log(lastPoint.close) - Math.log(firstPoint.close)) /
                   (lastPoint.timestamp - firstPoint.timestamp)

  return historicalData.map(point => ({
    timestamp: point.timestamp,
    supportPrice: Math.exp(
      Math.log(firstPoint.close) +
      logSlope * (point.timestamp - firstPoint.timestamp)
    ) * 0.3 // Support line below main trend
  }))
}

export function UnifiedPriceChart({ className, onProjectionChange }: UnifiedPriceChartProps) {
  const { params } = useSimulation()
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // Load historical data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null)
        console.log('📊 Loading historical data for unified chart...')
        
        let data = await loadHistoricalData()
        data = convertToEur(data, 0.92) // Convert to EUR

        // Use all historical data from 2013 onwards for proper Bitcoin analysis
        // Filter out any data before 2013 (Bitcoin's early days)
        const year2013 = new Date('2013-01-01').getTime()
        data = data.filter(point => point.timestamp >= year2013)
        
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
        
        // Get the last known price (current price) as starting point for projections
        // This should be the most recent price from our complete historical dataset (CSV + API gap data)
        const lastKnownPrice = historicalData.length > 0
          ? historicalData[historicalData.length - 1].close
          : params.initialBtcPrice

        console.log(`📊 Using last known price as projection start: €${lastKnownPrice.toFixed(0)}`)
        console.log(`📅 Last known price date: ${historicalData[historicalData.length - 1]?.date || 'unknown'}`)

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

  // Merge historical and projection data into continuous timeline
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []

    // Add historical data
    historicalData.forEach(point => {
      data.push({
        date: new Date(point.timestamp).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'short'
        }),
        timestamp: point.timestamp,
        price: Math.round(point.close),
        isHistorical: true,
        confidence: 1.0 // Historical data has full confidence
      })
    })

    // Add projection data (continues from historical data)
    if (projection) {
      projection.projectionPoints.forEach(point => {
        data.push({
          date: new Date(point.timestamp).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short'
          }),
          timestamp: point.timestamp,
          price: Math.round(point.price),
          support: point.support ? Math.round(point.support) : undefined,
          resistance: point.resistance ? Math.round(point.resistance) : undefined,
          isHistorical: false,
          confidence: point.confidence
        })
      })
    }

    // Sort by timestamp to ensure continuous timeline
    return data.sort((a, b) => a.timestamp - b.timestamp)
  }, [historicalData, projection])

  // Find current date for separator
  const currentDateIndex = useMemo(() => {
    const currentTime = Date.now()
    return chartData.findIndex(point => point.timestamp > currentTime)
  }, [chartData])

  // CSV download functionality
  const downloadCSV = async () => {
    if (chartData.length === 0) return

    setIsDownloading(true)

    try {
      // Generate CSV content with proper escaping
      const headers = ['Date', 'Price (EUR)', 'Data Type', 'Support Line', 'Resistance Line']
      const csvRows = [headers.join(',')]

      chartData.forEach(point => {
        const row = [
          `"${point.date}"`,
          point.price.toFixed(2),
          `"${point.isHistorical ? 'Historical' : 'Projected'}"`,
          point.support ? point.support.toFixed(2) : '',
          point.resistance ? point.resistance.toFixed(2) : ''
        ]
        csvRows.push(row.join(','))
      })

      const csvContent = csvRows.join('\n')

      // Create and download file with improved method
      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `bitcoin-price-forecast-${params.priceModel}-${currentDate}.csv`

      // Add BOM for proper UTF-8 encoding
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // Use modern download approach
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // IE/Edge
        window.navigator.msSaveOrOpenBlob(blob, filename)
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

      console.log(`📥 CSV download initiated: ${filename}`)
    } catch (err) {
      console.error('❌ Error generating CSV:', err)
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
            className="flex items-center gap-2 text-xs"
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
                  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`
                  return `€${value.toFixed(0)}`
                }}
                allowDataOverflow
              />
              
              <Tooltip
                formatter={(value: number, name: string) => [
                  `€${value.toLocaleString('de-DE')}`,
                  name === 'price' ? 'Bitcoin Price' :
                  name === 'support' ? 'Support Line' :
                  name === 'resistance' ? 'Resistance Line' : name
                ]}
                labelFormatter={(timestamp: number) => {
                  const date = new Date(timestamp)
                  return `Date: ${date.toLocaleDateString('de-DE', {
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
