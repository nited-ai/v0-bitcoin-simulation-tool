'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PriceModelSelector } from '../price-models/PriceModelSelector'
import { UnifiedPriceChart } from '../charts/UnifiedPriceChart'
import { SimplifiedManualGrowthInterface } from '../price-models/manual/SimplifiedManualGrowthInterface'
import { GrowthRateAnalysis } from '../price-models/GrowthRateAnalysis'
import { CustomGrowthRateSliders } from '../price-models/manual/CustomGrowthRateSliders'
import { useSimulation } from '../../context/SimulationContext'
import { Settings, TrendingUp } from 'lucide-react'
import type { PriceProjectionResult } from '../../price-models/types'
// import { CsvUpdatePanel } from '../admin/CsvUpdatePanel' // Disabled for production

export type TabValue = 'parameters' | 'price-projection' | 'strategy' | 'results'

interface TabNavigationProps {
  children?: React.ReactNode
}

export function TabNavigation({ children }: TabNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { params } = useSimulation()

  // State for projection data from UnifiedPriceChart
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)

  // Get initial tab from URL or default to parameters
  const getInitialTab = (): TabValue => {
    const tabParam = searchParams.get('tab') as TabValue
    if (tabParam && ['parameters', 'price-projection', 'strategy', 'results'].includes(tabParam)) {
      return tabParam
    }
    return 'parameters'
  }

  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab)

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabValue
    if (tabParam && ['parameters', 'price-projection', 'strategy', 'results'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else {
      setActiveTab('parameters')
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue
    setActiveTab(tabValue)

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabValue)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="price-projection">Price Projection</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parameters" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Parameters</h2>
              <p className="text-muted-foreground">Configure your loan parameters and investment settings.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Parameters content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="price-projection" className="mt-6">
          <div className="space-y-6">

            {/* Price Model Selection */}
            <PriceModelSelector />

            {/* Simplified Manual Growth Interface (when manual model is selected) */}
            {params.priceModel === 'manual' && (
              <SimplifiedManualGrowthInterface />
            )}

            {/* Unified Price Chart */}
            <UnifiedPriceChart onProjectionChange={setProjection} />

            {/* Custom Growth Rate Sliders (when manual model and custom preset are selected) */}
            {params.priceModel === 'manual' && (
              <CustomGrowthRateSliders />
            )}

            {/* Universal Growth Rate Analysis (for all models) */}
            <GrowthRateAnalysis
              projection={projection}
              startPrice={params.initialBtcPrice}
            />

            {/* Admin Panel - Completely disabled for clean UI */}
            {/*
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Data Management (Dev Only)</h3>
                <CsvUpdatePanel />
              </div>
            )}
            */}
          </div>
        </TabsContent>
        
        <TabsContent value="strategy" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Strategy</h2>
              <p className="text-muted-foreground">Choose and configure your Bitcoin lending strategy.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Strategy content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Results</h2>
              <p className="text-muted-foreground">View your simulation results and analysis.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Results content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
