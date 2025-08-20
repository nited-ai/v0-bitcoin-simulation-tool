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
  Rocket
} from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { DiminishingReturnsParams } from '../../../price-models/models/EnhancedCycleRepeatModel'

// Import presets from the model
import { DIMINISHING_RETURNS_PRESETS } from '../../../price-models/models/EnhancedCycleRepeatModel'

// UI-specific preset configuration
const PRESET_UI_CONFIG = {
  conservative: {
    name: 'Conservative',
    description: 'Low-risk approach with safety-first mindset',
    icon: Shield,
    badge: 'Safe',
    badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  moderate: {
    name: 'Moderate', 
    description: 'Balanced approach for typical investors',
    icon: Target,
    badge: 'Balanced',
    badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Growth-focused with higher risk tolerance',
    icon: TrendingUp,
    badge: 'Growth',
    badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  moonshots: {
    name: 'Moonshots',
    description: 'Maximum risk for maximum potential returns',
    icon: Rocket,
    badge: 'High Risk',
    badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
} as const

interface DiminishingReturnsControlsProps {
  className?: string
}

// Helper function to get preset impact descriptions
function getPresetImpactDescription(preset: keyof typeof PRESET_UI_CONFIG): string {
  switch (preset) {
    case 'conservative':
      return 'Strong market maturation effects will significantly reduce explosive growth in future cycles, leading to more stable but lower returns.'
    case 'moderate':
      return 'Balanced approach with moderate diminishing returns, expecting gradual reduction in cycle explosiveness over time.'
    case 'optimistic':
      return 'Minimal constraints on growth with low diminishing returns, maintaining strong potential for explosive cycles.'
    case 'moonshots':
      return 'Maximum growth potential with minimal market maturation effects, allowing for continued explosive price movements.'
    default:
      return 'Custom configuration with user-defined parameters.'
  }
}

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-enhanced-cycle-preset',
  customParams: 'bitcoin-sim-diminishing-returns-params' // Match UnifiedPriceChart expectation
}

export function DiminishingReturnsControls({ className }: DiminishingReturnsControlsProps) {
  const { params, setParams } = useSimulation()
  const [selectedPreset, setSelectedPreset] = useState<string>('moderate')
  const [customParams, setCustomParams] = useState<DiminishingReturnsParams>(DIMINISHING_RETURNS_PRESETS.moderate.params)
  const [showCustomControls, setShowCustomControls] = useState(false)
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false)

  // Load saved state from sessionStorage
  useEffect(() => {
    const savedPreset = sessionStorage.getItem(STORAGE_KEYS.selectedPreset)
    const savedParams = sessionStorage.getItem(STORAGE_KEYS.customParams)

    if (savedPreset && savedPreset in DIMINISHING_RETURNS_PRESETS) {
      setSelectedPreset(savedPreset)
      setShowCustomControls(savedPreset === 'custom')
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
    setSelectedPreset(presetKey)
    
    if (presetKey === 'custom') {
      setShowCustomControls(true)
      setHasUnappliedChanges(false)
    } else if (presetKey in DIMINISHING_RETURNS_PRESETS) {
      setShowCustomControls(false)
      const preset = DIMINISHING_RETURNS_PRESETS[presetKey as keyof typeof DIMINISHING_RETURNS_PRESETS]
      setCustomParams(preset.params)
      setHasUnappliedChanges(false)

      // Auto-apply preset parameters
      setTimeout(() => {
        applyParameters()
      }, 100)
    }
  }

  // Handle parameter changes
  const handleParamChange = (key: keyof DiminishingReturnsParams, value: any) => {
    const newParams = {
      ...customParams,
      [key]: value
    }

    setCustomParams(newParams)
    setHasUnappliedChanges(true)

    // If we're modifying parameters, switch to custom preset
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom')
    }
  }

  // Apply current parameters and trigger recalculation
  const applyParameters = () => {
    // Save current parameters to sessionStorage for the chart to pick up
    sessionStorage.setItem(STORAGE_KEYS.customParams, JSON.stringify(customParams))

    // Clear the unapplied changes flag
    setHasUnappliedChanges(false)

    // Force chart regeneration by updating simulation params
    setParams(prev => ({
      ...prev,
      // Update timestamp to trigger chart regeneration
      lastUpdated: Date.now(),
      // Also store a flag to indicate parameters changed
      diminishingReturnsUpdated: Date.now()
    }))
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setSelectedPreset('moderate')
    setCustomParams(DIMINISHING_RETURNS_PRESETS.moderate.params)
    setShowCustomControls(false)
    setHasUnappliedChanges(false)
    applyParameters()
  }

  // Only show for Enhanced Cycle Repeat Model
  if (params.priceModel !== 'enhancedCycleRepeat') {
    return null
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Diminishing Returns Theory
          </CardTitle>
          <CardDescription>
            Configure how Bitcoin's growth potential decreases as the market matures, 
            incorporating economic principles of diminishing returns, institutional saturation, and market evolution.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Card-based Preset Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Risk Level Preset</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PRESET_UI_CONFIG).map(([key, config]) => {
                const Icon = config.icon
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
                    <Badge className={`absolute -top-2 -right-2 text-xs ${config.badgeClassName}`}>
                      {config.badge}
                    </Badge>

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-primary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium">{config.name}</h3>
                      {isSelected && (
                        <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
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
                <Badge className="absolute -top-2 -right-2 text-xs bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  Custom
                </Badge>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium">Custom</h3>
                  {selectedPreset === 'custom' && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  Advanced users: customize all parameters
                </p>
              </div>
            </div>
          </div>

          {/* Growth Preview */}
          {selectedPreset !== 'custom' && selectedPreset in PRESET_UI_CONFIG && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Growth Preview</Label>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Selected Preset:</span>
                    <Badge className={PRESET_UI_CONFIG[selectedPreset as keyof typeof PRESET_UI_CONFIG].badgeClassName}>
                      {PRESET_UI_CONFIG[selectedPreset as keyof typeof PRESET_UI_CONFIG].name}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Diminishing Returns:</span>
                      <div className="font-medium">
                        {(customParams.diminishingFactor * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cycle Degradation:</span>
                      <div className="font-medium">
                        {(customParams.cycleDegradation * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Impact:</strong> {getPresetImpactDescription(selectedPreset as keyof typeof PRESET_UI_CONFIG)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Parameters - Only show when Custom is selected */}
          {showCustomControls && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Custom Parameters</Label>
                  {hasUnappliedChanges && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      Changes Pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={applyParameters}
                    className={hasUnappliedChanges
                      ? "bg-orange-600 hover:bg-orange-700 animate-pulse"
                      : "bg-primary hover:bg-primary/90"
                    }
                    size="sm"
                  >
                    {hasUnappliedChanges ? 'Apply Changes' : 'Recalculate'}
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
                        <p>Controls how strongly diminishing returns affect growth as market cap increases.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          0% = No diminishing returns, 50% = Maximum recommended effect
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.diminishingFactor * 100]}
                    onValueChange={(value) => handleParamChange('diminishingFactor', value[0] / 100)}
                    min={0}
                    max={50}
                    step={2.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No Effect</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.diminishingFactor * 100).toFixed(1)}%
                    </Badge>
                    <span>Maximum Effect</span>
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
                        <p>How much each 4-year cycle becomes less explosive than the previous one.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Higher values = lower future prices (fixed logic)
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
        </CardContent>
      </Card>
    </div>
  )
}
