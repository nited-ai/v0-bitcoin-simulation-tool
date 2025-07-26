'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Settings } from 'lucide-react'
import { priceModelRegistry } from '../../price-models/PriceModelRegistry'
import { useSimulation } from '../../context/SimulationContext'

interface ModelInfo {
  id: string
  name: string
  description: string
}

interface PriceModelSelectorProps {
  className?: string
}

export function PriceModelSelector({ className }: PriceModelSelectorProps) {
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
        
        console.log('📋 Loaded price models:', availableModels.map(m => m.id))
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
    console.log('🔄 Price model changed to:', modelId)
    setParams((prev) => ({ ...prev, priceModel: modelId as any }))
  }

  const renderSelectContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading models...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-4">
          <AlertCircle className="h-4 w-4 text-destructive mr-2" />
          <span className="text-sm text-destructive">Error loading models</span>
        </div>
      )
    }

    if (models.length === 0) {
      return (
        <div className="flex items-center justify-center p-4">
          <span className="text-sm text-muted-foreground">No models available</span>
        </div>
      )
    }

    return models.map((model) => (
      <SelectItem key={model.id} value={model.id}>
        <div className="flex flex-col text-left">
          <span className="font-medium">{model.name}</span>
          <span className="text-sm text-muted-foreground">{model.description}</span>
        </div>
      </SelectItem>
    ))
  }

  // Get the currently selected model for display
  const selectedModel = models.find(model => model.id === params.priceModel)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-6">
          <div className="w-1/2">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Select Price Projection Model
            </CardTitle>
            <CardDescription className="mt-2">
              Select and configure Bitcoin price projection models
            </CardDescription>
          </div>

          <div className="w-1/2">
            <Select
              value={params.priceModel || ''}
              onValueChange={handleModelChange}
              disabled={loading || error !== null || models.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose price prediction model">
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
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}

            {!loading && !error && models.length === 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                No price models are currently available. Please check the model registry.
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
