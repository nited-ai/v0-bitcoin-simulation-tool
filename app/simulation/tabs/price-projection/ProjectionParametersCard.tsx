'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { AlertCircle, Loader2, Settings, Calendar } from 'lucide-react'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { useSimulation } from '../../context/SimulationContext'

interface ModelInfo {
  id: string
  name: string
  description: string
}

interface ProjectionParametersCardProps {
  className?: string
}

export function ProjectionParametersCard({ className }: ProjectionParametersCardProps) {
  const { t } = useTranslation()
  const { params, setParams } = useSimulation()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load available models from registry
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get models from registry
        const availableModels = priceModelRegistry.getModelNames()
        setModels(availableModels)
        console.log(`✅ Loaded ${availableModels.length} price models:`, availableModels.map(m => m.name))


      } catch (err) {
        console.error('❌ Error loading price models:', err)
        setError('Error loading models')
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [])

  const handleModelChange = (modelId: string) => {
    console.log(`🔄 Price model changed to: ${modelId}`)
    setParams((prev) => ({ ...prev, priceModel: modelId as any }))
  }

  const renderSelectContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">{t('PriceModelSelector.loadingModels', 'Loading models...')}</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-4">
          <AlertCircle className="h-4 w-4 text-destructive mr-2" />
          <span className="text-sm text-destructive">{t('PriceModelSelector.errorLoadingModels', 'Error loading models')}</span>
        </div>
      )
    }

    if (models.length === 0) {
      return (
        <div className="flex items-center justify-center p-4">
          <span className="text-sm text-muted-foreground">{t('PriceModelSelector.noModelsAvailable', 'No models available')}</span>
        </div>
      )
    }

    return [
      ...models.map((model) => (
        <SelectItem key={model.id} value={model.id}>
          <div className="flex flex-col text-left">
            <span className="font-medium">{model.name}</span>
            <span className="text-sm text-muted-foreground">{model.description}</span>
          </div>
        </SelectItem>
      )),
      // Custom Model option (disabled with Coming Soon badge)
      <SelectItem key="custom" value="custom" disabled className="cursor-not-allowed opacity-60">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col text-left">
            <span className="font-medium">{t('PriceModelSelector.customModel', 'Custom Model')}</span>
            <span className="text-sm text-muted-foreground">{t('PriceModelSelector.customModelDescription', 'Create your own price projection model')}</span>
          </div>
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200 ml-2">
            {t('PriceModelSelector.comingSoon', 'Coming Soon')}
          </Badge>
        </div>
      </SelectItem>
    ]
  }

  // Get the currently selected model for display
  const selectedModel = models.find(model => model.id === params.priceModel)

  // Convert months to years for display and input
  const simulationYears = Math.round(params.simulationMonths / 12)

  const handleYearsChange = (years: number[]) => {
    const months = years[0] * 12
    setParams(prev => ({ ...prev, simulationMonths: months }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        {/* Header Section - Responsive layout: stacked on mobile, horizontal on desktop */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
          {/* Title and Description */}
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t('PriceModelSelector.title', 'Select Model and Simulation Length')}
            </CardTitle>
            <CardDescription className="mt-2">
              {t('PriceModelSelector.description', 'Select and configure Bitcoin price projection models and simulation timeline')}
            </CardDescription>
          </div>

          {/* Right side: Price Model Selection */}
          <div className="flex-shrink-0 space-y-2">
            <Label className="text-base font-medium">{t('PriceModelSelector.priceProjectionModel', 'Price Projection Model')}</Label>
            <Select
              value={params.priceModel || ''}
              onValueChange={handleModelChange}
              disabled={loading || error !== null || models.length === 0}
            >
              <SelectTrigger className="w-full border-primary border-2 focus:ring-primary">
                <SelectValue placeholder={t('PriceModelSelector.choosePriceModel', 'Choose price prediction model')}>
                  {selectedModel && (
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{selectedModel.name}</span>
                      <span className="text-sm text-muted-foreground">{selectedModel.description}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {renderSelectContent()}
              </SelectContent>
            </Select>

            {error && (
              <div className="mt-2 flex items-center text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}

            {!loading && !error && models.length === 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                {t('PriceModelSelector.noModelsRegistry', 'No price models are currently available. Please check the model registry.')}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Full-width Simulation Length Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('PriceModelSelector.simulationLength', 'Simulation Length: {{years}} Years', { years: simulationYears })}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t('PriceModelSelector.simulationDetails', '{{months}} months • End: {{endYear}}', {
                months: params.simulationMonths,
                endYear: new Date().getFullYear() + simulationYears
              })}
            </div>
          </div>

          <Slider
            value={[simulationYears]}
            onValueChange={handleYearsChange}
            min={1}
            max={25}
            step={1}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}
