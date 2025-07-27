'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Settings,
  Rocket
} from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'

interface SimplifiedManualGrowthInterfaceProps {
  className?: string
}

const PRESETS = {
  conservative: {
    name: 'Conservative',
    icon: Activity, // Changed from TrendingDown to Activity
    rates: [15, -10, -5, 25, 30, -15, -5, 20, 25, -10, -5, 15],
    description: 'Steady, realistic growth with moderate volatility'
  },
  moderate: {
    name: 'Moderate',
    icon: TrendingUp, // Changed from Activity to TrendingUp
    rates: [50, -30, -10, 80, 100, -40, -15, 60, 80, -35, -10, 40],
    description: 'Balanced growth with typical Bitcoin cycles'
  },
  optimistic: {
    name: 'Optimistic',
    icon: Zap, // Changed from TrendingUp to Zap
    rates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
    description: 'High growth potential with significant volatility'
  },
  moonshot: {
    name: 'Moonshot',
    icon: Rocket, // Changed from Zap to Rocket
    rates: [300, -70, -30, 400, 500, -80, -40, 350, 450, -75, -35, 250],
    description: 'Extreme bull case scenario'
  },
  custom: {
    name: 'Custom',
    icon: Settings,
    rates: [], // Will be populated dynamically
    description: 'Customize individual growth rates'
  }
}

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-selected-preset',
  customRates: 'bitcoin-sim-custom-rates'
}

export function SimplifiedManualGrowthInterface({ className }: SimplifiedManualGrowthInterfaceProps) {
  const { params, setParams } = useSimulation()
  const [selectedPreset, setSelectedPreset] = useState<string>('optimistic')
  const [customRates, setCustomRates] = useState<number[]>([])
  const [tempCustomRates, setTempCustomRates] = useState<number[]>([]) // Temporary state for sliders
  const [showCustomControls, setShowCustomControls] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Convert months to years for display
  const simulationYears = Math.round(params.simulationMonths / 12)

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedPreset = sessionStorage.getItem(STORAGE_KEYS.selectedPreset)
    const savedCustomRates = sessionStorage.getItem(STORAGE_KEYS.customRates)

    if (savedPreset) {
      setSelectedPreset(savedPreset)
      if (savedPreset === 'custom' && savedCustomRates) {
        const rates = JSON.parse(savedCustomRates)
        setCustomRates(rates)
        setTempCustomRates(rates)
        setShowCustomControls(true)
      }
    }
  }, [])

  // Get current growth rates
  const getCurrentGrowthRates = () => {
    if (selectedPreset === 'custom' && customRates.length > 0) {
      return customRates
    }
    return params.annualGrowthRates || PRESETS.optimistic.rates
  }

  const currentGrowthRates = getCurrentGrowthRates()

  // Ensure growth rates array matches simulation years
  const adjustedGrowthRates = [...currentGrowthRates]
  while (adjustedGrowthRates.length < simulationYears) {
    adjustedGrowthRates.push(50) // Default 50% growth for new years
  }
  if (adjustedGrowthRates.length > simulationYears) {
    adjustedGrowthRates.splice(simulationYears)
  }

  // Handle custom rate slider changes (only visual feedback)
  const handleTempCustomRateChange = (index: number, value: number) => {
    const newTempRates = [...tempCustomRates]
    newTempRates[index] = value
    setTempCustomRates(newTempRates)
  }

  // Apply custom rates to actual state and chart
  const applyCustomRates = () => {
    setCustomRates(tempCustomRates)
    sessionStorage.setItem(STORAGE_KEYS.customRates, JSON.stringify(tempCustomRates))
    setParams(prev => ({ ...prev, annualGrowthRates: tempCustomRates }))
  }

  const handlePresetSelect = (presetKey: string) => {
    if (presetKey === 'custom') {
      // Initialize custom rates with current active preset rates
      const currentActivePreset = selectedPreset !== 'custom' ? selectedPreset : 'optimistic'
      const baseRates = PRESETS[currentActivePreset as keyof typeof PRESETS].rates

      const adjustedRates = [...baseRates]
      while (adjustedRates.length < simulationYears) {
        adjustedRates.push(baseRates[adjustedRates.length % baseRates.length])
      }
      if (adjustedRates.length > simulationYears) {
        adjustedRates.splice(simulationYears)
      }

      setCustomRates(adjustedRates)
      setTempCustomRates(adjustedRates)
      setShowCustomControls(true)
      setSelectedPreset('custom')

      // Save to sessionStorage
      sessionStorage.setItem(STORAGE_KEYS.selectedPreset, 'custom')
      sessionStorage.setItem(STORAGE_KEYS.customRates, JSON.stringify(adjustedRates))

      setParams(prev => ({ ...prev, annualGrowthRates: adjustedRates }))
    } else {
      const preset = PRESETS[presetKey as keyof typeof PRESETS]
      if (preset) {
        // Adjust preset rates to match simulation years
        const adjustedRates = [...preset.rates]
        while (adjustedRates.length < simulationYears) {
          adjustedRates.push(preset.rates[adjustedRates.length % preset.rates.length])
        }
        if (adjustedRates.length > simulationYears) {
          adjustedRates.splice(simulationYears)
        }

        setSelectedPreset(presetKey)
        setShowCustomControls(false)

        // Save to sessionStorage
        sessionStorage.setItem(STORAGE_KEYS.selectedPreset, presetKey)

        setParams(prev => ({ ...prev, annualGrowthRates: adjustedRates }))
      }
    }
  }



  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Manual Growth Rate Model
          </CardTitle>
          <CardDescription>
            Customize Bitcoin price projections with user-defined annual growth rates
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Quick Presets */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Quick Presets</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const Icon = preset.icon
                const isSelected = selectedPreset === key

                // Define badge colors for each preset
                const getBadgeConfig = (presetKey: string) => {
                  switch (presetKey) {
                    case 'conservative':
                      return { badge: 'Safe', className: 'border-transparent bg-green-500 text-white hover:bg-green-600' }
                    case 'moderate':
                      return { badge: 'Balanced', className: 'border-transparent bg-lime-500 text-white hover:bg-lime-600' }
                    case 'optimistic':
                      return { badge: 'Growth', className: 'border-transparent bg-orange-500 text-white hover:bg-orange-600' }
                    case 'moonshot':
                      return { badge: 'High Risk', className: 'border-transparent bg-red-500 text-white hover:bg-red-600' }
                    case 'custom':
                      return { badge: 'Custom', className: 'border-transparent bg-purple-500 text-white hover:bg-purple-600' }
                    default:
                      return { badge: 'Default', className: 'border-transparent bg-gray-500 text-white hover:bg-gray-600' }
                  }
                }

                const badgeConfig = getBadgeConfig(key)

                return (
                  <div
                    key={key}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handlePresetSelect(key)}
                  >
                    {/* Badge */}
                    <Badge
                      className={`absolute -top-2 -right-2 text-xs ${badgeConfig.className}`}
                    >
                      {badgeConfig.badge}
                    </Badge>

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-primary"><Icon className="w-5 h-5" /></div>
                      <h3 className="font-medium">{preset.name}</h3>
                      {isSelected && (
                        <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {preset.description}
                    </p>
                  </div>
                )
              })}
            </div>
            

          </div>


        </CardContent>
      </Card>
    </div>
  )
}
