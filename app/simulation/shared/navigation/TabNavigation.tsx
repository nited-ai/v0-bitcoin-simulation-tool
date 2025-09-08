'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { HybridTooltip, HybridTooltipTrigger, HybridTooltipContent } from '@/components/ui/hybrid-tooltip'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DollarSign, Info, TrendingUp, Menu, Settings, BarChart3, Target, TrendingDown, Home, Globe, Sun, Moon } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useTheme } from "next-themes"
import Link from "next/link"
import { NumberInput } from '../../../../shared/ui/forms/NumberInput'
import { PriceModelSelector, UnifiedPriceChart, SimplifiedManualGrowthInterface, GrowthRateAnalysis, CustomGrowthRateSliders, DiminishingReturnsControls, LogarithmicCurveControls } from '../../tabs/price-projection'
import { BasicParametersCard, ValidationSummary, RiskLevelSelector } from '../../tabs/parameters'

import { CollateralVisualizationCard, LoanUsageVisualizationCard, PriceDropToleranceCard, LoanParametersCard, PlatformSelector } from '../../tabs/parameters'
import { ResultsPage } from '../../tabs/results'
import { useSimulation } from '../../context/SimulationContext'
import type { PriceProjectionResult } from '../../price-models/types'
// import { CsvUpdatePanel } from '../admin/CsvUpdatePanel' // Disabled for production

export type TabValue = 'parameters' | 'price-projection' | 'strategy' | 'results'

interface TabNavigationProps {
  children?: React.ReactNode
}

// Tab configuration interface
interface TabConfig {
  label: string
  shortLabel: string
  icon: React.ComponentType<any>
  enabled: boolean
  badge?: string // Optional badge property
}

export function TabNavigation({ children }: TabNavigationProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { params, setParams } = useSimulation()
  const isMobile = useIsMobile()
  const { setTheme, theme } = useTheme()

  // Tab configuration with icons and labels - using translation function
  const tabConfig: Record<TabValue, TabConfig> = {
    parameters: {
      label: t('Navigation.parameters.label'),
      shortLabel: t('Navigation.parameters.shortLabel'),
      icon: Settings,
      enabled: true
    },
    'price-projection': {
      label: t('Navigation.priceProjection.label'),
      shortLabel: t('Navigation.priceProjection.shortLabel'),
      icon: BarChart3,
      enabled: true
    },
    strategy: {
      label: t('Navigation.strategy.label'),
      shortLabel: t('Navigation.strategy.shortLabel'),
      icon: Target,
      enabled: false,
      badge: t('Navigation.comingSoon.badge')
    },
    results: {
      label: t('Navigation.results.label'),
      shortLabel: t('Navigation.results.shortLabel'),
      icon: TrendingDown,
      enabled: false,
      badge: t('Navigation.comingSoon.badge')
    }
  }

  // State for projection data from UnifiedPriceChart
  const [projection, setProjection] = useState<PriceProjectionResult | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Get BTC accumulation state (default to true)
  const btcAccumulation = (params as any).btcAccumulation ?? true

  /**
   * Handle BTC accumulation checkbox change
   */
  const handleBtcAccumulationChange = (checked: boolean) => {
    setParams((current) => ({
      ...current,
      btcAccumulation: checked
    }))
  }

  /**
   * Get investment mode description based on checkbox and savings/withdrawal amount
   */
  const getInvestmentModeDescription = () => {
    if (btcAccumulation && params.monthlyWithdrawalAmount === 0) {
      return "Accumulate more BTC only (reinvest all loan proceeds)"
    } else if (btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Hybrid approach (add monthly savings AND reinvest remaining loan proceeds into BTC)"
    } else if (btcAccumulation && params.monthlyWithdrawalAmount < 0) {
      return "Hybrid approach (withdraw specific amount AND reinvest remaining loan proceeds into BTC)"
    } else if (!btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Monthly savings only (add specific amount, no loan reinvestment)"
    } else if (!btcAccumulation && params.monthlyWithdrawalAmount < 0) {
      return "Live from BTC stack only (withdraw specific amount, no reinvestment)"
    } else {
      return "No savings/withdrawals, no reinvestment"
    }
  }

  // Get initial tab from URL, localStorage, or default to parameters
  const getInitialTab = (): TabValue => {
    // First, try to get from URL parameters
    const urlTab = searchParams.get('tab') as TabValue
    if (urlTab && ['parameters', 'price-projection', 'strategy', 'results'].includes(urlTab)) {
      return urlTab
    }

    // If URL doesn't have a valid tab, try localStorage (for page refresh persistence)
    if (typeof window !== 'undefined') {
      try {
        const savedTab = localStorage.getItem('bitcoin-sim-active-tab') as TabValue
        if (savedTab && ['parameters', 'price-projection', 'strategy', 'results'].includes(savedTab)) {
          return savedTab
        }
      } catch (error) {
        console.warn('Failed to read saved tab from localStorage:', error)
      }
    }

    // Default to parameters if nothing else works
    return 'parameters'
  }

  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab)

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabValue

    // If URL has a valid tab parameter, use it
    if (tabParam && ['parameters', 'price-projection'].includes(tabParam)) {
      setActiveTab(tabParam)
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bitcoin-sim-active-tab', tabParam)
        } catch (error) {
          console.warn('Failed to save tab to localStorage:', error)
        }
      }
    } else if (!tabParam) {
      // Only update URL if there's no tab parameter at all
      // This prevents overriding valid saved states on page refresh
      const initialTab = getInitialTab()
      setActiveTab(initialTab)

      // Update URL to reflect the determined tab
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', initialTab)
      router.replace(`?${params.toString()}`)
    }
  }, [searchParams, router])

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue

    // Allow navigation to parameters and price-projection tabs
    if (!['parameters', 'price-projection'].includes(tabValue)) {
      return
    }

    setActiveTab(tabValue)
    setIsSheetOpen(false) // Close mobile sheet when tab changes

    // Save active tab to localStorage for persistence across page refreshes
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bitcoin-sim-active-tab', tabValue)
      } catch (error) {
        console.warn('Failed to save active tab to localStorage:', error)
      }
    }

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabValue)
    router.replace(`?${params.toString()}`)
  }

  // Get current tab config
  const currentTabConfig = tabConfig[activeTab]

  return (
    <div className="w-full">
      {/* Mobile Navigation Header */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <currentTabConfig.icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-semibold text-lg">{currentTabConfig.label}</h1>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>{t('Navigation.title', 'Navigation')}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Home Button */}
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start gap-3 h-12"
                  onClick={() => setIsSheetOpen(false)}
                >
                  <Link href="/">
                    <Home className="w-5 h-5" />
                    <span className="flex-1 text-left">{t("Navigation.backToLanding.button", "Back to Landing")}</span>
                  </Link>
                </Button>

                {/* Divider */}
                <div className="border-t border-border my-2" />

                {/* Tab Navigation */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-3">Simulation Tabs</h3>
                  {Object.entries(tabConfig).map(([key, config]) => {
                    const Icon = config.icon
                    const isActive = activeTab === key
                    const isEnabled = config.enabled

                    return (
                      <Button
                        key={key}
                        variant={isActive ? "default" : "ghost"}
                        className={`
                          justify-start gap-3 h-12
                          ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={!isEnabled}
                        onClick={() => isEnabled && handleTabChange(key)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1 text-left">{config.label}</span>
                        {config.badge && (
                          <Badge variant="outline" className="text-xs">
                            {config.badge}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className="border-t border-border my-2" />

                {/* Language Selector */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-3">Settings</h3>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Language</span>
                    <div className="ml-auto">
                      <LocaleSwitcher />
                    </div>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      </div>
                      <span className="text-sm font-medium">Theme</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-8">
                      <Button
                        variant={theme === "light" ? "default" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setTheme("light")}
                      >
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setTheme("dark")}
                      >
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setTheme("system")}
                      >
                        System
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Desktop Navigation */}
        {!isMobile && (
          <TabsList className="
            grid w-full
            grid-cols-2 sm:grid-cols-4
            h-auto p-1
            bg-muted/50
          ">
            {Object.entries(tabConfig).map(([key, config]) => {
              const Icon = config.icon
              const isEnabled = config.enabled

              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  disabled={!isEnabled}
                  className={`
                    flex flex-col gap-1 h-16 px-3
                    data-[state=active]:bg-background
                    data-[state=active]:shadow-sm
                    ${!isEnabled ? 'opacity-50' : ''}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:block">
                    {config.label}
                  </span>
                  <span className="text-xs font-medium sm:hidden">
                    {config.shortLabel}
                  </span>
                  {config.badge && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 hidden sm:flex">
                      {config.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        )}
        
        <TabsContent value="parameters" className={`${isMobile ? 'mt-0 px-4' : 'mt-6'}`}>
          <div className="space-y-6">
            {/* Validation Summary - Only show if parameters are not valid */}
            <ValidationSummary />

            {/* Parameter Cards in Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <BasicParametersCard />
                <LoanParametersCard />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <RiskLevelSelector />
                <PlatformSelector />
              </div>
            </div>

            {/* Loan Parameter Visualization Cards - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <CollateralVisualizationCard />
              <PriceDropToleranceCard />
              <LoanUsageVisualizationCard />
            </div>


          </div>
        </TabsContent>
        
        <TabsContent value="price-projection" className={`${isMobile ? 'mt-0 px-4' : 'mt-6'}`}>
          <div className="space-y-6">

            {/* Price Model Selection */}
            <PriceModelSelector />

            {/* Simplified Manual Growth Interface (when manual model is selected) */}
            {params.priceModel === 'manual' && (
              <SimplifiedManualGrowthInterface />
            )}

            {/* Unified Price Chart */}
            <UnifiedPriceChart onProjectionChange={setProjection} />

            {/* Custom Growth Rate Sliders (when manual model and custom preset are selected) */}
            {params.priceModel === 'manual' && (
              <CustomGrowthRateSliders />
            )}

            {/* Diminishing Returns Controls (when enhanced cycle repeat model is selected) */}
            {params.priceModel === 'enhancedCycleRepeat' && (
              <DiminishingReturnsControls />
            )}

            {/* Logarithmic Curve Controls (when logarithmic curve repeat model is selected) */}
            {/* Temporarily disabled - model not fully implemented */}
            {/* {params.priceModel === 'logarithmicCurveRepeat' && (
              <LogarithmicCurveControls />
            )} */}

            {/* Universal Growth Rate Analysis (for all models) */}
            <GrowthRateAnalysis
              projection={projection}
              startPrice={params.initialBtcPrice}
            />

            {/* Admin Panel - Completely disabled for clean UI */}
            {/*
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Data Management (Dev Only)</h3>
                <CsvUpdatePanel />
              </div>
            )}
            */}
          </div>
        </TabsContent>
        
        <TabsContent value="strategy" className={`${isMobile ? 'mt-0 px-4' : 'mt-6'}`}>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Strategy</h2>
              <p className="text-muted-foreground">Choose and configure your Bitcoin lending strategy.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Investment Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Savings/Withdrawal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      Monthly Savings/Withdrawal
                      <HybridTooltip>
                        <HybridTooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                        </HybridTooltipTrigger>
                        <HybridTooltipContent>
                          <p>Positive values: Monthly savings added to BTC stack. Negative values: Monthly withdrawals from BTC stack for living expenses.</p>
                        </HybridTooltipContent>
                      </HybridTooltip>
                    </Label>
                    <NumberInput
                      value={params.monthlyWithdrawalAmount}
                      onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
                      min={-50000}
                      max={50000}
                      step={100}
                      decimals={0}
                      suffix="$"
                      placeholder="150"
                    />
                  </div>

                  <div className="space-y-2">
                    {/* Empty label space to align with Monthly Savings/Withdrawal label */}
                    <div className="h-6"></div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="btcAccumulation"
                        checked={btcAccumulation}
                        onCheckedChange={handleBtcAccumulationChange}
                      />
                      <Label
                        htmlFor="btcAccumulation"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        BTC Accumulation
                        <HybridTooltip>
                          <HybridTooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                          </HybridTooltipTrigger>
                          <HybridTooltipContent className="max-w-xs">
                            <p>Decide whether you want to accumulate more BTC or live off your stack</p>
                          </HybridTooltipContent>
                        </HybridTooltip>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Investment Mode Description */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {getInvestmentModeDescription()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className={`${isMobile ? 'mt-0 px-4' : 'mt-6'}`}>
          <ResultsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
