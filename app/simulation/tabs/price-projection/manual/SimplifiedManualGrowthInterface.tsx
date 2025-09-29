'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
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

// PRESETS will be created inside the component to access t() function

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-selected-preset',
  customRates: 'bitcoin-sim-custom-rates'
}

export function SimplifiedManualGrowthInterface({ className }: SimplifiedManualGrowthInterfaceProps) {
  const { t } = useTranslation()
  const { params, setParams } = useSimulation()
  const [selectedPreset, setSelectedPreset] = useState<string>('optimistic')
  const [customRates, setCustomRates] = useState<number[]>([])
  const [tempCustomRates, setTempCustomRates] = useState<number[]>([]) // Temporary state for sliders
  const [showCustomControls, setShowCustomControls] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convert months to years for display
  const simulationYears = Math.round(params.simulationMonths / 12)

  const PRESETS = {
    conservative: {
      name: t('ManualGrowthInterface.presets.conservative.name', 'Conservative'),
      icon: Activity,
      rates: [15, -10, -5, 25, 30, -15, -5, 20, 25, -10, -5, 15],
      description: t('ManualGrowthInterface.presets.conservative.description', 'Steady, realistic growth with moderate volatility')
    },
    moderate: {
      name: t('ManualGrowthInterface.presets.moderate.name', 'Moderate'),
      icon: TrendingUp,
      rates: [50, -30, -10, 80, 100, -40, -15, 60, 80, -35, -10, 40],
      description: t('ManualGrowthInterface.presets.moderate.description', 'Balanced growth with typical Bitcoin cycles')
    },
    optimistic: {
      name: t('ManualGrowthInterface.presets.optimistic.name', 'Optimistic'),
      icon: Zap,
      rates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
      description: t('ManualGrowthInterface.presets.optimistic.description', 'High growth potential with significant volatility')
    },
    moonshot: {
      name: t('ManualGrowthInterface.presets.moonshot.name', 'Moonshot'),
      icon: Rocket,
      rates: [300, -70, -30, 400, 500, -80, -40, 350, 450, -75, -35, 250],
      description: t('ManualGrowthInterface.presets.moonshot.description', 'Extreme bull case scenario')
    },
    custom: {
      name: t('ManualGrowthInterface.presets.custom.name', 'Custom'),
      icon: Settings,
      rates: [], // Will be populated dynamically
      description: t('ManualGrowthInterface.presets.custom.description', 'Customize individual growth rates')
    }
  }

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
        // Don't auto-open drawer on mount, let user click to open
      }
    }
  }, [])

  // Initialize tempCustomRates when custom rates change or simulation years change
  useEffect(() => {
    if (selectedPreset === 'custom' && customRates.length > 0) {
      const adjustedRates = [...customRates]
      while (adjustedRates.length < simulationYears) {
        adjustedRates.push(50) // Default 50% growth for new years
      }
      if (adjustedRates.length > simulationYears) {
        adjustedRates.splice(simulationYears)
      }
      setTempCustomRates(adjustedRates)
    }
  }, [customRates, simulationYears, selectedPreset])

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
    // Update params with timestamp to trigger chart regeneration
    setParams(prev => ({
      ...prev,
      annualGrowthRates: tempCustomRates,
      lastUpdated: Date.now()
    }))
    // Keep drawer open after applying changes
  }

  // Get dynamic year labels based on current date
  const getYearLabel = (index: number) => {
    const currentYear = new Date().getFullYear()
    return (currentYear + 1 + index).toString() // Start from next year
  }

  // Get color styling for growth rate values
  const getValueColor = (rate: number) => {
    if (rate > 100) {
      return 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700'
    } else if (rate > 0) {
      return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    } else if (rate > -20) {
      return 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
    } else {
      return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    }
  }

  const handlePresetSelect = (presetKey: string) => {
    if (presetKey === 'custom') {
      // Check if we should toggle the drawer closed
      if (selectedPreset === 'custom' && showCustomControls && isDrawerOpen) {
        // Simply close the drawer - don't change any other states
        setIsDrawerOpen(false)
        return // Exit early to prevent any other state changes
      }

      // Initialize or reopen custom drawer
      const currentActivePreset = selectedPreset !== 'custom' ? selectedPreset : 'optimistic'
      const baseRates = PRESETS[currentActivePreset as keyof typeof PRESETS].rates

      const adjustedRates = [...baseRates]
      while (adjustedRates.length < simulationYears) {
        adjustedRates.push(baseRates[adjustedRates.length % baseRates.length])
      }
      if (adjustedRates.length > simulationYears) {
        adjustedRates.splice(simulationYears)
      }

      // Update all states in the correct order
      setSelectedPreset('custom')
      setCustomRates(adjustedRates)
      setTempCustomRates(adjustedRates)
      setShowCustomControls(true)

      // Save to sessionStorage
      sessionStorage.setItem(STORAGE_KEYS.selectedPreset, 'custom')
      sessionStorage.setItem(STORAGE_KEYS.customRates, JSON.stringify(adjustedRates))

      // Update params with timestamp to trigger chart regeneration
      setParams(prev => ({
        ...prev,
        annualGrowthRates: adjustedRates,
        lastUpdated: Date.now()
      }))

      // Open drawer after state updates
      setTimeout(() => {
        setIsDrawerOpen(true)
      }, 10) // Slightly longer delay to ensure state is settled
    } else {
      const preset = PRESETS[presetKey as keyof typeof PRESETS]
      if (preset) {
        // Close drawer first if it's open
        if (isDrawerOpen) {
          setIsDrawerOpen(false)
        }

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

        // Update params with timestamp to trigger chart regeneration
        setParams(prev => ({
          ...prev,
          annualGrowthRates: adjustedRates,
          lastUpdated: Date.now()
        }))
      }
    }
  }



  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('ManualGrowthInterface.title', 'Manual Growth Rate Model')}
          </CardTitle>
          <CardDescription>
            {t('ManualGrowthInterface.description', 'Customize Bitcoin price projections with user-defined annual growth rates')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Quick Presets */}
          <div className="space-y-4">
            <Label className="text-base font-medium">{t('ManualGrowthInterface.quickPresets', 'Quick Presets')}</Label>
            
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

      {/* Custom Growth Rates Drawer */}
      <Sheet modal={false} open={isDrawerOpen} onOpenChange={(open) => {
        // Only update state if it's actually changing to prevent animation conflicts
        if (open !== isDrawerOpen) {
          setIsDrawerOpen(open)
        }
      }}>
        <SheetContent side="bottom" className="h-auto pt-[10px] bg-background/80 backdrop-blur-sm border-t">
          <div className="flex flex-col">
            {/* Header with title aligned to close button */}
            <div className="flex items-center justify-between pt-[10px] pb-[10px] pl-[50px] pr-[50px]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">Custom Growth Rates ({simulationYears} Years)</span>
              </div>
            </div>

            {/* Centered sliders container with top padding */}
            <div className="flex justify-center pt-[10px]">
              <div className="flex items-end gap-3 overflow-hidden">
                {/* Vertical sliders */}
              {tempCustomRates.map((rate, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 min-w-[50px] flex-shrink-0">
                  {/* Value display with dynamic coloring */}
                  <div className={`text-sm font-semibold text-center min-h-[20px] px-2 py-1 rounded-md border ${getValueColor(rate)}`}>
                    {rate > 0 ? '+' : ''}{rate}%
                  </div>

                  {/* Simplified vertical slider - taller for bottom drawer */}
                  <div className="h-48 flex items-center relative">
                    {/* Custom track background */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-secondary rounded-full">
                      {/* Dynamic orange fill based on slider value */}
                      <div
                        className="absolute bottom-0 w-full bg-primary rounded-full transition-all duration-150 ease-out"
                        style={{
                          height: `${Math.max(0, ((rate - (-100)) / (300 - (-100))) * 100)}%`
                        }}
                      />
                    </div>

                    <Slider
                      value={[rate]}
                      onValueChange={(values) => handleTempCustomRateChange(index, values[0])}
                      min={-100}
                      max={300}
                      step={5}
                      orientation="vertical"
                      className="h-full slider-orange"
                    />

                    {/* Zero line indicator */}
                    <div
                      className="absolute w-4 h-0.5 bg-orange-500 pointer-events-none z-10"
                      style={{
                        bottom: '26.5%',
                        left: '50%',
                        transform: 'translateX(-50%) translateY(-50%)'
                      }}
                    />
                  </div>

                  {/* Dynamic year label */}
                  <Label className="text-xs text-center font-medium text-muted-foreground">
                    {getYearLabel(index)}
                  </Label>
                </div>
              ))}
              </div>
            </div>

            {/* Apply Changes Button - centered with minimal spacing */}
            <div className="p-[10px] flex justify-center">
              <Button
                onClick={applyCustomRates}
                className="bg-primary hover:bg-primary/90"
                size="lg"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Custom CSS for orange sliders - Custom Track with Dynamic Fill */}
      <style jsx global>{`
        /* Hide original slider track - make it transparent */
        .slider-orange [data-orientation="vertical"]:not([role="slider"]) {
          background-color: transparent !important;
          width: 8px !important;
          height: 100% !important;
        }

        /* Hide original slider fill */
        .slider-orange [data-orientation="vertical"] > span {
          background-color: transparent !important;
        }

        .slider-orange .relative > span[data-orientation="vertical"] {
          background-color: transparent !important;
        }

        .slider-orange .relative > span[data-orientation="vertical"] > span {
          background-color: transparent !important;
        }

        /* Slider thumb - centered horizontally with margin adjustment */
        .slider-orange [role="slider"] {
          height: 20px !important;
          width: 20px !important;
          border-radius: 50% !important;
          border: 2px solid hsl(var(--primary)) !important;
          background-color: hsl(var(--background)) !important;
          box-shadow: none !important;
          transition: all 0.2s ease !important;
          margin-left: -6px !important; /* Center 20px thumb over 8px track */
          position: relative !important;
          z-index: 20 !important; /* Above custom track */
        }

        .slider-orange [role="slider"]:hover {
          border-color: hsl(var(--primary)) !important;
          background-color: hsl(var(--background)) !important;
          transform: scale(1.05) !important;
        }

        .slider-orange [role="slider"]:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px hsl(var(--ring)) !important;
          border-color: hsl(var(--primary)) !important;
        }

        /* Force orange primary color for consistency */
        .slider-orange {
          --primary: 24.6 95% 53.1%; /* Orange color */
        }

        /* Additional specificity for thumb centering */
        .slider-orange span[role="slider"] {
          margin-left: -6px !important;
        }

        /* Ensure slider container allows overflow for thumb */
        .slider-orange {
          overflow: visible !important;
        }

        .slider-orange .relative {
          overflow: visible !important;
        }
      `}</style>
    </div>
  )
}
