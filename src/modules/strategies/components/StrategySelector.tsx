"use client"

/**
 * Strategy Selector Component
 * 
 * Allows users to select and configure investment strategies.
 * Provides strategy information and parameter configuration.
 */

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { TrendingUp, Info, Shield, Zap, Target, Brain } from "lucide-react"
import { strategyRegistry } from "../services/StrategyRegistry"
import type { InvestmentStrategy, StrategyMetadata } from "../types"

interface StrategySelectorProps {
  selectedStrategy: InvestmentStrategy
  onStrategyChange: (strategy: InvestmentStrategy) => void
  className?: string
}

/**
 * Strategy Selector Component
 */
export function StrategySelector({ 
  selectedStrategy, 
  onStrategyChange, 
  className = "" 
}: StrategySelectorProps) {
  const [selectedStrategyMetadata, setSelectedStrategyMetadata] = useState<StrategyMetadata | null>(null)

  // Get available strategies from registry
  const availableStrategies = strategyRegistry.getStrategyNames()

  // Handle strategy selection
  const handleStrategyChange = (strategyId: string) => {
    onStrategyChange(strategyId as InvestmentStrategy)
    
    // Get metadata for the selected strategy
    const metadata = strategyRegistry.getStrategyMetadata(strategyId)
    setSelectedStrategyMetadata(metadata)
  }

  // Get current strategy metadata
  const currentMetadata = strategyRegistry.getStrategyMetadata(selectedStrategy)

  // Get security rating display
  const getSecurityRating = (rating: number) => {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating)
    const colors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"]
    return { stars, color: colors[rating - 1] || "text-gray-500" }
  }

  // Get complexity rating display
  const getComplexityRating = (rating: number) => {
    const dots = "●".repeat(rating) + "○".repeat(5 - rating)
    const colors = ["text-green-500", "text-blue-500", "text-yellow-500", "text-orange-500", "text-red-500"]
    return { dots, color: colors[rating - 1] || "text-gray-500" }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Investment Strategy
        </CardTitle>
        <CardDescription>
          Choose your investment approach and risk management strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Strategy Selection */}
        <div className="space-y-2">
          <Label htmlFor="strategy-select">Strategy Type</Label>
          <Select value={selectedStrategy} onValueChange={handleStrategyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an investment strategy" />
            </SelectTrigger>
            <SelectContent>
              {availableStrategies.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  <div className="flex items-center gap-2">
                    <span>{strategy.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Strategy Information */}
        {currentMetadata && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Strategy Details</h4>
              <div className="flex gap-2">
                {currentMetadata.suitableFor.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Security:</span>
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <span className={`text-sm font-mono ${getSecurityRating(currentMetadata.securityRating).color}`}>
                      {getSecurityRating(currentMetadata.securityRating).stars}
                    </span>
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>Security Rating: {currentMetadata.securityRating}/5</p>
                    <p>Higher ratings indicate more conservative risk management</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </div>

              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Complexity:</span>
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <span className={`text-sm font-mono ${getComplexityRating(currentMetadata.complexityRating).color}`}>
                      {getComplexityRating(currentMetadata.complexityRating).dots}
                    </span>
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>Complexity Rating: {currentMetadata.complexityRating}/5</p>
                    <p>Higher ratings require more configuration and understanding</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </div>
            </div>

            {/* Strategy Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">How it works:</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {strategyRegistry.getStrategy(selectedStrategy)?.getDetailedDescription()}
              </p>
            </div>

            {/* Strategy Criteria */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Decision criteria:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentMetadata.criteria.map((criterion) => (
                  <Badge key={criterion} variant="outline" className="text-xs">
                    {criterion.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Strategy Parameters Placeholder */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Strategy Parameters</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Strategy-specific parameters will be configured here based on the selected strategy.
            This will be implemented in the next phase of the modular architecture.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
