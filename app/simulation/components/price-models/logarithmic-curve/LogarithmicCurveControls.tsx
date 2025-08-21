'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  TrendingUp, 
  Info, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Scale,
  Waves,
  Target,
  RotateCcw
} from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { CurveTransformationParams } from '../../../price-models/models/LogarithmicCurveRepeatModel'

interface LogarithmicCurveControlsProps {
  className?: string
}

// Preset configurations with much more conservative ranges
const PRESETS = {
  pureRepeat: {
    name: 'Pure Cycle Repeat',
    description: 'No transformation - identical to current cycle repeat behavior',
    icon: Target,
    params: {
      curveType: 'logarithmic' as const,
      baseMultiplier: 1.0,
      logarithmicStrength: 0.0,
      smoothingFactor: 0.0,
      growthAcceleration: 1.0
    }
  },
  smoothed: {
    name: 'Smoothed Logarithmic',
    description: 'Gentle logarithmic dampening with preserved volatility',
    icon: Waves,
    params: {
      curveType: 'logarithmic' as const,
      baseMultiplier: 0.95,
      logarithmicStrength: 0.15,
      smoothingFactor: 0.05,
      growthAcceleration: 1.0
    }
  },
  conservative: {
    name: 'Conservative Growth',
    description: 'Moderate logarithmic dampening for conservative projections',
    icon: Scale,
    params: {
      curveType: 'logarithmic' as const,
      baseMultiplier: 0.85,
      logarithmicStrength: 0.35,
      smoothingFactor: 0.1,
      growthAcceleration: 0.95
    }
  },
  aggressive: {
    name: 'Aggressive Growth',
    description: 'Strong logarithmic dampening for very conservative projections',
    icon: Zap,
    params: {
      curveType: 'logarithmic' as const,
      baseMultiplier: 0.75,
      logarithmicStrength: 0.55,
      smoothingFactor: 0.15,
      growthAcceleration: 0.9
    }
  }
} as const

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-logarithmic-curve-preset',
  customParams: 'bitcoin-sim-logarithmic-curve-params',
  advancedExpanded: 'bitcoin-sim-logarithmic-curve-advanced'
}

export function LogarithmicCurveControls({ className }: LogarithmicCurveControlsProps) {
  const { params, setParams } = useSimulation()
  const [selectedPreset, setSelectedPreset] = useState<string>('pureRepeat')
  const [customParams, setCustomParams] = useState<CurveTransformationParams>(PRESETS.pureRepeat.params)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false)

  // Load saved state from sessionStorage
  useEffect(() => {
    const savedPreset = sessionStorage.getItem(STORAGE_KEYS.selectedPreset)
    const savedParams = sessionStorage.getItem(STORAGE_KEYS.customParams)
    const savedAdvanced = sessionStorage.getItem(STORAGE_KEYS.advancedExpanded)

    if (savedPreset && savedPreset in PRESETS) {
      setSelectedPreset(savedPreset)
    }

    if (savedParams) {
      try {
        const parsed = JSON.parse(savedParams)
        setCustomParams(parsed)
      } catch (error) {
        console.warn('Failed to parse saved logarithmic curve params:', error)
      }
    }

    if (savedAdvanced) {
      setAdvancedExpanded(savedAdvanced === 'true')
    }
  }, [])

  // Save state to sessionStorage
  const saveToStorage = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.selectedPreset, selectedPreset)
    sessionStorage.setItem(STORAGE_KEYS.customParams, JSON.stringify(customParams))
    sessionStorage.setItem(STORAGE_KEYS.advancedExpanded, advancedExpanded.toString())
  }, [selectedPreset, customParams, advancedExpanded])

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage()
  }, [saveToStorage])

  // Handle preset selection
  const handlePresetSelect = (presetKey: string) => {
    if (presetKey in PRESETS) {
      setSelectedPreset(presetKey)
      const preset = PRESETS[presetKey as keyof typeof PRESETS]
      setCustomParams(preset.params)
      setHasUnappliedChanges(false) // Presets are auto-applied

      // Auto-apply preset parameters
      setTimeout(() => {
        applyParameters()
      }, 100) // Small delay to ensure state is updated
    }
  }

  // Handle parameter changes
  const handleParamChange = (key: keyof CurveTransformationParams, value: any) => {
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
      logarithmicCurveUpdated: Date.now()
    }))
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setSelectedPreset('pureRepeat')
    setCustomParams(PRESETS.pureRepeat.params)
  }

  // Only show this component when logarithmic curve repeat model is selected
  // Temporarily disabled - model not fully implemented
  return null

  // if (params.priceModel !== 'logarithmicCurveRepeat') {
  //   return null
  // }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Logarithmic Curve Controls
          </CardTitle>
          <CardDescription>
            Configure mathematical logarithmic transformations applied to historical Bitcoin price movements.
            Adjust curve parameters to create smooth, mathematically sound projections.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preset Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Curve Presets</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Advanced Controls */}
          <Collapsible open={advancedExpanded} onOpenChange={setAdvancedExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto">
                <Settings className="w-4 h-4" />
                Advanced Curve Parameters
                {advancedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base Multiplier */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Base Multiplier</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Amplifies or dampens all price movements uniformly.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          1.0 = No change, &lt;1.0 = Dampened, &gt;1.0 = Amplified (max 1.2x)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.baseMultiplier * 100]}
                    onValueChange={([value]) => handleParamChange('baseMultiplier', value / 100)}
                    min={50}
                    max={120}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5x</span>
                    <Badge variant="outline" className="text-xs">
                      {customParams.baseMultiplier.toFixed(2)}x
                    </Badge>
                    <span>1.2x</span>
                  </div>
                </div>

                {/* Logarithmic Strength */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Logarithmic Strength</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Controls logarithmic dampening of large movements (&gt;1%) while preserving volatility.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          0% = Pure cycle repeat, Higher % = More dampened large movements
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.logarithmicStrength * 100]}
                    onValueChange={([value]) => handleParamChange('logarithmicStrength', value / 100)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(customParams.logarithmicStrength * 100)}%
                    </Badge>
                    <span>100%</span>
                  </div>
                </div>

                {/* Smoothing Factor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Smoothing Factor</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Reduces extreme volatility while preserving natural market movements.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          0% = Full volatility, Higher % = Smoother curves
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.smoothingFactor * 100]}
                    onValueChange={([value]) => handleParamChange('smoothingFactor', value / 100)}
                    min={0}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(customParams.smoothingFactor * 100)}%
                    </Badge>
                    <span>50%</span>
                  </div>
                </div>

                {/* Growth Acceleration */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Growth Acceleration</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Modifies the overall growth trajectory steepness.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          1.0 = Normal, &lt;1.0 = Slower growth, &gt;1.0 = Faster growth
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.growthAcceleration * 100]}
                    onValueChange={([value]) => handleParamChange('growthAcceleration', value / 100)}
                    min={50}
                    max={150}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5x</span>
                    <Badge variant="outline" className="text-xs">
                      {customParams.growthAcceleration.toFixed(2)}x
                    </Badge>
                    <span>1.5x</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}
