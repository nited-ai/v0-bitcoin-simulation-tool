'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'

interface CustomGrowthRateSlidersProps {
  className?: string
}

// SessionStorage keys
const STORAGE_KEYS = {
  selectedPreset: 'bitcoin-sim-selected-preset',
  customRates: 'bitcoin-sim-custom-rates'
}

export function CustomGrowthRateSliders({ className }: CustomGrowthRateSlidersProps) {
  const { params, setParams } = useSimulation()
  const [tempCustomRates, setTempCustomRates] = useState<number[]>([])
  const [showCustomControls, setShowCustomControls] = useState(false)
  
  // Convert months to years for display
  const simulationYears = Math.round(params.simulationMonths / 12)
  
  // Check preset selection and load custom rates
  const checkPresetSelection = () => {
    const savedPreset = sessionStorage.getItem(STORAGE_KEYS.selectedPreset)
    const savedCustomRates = sessionStorage.getItem(STORAGE_KEYS.customRates)

    if (savedPreset === 'custom') {
      setShowCustomControls(true)
      if (savedCustomRates) {
        const rates = JSON.parse(savedCustomRates)
        setTempCustomRates(rates)
      } else {
        // Initialize with default optimistic rates
        const defaultRates = [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110]
        const adjustedRates = [...defaultRates]
        while (adjustedRates.length < simulationYears) {
          adjustedRates.push(defaultRates[adjustedRates.length % defaultRates.length])
        }
        if (adjustedRates.length > simulationYears) {
          adjustedRates.splice(simulationYears)
        }
        setTempCustomRates(adjustedRates)
      }
    } else {
      setShowCustomControls(false)
    }
  }

  // Load from sessionStorage and check if custom preset is selected
  useEffect(() => {
    checkPresetSelection()
  }, [simulationYears])

  // Listen for storage changes to update visibility
  useEffect(() => {
    const handleStorageChange = () => {
      checkPresetSelection()
    }

    // Check every 100ms for changes (since sessionStorage doesn't trigger events on same tab)
    const interval = setInterval(handleStorageChange, 100)

    return () => clearInterval(interval)
  }, [simulationYears])

  // Handle custom rate slider changes (only visual feedback)
  const handleTempCustomRateChange = (index: number, values: number[]) => {
    const newTempRates = [...tempCustomRates]
    newTempRates[index] = values[0]
    setTempCustomRates(newTempRates)

    // Save to sessionStorage immediately for persistence
    sessionStorage.setItem(STORAGE_KEYS.customRates, JSON.stringify(newTempRates))
  }

  // Apply custom rates to actual state and chart
  const applyCustomRates = () => {
    sessionStorage.setItem(STORAGE_KEYS.customRates, JSON.stringify(tempCustomRates))
    setParams(prev => ({ ...prev, annualGrowthRates: tempCustomRates }))
  }

  // Get dynamic year labels based on current date
  const getYearLabel = (index: number) => {
    const currentYear = new Date().getFullYear()
    return (currentYear + 1 + index).toString() // Start from next year
  }

  // Get color for percentage value with consistent styling
  const getValueColor = (rate: number) => {
    if (rate >= 0) {
      return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    } else {
      return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    }
  }

  if (!showCustomControls) {
    return null
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Custom Growth Rates ({simulationYears} Years)
            </CardTitle>
            <Button
              onClick={applyCustomRates}
              className="bg-primary hover:bg-primary/90"
              size="sm"
            >
              Apply Changes
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vertical sliders in a horizontal row */}
          <div className="flex justify-center items-end gap-4 p-4 overflow-x-auto border border-border rounded-md bg-muted/30">
            {tempCustomRates.map((rate, index) => (
              <div key={index} className="flex flex-col items-center space-y-3 min-w-[60px]">
                {/* Value display with dynamic coloring */}
                <div className={`text-sm font-semibold text-center min-h-[20px] px-2 py-1 rounded-md border ${getValueColor(rate)}`}>
                  {rate > 0 ? '+' : ''}{rate}%
                </div>

                {/* Simplified vertical slider */}
                <div className="h-40 flex items-center relative">
                  <Slider
                    value={[rate]}
                    onValueChange={(values) => handleTempCustomRateChange(index, values)}
                    min={-100}
                    max={300}
                    step={5}
                    orientation="vertical"
                    className="h-full slider-orange"
                  />

                  {/* Zero line indicator */}
                  <div
                    className="absolute w-6 h-0.5 bg-muted-foreground -left-1 pointer-events-none z-10"
                    style={{
                      top: `${((0 - (-100)) / (300 - (-100))) * 100}%`,
                      transform: 'translateY(-50%)'
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

          {/* Custom CSS for orange sliders */}
          <style jsx>{`
            .slider-orange [data-orientation="vertical"] {
              background-color: #fed7aa;
              width: 4px;
              border-radius: 2px;
            }
            .slider-orange [role="slider"] {
              background-color: #ea580c;
              border: 2px solid white;
              width: 20px;
              height: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .slider-orange [role="slider"]:hover {
              background-color: #dc2626;
            }
          `}</style>
        </CardContent>
      </Card>
    </div>
  )
}
