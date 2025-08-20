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
  TrendingDown,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  Building2,
  Scale,
  Zap,
  Target,
  Rocket,
  RotateCcw
} from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { DiminishingReturnsParams, DIMINISHING_RETURNS_PRESETS } from '../../../price-models/models/EnhancedCycleRepeatModel'

interface DiminishingReturnsControlsProps {
  className?: string
}

// Import presets from the model
import { DIMINISHING_RETURNS_PRESETS } from '../../../price-models/models/EnhancedCycleRepeatModel'

// UI-specific preset configuration
const PRESET_UI_CONFIG = {
  conservative: {
    name: 'Conservative',
    description: 'Strong diminishing returns with high market maturity assumptions',
    icon: TrendingDown
  },
  moderate: {
    name: 'Moderate',
    description: 'Balanced diminishing returns reflecting gradual market evolution',
    icon: Target
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Minimal diminishing returns with continued growth potential',
    icon: Zap
  },
  moonshots: {
    name: 'Moonshots',
    description: 'Aggressive growth assumptions with minimal constraints',
    icon: Rocket
  }
} as const

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-enhanced-cycle-preset',
  customParams: 'bitcoin-sim-enhanced-cycle-params'
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

  // Format market cap for display
  const formatMarketCap = (value: number) => {
    if (value >= 1_000_000_000_000) {
      return `$${(value / 1_000_000_000_000).toFixed(1)}T`
    } else if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(0)}B`
    }
    return `$${value.toLocaleString()}`
  }

  // Calculate preview metrics
  const calculatePreviewMetrics = () => {
    const baseGrowth = 100 // Base 100% annual growth
    const maturityEffect = customParams.diminishingFactor * 0.5
    const cycleEffect = customParams.cycleDegradation * 0.3
    const institutionalEffect = customParams.institutionalSaturation * 0.2
    
    const adjustedGrowth = baseGrowth * (1 - maturityEffect - cycleEffect - institutionalEffect)
    
    return {
      firstCycleGrowth: adjustedGrowth,
      secondCycleGrowth: adjustedGrowth * (1 - customParams.cycleDegradation),
      thirdCycleGrowth: adjustedGrowth * Math.pow(1 - customParams.cycleDegradation, 2)
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
            <TrendingDown className="w-5 h-5 text-primary" />
            Diminishing Returns Theory
          </CardTitle>
          <CardDescription>
            Configure how Bitcoin's growth potential decreases as the market matures, 
            incorporating economic principles of diminishing returns, institutional saturation, and market evolution.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Simplified Preset Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Risk Level Preset</Label>

            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select risk level..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_UI_CONFIG).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{config.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Custom</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Show description for selected preset */}
            {selectedPreset !== 'custom' && selectedPreset in PRESET_UI_CONFIG && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {PRESET_UI_CONFIG[selectedPreset as keyof typeof PRESET_UI_CONFIG].description}
                </p>
              </div>
            )}
          </div>

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
            )}
        </CardContent>
      </Card>
    </div>
  )
}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-base font-medium">Advanced Economic Factors</span>
                </div>
                {advancedExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Adoption Curve Type */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Adoption Curve Model</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Mathematical model for how Bitcoin adoption affects growth potential:</p>
                        <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                          <li>Linear: Steady decline in growth</li>
                          <li>Logarithmic: Rapid early decline, then stabilizes</li>
                          <li>Sigmoid: S-curve with inflection point</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={customParams.adoptionCurveType}
                    onValueChange={(value) => handleParamChange('adoptionCurveType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear Decline</SelectItem>
                      <SelectItem value="logarithmic">Logarithmic Curve</SelectItem>
                      <SelectItem value="sigmoid">S-Curve (Sigmoid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Regulatory Maturity */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Regulatory Maturity</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Level of regulatory clarity and framework development.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Higher maturity reduces volatility but may limit explosive growth
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.regulatoryMaturity * 100]}
                    onValueChange={(value) => handleParamChange('regulatoryMaturity', value[0] / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uncertain</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.regulatoryMaturity * 100).toFixed(0)}%
                    </Badge>
                    <span>Clear Framework</span>
                  </div>
                </div>

                {/* Liquidity Constraint */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Liquidity Constraints</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Market liquidity limitations that affect price movements at higher market caps.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Higher constraints mean larger market caps require more capital for significant moves
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.liquidityConstraint * 100]}
                    onValueChange={(value) => handleParamChange('liquidityConstraint', value[0] / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>High Liquidity</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.liquidityConstraint * 100).toFixed(0)}%
                    </Badge>
                    <span>Constrained</span>
                  </div>
                </div>

                {/* Competition Factor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Competition Effect</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Impact of competing cryptocurrencies and alternative investments on Bitcoin's growth.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Higher competition reduces Bitcoin's exclusive growth potential over time
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[customParams.competitionFactor * 100]}
                    onValueChange={(value) => handleParamChange('competitionFactor', value[0] / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No Competition</span>
                    <Badge variant="secondary" className="text-xs">
                      {(customParams.competitionFactor * 100).toFixed(0)}%
                    </Badge>
                    <span>High Competition</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Growth Preview */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Growth Impact Preview</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>

            {showPreview && (
              <div className="space-y-4">
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
                  <p className="font-medium mb-2">Economic Theory Explanation:</p>
                  <p>
                    Diminishing returns theory suggests that as Bitcoin's market cap grows, each additional dollar of investment
                    yields progressively smaller price increases. This model accounts for market maturation, institutional
                    saturation, regulatory clarity, and competitive pressures that naturally reduce explosive growth potential over time.
                  </p>
                  <p className="mt-2">
                    The preview shows how your current settings would affect growth rates across multiple 4-year cycles,
                    demonstrating the economic principle that mature markets tend to have more stable, predictable growth patterns.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
