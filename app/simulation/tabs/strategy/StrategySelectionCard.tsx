"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { TrendingUp, Info, Shield, Zap, Target, Brain } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { getAvailableStrategies } from "@/src/modules/strategies"
import { strategyRegistry } from "@/src/modules/strategies/services/StrategyRegistry"
import type { InvestmentStrategy, StrategyMetadata } from "@/src/modules/strategies/types"

/**
 * Strategy Selection Card Component
 * 
 * Provides a card-based interface for selecting investment strategies
 * with detailed information and metadata display.
 */
export function StrategySelectionCard() {
  const { params, setParams } = useSimulation()
  const [selectedStrategyMetadata, setSelectedStrategyMetadata] = useState<StrategyMetadata | null>(null)

  // Get available strategies from registry with limited selection
  const allStrategies = getAvailableStrategies()
  const availableStrategies = [
    { id: 'default', name: 'Default Strategy', description: 'Standard investment approach with no additional restrictions. Invests up to target LTV.', enabled: true },
    { id: 'rollingLoan', name: 'Rolling Loan Strategy', description: 'Automated loan rollover strategy with dual accumulation and income modes.', enabled: true },
    { id: 'custom', name: 'Custom Strategy', description: 'User-defined strategy with custom parameters and logic.', enabled: false },
    ...allStrategies.filter(s => !['default', 'rollingLoan', 'custom'].includes(s.id)).map(s => ({ ...s, enabled: false }))
  ]

  // Load metadata for currently selected strategy
  useEffect(() => {
    const metadata = strategyRegistry.getStrategyMetadata(params.investmentStrategy)
    setSelectedStrategyMetadata(metadata)
  }, [params.investmentStrategy])

  // Handle strategy selection
  const handleStrategyChange = (strategyId: InvestmentStrategy) => {
    // Only allow selection of enabled strategies
    const strategy = availableStrategies.find(s => s.id === strategyId)
    if (!strategy?.enabled) {
      return
    }

    setParams((prev) => ({
      ...prev,
      investmentStrategy: strategyId
    }))

    // Load metadata for the selected strategy
    const metadata = strategyRegistry.getStrategyMetadata(strategyId)
    setSelectedStrategyMetadata(metadata)
  }

  // Get strategy icon based on strategy type
  const getStrategyIcon = (strategyId: string) => {
    switch (strategyId) {
      case 'rollingLoan':
        return <Zap className="w-5 h-5 text-orange-500" />
      case 'athBased':
        return <Target className="w-5 h-5 text-blue-500" />
      case 'movingAverage':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'athCollateral':
        return <Shield className="w-5 h-5 text-purple-500" />
      default:
        return <Brain className="w-5 h-5 text-gray-500" />
    }
  }

  // Get strategy priority badge
  const getStrategyBadge = (strategy: any) => {
    if (!strategy.enabled) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-500">Coming Soon</Badge>
    }

    switch (strategy.id) {
      case 'rollingLoan':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Automated</Badge>
      case 'default':
        return <Badge variant="outline">Basic</Badge>
      case 'athBased':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Advanced</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Investment Strategy
        </CardTitle>
        <CardDescription>
          Choose your Bitcoin lending strategy and risk management approach
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (1/3 width) - Strategy Selection and Criteria */}
          <div className="space-y-4">
            {/* Strategy Selection */}
            <div className="space-y-2">
              <Label htmlFor="strategy-select">Strategy Type</Label>
              <Select value={params.investmentStrategy} onValueChange={handleStrategyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an investment strategy" />
                </SelectTrigger>
                <SelectContent>
                  {availableStrategies.map((strategy) => (
                    <SelectItem
                      key={strategy.id}
                      value={strategy.id}
                      disabled={!strategy.enabled}
                      className={!strategy.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <div className="flex items-center gap-2">
                        {getStrategyIcon(strategy.id)}
                        <span>{strategy.name}</span>
                        {getStrategyBadge(strategy)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Criteria */}
            {selectedStrategyMetadata && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Strategy Criteria</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStrategyMetadata.criteria.map((criterion) => (
                    <Badge key={criterion} variant="secondary" className="text-xs">
                      {criterion.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (2/3 width) - Strategy Description and Metadata */}
          <div className="lg:col-span-2 space-y-4">
            {/* Strategy Description */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    {availableStrategies.find(s => s.id === params.investmentStrategy)?.name}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {availableStrategies.find(s => s.id === params.investmentStrategy)?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy Metadata */}
            {selectedStrategyMetadata && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Security Rating */}
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Security</div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < selectedStrategyMetadata.securityRating
                              ? 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Complexity Rating */}
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Complexity</div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < selectedStrategyMetadata.complexityRating
                              ? 'bg-blue-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suitable For */}
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-sm font-medium">Suitable For</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategyMetadata.suitableFor.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
