"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Fish, Zap, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import type { Platform } from "../../types/simulation"

interface PlatformOption {
  id: Platform
  name: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeClassName: string
  features: string[]
}

/**
 * Platform Selector Component
 * 
 * Allows users to select between different lending platforms (Firefish, Strike)
 * with card-based UI similar to Risk Level Selector. This is designed as a 
 * foundation for future platform plugins where each platform will have 
 * specific loan rules and terms.
 */
export function PlatformSelector() {
  const { params, setParams } = useSimulation()

  const platforms: PlatformOption[] = [
    {
      id: "firefish",
      name: "Firefish",
      description: "Flexible lending platform with competitive rates",
      icon: <Fish className="w-5 h-5" />,
      badge: "Flexible",
      badgeClassName: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      features: ["Flexible terms", "Competitive rates", "Multiple loan types"]
    },
    {
      id: "strike",
      name: "Strike",
      description: "Lightning-fast loans with instant approval",
      icon: <Zap className="w-5 h-5" />,
      badge: "Fast",
      badgeClassName: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
      features: ["Instant approval", "Lightning network", "Low fees"]
    }
  ]

  // Get current platform from params (default to firefish)
  const currentPlatform = params.platform || "firefish"

  /**
   * Handle platform selection
   */
  const handlePlatformChange = (platform: Platform) => {
    setParams((current) => ({
      ...current,
      platform
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5 text-primary" />
          Lending Platform
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Choose your preferred lending platform for loan terms and conditions</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>
          Select the lending platform that best fits your needs
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const isSelected = currentPlatform === platform.id
            
            return (
              <div
                key={platform.id}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handlePlatformChange(platform.id)}
              >
                {/* Badge */}
                <Badge 
                  className={`absolute -top-2 -right-2 text-xs ${platform.badgeClassName}`}
                >
                  {platform.badge}
                </Badge>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">{platform.icon}</div>
                  <h3 className="font-medium">{platform.name}</h3>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">
                  {platform.description}
                </p>

                {/* Features */}
                <div className="space-y-1">
                  {platform.features.map((feature, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
