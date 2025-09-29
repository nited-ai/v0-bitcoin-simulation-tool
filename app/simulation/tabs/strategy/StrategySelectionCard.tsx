"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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

  // Memoize available strategies to prevent excessive API calls
  const availableStrategies = useMemo(() => {
    // Only call getAvailableStrategies once and memoize the result
    const allStrategies = getAvailableStrategies()
    return [
      { id: 'default', name: 'Default Strategy', description: 'Standard investment approach with no additional restrictions. Invests up to target LTV.', enabled: true },
      { id: 'rollingLoan', name: 'Rolling Loan Strategy', description: 'Automated loan rollover strategy with dual accumulation and income modes.', enabled: true },
      { id: 'custom', name: 'Custom Strategy', description: 'User-defined strategy with custom parameters and logic.', enabled: false },
      ...allStrategies.filter(s => !['default', 'rollingLoan', 'custom'].includes(s.id)).map(s => ({ ...s, enabled: false }))
    ]
  }, []) // Empty dependency array - only compute once on mount

  // Load metadata for currently selected strategy
  useEffect(() => {
    const metadata = strategyRegistry.getStrategyMetadata(params.investmentStrategy)
    setSelectedStrategyMetadata(metadata)
  }, [params.investmentStrategy])

  // Memoize strategy selection handler to prevent unnecessary re-renders
  const handleStrategyChange = useCallback((strategyId: InvestmentStrategy) => {
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
  }, [availableStrategies, setParams])

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

  const getSecurityExplanation = (rating: number): string => {
    switch (rating) {
      case 1: return "High risk - requires careful monitoring and risk management"
      case 2: return "Moderate risk - some volatility and liquidation risk"
      case 3: return "Balanced risk - standard Bitcoin lending risks apply"
      case 4: return "Lower risk - conservative approach with safety margins"
      case 5: return "Lowest risk - maximum safety with minimal exposure"
      default: return "Risk level varies based on market conditions"
    }
  }

  const getComplexityExplanation = (rating: number): string => {
    switch (rating) {
      case 1: return "Very simple - minimal setup and monitoring required"
      case 2: return "Simple - basic understanding of Bitcoin lending needed"
      case 3: return "Moderate - requires understanding of loan mechanics"
      case 4: return "Complex - advanced knowledge of DeFi and risk management"
      case 5: return "Very complex - expert-level strategy requiring active management"
      default: return "Complexity varies based on configuration"
    }
  }

  const getSuitabilityExplanation = (suitableFor: string[]): string => {
    return suitableFor.join(", ") + " who understand the associated risks and have appropriate risk tolerance"
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
      
      <CardContent className="space-y-4">
        {/* Single Column Layout */}
        <div className="space-y-4">
          {/* 1. Strategy Selection Dropdown */}
          <div className="space-y-2">
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

          {/* 2. Strategy Description with Enhanced Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {availableStrategies.find(s => s.id === params.investmentStrategy)?.name}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {availableStrategies.find(s => s.id === params.investmentStrategy)?.description}
                </p>

                {/* Enhanced explanations */}
                {selectedStrategyMetadata && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-2">
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      <strong>Security Rating ({selectedStrategyMetadata.securityRating}/5):</strong> {getSecurityExplanation(selectedStrategyMetadata.securityRating)}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      <strong>Complexity Rating ({selectedStrategyMetadata.complexityRating}/5):</strong> {getComplexityExplanation(selectedStrategyMetadata.complexityRating)}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      <strong>Suitable For:</strong> {getSuitabilityExplanation(selectedStrategyMetadata.suitableFor)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Security/Complexity/Suitable For Rating Indicators */}
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

          {/* 4. Strategy Criteria (clarified) */}
          {selectedStrategyMetadata && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Strategy Features</span>
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
      </CardContent>
    </Card>
  )
}
