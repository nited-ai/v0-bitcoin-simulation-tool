"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { Zap, Shield, TrendingUp, Target, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import type { SimulationParams } from "../../types/simulation"

interface ParameterPreset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge?: string
  params: Partial<SimulationParams>
}

/**
 * Parameter Presets Component
 * 
 * Provides quick-start templates for common Bitcoin loan simulation scenarios.
 * Helps users get started quickly with realistic parameter combinations.
 */
export function ParameterPresets() {
  const { params, setParams } = useSimulation()

  const presets: ParameterPreset[] = [
    {
      id: "conservative",
      name: "Conservative",
      description: "Low-risk approach with modest BTC amount and safe loan terms",
      icon: <Shield className="w-4 h-4" />,
      badge: "Safe",
      params: {
        initialBtcAmount: 0.5,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 0,
        annualInterestRate: 6.5,
        originationFeePercent: 1.5,
        loanTermMonths: 6,
        maxLoanAmount: 50000,
        riskManagement: {
          targetLtv: 40,
          liquidationLtv: 80,
        },
      },
    },
    {
      id: "moderate",
      name: "Moderate",
      description: "Balanced approach with standard parameters for typical users",
      icon: <Target className="w-4 h-4" />,
      badge: "Recommended",
      params: {
        initialBtcAmount: 1.0,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 2000,
        annualInterestRate: 6.5,
        originationFeePercent: 1.5,
        loanTermMonths: 6,
        maxLoanAmount: 100000,
        riskManagement: {
          targetLtv: 50,
          liquidationLtv: 85,
        },
      },
    },
    {
      id: "aggressive",
      name: "Aggressive",
      description: "Higher-risk approach with larger amounts and higher leverage",
      icon: <TrendingUp className="w-4 h-4" />,
      badge: "High Risk",
      params: {
        initialBtcAmount: 2.0,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 5000,
        annualInterestRate: 7.5,
        originationFeePercent: 2.0,
        loanTermMonths: 12,
        maxLoanAmount: 200000,
        riskManagement: {
          targetLtv: 60,
          liquidationLtv: 90,
        },
      },
    },
    {
      id: "whale",
      name: "Whale",
      description: "Large-scale simulation for high-net-worth individuals",
      icon: <Zap className="w-4 h-4" />,
      badge: "Premium",
      params: {
        initialBtcAmount: 10.0,
        initialBtcPrice: 100000,
        monthlyWithdrawalAmount: 20000,
        annualInterestRate: 6.0,
        originationFeePercent: 1.0,
        loanTermMonths: 6,
        maxLoanAmount: 1000000,
        riskManagement: {
          targetLtv: 45,
          liquidationLtv: 80,
        },
      },
    },
  ]

  /**
   * Apply a preset to current parameters
   */
  const applyPreset = (preset: ParameterPreset) => {
    setParams((current) => ({
      ...current,
      ...preset.params,
    }))
  }

  /**
   * Check if a preset is currently active
   */
  const isPresetActive = (preset: ParameterPreset): boolean => {
    return Object.entries(preset.params).every(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle nested objects like riskManagement
        return Object.entries(value).every(([nestedKey, nestedValue]) => {
          const currentValue = (params as any)[key]?.[nestedKey]
          return currentValue === nestedValue
        })
      }
      return (params as any)[key] === value
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Parameter Presets
        </CardTitle>
        <CardDescription>
          Quick-start templates for common simulation scenarios
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {presets.map((preset) => {
            const isActive = isPresetActive(preset)
            
            return (
              <div
                key={preset.id}
                className={`relative p-4 border rounded-lg transition-all hover:shadow-md ${
                  isActive 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Badge */}
                {preset.badge && (
                  <Badge 
                    variant={preset.badge === "Recommended" ? "default" : "secondary"}
                    className="absolute -top-2 -right-2 text-xs"
                  >
                    {preset.badge}
                  </Badge>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">{preset.icon}</div>
                  <h3 className="font-medium">{preset.name}</h3>
                  {isActive && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {preset.description}
                </p>

                {/* Key Parameters Preview */}
                <div className="space-y-1 mb-4 text-xs text-muted-foreground">
                  <div>BTC: {preset.params.initialBtcAmount} • LTV: {preset.params.riskManagement?.targetLtv}%</div>
                  <div>Monthly: €{preset.params.monthlyWithdrawalAmount?.toLocaleString()}</div>
                </div>

                {/* Apply Button */}
                <Button
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  disabled={isActive}
                  className="w-full"
                >
                  {isActive ? "Active" : "Apply"}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">How to use presets:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Conservative:</strong> Best for beginners or risk-averse users</li>
                <li>• <strong>Moderate:</strong> Balanced approach suitable for most users</li>
                <li>• <strong>Aggressive:</strong> Higher risk/reward for experienced users</li>
                <li>• <strong>Whale:</strong> Large-scale simulations for institutional use</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
