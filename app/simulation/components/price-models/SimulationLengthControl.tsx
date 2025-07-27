'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Target, RotateCcw } from 'lucide-react'
import { useSimulation } from '../../context/SimulationContext'

interface SimulationLengthControlProps {
  className?: string
}

const PRESET_LENGTHS = [
  { years: 5, label: '5 Years', description: 'Short-term projection' },
  { years: 10, label: '10 Years', description: 'Medium-term outlook' },
  { years: 12, label: '12 Years', description: 'Default simulation' },
  { years: 15, label: '15 Years', description: 'Long-term planning' },
  { years: 20, label: '20 Years', description: 'Extended forecast' },
]

export function SimulationLengthControl({ className }: SimulationLengthControlProps) {
  const { params, setParams } = useSimulation()

  // Convert months to years for display and input
  const simulationYears = Math.round(params.simulationMonths / 12)

  const handleYearsChange = (years: number) => {
    const months = years * 12
    setParams(prev => ({ ...prev, simulationMonths: months }))
  }

  const handleSliderChange = (value: number[]) => {
    handleYearsChange(value[0])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value >= 1 && value <= 50) {
      handleYearsChange(value)
    }
  }

  const handlePresetSelect = (years: number) => {
    handleYearsChange(years)
  }

  const handleReset = () => {
    handleYearsChange(12) // Default 12 years
  }

  // Calculate derived values
  const endYear = new Date().getFullYear() + simulationYears
  const isCustomLength = !PRESET_LENGTHS.some(preset => preset.years === simulationYears)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Simulation Length
        </CardTitle>
        <CardDescription>
          Set the projection timeline for your Bitcoin price model
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Settings Display */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {simulationYears}
            </div>
            <div className="text-sm text-muted-foreground">Years</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {params.simulationMonths}
            </div>
            <div className="text-sm text-muted-foreground">Months</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {endYear}
            </div>
            <div className="text-sm text-muted-foreground">End Year</div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Quick Presets</Label>
            {isCustomLength && (
              <Badge variant="outline" className="text-xs">
                Custom Length
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {PRESET_LENGTHS.map((preset) => (
              <Button
                key={preset.years}
                variant={simulationYears === preset.years ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetSelect(preset.years)}
                className="flex flex-col items-center h-auto p-3"
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs text-muted-foreground">
                  {preset.description}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Slider Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Custom Length</Label>
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
          
          <div className="space-y-4">
            <Slider
              value={[simulationYears]}
              onValueChange={handleSliderChange}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="years-input" className="text-sm">
                  Years:
                </Label>
              </div>
              <Input
                id="years-input"
                type="number"
                value={simulationYears}
                onChange={handleInputChange}
                min={1}
                max={50}
                step={1}
                className="w-24"
              />
              <div className="text-sm text-muted-foreground">
                (1-50 years)
              </div>
            </div>
          </div>
        </div>

        {/* Impact Information */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <Target className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Impact on Growth Rate Model</h4>
              <p className="text-sm text-amber-700 mt-1">
                The Manual Growth Rate model will automatically provide{' '}
                <strong>{simulationYears} annual growth rate sliders</strong>{' '}
                to cover the entire {simulationYears}-year projection period.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timeline Preview</Label>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Start:</span> {new Date().getFullYear()}
            </div>
            <div className="text-sm text-muted-foreground">
              {simulationYears} years projection
            </div>
            <div className="text-sm">
              <span className="font-medium">End:</span> {endYear}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
