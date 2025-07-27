// app/strategies/ath-based/components/AthBasedSettings.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { PercentageInput } from "@/shared/ui/forms/PercentageInput"
import { useAthBasedStrategy } from "../hooks/useAthBasedStrategy"
import { useAthBasedValidation } from "../hooks/useAthBasedValidation"
import { AthBasedDocumentation } from "./AthBasedDocumentation"
import type { AthBasedStrategyParams } from "../types/athBased"

interface AthBasedSettingsProps {
  params: AthBasedStrategyParams
  onChange: (params: AthBasedStrategyParams) => void
  disabled?: boolean
}

/**
 * ATH-Based Strategy Settings Component
 * 
 * This component is completely isolated and only handles ATH-based strategy
 * configuration. It can be developed, tested, and maintained independently
 * of other strategies.
 */
export function AthBasedSettings({ params, onChange, disabled }: AthBasedSettingsProps) {
  const { updateParams, isValidConfiguration } = useAthBasedStrategy(params, onChange)
  const { errors, warnings } = useAthBasedValidation(params)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📈 ATH-Based Strategy Settings
        </CardTitle>
        <CardDescription>
          Configure parameters for the All-Time High based investment strategy
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ATH Threshold */}
        <div>
          <Label htmlFor="ath-threshold">
            ATH Threshold Percentage
          </Label>
          <PercentageInput
            id="ath-threshold"
            value={params.athThresholdPercent}
            onChange={(value) => updateParams({ athThresholdPercent: value })}
            min={50}
            max={100}
            step={5}
            disabled={disabled}
            error={errors.athThresholdPercent}
            warning={warnings.athThresholdPercent}
          />
        </div>

        {/* Investment Multiplier */}
        <div>
          <Label htmlFor="investment-multiplier">
            Investment Multiplier
          </Label>
          <NumberInput
            id="investment-multiplier"
            value={params.investmentMultiplier}
            onChange={(value) => updateParams({ investmentMultiplier: value })}
            min={1.0}
            max={10.0}
            step={0.1}
            disabled={disabled}
            error={errors.investmentMultiplier}
            warning={warnings.investmentMultiplier}
          />
        </div>

        {/* Strategy Documentation */}
        <AthBasedDocumentation 
          params={params}
          isValid={isValidConfiguration}
        />
      </CardContent>
    </Card>
  )
}

// Total: ~80 lines - focused and maintainable! ✨
