"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Fish, Zap, Info, Settings, ExternalLink } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import type { Platform } from "../../types/simulation"

interface PlatformOption {
  id: Platform | "custom"
  name: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeClassName: string
  features: string[]
  disabled?: boolean
  url?: string
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
      features: [],
      url: "https://firefish.io/"
    },
    {
      id: "strike",
      name: "Strike",
      description: "Lightning-fast loans with instant approval",
      icon: <Zap className="w-5 h-5" />,
      badge: "Fast",
      badgeClassName: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
      features: [],
      url: "https://strike.me/lending/"
    },
    {
      id: "custom",
      name: "Custom Platform",
      description: "Configure your own lending platform parameters",
      icon: <Settings className="w-5 h-5" />,
      badge: "Coming Soon",
      badgeClassName: "border-transparent bg-gray-500 text-white",
      features: [],
      disabled: true
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

  /**
   * Handle external link clicks
   */
  const handleExternalLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation() // Prevent card selection when clicking the link
    window.open(url, '_blank', 'noopener,noreferrer')
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const isSelected = currentPlatform === platform.id
            
            return (
              <div
                key={platform.id}
                className={`relative p-4 border rounded-lg transition-all ${
                  platform.disabled
                    ? "border-muted bg-muted/20 cursor-not-allowed opacity-60"
                    : isSelected
                      ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
                      : "border-border hover:border-primary/50 cursor-pointer hover:shadow-md"
                }`}
                onClick={() => !platform.disabled && platform.id !== "custom" && handlePlatformChange(platform.id as Platform)}
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

                {/* External Link */}
                {platform.url && (
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => handleExternalLinkClick(e, platform.url!)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      title={`Visit ${platform.name} website`}
                    >
                      <span>Visit Platform</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
