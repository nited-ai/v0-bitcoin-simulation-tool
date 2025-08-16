'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DollarSign, Info, TrendingUp } from 'lucide-react'
import { NumberInput } from '@/shared/ui/forms/NumberInput'
import { PriceModelSelector } from '../price-models/PriceModelSelector'
import { UnifiedPriceChart } from '../charts/UnifiedPriceChart'
import { SimplifiedManualGrowthInterface } from '../price-models/manual/SimplifiedManualGrowthInterface'
import { GrowthRateAnalysis } from '../price-models/GrowthRateAnalysis'
import { CustomGrowthRateSliders } from '../price-models/manual/CustomGrowthRateSliders'
import { BasicParametersCard } from '../parameters/BasicParametersCard'
import { ValidationSummary } from '../parameters/ValidationSummary'
import { RiskLevelSelector } from '../parameters/RiskLevelSelector'
import { CollateralAnalysisCard } from '../parameters/CollateralAnalysisCard'
import { CollateralVisualizationCard } from '../parameters/CollateralVisualizationCard'
import { LoanParametersCard } from '../parameters/LoanParametersCard'
import { PlatformSelector } from '../parameters/PlatformSelector'
import { ResultsPage } from '../results/ResultsPage'
import { useSimulation } from '../../context/SimulationContext'
import type { PriceProjectionResult } from '../../price-models/types'
// import { CsvUpdatePanel } from '../admin/CsvUpdatePanel' // Disabled for production

export type TabValue = 'parameters' | 'price-projection' | 'strategy' | 'results'

interface TabNavigationProps {
  children?: React.ReactNode
}

export function TabNavigation({ children }: TabNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { params, setParams } = useSimulation()

  // State for projection data from UnifiedPriceChart
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)

  // Get BTC accumulation state (default to true)
  const btcAccumulation = (params as any).btcAccumulation ?? true

  /**
   * Handle BTC accumulation checkbox change
   */
  const handleBtcAccumulationChange = (checked: boolean) => {
    setParams((current) => ({
      ...current,
      btcAccumulation: checked
    }))
  }

  /**
   * Get investment mode description based on checkbox and savings/withdrawal amount
   */
  const getInvestmentModeDescription = () => {
    if (btcAccumulation && params.monthlyWithdrawalAmount === 0) {
      return "Accumulate more BTC only (reinvest all loan proceeds)"
    } else if (btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Hybrid approach (add monthly savings AND reinvest remaining loan proceeds into BTC)"
    } else if (btcAccumulation && params.monthlyWithdrawalAmount < 0) {
      return "Hybrid approach (withdraw specific amount AND reinvest remaining loan proceeds into BTC)"
    } else if (!btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Monthly savings only (add specific amount, no loan reinvestment)"
    } else if (!btcAccumulation && params.monthlyWithdrawalAmount < 0) {
      return "Live from BTC stack only (withdraw specific amount, no reinvestment)"
    } else {
      return "No savings/withdrawals, no reinvestment"
    }
  }

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
          <TabsTrigger value="results">
            Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="parameters" className="mt-6">
          <div className="space-y-6">
            {/* Validation Summary - Only show if parameters are not valid */}
            <ValidationSummary />

            {/* Parameter Cards in Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <BasicParametersCard />
                <PlatformSelector />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <RiskLevelSelector />
                <LoanParametersCard />
                <CollateralVisualizationCard />
              </div>
            </div>

            {/* Full Width Bottom Section */}
            <div className="mt-6">
              <CollateralAnalysisCard />
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
            <Card>
              <CardHeader>
                <CardTitle>Investment Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Savings/Withdrawal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      Monthly Savings/Withdrawal
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Positive values: Monthly savings added to BTC stack. Negative values: Monthly withdrawals from BTC stack for living expenses.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <NumberInput
                      value={params.monthlyWithdrawalAmount}
                      onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
                      min={-50000}
                      max={50000}
                      step={100}
                      decimals={0}
                      suffix="$"
                      placeholder="150"
                    />
                  </div>

                  <div className="space-y-2">
                    {/* Empty label space to align with Monthly Savings/Withdrawal label */}
                    <div className="h-6"></div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="btcAccumulation"
                        checked={btcAccumulation}
                        onCheckedChange={handleBtcAccumulationChange}
                      />
                      <Label
                        htmlFor="btcAccumulation"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        BTC Accumulation
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Decide whether you want to accumulate more BTC or live off your stack</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Investment Mode Description */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {getInvestmentModeDescription()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className="mt-6">
          <ResultsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
