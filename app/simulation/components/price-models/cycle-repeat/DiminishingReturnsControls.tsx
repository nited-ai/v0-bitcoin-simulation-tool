'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  TrendingDown, 
  Info, 
  Settings, 
  Zap,
  Target,
  RotateCcw,
  Shield,
  TrendingUp,
  Rocket,
  Activity
} from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'

interface DiminishingReturnsControlsProps {
  className?: string
}

// Define simplified parameter interface for the two key parameters
interface SimplifiedParams {
  diminishingFactor: number    // Diminishing Returns Strength (0-1)
  cycleDegradation: number     // Cycle Degradation Rate (0-0.5)
}

// Simplified preset definitions focused on the two key parameters
const PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Strong diminishing returns with high cycle degradation',
    icon: Shield,
    badge: 'Safe',
    badgeClassName: 'border-transparent bg-green-500 text-white hover:bg-green-600',
    params: {
      diminishingFactor: 0.8,    // 80% diminishing returns
      cycleDegradation: 0.3      // 30% cycle degradation
    }
  },
  moderate: {
    name: 'Moderate',
    description: 'Balanced approach with moderate diminishing effects',
    icon: Target,
    badge: 'Balanced',
    badgeClassName: 'border-transparent bg-lime-500 text-white hover:bg-lime-600',
    params: {
      diminishingFactor: 0.5,    // 50% diminishing returns
      cycleDegradation: 0.15     // 15% cycle degradation
    }
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Minimal diminishing returns with continued growth potential',
    icon: Zap,
    badge: 'Growth',
    badgeClassName: 'border-transparent bg-orange-500 text-white hover:bg-orange-600',
    params: {
      diminishingFactor: 0.2,    // 20% diminishing returns
      cycleDegradation: 0.05     // 5% cycle degradation
    }
  },
  moonshots: {
    name: 'Moonshots',
    description: 'Maximum growth potential with minimal dampening effects',
    icon: Rocket,
    badge: 'High Risk',
    badgeClassName: 'border-transparent bg-red-500 text-white hover:bg-red-600',
    params: {
      diminishingFactor: 0.1,    // 10% diminishing returns
      cycleDegradation: 0.02     // 2% cycle degradation
    }
  }
} as const

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-enhanced-cycle-preset',
  customParams: 'bitcoin-sim-enhanced-cycle-params'
}

export function DiminishingReturnsControls({ className }: DiminishingReturnsControlsProps) {
  const { params, setParams } = useSimulation()
  const [selectedPreset, setSelectedPreset] = useState<string>('optimistic')
  const [customParams, setCustomParams] = useState<SimplifiedParams>(PRESETS.optimistic.params)
  const [showCustomControls, setShowCustomControls] = useState(false)

  // Load saved state from sessionStorage
  useEffect(() => {
    const savedPreset = sessionStorage.getItem(STORAGE_KEYS.selectedPreset)
    const savedParams = sessionStorage.getItem(STORAGE_KEYS.customParams)

    if (savedPreset && savedPreset in PRESETS) {
      setSelectedPreset(savedPreset)
      if (savedPreset !== 'custom') {
        const preset = PRESETS[savedPreset as keyof typeof PRESETS]
        setCustomParams(preset.params)
        setShowCustomControls(false)
      } else {
        setShowCustomControls(true)
      }
    }

    if (savedParams) {
      try {
        const parsed = JSON.parse(savedParams)
        setCustomParams(parsed)
      } catch (error) {
        console.warn('Failed to parse saved enhanced cycle params:', error)
      }
    }
  }, [])

  // Save state to sessionStorage
  const saveToStorage = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.selectedPreset, selectedPreset)
    sessionStorage.setItem(STORAGE_KEYS.customParams, JSON.stringify(customParams))
  }, [selectedPreset, customParams])

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage()
  }, [saveToStorage])

  // Handle preset selection
  const handlePresetSelect = (presetKey: string) => {
    if (presetKey === 'custom') {
      setSelectedPreset('custom')
      setShowCustomControls(true)
    } else if (presetKey in PRESETS) {
      setSelectedPreset(presetKey)
      const preset = PRESETS[presetKey as keyof typeof PRESETS]
      setCustomParams(preset.params)
      setShowCustomControls(false)

      // Auto-apply preset parameters
      setTimeout(() => {
        applyParameters()
      }, 100) // Small delay to ensure state is updated
    }
  }

  // Handle parameter changes
  const handleParamChange = (key: keyof SimplifiedParams, value: number) => {
    const newParams = {
      ...customParams,
      [key]: value
    }

    setCustomParams(newParams)

    // If we're modifying parameters, switch to custom preset
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom')
      setShowCustomControls(true)
    }
  }

  // Apply current parameters and trigger recalculation
  const applyParameters = () => {
    // Save current parameters to sessionStorage for the chart to pick up
    sessionStorage.setItem(STORAGE_KEYS.customParams, JSON.stringify(customParams))

    // Force chart regeneration by updating simulation params
    setParams(prev => ({
      ...prev,
      // Update timestamp to trigger chart regeneration
      lastUpdated: Date.now(),
      // Store enhanced cycle parameters
      enhancedCycleUpdated: Date.now()
    }))
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setSelectedPreset('optimistic')
    setCustomParams(PRESETS.optimistic.params)
    setShowCustomControls(false)
  }

  // Calculate preview metrics for the selected parameters
  const calculatePreviewMetrics = () => {
    const baseGrowth = 100 // Base 100% annual growth
    const diminishingEffect = customParams.diminishingFactor * 0.6
    const cycleEffect = customParams.cycleDegradation * 0.4
    
    const adjustedGrowth = baseGrowth * (1 - diminishingEffect - cycleEffect)
    
    return {
      firstCycleGrowth: Math.max(10, adjustedGrowth),
      secondCycleGrowth: Math.max(5, adjustedGrowth * (1 - customParams.cycleDegradation)),
      thirdCycleGrowth: Math.max(2, adjustedGrowth * Math.pow(1 - customParams.cycleDegradation, 2))
    }
  }

  const previewMetrics = calculatePreviewMetrics()

  // Only show this component when enhanced cycle repeat model is selected
  if (params.priceModel !== 'enhancedCycleRepeat') {
    return null
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Enhanced Cycle Repeat Model Settings
          </CardTitle>
          <CardDescription>
            Select a risk level preset or customize the two key parameters that impact price projections.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Risk Level Preset Selection - Card-based like Parameters tab */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Risk Level Presets</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const Icon = preset.icon
                const isSelected = selectedPreset === key

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
                      className={`absolute -top-2 -right-2 text-xs ${preset.badgeClassName}`}
                    >
                      {preset.badge}
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
                    <p className="text-sm text-muted-foreground mb-3">
                      {preset.description}
                    </p>

                    {/* Key metrics preview */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>Diminishing: {(preset.params.diminishingFactor * 100).toFixed(0)}%</div>
                      <div>Degradation: {(preset.params.cycleDegradation * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )
              })}
              
              {/* Custom Option */}
              <div
                className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedPreset === 'custom'
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handlePresetSelect('custom')}
              >
                {/* Badge */}
                <Badge className="absolute -top-2 -right-2 text-xs border-transparent bg-blue-500 text-white hover:bg-blue-600">
                  Custom
                </Badge>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary"><Settings className="w-5 h-5" /></div>
                  <h3 className="font-medium">Custom</h3>
                  {selectedPreset === 'custom' && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">
                  Manually adjust the two key parameters
                </p>

                {/* Current custom values */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Diminishing: {(customParams.diminishingFactor * 100).toFixed(0)}%</div>
                  <div>Degradation: {(customParams.cycleDegradation * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Parameter Controls - Only show when Custom is selected */}
          {showCustomControls && (
            <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Custom Parameters</Label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={applyParameters}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaults}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Two Key Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Diminishing Returns Strength */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Diminishing Returns Strength</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Controls how much Bitcoin's growth potential decreases over time as the market matures.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          0% = No diminishing returns, 100% = Strong diminishing returns
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.diminishingFactor * 100]}
                    onValueChange={(value) => handleParamChange('diminishingFactor', value[0] / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No Effect</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.diminishingFactor * 100).toFixed(0)}%
                    </Badge>
                    <span>Strong Effect</span>
                  </div>
                </div>

                {/* Cycle Degradation Rate */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Cycle Degradation Rate</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>How much each Bitcoin cycle's impact diminishes compared to the previous cycle.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          0% = Cycles maintain full strength, 50% = Each cycle is half as strong
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.cycleDegradation * 100]}
                    onValueChange={(value) => handleParamChange('cycleDegradation', value[0] / 100)}
                    min={0}
                    max={50}
                    step={2.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No Degradation</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.cycleDegradation * 100).toFixed(1)}%
                    </Badge>
                    <span>High Degradation</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Growth Impact Preview */}
          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="text-base font-medium">Growth Impact Preview</Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {previewMetrics.firstCycleGrowth.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">1st Cycle Growth</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                  {previewMetrics.secondCycleGrowth.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">2nd Cycle Growth</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                  {previewMetrics.thirdCycleGrowth.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">3rd Cycle Growth</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-2">How it works:</p>
              <p>
                The Enhanced Cycle Repeat Model applies historical Bitcoin price movements from exactly 4 years ago.
                The two key parameters above control how these movements are modified to account for market maturation over time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
