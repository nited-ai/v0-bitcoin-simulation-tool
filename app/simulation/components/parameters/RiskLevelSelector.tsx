"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Activity, TrendingUp, Zap, Rocket, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"

export type RiskLevel = "conservative" | "moderate" | "optimistic" | "moonshots"

interface RiskLevelOption {
  id: RiskLevel
  name: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeClassName: string
  characteristics: string[]
}

/**
 * Risk Level Selector Component
 * 
 * Allows users to select their risk tolerance level, which determines
 * default presets for price projection models and investment strategies.
 */
export function RiskLevelSelector() {
  const { params, applyRiskLevelPreset } = useSimulation()

  const riskLevels: RiskLevelOption[] = [
    {
      id: "conservative",
      name: "Conservative",
      description: "Low-risk approach with safety-first mindset",
      icon: <Activity className="w-5 h-5" />,
      badge: "Safe",
      badgeClassName: "border-transparent bg-green-500 text-white hover:bg-green-600",
      characteristics: []
    },
    {
      id: "moderate",
      name: "Moderate",
      description: "Balanced approach for typical investors",
      icon: <TrendingUp className="w-5 h-5" />,
      badge: "Balanced",
      badgeClassName: "border-transparent bg-lime-500 text-white hover:bg-lime-600",
      characteristics: []
    },
    {
      id: "optimistic",
      name: "Optimistic",
      description: "Growth-focused with higher risk tolerance",
      icon: <Zap className="w-5 h-5" />,
      badge: "Growth",
      badgeClassName: "border-transparent bg-orange-500 text-white hover:bg-orange-600",
      characteristics: []
    },
    {
      id: "moonshots",
      name: "Moonshots",
      description: "Maximum risk for maximum potential returns",
      icon: <Rocket className="w-5 h-5" />,
      badge: "High Risk",
      badgeClassName: "border-transparent bg-red-500 text-white hover:bg-red-600",
      characteristics: []
    }
  ]

  // Get current risk level from params (default to optimistic)
  const currentRiskLevel = params.selectedRiskLevel || params.riskLevel || "optimistic"

  /**
   * Handle risk level selection
   *
   * This now applies the complete risk level preset including all
   * related loan parameters based on the selected risk level.
   */
  const handleRiskLevelChange = (riskLevel: RiskLevel) => {
    // Apply the risk level preset which will update all related parameters
    applyRiskLevelPreset(riskLevel, true) // confirmOverride=true for now
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Risk Level
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskLevels.map((level) => {
            const isSelected = currentRiskLevel === level.id
            
            return (
              <div
                key={level.id}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleRiskLevelChange(level.id)}
              >
                {/* Badge */}
                <Badge
                  className={`absolute -top-2 -right-2 text-xs ${level.badgeClassName}`}
                >
                  {level.badge}
                </Badge>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">{level.icon}</div>
                  <h3 className="font-medium">{level.name}</h3>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {level.description}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
