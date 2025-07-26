'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import type { PriceProjectionResult } from '../../price-models/types'

interface GrowthRateAnalysisProps {
  className?: string
  projection: PriceProjectionResult | null
  startPrice?: number
}

interface GrowthMetrics {
  avgAnnualGrowth: number
  peakGrowth: number
  maxDecline: number
  finalPrice: number
  totalGrowth: number
}

/**
 * Calculate the maximum peak-to-trough decline from projected price data
 * This finds all local peaks and calculates the largest decline to subsequent troughs
 */
function calculateMaxPeakToTroughDecline(projectionPoints: any[], startPrice: number): number {
  if (projectionPoints.length === 0) return 0

  // Create full price timeline including start price
  const allPrices = [startPrice, ...projectionPoints.map(p => p.price)]

  let maxDecline = 0

  // Find all local peaks and calculate declines to subsequent troughs
  for (let i = 1; i < allPrices.length - 1; i++) {
    const currentPrice = allPrices[i]
    const prevPrice = allPrices[i - 1]
    const nextPrice = allPrices[i + 1]

    // Check if this is a local peak (higher than both neighbors)
    if (currentPrice > prevPrice && currentPrice > nextPrice) {
      // Find the lowest price after this peak
      let lowestAfterPeak = currentPrice
      for (let j = i + 1; j < allPrices.length; j++) {
        if (allPrices[j] < lowestAfterPeak) {
          lowestAfterPeak = allPrices[j]
        }
      }

      // Calculate decline percentage from peak to trough
      const decline = ((lowestAfterPeak - currentPrice) / currentPrice) * 100
      if (decline < maxDecline) {
        maxDecline = decline
      }
    }
  }

  // Also check if the starting price is a peak
  if (allPrices.length > 1 && startPrice > allPrices[1]) {
    let lowestAfterStart = startPrice
    for (let j = 1; j < allPrices.length; j++) {
      if (allPrices[j] < lowestAfterStart) {
        lowestAfterStart = allPrices[j]
      }
    }
    const decline = ((lowestAfterStart - startPrice) / startPrice) * 100
    if (decline < maxDecline) {
      maxDecline = decline
    }
  }

  // Also check if the final price represents a decline from the highest point
  const highestPrice = Math.max(...allPrices)
  const finalPrice = allPrices[allPrices.length - 1]
  if (finalPrice < highestPrice) {
    const decline = ((finalPrice - highestPrice) / highestPrice) * 100
    if (decline < maxDecline) {
      maxDecline = decline
    }
  }

  return maxDecline
}

export function GrowthRateAnalysis({ className, projection, startPrice = 108629 }: GrowthRateAnalysisProps) {
  
  // Calculate growth metrics from projection data
  const metrics: GrowthMetrics = useMemo(() => {
    if (!projection || projection.projectionPoints.length === 0) {
      return {
        avgAnnualGrowth: 0,
        peakGrowth: 0,
        maxDecline: 0,
        finalPrice: startPrice,
        totalGrowth: 0
      }
    }

    const projectionPoints = projection.projectionPoints
    const yearlyGrowthRates: number[] = []
    
    // Calculate year-over-year growth rates from price progression
    let currentYearStart = 0
    const monthsPerYear = 12
    
    while (currentYearStart + monthsPerYear <= projectionPoints.length) {
      const startIndex = currentYearStart
      const endIndex = currentYearStart + monthsPerYear - 1
      
      const startYearPrice = currentYearStart === 0 ? startPrice : projectionPoints[startIndex].price
      const endYearPrice = projectionPoints[endIndex].price
      
      const yearlyGrowthRate = ((endYearPrice - startYearPrice) / startYearPrice) * 100
      yearlyGrowthRates.push(yearlyGrowthRate)
      
      currentYearStart += monthsPerYear
    }
    
    // Handle partial year at the end if exists
    if (currentYearStart < projectionPoints.length) {
      const remainingMonths = projectionPoints.length - currentYearStart
      const startYearPrice = currentYearStart === 0 ? startPrice : projectionPoints[currentYearStart].price
      const endYearPrice = projectionPoints[projectionPoints.length - 1].price
      
      // Annualize the partial year growth
      const partialGrowthRate = ((endYearPrice - startYearPrice) / startYearPrice) * 100
      const annualizedGrowthRate = (partialGrowthRate * 12) / remainingMonths
      yearlyGrowthRates.push(annualizedGrowthRate)
    }

    // Calculate metrics from yearly growth rates
    const avgAnnualGrowth = yearlyGrowthRates.length > 0
      ? yearlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / yearlyGrowthRates.length
      : 0

    const peakGrowth = yearlyGrowthRates.length > 0 ? Math.max(...yearlyGrowthRates) : 0

    // Calculate max decline from actual price peaks to troughs
    const maxDecline = calculateMaxPeakToTroughDecline(projectionPoints, startPrice)
    
    const finalPrice = projectionPoints[projectionPoints.length - 1].price
    const totalGrowth = ((finalPrice - startPrice) / startPrice) * 100

    return {
      avgAnnualGrowth,
      peakGrowth,
      maxDecline,
      finalPrice,
      totalGrowth
    }
  }, [projection, startPrice])

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Growth Rate Analysis
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Single horizontal row with 5 containers: Avg Annual, Peak Growth, Max Decline, Final Price, Total Growth */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {metrics.avgAnnualGrowth.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Annual</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className={`text-2xl font-bold ${metrics.peakGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.peakGrowth.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Peak Growth</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className={`text-2xl font-bold ${metrics.maxDecline >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.maxDecline.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Max Decline</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                €{Math.round(metrics.finalPrice).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Final Price</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className={`text-2xl font-bold ${metrics.totalGrowth >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {metrics.totalGrowth.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Total Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
