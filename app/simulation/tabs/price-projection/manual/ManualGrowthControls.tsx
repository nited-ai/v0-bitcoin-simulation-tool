'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { NumberInput } from "../../../../../shared/ui/forms/NumberInput"
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Settings,
  Zap,
  Target
} from 'lucide-react'

interface ManualGrowthControlsProps {
  growthRates: number[]
  onGrowthRatesChange: (rates: number[]) => void
  simulationYears: number
  className?: string
}

const PRESETS = {
  conservative: {
    name: 'Conservative',
    icon: TrendingDown,
    rates: [15, -10, -5, 25, 30, -15, -5, 20, 25, -10, -5, 15],
    description: 'Steady, realistic growth with moderate volatility'
  },
  moderate: {
    name: 'Moderate', 
    icon: Activity,
    rates: [50, -30, -10, 80, 100, -40, -15, 60, 80, -35, -10, 40],
    description: 'Balanced growth with typical Bitcoin cycles'
  },
  aggressive: {
    name: 'Aggressive',
    icon: TrendingUp,
    rates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
    description: 'High growth potential with significant volatility'
  },
  moonshot: {
    name: 'Moonshot',
    icon: Zap,
    rates: [300, -70, -30, 400, 500, -80, -40, 350, 450, -75, -35, 250],
    description: 'Extreme bull case scenario'
  }
}

export function ManualGrowthControls({
  growthRates,
  onGrowthRatesChange,
  simulationYears,
  className
}: ManualGrowthControlsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('aggressive')
  const [editMode, setEditMode] = useState<'sliders' | 'inputs'>('sliders')

  // Ensure growth rates array matches simulation years
  const adjustedGrowthRates = [...growthRates]
  while (adjustedGrowthRates.length < simulationYears) {
    // Add default growth rates if array is too short
    adjustedGrowthRates.push(50) // Default 50% growth for new years
  }
  if (adjustedGrowthRates.length > simulationYears) {
    // Trim array if too long
    adjustedGrowthRates.splice(simulationYears)
  }

  // Update parent if array was adjusted
  if (adjustedGrowthRates.length !== growthRates.length) {
    onGrowthRatesChange(adjustedGrowthRates)
  }

  // Calculate projection statistics
  const totalGrowth = adjustedGrowthRates.reduce((acc, rate) => acc * (1 + rate / 100), 1) - 1
  const avgGrowth = adjustedGrowthRates.reduce((acc, rate) => acc + rate, 0) / adjustedGrowthRates.length
  const maxGrowth = Math.max(...adjustedGrowthRates)
  const minGrowth = Math.min(...adjustedGrowthRates)

  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS]
    if (preset) {
      // Adjust preset rates to match simulation years
      const adjustedRates = [...preset.rates]
      while (adjustedRates.length < simulationYears) {
        // Repeat the pattern if needed
        adjustedRates.push(preset.rates[adjustedRates.length % preset.rates.length])
      }
      if (adjustedRates.length > simulationYears) {
        adjustedRates.splice(simulationYears)
      }
      onGrowthRatesChange(adjustedRates)
      setSelectedPreset(presetKey)
    }
  }

  const handleSliderChange = (index: number, value: number[]) => {
    const newRates = [...adjustedGrowthRates]
    newRates[index] = value[0]
    onGrowthRatesChange(newRates)
    setSelectedPreset('custom')
  }

  const handleInputChange = (index: number, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= -100 && numValue <= 500) {
      const newRates = [...adjustedGrowthRates]
      newRates[index] = numValue
      onGrowthRatesChange(newRates)
      setSelectedPreset('custom')
    }
  }

  const handleReset = () => {
    handlePresetSelect('aggressive')
  }

  const getGrowthColor = (rate: number) => {
    if (rate > 100) return 'text-green-600 bg-green-50'
    if (rate > 0) return 'text-green-500 bg-green-50'
    if (rate > -20) return 'text-orange-500 bg-orange-50'
    return 'text-red-500 bg-red-50'
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Manual Growth Rate Controls
              </CardTitle>
              <CardDescription>
                Customize annual Bitcoin price growth rates for your projection
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup 
                type="single" 
                value={editMode} 
                onValueChange={(value) => value && setEditMode(value as 'sliders' | 'inputs')}
                size="sm"
              >
                <ToggleGroupItem value="sliders" aria-label="Slider mode">
                  <Activity className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="inputs" aria-label="Input mode">
                  <Settings className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preset Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const Icon = preset.icon
                return (
                  <Button
                    key={key}
                    variant={selectedPreset === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(key)}
                    className="flex items-center gap-2 h-auto p-3"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{preset.name}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
            {selectedPreset !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                {PRESETS[selectedPreset as keyof typeof PRESETS]?.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(totalGrowth * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Total Growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {avgGrowth.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Annual</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {maxGrowth}%
              </div>
              <div className="text-xs text-muted-foreground">Peak Growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {minGrowth}%
              </div>
              <div className="text-xs text-muted-foreground">Max Decline</div>
            </div>
          </div>

          <Separator />

          {/* Growth Rate Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Annual Growth Rates ({simulationYears} Years)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adjustedGrowthRates.map((rate, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Year {index + 1}</Label>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getGrowthColor(rate)}`}
                    >
                      {rate > 0 ? '+' : ''}{rate}%
                    </Badge>
                  </div>
                  
                  {editMode === 'sliders' ? (
                    <Slider
                      value={[rate]}
                      onValueChange={(value) => handleSliderChange(index, value)}
                      min={-100}
                      max={500}
                      step={5}
                      className="w-full"
                    />
                  ) : (
                    <NumberInput
                      value={rate}
                      onChange={(value) => handleSliderChange(index, [value])}
                      min={-100}
                      max={500}
                      step={0.5}
                      decimals={1}
                      suffix="%"
                      className="w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Controls */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Options
                </span>
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground">
                <p>• Drag projection points directly on the chart for visual adjustments</p>
                <p>• Growth rates are applied annually starting from current Bitcoin price</p>
                <p>• Negative values represent price corrections or bear markets</p>
                <p>• Values above 200% represent extreme bull market scenarios</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}
