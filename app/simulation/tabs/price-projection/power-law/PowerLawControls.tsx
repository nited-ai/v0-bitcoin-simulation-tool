"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RotateCcw, Info, Settings2, Sliders, Zap, Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSimulation } from '../../../context/SimulationContext'

// Default Power Law parameters (industry standard + calibrated)
const DEFAULT_PARAMS = {
  fit: { slope: 5.844, intercept: -17.01 },
  support: { slope: 5.844, intercept: -17.46 },
  resistance: { slope: 5.06, intercept: -13.5 }
}

// Slider ranges
const SLOPE_RANGE = { min: 5.0, max: 6.0, step: 0.01 }
const INTERCEPT_RANGE = { min: -19.0, max: -13.0, step: 0.01 }

// Volatility parameter ranges and defaults
const VOLATILITY_DEFAULTS = {
  enabled: false,
  patternLengthMonths: 96,  // 8 years (matches original implementation)
  diminishingFactor: 1.0    // No diminishing by default
}

const PATTERN_LENGTH_RANGE = { min: 24, max: 120, step: 1 }  // 2-10 years
const DIMINISHING_FACTOR_RANGE = { min: 0.5, max: 1.0, step: 0.01 }

interface PowerLawControlsProps {
  className?: string
}

export function PowerLawControls({ className }: PowerLawControlsProps) {
  const { params, setParams } = useSimulation()
  
  // Initialize default values if not set
  useEffect(() => {
    if (params.priceModel === 'powerLaw' && params.powerLawSettings) {
      const settings = params.powerLawSettings

      // Initialize missing properties with defaults
      if (!settings.controlMode || !settings.unifiedSlope || !settings.individualParams || !settings.cycleRepeatVolatility) {
        setParams(prev => ({
          ...prev,
          powerLawSettings: {
            ...settings,
            controlMode: settings.controlMode || 'unified',
            unifiedSlope: settings.unifiedSlope || DEFAULT_PARAMS.fit.slope,
            unifiedIntercept: settings.unifiedIntercept || DEFAULT_PARAMS.fit.intercept,
            individualParams: settings.individualParams || DEFAULT_PARAMS,
            // Initialize volatility settings with defaults
            cycleRepeatVolatility: settings.cycleRepeatVolatility || VOLATILITY_DEFAULTS
          }
        }))
      }
    }
  }, [params.priceModel, params.powerLawSettings, setParams])

  // Don't render if not Power Law model
  if (params.priceModel !== 'powerLaw' || !params.powerLawSettings) {
    return null
  }

  const settings = params.powerLawSettings
  const isUnified = settings.controlMode === 'unified'

  const handleControlModeChange = (unified: boolean) => {
    const newMode = unified ? 'unified' : 'individual'
    
    setParams(prev => ({
      ...prev,
      powerLawSettings: {
        ...prev.powerLawSettings!,
        controlMode: newMode
      }
    }))
  }

  const handleUnifiedSlopeChange = (value: number[]) => {
    setParams(prev => ({
      ...prev,
      powerLawSettings: {
        ...prev.powerLawSettings!,
        unifiedSlope: value[0]
      }
    }))
  }

  const handleUnifiedInterceptChange = (value: number[]) => {
    setParams(prev => ({
      ...prev,
      powerLawSettings: {
        ...prev.powerLawSettings!,
        unifiedIntercept: value[0]
      }
    }))
  }

  const handleIndividualParamChange = (
    line: 'fit' | 'support' | 'resistance',
    param: 'slope' | 'intercept',
    value: number[]
  ) => {
    setParams(prev => ({
      ...prev,
      powerLawSettings: {
        ...prev.powerLawSettings!,
        individualParams: {
          ...prev.powerLawSettings!.individualParams!,
          [line]: {
            ...prev.powerLawSettings!.individualParams![line],
            [param]: value[0]
          }
        }
      }
    }))
  }

  const resetToDefaults = () => {
    setParams(prev => ({
      ...prev,
      powerLawSettings: {
        ...prev.powerLawSettings!,
        controlMode: 'unified',
        unifiedSlope: DEFAULT_PARAMS.fit.slope,
        unifiedIntercept: DEFAULT_PARAMS.fit.intercept,
        individualParams: DEFAULT_PARAMS
      }
    }))
  }

  // Volatility handling functions
  const handleVolatilityToggle = (enabled: boolean) => {
    console.log('🎛️ [PowerLawControls] Volatility checkbox toggled:', enabled)
    setParams(prev => {
      const newSettings = {
        ...prev,
        powerLawSettings: {
          ...prev.powerLawSettings!,
          cycleRepeatVolatility: {
            enabled,
            patternLengthMonths: prev.powerLawSettings?.cycleRepeatVolatility?.patternLengthMonths || VOLATILITY_DEFAULTS.patternLengthMonths,
            diminishingFactor: prev.powerLawSettings?.cycleRepeatVolatility?.diminishingFactor || VOLATILITY_DEFAULTS.diminishingFactor
          }
        }
      }
      console.log('🎛️ [PowerLawControls] Saving volatility settings:', newSettings.powerLawSettings.cycleRepeatVolatility)
      return newSettings
    })
  }

  const handleVolatilityParamChange = (param: 'patternLengthMonths' | 'diminishingFactor', value: number[]) => {
    console.log(`🎛️ [PowerLawControls] ${param} changed to:`, value[0])
    setParams(prev => {
      const newSettings = {
        ...prev,
        powerLawSettings: {
          ...prev.powerLawSettings!,
          cycleRepeatVolatility: {
            ...prev.powerLawSettings?.cycleRepeatVolatility!,
            [param]: value[0]
          }
        }
      }
      console.log('🎛️ [PowerLawControls] Updated volatility settings:', newSettings.powerLawSettings.cycleRepeatVolatility)
      return newSettings
    })
  }

  // Apply to Price Projection functionality
  const applyToPriceProjection = () => {
    console.log('🔘 [PowerLawControls] Apply to Price Projection button clicked')
    const settings = params.powerLawSettings!
    const fitParams = settings.controlMode === 'unified'
      ? { slope: settings.unifiedSlope!, intercept: settings.unifiedIntercept! }
      : settings.individualParams!.fit

    console.log('🔘 [PowerLawControls] Current Fit line params:', fitParams)
    console.log('🔘 [PowerLawControls] Current priceProjectionParams:', settings.priceProjectionParams)

    setParams(prev => {
      const newSettings = {
        ...prev,
        powerLawSettings: {
          ...prev.powerLawSettings!,
          priceProjectionParams: {
            slope: fitParams.slope,
            intercept: fitParams.intercept
          }
        }
      }
      console.log('🔘 [PowerLawControls] New priceProjectionParams:', newSettings.powerLawSettings.priceProjectionParams)
      return newSettings
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Power Law Parameters</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <CardDescription>
          Adjust slope and intercept parameters for Power Law lines. Changes update the chart in real-time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Apply to Price Projection Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={applyToPriceProjection}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Apply to Price Projection
          </Button>
        </div>

        <Separator />

        {/* Control Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="control-mode">Control Mode</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    <strong>Unified:</strong> Single controls adjust all lines together<br/>
                    <strong>Individual:</strong> Separate controls for each line
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={!isUnified ? "default" : "outline"}
              size="sm"
              onClick={() => handleControlModeChange(false)}
              className="text-xs"
            >
              Individual
            </Button>
            <Button
              variant={isUnified ? "default" : "outline"}
              size="sm"
              onClick={() => handleControlModeChange(true)}
              className="text-xs"
            >
              Unified
            </Button>
          </div>
        </div>

        <Separator />

        {/* Unified Controls */}
        {isUnified && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Unified Controls</h4>
            </div>
            
            {/* Unified Slope */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Slope</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {settings.unifiedSlope?.toFixed(3) || DEFAULT_PARAMS.fit.slope.toFixed(3)}
                </span>
              </div>
              <Slider
                value={[settings.unifiedSlope || DEFAULT_PARAMS.fit.slope]}
                onValueChange={handleUnifiedSlopeChange}
                min={SLOPE_RANGE.min}
                max={SLOPE_RANGE.max}
                step={SLOPE_RANGE.step}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{SLOPE_RANGE.min}</span>
                <span>{SLOPE_RANGE.max}</span>
              </div>
            </div>

            {/* Unified Intercept */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Intercept</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {settings.unifiedIntercept?.toFixed(3) || DEFAULT_PARAMS.fit.intercept.toFixed(3)}
                </span>
              </div>
              <Slider
                value={[settings.unifiedIntercept || DEFAULT_PARAMS.fit.intercept]}
                onValueChange={handleUnifiedInterceptChange}
                min={INTERCEPT_RANGE.min}
                max={INTERCEPT_RANGE.max}
                step={INTERCEPT_RANGE.step}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{INTERCEPT_RANGE.min}</span>
                <span>{INTERCEPT_RANGE.max}</span>
              </div>
            </div>
          </div>
        )}

        {/* Individual Controls */}
        {!isUnified && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Individual Controls</h4>
            </div>

            {/* PL Fit Controls */}
            <div className="space-y-3">
              <h5 className="font-medium text-blue-600 flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
                PL Fit
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Slope</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.fit.slope?.toFixed(3) || DEFAULT_PARAMS.fit.slope.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.fit.slope || DEFAULT_PARAMS.fit.slope]}
                    onValueChange={(value) => handleIndividualParamChange('fit', 'slope', value)}
                    min={SLOPE_RANGE.min}
                    max={SLOPE_RANGE.max}
                    step={SLOPE_RANGE.step}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Intercept</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.fit.intercept?.toFixed(3) || DEFAULT_PARAMS.fit.intercept.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.fit.intercept || DEFAULT_PARAMS.fit.intercept]}
                    onValueChange={(value) => handleIndividualParamChange('fit', 'intercept', value)}
                    min={INTERCEPT_RANGE.min}
                    max={INTERCEPT_RANGE.max}
                    step={INTERCEPT_RANGE.step}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* PL Support Controls */}
            <div className="space-y-3">
              <h5 className="font-medium text-green-600 flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
                PL Support
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Slope</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.support.slope?.toFixed(3) || DEFAULT_PARAMS.support.slope.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.support.slope || DEFAULT_PARAMS.support.slope]}
                    onValueChange={(value) => handleIndividualParamChange('support', 'slope', value)}
                    min={SLOPE_RANGE.min}
                    max={SLOPE_RANGE.max}
                    step={SLOPE_RANGE.step}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Intercept</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.support.intercept?.toFixed(3) || DEFAULT_PARAMS.support.intercept.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.support.intercept || DEFAULT_PARAMS.support.intercept]}
                    onValueChange={(value) => handleIndividualParamChange('support', 'intercept', value)}
                    min={INTERCEPT_RANGE.min}
                    max={INTERCEPT_RANGE.max}
                    step={INTERCEPT_RANGE.step}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* PL Resistance Controls */}
            <div className="space-y-3">
              <h5 className="font-medium text-red-600 flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
                PL Resistance
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Slope</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.resistance.slope?.toFixed(3) || DEFAULT_PARAMS.resistance.slope.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.resistance.slope || DEFAULT_PARAMS.resistance.slope]}
                    onValueChange={(value) => handleIndividualParamChange('resistance', 'slope', value)}
                    min={SLOPE_RANGE.min}
                    max={SLOPE_RANGE.max}
                    step={SLOPE_RANGE.step}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Intercept</Label>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {settings.individualParams?.resistance.intercept?.toFixed(3) || DEFAULT_PARAMS.resistance.intercept.toFixed(3)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.individualParams?.resistance.intercept || DEFAULT_PARAMS.resistance.intercept]}
                    onValueChange={(value) => handleIndividualParamChange('resistance', 'intercept', value)}
                    min={INTERCEPT_RANGE.min}
                    max={INTERCEPT_RANGE.max}
                    step={INTERCEPT_RANGE.step}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cycle Repeat Volatility Section */}
        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <Label className="text-base font-medium">Cycle Repeat Volatility</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Applies historical Bitcoin price volatility patterns to the <strong>price projection line only</strong>.
                      Power Law regression lines (Support/Fit/Resistance) remain pure mathematical curves.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Checkbox
              checked={settings.cycleRepeatVolatility?.enabled || false}
              onCheckedChange={handleVolatilityToggle}
            />
          </div>



          {/* Volatility Controls */}
          {settings.cycleRepeatVolatility?.enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-amber-200">
              {/* Pattern Length Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Pattern Length</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Number of months of historical data to use for volatility pattern (24-120 months)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {settings.cycleRepeatVolatility.patternLengthMonths} months
                  </span>
                </div>
                <Slider
                  value={[settings.cycleRepeatVolatility.patternLengthMonths]}
                  onValueChange={(value) => handleVolatilityParamChange('patternLengthMonths', value)}
                  min={PATTERN_LENGTH_RANGE.min}
                  max={PATTERN_LENGTH_RANGE.max}
                  step={PATTERN_LENGTH_RANGE.step}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2 years</span>
                  <span>10 years</span>
                </div>
              </div>

              {/* Diminishing Factor Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Diminishing Factor</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Reduces volatility impact over time. 1.0 = no reduction, 0.5 = strong reduction</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {settings.cycleRepeatVolatility.diminishingFactor.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[settings.cycleRepeatVolatility.diminishingFactor]}
                  onValueChange={(value) => handleVolatilityParamChange('diminishingFactor', value)}
                  min={DIMINISHING_FACTOR_RANGE.min}
                  max={DIMINISHING_FACTOR_RANGE.max}
                  step={DIMINISHING_FACTOR_RANGE.step}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Strong reduction</span>
                  <span>No reduction</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
