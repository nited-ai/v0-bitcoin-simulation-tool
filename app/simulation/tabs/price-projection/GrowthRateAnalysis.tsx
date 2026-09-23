'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import { projectionMetrics } from '../../price-models/models/projectionMetrics'
import type { PriceProjectionResult } from '../../price-models/types'

interface GrowthRateAnalysisProps {
  className?: string
  projection: PriceProjectionResult | null
  startPrice?: number
}

export function GrowthRateAnalysis({ className, projection, startPrice = 108629 }: GrowthRateAnalysisProps) {
  
  const metrics = useMemo(() => projectionMetrics(projection?.projectionPoints ?? [], startPrice), [projection, startPrice])
  if (!projection) return null

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Szenario-Kennzahlen
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Single horizontal row with 5 containers: Avg Annual, Stärkstes volles Jahr, Größter Rückgang vom Hoch, Endkurs, Gesamte Kursänderung */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Average Annual Growth */}
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  {metrics.avgAnnualGrowth.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Wachstum p. a. (CAGR)
                </div>
              </div>
            </div>

            {/* Stärkstes volles Jahr */}
            <div className="space-y-2">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                <div className={`text-lg font-semibold ${(metrics.peakGrowth ?? 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {metrics.peakGrowth === null ? '—' : metrics.peakGrowth.toFixed(0) + '%'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Stärkstes volles Jahr
                </div>
              </div>
            </div>

            {/* Größter Rückgang vom Hoch */}
            <div className="space-y-2">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                <div className={`text-lg font-semibold ${metrics.maxDecline >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {metrics.maxDecline.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Größter Rückgang vom Hoch
                </div>
              </div>
            </div>

            {/* Endkurs */}
            <div className="space-y-2">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(metrics.finalPrice)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Endkurs
                </div>
              </div>
            </div>

            {/* Gesamte Kursänderung */}
            <div className="space-y-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                <div className={`text-lg font-semibold ${metrics.totalGrowth >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-red-700 dark:text-red-300'}`}>
                  {metrics.totalGrowth.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Gesamte Kursänderung
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
