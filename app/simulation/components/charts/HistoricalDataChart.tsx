"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useHistoricalDataOnly, useCurrentPriceOnly } from "../../hooks/useCentralizedData"
import type { HistoricalDataPoint } from "@/lib/services/centralized-data-service"

/**
 * Historical Data Chart Component
 * 
 * Displays static historical Bitcoin price data from 2013 onwards.
 * This chart is separate from projections and loads data once.
 */
export function HistoricalDataChart() {
  const { historicalData, isLoaded, isLoading } = useHistoricalDataOnly()
  const { currentPrice } = useCurrentPriceOnly()
  const [error, setError] = useState<string | null>(null)

  // Combine historical data with current price for display
  const displayData = useMemo(() => {
    if (!isLoaded || historicalData.length === 0) return []

    let data = [...historicalData]

    // Append current price if available and not already the latest point
    if (currentPrice) {
      const latestPoint = data[data.length - 1]
      const currentDate = new Date().toISOString().split('T')[0]

      if (!latestPoint || latestPoint.date !== currentDate) {
        data.push({
          timestamp: currentPrice.timestamp,
          date: currentDate,
          open: currentPrice.price,
          high: currentPrice.price,
          low: currentPrice.price,
          close: currentPrice.price,
          source: currentPrice.source
        })
      }
    }

    // Convert to EUR (simplified conversion - in real app this should be dynamic)
    return data.map(point => ({
      ...point,
      open: point.open * 0.92,
      high: point.high * 0.92,
      low: point.low * 0.92,
      close: point.close * 0.92
    }))
  }, [historicalData, currentPrice, isLoaded])

  // Prepare chart data (sample every N points for performance)
  const chartData = useMemo(() => {
    if (displayData.length === 0) return []

    // Limit data points for performance (show last 5 years or all data if less)
    const maxPoints = 365 * 5 // 5 years of daily data
    let data = displayData.length > maxPoints ? displayData.slice(-maxPoints) : displayData

    // Sample every 7th point for weekly view
    return data.filter((_, index) => index % 7 === 0)
      .map(point => ({
        date: new Date(point.timestamp).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'short'
        }),
        price: Math.round(point.close),
        high: Math.round(point.high),
        low: Math.round(point.low),
        timestamp: point.timestamp
      }))
  }, [displayData])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Historical Bitcoin Price Data</CardTitle>
          <CardDescription>Loading historical price data since 2013...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2">Loading historical data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Historical Bitcoin Price Data</CardTitle>
          <CardDescription>Error loading historical data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <p className="text-red-800 dark:text-red-200">❌ {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Historical Bitcoin Price Data</CardTitle>
          <CardDescription>No historical data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground">No historical data points available to display.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Historical Bitcoin Price Data</CardTitle>
        <CardDescription>
          Bitcoin price history from {chartData[0]?.date} to {chartData[chartData.length - 1]?.date}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
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
                  name === 'price' ? 'Close Price' : 
                  name === 'high' ? 'High' : 'Low'
                ]}
                labelFormatter={(date: string) => `Date: ${date}`}
              />
              <Legend />
              
              {/* High/Low Range (optional, can be toggled) */}
              <Line
                type="monotone"
                dataKey="low"
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="Daily Low"
                connectNulls={false}
              />
              
              <Line
                type="monotone"
                dataKey="high"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="Daily High"
                connectNulls={false}
              />
              
              {/* Main Price Line */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Close Price"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Data Information */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
              📈 Data Range
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>From: <strong>{historicalData[0]?.date}</strong></p>
              <p>To: <strong>{historicalData[historicalData.length - 1]?.date}</strong></p>
              <p>Total Days: <strong>{historicalData.length}</strong></p>
              <p>Chart Points: <strong>{chartData.length}</strong></p>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
              💰 Price Statistics
            </h4>
            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <p>Current: <strong>€{historicalData[historicalData.length - 1]?.close.toLocaleString('de-DE')}</strong></p>
              <p>All-Time High: <strong>€{Math.max(...historicalData.map(d => d.high)).toLocaleString('de-DE')}</strong></p>
              <p>All-Time Low: <strong>€{Math.min(...historicalData.map(d => d.low)).toLocaleString('de-DE')}</strong></p>
            </div>
          </div>
          
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
              📊 Chart Info
            </h4>
            <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <p>Sampling: <strong>Weekly</strong></p>
              <p>Currency: <strong>EUR</strong></p>
              <p>Source: <strong>Static CSV + API</strong></p>
              <p>Update: <strong>Daily</strong></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
