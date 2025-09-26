"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { TrendingUp, Info, Zap, Brain, Shield, Target } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { getAvailableStrategies } from "@/src/modules/strategies"
import type { InvestmentStrategy } from "@/src/modules/strategies/types"

/**
 * Strategy Selection Card Component
 * 
 * Provides a card-based interface for selecting investment strategies
 * with detailed information and metadata display.
 */
export function StrategySelectionCard() {
  const { params, setParams } = useSimulation()

  // Get available strategies from registry with limited selection
  const allStrategies = getAvailableStrategies()
  const availableStrategies = [
    { id: 'default', name: 'Default Strategy', description: 'Standard investment approach with no additional restrictions. Invests up to target LTV.', enabled: true },
    { id: 'rollingLoan', name: 'Rolling Loan Strategy', description: 'Automated loan rollover strategy with dual accumulation and income modes.', enabled: true },
    { id: 'custom', name: 'Custom Strategy', description: 'User-defined strategy with custom parameters and logic.', enabled: false },
    ...allStrategies.filter(s => !['default', 'rollingLoan', 'custom'].includes(s.id)).map(s => ({ ...s, enabled: false }))
  ]



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

                {/* Enhanced strategy explanations */}
                {params.investmentStrategy === 'rollingLoan' && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-3">
                    <div className="text-blue-700 dark:text-blue-300 text-xs space-y-2">
                      <p><strong>How Rolling Loans Work:</strong> This strategy automatically refinances your Bitcoin-backed loan at maturity by taking a new loan to pay off the previous one, creating a continuous cycle that preserves your Bitcoin holdings while accessing liquidity.</p>

                      <p><strong>Key Benefits:</strong> Maintain Bitcoin exposure during bull markets, generate consistent cash flow, avoid forced selling during market downturns, and benefit from potential Bitcoin appreciation while accessing immediate liquidity.</p>

                      <p><strong>Rollover Process:</strong> Before each loan expires, the system calculates your current collateral value, determines the optimal new loan amount based on your target LTV, and automatically initiates a new loan to pay off the maturing one.</p>

                      <p><strong>Timing Considerations:</strong> Rollovers typically occur 1-3 days before maturity to ensure smooth transitions. Market volatility may require collateral top-ups or partial repayments to maintain target LTV ratios.</p>

                      <p><strong>Edge Cases:</strong> If Bitcoin price drops significantly, you may need to add collateral or accept a smaller loan amount. During extreme market stress, manual intervention may be required to prevent liquidation.</p>
                    </div>
                  </div>
                )}
                {params.investmentStrategy === 'default' && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-2">
                    <div className="text-blue-700 dark:text-blue-300 text-xs">
                      <p><strong>Standard Approach:</strong> This strategy follows a traditional investment approach, investing up to your target LTV without additional complexity or automated features. Suitable for users who prefer manual control over their investment decisions.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>




        </div>
      </CardContent>
    </Card>
  )
}
