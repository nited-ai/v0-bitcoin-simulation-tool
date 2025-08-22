"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { Fish, Zap, Info, Settings, ExternalLink, Edit, Save, X, ChevronDown, Plus, Trash2, Building2 } from "lucide-react"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSimulation } from "../../context/SimulationContext"
import type { Platform } from "../../types/simulation"
import { getPlatformConfig, saveCustomPlatformConfig } from "../../constants/platformPresets"

interface PlatformOption {
  id: Platform | "custom" | string
  name: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeClassName: string
  features: string[]
  disabled?: boolean
  url?: string
  isCustom?: boolean
  createdAt?: number
}

interface SerializablePlatformOption {
  id: Platform | "custom" | string
  name: string
  description: string
  iconType: string // Store icon type as string instead of React element
  badge: string
  badgeClassName: string
  features: string[]
  disabled?: boolean
  url?: string
  isCustom?: boolean
  createdAt?: number
}

/**
 * Platform Selector Component
 * 
 * Allows users to select between different lending platforms (Firefish, Strike)
 * with card-based UI similar to Risk Level Selector. This is designed as a 
 * foundation for future platform plugins where each platform will have 
 * specific loan rules and terms.
 */
export function PlatformSelector() {
  const { t } = useTranslation()
  const { params, applyPlatformConfig, updatePlatformConfig } = useSimulation()
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    name?: string
    originationFeePercent?: number
    liquidationLtv?: number
    liquidationFeePercent?: number
    maxInitialLtv?: number
    availableLoanTerms?: (number | 'infinity')[]
  }>({})

  const [loanTermsInput, setLoanTermsInput] = useState<string>('')
  const [customPlatforms, setCustomPlatforms] = useState<PlatformOption[]>([])
  const [customPlatformName, setCustomPlatformName] = useState<string>('')
  const [customPlatformDescription, setCustomPlatformDescription] = useState<string>('')

  // Helper function to get icon component by type
  const getIconComponent = (iconType: string): React.ReactNode => {
    switch (iconType) {
      case 'settings':
        return <Settings className="w-5 h-5" />
      case 'fish':
        return <Fish className="w-5 h-5" />
      case 'zap':
        return <Zap className="w-5 h-5" />
      case 'plus':
        return <Plus className="w-5 h-5" />
      default:
        return <Settings className="w-5 h-5" />
    }
  }

  // Convert PlatformOption to SerializablePlatformOption for storage
  const toSerializable = (platform: PlatformOption): SerializablePlatformOption => {
    return {
      ...platform,
      iconType: 'settings' // Default to settings icon for custom platforms
    }
  }

  // Convert SerializablePlatformOption to PlatformOption for rendering
  const fromSerializable = (serializable: SerializablePlatformOption): PlatformOption => {
    return {
      ...serializable,
      icon: getIconComponent(serializable.iconType)
    }
  }

  // localStorage utility functions
  const saveCustomPlatforms = (platforms: PlatformOption[]) => {
    try {
      const serializable = platforms.map(toSerializable)
      localStorage.setItem('customPlatforms', JSON.stringify(serializable))
    } catch (error) {
      console.error('Failed to save custom platforms:', error)
    }
  }

  const loadCustomPlatforms = (): PlatformOption[] => {
    try {
      const saved = localStorage.getItem('customPlatforms')
      if (!saved) return []
      const serializable: SerializablePlatformOption[] = JSON.parse(saved)
      return serializable.map(fromSerializable)
    } catch (error) {
      console.error('Failed to load custom platforms:', error)
      return []
    }
  }

  // Load custom platforms on component mount
  useEffect(() => {
    setCustomPlatforms(loadCustomPlatforms())
  }, [])

  const basePlatforms: PlatformOption[] = [
    {
      id: "firefish",
      name: t('PlatformSelector.firefish.name', 'Firefish'),
      description: t('PlatformSelector.firefish.description', 'Flexible lending platform with competitive rates'),
      icon: <Fish className="w-5 h-5" />,
      badge: t('PlatformSelector.firefish.badge', 'Non Custodial'),
      badgeClassName: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      features: [],
      url: "https://firefish.io/"
    },
    {
      id: "strike",
      name: t('PlatformSelector.strike.name', 'Strike'),
      description: t('PlatformSelector.strike.description', 'Lightning-fast loans with instant approval'),
      icon: <Zap className="w-5 h-5" />,
      badge: t('PlatformSelector.strike.badge', 'Low Rates'),
      badgeClassName: "border-transparent bg-green-500 text-white hover:bg-green-600",
      features: [],
      url: "https://strike.me/lending/"
    },
    {
      id: "custom",
      name: t('PlatformSelector.custom.name', 'Custom'),
      description: t('PlatformSelector.custom.description', 'Configure your own platform parameters'),
      icon: <Plus className="w-5 h-5" />,
      badge: t('PlatformSelector.custom.badge', 'Custom'),
      badgeClassName: "border-transparent bg-purple-500 text-white hover:bg-purple-600",
      features: [],
      disabled: false
    }
  ]

  // Combine base platforms with custom platforms
  const platforms: PlatformOption[] = [
    ...basePlatforms,
    ...customPlatforms
  ]

  // Get current platform from params (default to firefish)
  const currentPlatform = params.platform || "firefish"

  // Custom platform management functions

  const deleteCustomPlatform = (platformId: string) => {
    if (confirm('Are you sure you want to delete this custom platform?')) {
      const updatedCustomPlatforms = customPlatforms.filter(p => p.id !== platformId)
      setCustomPlatforms(updatedCustomPlatforms)
      saveCustomPlatforms(updatedCustomPlatforms)

      // If the deleted platform was selected, switch to firefish
      if (currentPlatform === platformId) {
        applyPlatformConfig('firefish')
      }
    }
  }

  /**
   * Handle platform selection
   */
  const handlePlatformChange = (platform: Platform) => {
    // Apply the platform configuration which will update platform-specific parameters
    applyPlatformConfig(platform)
  }

  /**
   * Handle external link clicks
   */
  const handleExternalLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation() // Prevent card selection when clicking the link
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  /**
   * Handle platform editing
   */
  const handleEditPlatform = (e: React.MouseEvent, platformId: string) => {
    e.stopPropagation() // Prevent card selection when clicking edit
    setEditingPlatform(platformId)

    if (platformId === "custom") {
      // Initialize for custom platform creation only if not already editing
      if (editingPlatform !== "custom") {
        setCustomPlatformName('')
        setCustomPlatformDescription('')
        setEditValues({
          originationFeePercent: 1.0,
          liquidationLtv: 95,
          liquidationFeePercent: 3.0,
          maxInitialLtv: 70,
          availableLoanTerms: [6, 12, 24, 'infinity'] as (number | 'infinity')[]
        })
        setLoanTermsInput('6, 12, 24, infinity')
      }
    } else {
      // Initialize edit values with current platform config
      const currentConfig = params.platformConfigs[platformId] || {}
      setEditValues(currentConfig)

      // Initialize loan terms input for existing platforms
      const platformConfig = getPlatformConfig(platformId as Platform)
      const loanTermsString = platformConfig.availableLoanTerms.map(term =>
        term === 'infinity' ? 'infinity' : term.toString()
      ).join(', ')
      setLoanTermsInput(loanTermsString)
    }
  }

  /**
   * Handle saving platform edits
   */
  const handleSavePlatformEdit = (e: React.MouseEvent, platformId: string) => {
    e.stopPropagation()

    if (platformId === "custom") {
      // Create new custom platform
      if (!customPlatformName.trim()) {
        alert('Please enter a platform name')
        return
      }

      // Check for duplicate names
      const existingNames = [...basePlatforms, ...customPlatforms].map(p => p.name.toLowerCase())
      if (existingNames.includes(customPlatformName.toLowerCase())) {
        alert('A platform with this name already exists')
        return
      }

      const newPlatformId = `custom-${Date.now()}`

      const newPlatform: PlatformOption = {
        id: newPlatformId,
        name: customPlatformName,
        description: customPlatformDescription || `Custom platform: ${customPlatformName}`,
        icon: getIconComponent('settings'),
        badge: "Custom",
        badgeClassName: "border-transparent bg-purple-500 text-white hover:bg-purple-600",
        features: [],
        isCustom: true,
        createdAt: Date.now()
      }

      // Create platform configuration
      const newConfig = {
        id: newPlatformId,
        name: customPlatformName,
        description: customPlatformDescription || `Custom platform: ${customPlatformName}`,
        originationFeePercent: editValues.originationFeePercent || 1.0,
        liquidationLtv: editValues.liquidationLtv || 95,
        liquidationFeePercent: editValues.liquidationFeePercent || 3.0,
        availableLoanTerms: editValues.availableLoanTerms || [6, 12, 24, 'infinity'] as (number | 'infinity')[],
        defaultLoanTerm: 12 as number | 'infinity',
        maxInitialLtv: editValues.maxInitialLtv || 70
      }

      // Save platform configuration
      saveCustomPlatformConfig(newPlatformId, newConfig)

      const updatedCustomPlatforms = [...customPlatforms, newPlatform]
      setCustomPlatforms(updatedCustomPlatforms)
      saveCustomPlatforms(updatedCustomPlatforms)

      // Select the new platform
      applyPlatformConfig(newPlatformId)

    } else if (platformId.startsWith('custom-')) {
      // Update existing custom platform
      const currentConfig = getPlatformConfig(platformId)
      const updatedConfig = {
        ...currentConfig,
        ...editValues
      }
      saveCustomPlatformConfig(platformId, updatedConfig)

      // Update platform name in the UI if changed
      if (editValues.name) {
        const updatedCustomPlatforms = customPlatforms.map(p =>
          p.id === platformId
            ? { ...p, name: editValues.name!, description: `Custom platform: ${editValues.name}` }
            : p
        )
        setCustomPlatforms(updatedCustomPlatforms)
        saveCustomPlatforms(updatedCustomPlatforms)
      }
    } else {
      // For built-in platforms, use the existing update mechanism
      updatePlatformConfig(platformId as Platform, editValues)
    }

    setEditingPlatform(null)
    setEditValues({})
    setCustomPlatformName('')
    setCustomPlatformDescription('')
  }

  /**
   * Handle canceling platform edits
   */
  const handleCancelPlatformEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPlatform(null)
    setEditValues({})
    // Only reset custom platform fields when explicitly canceling
    setCustomPlatformName('')
    setCustomPlatformDescription('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t('PlatformSelector.title', 'Lending Platform')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const isSelected = currentPlatform === platform.id
            
            return (
              <div
                key={platform.id}
                className={`relative p-4 border rounded-lg transition-all ${
                  platform.disabled
                    ? "border-muted bg-muted/20 cursor-not-allowed opacity-60"
                    : isSelected
                      ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
                      : "border-border hover:border-primary/50 cursor-pointer hover:shadow-md"
                }`}
                onClick={() => {
                  if (platform.disabled) return
                  if (platform.id === "custom") {
                    // Open edit mode for custom platform creation
                    setEditingPlatform("custom")
                    // Only reset if not already editing custom platform
                    if (editingPlatform !== "custom") {
                      setCustomPlatformName('')
                      setCustomPlatformDescription('')
                      setEditValues({})
                    }
                  } else {
                    handlePlatformChange(platform.id as Platform)
                  }
                }}
              >
                {/* Badge */}
                <Badge 
                  className={`absolute -top-2 -right-2 text-xs ${platform.badgeClassName}`}
                >
                  {platform.badge}
                </Badge>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-primary">{platform.icon}</div>
                  <h3 className="font-medium">{platform.name}</h3>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                  {/* Edit/Info Button */}
                  {!platform.disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={(e) => handleEditPlatform(e, platform.id as string)}
                      title={
                        platform.id === "custom"
                          ? "Create custom platform"
                          : platform.isCustom
                            ? `Edit ${platform.name} settings`
                            : `View ${platform.name} parameters`
                      }
                    >
                      {platform.id === "custom" || platform.isCustom ? (
                        <Edit className="h-3 w-3" />
                      ) : (
                        <Info className="h-3 w-3" />
                      )}
                    </Button>
                  )}

                  {/* Delete Button for Custom Platforms */}
                  {platform.isCustom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCustomPlatform(platform.id)
                      }}
                      title="Delete custom platform"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">
                  {platform.description}
                </p>

                {/* Platform Editing Section */}
                {editingPlatform === platform.id && (
                  <div className="mb-4 p-3 border rounded-md bg-muted/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">
                          {platform.id === "custom"
                            ? "Create Custom Platform"
                            : platform.isCustom
                              ? "Edit Platform Settings"
                              : "Platform Parameters"
                          }
                        </h4>
                        {/* Only show Save/Cancel buttons for custom platforms */}
                        {(platform.id === "custom" || platform.isCustom) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleSavePlatformEdit(e, platform.id as string)}
                              title="Save changes"
                            >
                              <Save className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={handleCancelPlatformEdit}
                              title="Cancel editing"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        )}
                        {/* Close button for info-only dialogs */}
                        {!(platform.id === "custom" || platform.isCustom) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleCancelPlatformEdit}
                            title="Close"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>

                      {/* Editable Parameters */}
                      <div className="grid grid-cols-1 gap-2">
                        {/* Platform Name and Description for Custom Platform Creation */}
                        {platform.id === "custom" && (
                          <>
                            <div>
                              <Label className="text-xs">Platform Name *</Label>
                              <Input
                                value={customPlatformName}
                                onChange={(e) => setCustomPlatformName(e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Enter platform name (e.g., My Custom Platform)"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Platform Description</Label>
                              <Input
                                value={customPlatformDescription}
                                onChange={(e) => setCustomPlatformDescription(e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Optional description"
                              />
                            </div>
                          </>
                        )}

                        {/* Platform Name for Existing Custom Platforms */}
                        {platform.isCustom && platform.id !== "custom" && (
                          <div>
                            <Label className="text-xs">Platform Name</Label>
                            <Input
                              value={editValues.name || platform.name}
                              onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                              className="h-7 text-xs"
                              placeholder="Enter platform name"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-xs">Origination Fee (%)</Label>
                          <NumberInput
                            value={editValues.originationFeePercent || getPlatformConfig(platform.id as string).originationFeePercent}
                            onChange={(value) => setEditValues(prev => ({ ...prev, originationFeePercent: value }))}
                            min={0}
                            max={10}
                            step={0.1}
                            className="h-7 text-xs"
                            disabled={!(platform.id === "custom" || platform.isCustom)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Liquidation LTV (%)</Label>
                          <NumberInput
                            value={editValues.liquidationLtv || getPlatformConfig(platform.id as string).liquidationLtv}
                            onChange={(value) => setEditValues(prev => ({ ...prev, liquidationLtv: value }))}
                            min={50}
                            max={100}
                            step={1}
                            className="h-7 text-xs"
                            disabled={!(platform.id === "custom" || platform.isCustom)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Liquidation Fee (%)</Label>
                          <NumberInput
                            value={editValues.liquidationFeePercent || getPlatformConfig(platform.id as string).liquidationFeePercent}
                            onChange={(value) => setEditValues(prev => ({ ...prev, liquidationFeePercent: value }))}
                            min={0}
                            max={20}
                            step={0.1}
                            className="h-7 text-xs"
                            disabled={!(platform.id === "custom" || platform.isCustom)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Maximum Initial LTV (%)</Label>
                          <NumberInput
                            value={editValues.maxInitialLtv || getPlatformConfig(platform.id as string).maxInitialLtv}
                            onChange={(value) => setEditValues(prev => ({ ...prev, maxInitialLtv: value }))}
                            min={10}
                            max={95}
                            step={1}
                            className="h-7 text-xs"
                            disabled={!(platform.id === "custom" || platform.isCustom)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Available Loan Terms</Label>
                          <Input
                            value={loanTermsInput || getPlatformConfig(platform.id as string).availableLoanTerms.map(term =>
                              term === 'infinity' ? 'infinity' : term.toString()
                            ).join(', ')}
                            onChange={(e) => {
                              setLoanTermsInput(e.target.value)
                              // Parse the input and update availableLoanTerms
                              const terms = e.target.value.split(',').map(term => {
                                const trimmed = term.trim().toLowerCase()
                                if (trimmed === 'infinity') return 'infinity'
                                const num = parseInt(trimmed)
                                return isNaN(num) ? null : num
                              }).filter(term => term !== null) as (number | 'infinity')[]

                              if (terms.length > 0) {
                                setEditValues(prev => ({ ...prev, availableLoanTerms: terms }))
                              }
                            }}
                            placeholder="6, 12, 24, infinity"
                            className="h-7 text-xs"
                            disabled={!(platform.id === "custom" || platform.isCustom)}
                            readOnly={!(platform.id === "custom" || platform.isCustom)}
                          />
                          {/* Only show helper text for custom platforms */}
                          {(platform.id === "custom" || platform.isCustom) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Enter loan terms separated by commas (e.g., "6, 12, 24, infinity")
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* External Link */}
                {platform.url && (
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => handleExternalLinkClick(e, platform.url!)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      title={`Visit ${platform.name} website`}
                    >
                      <span>{t('PlatformSelector.visitPlatform', 'Visit Platform')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

              </div>
            )
          })}
        </div>


      </CardContent>
    </Card>
  )
}
