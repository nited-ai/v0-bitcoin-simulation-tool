"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Shield, AlertTriangle, TrendingDown, Target, Zap, Activity, HelpCircle } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { useResultsAnalysis } from "../../hooks/useResultsAnalysis"

interface RiskMetric {
  name: string
  value: number
  maxValue: number
  level: 'low' | 'medium' | 'high' | 'extreme'
  description: string
  icon: React.ComponentType<{ className?: string }>
}

// Helper functions for strategy risk calculation
function getStrategyRiskScore(strategy: string, loanPercent: number, targetLtv: number): number {
  let baseRisk = 20 // Base risk for any strategy

  // Add risk based on loan exposure
  if (loanPercent > 25) baseRisk += 30
  else if (loanPercent > 15) baseRisk += 20
  else if (loanPercent > 10) baseRisk += 10

  // Add risk based on target LTV
  if (targetLtv > 70) baseRisk += 25
  else if (targetLtv > 50) baseRisk += 15
  else if (targetLtv > 30) baseRisk += 10

  // Strategy-specific adjustments
  if (strategy === 'rollingLoan') baseRisk += 15 // Rolling loans have inherent complexity risk

  return Math.min(100, baseRisk)
}

function getStrategyRiskLevel(strategy: string, loanPercent: number, targetLtv: number): 'low' | 'medium' | 'high' | 'extreme' {
  const score = getStrategyRiskScore(strategy, loanPercent, targetLtv)
  if (score >= 80) return 'extreme'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

// Helper function for metric tooltip content
function getMetricTooltipContent(metricName: string, analysis: any, params: any): string {
  switch (metricName) {
    case 'Liquidation Risk':
      return analysis?.liquidationCount > 0
        ? `Liquidations occurred when collateral value fell below liquidation threshold. This indicates high risk exposure.`
        : `Risk of liquidation based on maximum LTV reached. Higher LTV increases liquidation probability during price drops.`

    case 'Volatility Risk':
      return `Measures portfolio volatility through maximum drawdown. Higher drawdowns indicate greater price volatility risk and potential for significant losses.`

    case 'Debt Exposure':
      return `Assesses risk from debt levels relative to portfolio value. Higher average LTV indicates greater leverage and potential for margin calls.`

    case 'Concentration Risk':
      return `Risk from having wealth concentrated in a single asset (Bitcoin). Larger positions have higher concentration risk but potentially better diversification opportunities.`

    case 'Strategy Risk':
      return `Risk inherent to the chosen investment strategy and parameters. Rolling loan strategies with higher loan exposure and target LTV carry additional complexity and execution risks.`

    default:
      return 'Risk metric calculation based on simulation parameters and results.'
  }
}

/**
 * Risk Assessment Component
 * 
 * Provides comprehensive risk analysis including liquidation risk,
 * volatility assessment, stress testing, and risk recommendations.
 */
export function RiskAssessment() {
  const { t } = useTranslation()
  const { results, params } = useSimulation()
  const analysis = useResultsAnalysis(results, params)

  // Calculate detailed risk metrics
  const riskMetrics: RiskMetric[] = useMemo(() => {
    if (!analysis) return []

    return [
      {
        name: t('RiskAssessment.riskMetrics.liquidationRisk', 'Liquidation Risk'),
        value: analysis.liquidationCount > 0 ? 100 : analysis.maxLTV > 85 ? 80 : analysis.maxLTV > 80 ? 60 : analysis.maxLTV > 70 ? 40 : 20,
        maxValue: 100,
        level: analysis.liquidationCount > 0 ? 'extreme' : analysis.maxLTV > 85 ? 'high' : analysis.maxLTV > 70 ? 'medium' : 'low',
        description: analysis.liquidationCount > 0
          ? `${analysis.liquidationCount} liquidation events occurred`
          : `Max LTV reached ${analysis.maxLTV.toFixed(1)}%`,
        icon: AlertTriangle,
      },
      {
        name: t('RiskAssessment.riskMetrics.volatilityRisk', 'Volatility Risk'),
        value: Math.min(100, analysis.maxDrawdownPercent * 2),
        maxValue: 100,
        level: analysis.maxDrawdownPercent > 50 ? 'extreme' : analysis.maxDrawdownPercent > 30 ? 'high' : analysis.maxDrawdownPercent > 15 ? 'medium' : 'low',
        description: `Maximum drawdown of ${analysis.maxDrawdownPercent.toFixed(1)}%`,
        icon: TrendingDown,
      },
      {
        name: t('RiskAssessment.riskMetrics.debtExposure', 'Debt Exposure'),
        value: Math.min(100, (analysis.maxDebt / (analysis.finalPortfolioValue || 1)) * 100),
        maxValue: 100,
        level: analysis.averageLTV > 70 ? 'high' : analysis.averageLTV > 50 ? 'medium' : 'low',
        description: `Average LTV of ${analysis.averageLTV.toFixed(1)}%`,
        icon: Target,
      },
      {
        name: t('RiskAssessment.riskMetrics.concentrationRisk', 'Concentration Risk'),
        value: params.initialBtcAmount > 10 ? 20 : params.initialBtcAmount > 5 ? 40 : params.initialBtcAmount > 1 ? 60 : 80,
        maxValue: 100,
        level: params.initialBtcAmount > 10 ? 'low' : params.initialBtcAmount > 5 ? 'medium' : 'high',
        description: `${params.initialBtcAmount} BTC concentrated in single asset`,
        icon: Zap,
      },
      {
        name: t('RiskAssessment.riskMetrics.strategyRisk', 'Strategy Risk'),
        value: getStrategyRiskScore(params.investmentStrategy, params.loanAmountPercent || 0, params.targetLtv || 0),
        maxValue: 100,
        level: getStrategyRiskLevel(params.investmentStrategy, params.loanAmountPercent || 0, params.targetLtv || 0),
        description: `${params.investmentStrategy || 'rollingLoan'} strategy with ${params.loanAmountPercent || 0}% loan exposure`,
        icon: Activity,
      },
    ]
  }, [analysis, params])

  // Calculate overall risk score using weighted system: Liquidation (40) + LTV (30) + Drawdown (30)
  const overallRiskScore = useMemo(() => {
    if (!analysis) return 0

    // Use the same scoring system as useResultsAnalysis hook for consistency
    const liquidationRisk = analysis.liquidationCount > 0 ? 40 : 0
    const ltvRisk = analysis.maxLTV > 80 ? 30 : analysis.maxLTV > 60 ? 20 : analysis.maxLTV >= 30 ? 10 : 0
    const drawdownRisk = analysis.maxDrawdownPercent > 50 ? 30 : analysis.maxDrawdownPercent > 30 ? 20 : analysis.maxDrawdownPercent > 15 ? 10 : 0

    return liquidationRisk + ltvRisk + drawdownRisk
  }, [analysis])

  // Get overall risk level
  const overallRiskLevel = useMemo(() => {
    if (overallRiskScore >= 80) return 'extreme'
    if (overallRiskScore >= 60) return 'high'
    if (overallRiskScore >= 40) return 'medium'
    return 'low'
  }, [overallRiskScore])

  // Risk recommendations
  const riskRecommendations = useMemo(() => {
    if (!analysis) return []

    const recommendations: string[] = []

    if (analysis.liquidationCount > 0) {
      recommendations.push(t('RiskAssessment.recommendations.reduceLtv', 'Consider reducing target LTV to avoid liquidations'))
    }

    if (analysis.maxLTV > 80) {
      recommendations.push(t('RiskAssessment.recommendations.conservativeParameters', 'Your maximum LTV exceeded 80% - consider more conservative parameters'))
    }

    if (analysis.maxDrawdownPercent > 30) {
      recommendations.push(t('RiskAssessment.recommendations.diversification', 'High volatility detected - consider diversification or lower leverage'))
    }

    if (params.initialBtcAmount < 1) {
      recommendations.push(t('RiskAssessment.recommendations.accumulateMore', 'Small BTC holdings increase concentration risk - consider accumulating more'))
    }

    if (analysis.averageLTV > 60) {
      recommendations.push("Average LTV is high - consider reducing loan amounts or increasing collateral")
    }

    if (recommendations.length === 0) {
      recommendations.push("Risk profile looks reasonable for your parameters")
    }

    return recommendations
  }, [analysis, params])

  // Show empty state if no data
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('RiskAssessment.title', 'Risk Assessment')}
          </CardTitle>
          <CardDescription>
            {t('RiskAssessment.description', 'Comprehensive risk analysis and recommendations')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run a simulation to see risk assessment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'extreme': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProgressColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'extreme': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('RiskAssessment.title', 'Risk Assessment')}
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold mb-2">Risk Assessment Methodology</p>
                  <p className="text-sm mb-2">Comprehensive analysis using weighted scoring:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Liquidation Risk: 40 points max</li>
                    <li>• LTV Risk: 30 points max</li>
                    <li>• Drawdown Risk: 30 points max</li>
                  </ul>
                  <p className="text-xs mt-2">Thresholds: &lt;25 Low, 25-49 Medium, 50-69 High, 70+ Extreme</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            {t('RiskAssessment.description', 'Comprehensive risk analysis for your simulation parameters')}
          </CardDescription>

          {/* Overall Risk Score */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('RiskAssessment.overallRiskLevel', 'Overall Risk Score')}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-semibold mb-1">Overall Risk Score</p>
                      <p className="text-sm">Calculated as: Liquidation Risk + LTV Risk + Drawdown Risk</p>
                      <p className="text-xs mt-2">Current: {analysis?.liquidationCount > 0 ? '40' : '0'} + {analysis?.maxLTV > 80 ? '30' : analysis?.maxLTV > 60 ? '20' : analysis?.maxLTV >= 30 ? '10' : '0'} + {analysis?.maxDrawdownPercent > 50 ? '30' : analysis?.maxDrawdownPercent > 30 ? '20' : analysis?.maxDrawdownPercent > 15 ? '10' : '0'} = {overallRiskScore}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Badge className={getRiskBadgeColor(overallRiskLevel)}>
                {t(`RiskAssessment.riskLevels.${overallRiskLevel}`, overallRiskLevel.toUpperCase())}
              </Badge>
            </div>
          <div className="flex items-center gap-3">
            <Progress 
              value={overallRiskScore} 
              className="flex-1"
            />
            <span className={`text-lg font-bold ${getRiskColor(overallRiskLevel)}`}>
              {overallRiskScore}/100
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Individual Risk Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Risk Breakdown</h4>
          {riskMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{metric.name}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold mb-1">{metric.name}</p>
                        <p className="text-sm mb-2">{getMetricTooltipContent(metric.name, analysis, params)}</p>
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Badge className={getRiskBadgeColor(metric.level)}>
                  {t(`RiskAssessment.riskLevels.${metric.level}`, metric.level.toUpperCase())}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={metric.value} 
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12">
                  {metric.value.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>

        {/* Risk Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Risk Recommendations</h4>
          {riskRecommendations.map((recommendation, index) => (
            <Alert key={index}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {recommendation}
              </AlertDescription>
            </Alert>
          ))}
        </div>

        {/* Risk Summary */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">{t('RiskAssessment.riskSummary.title', 'Risk Summary')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">{t('RiskAssessment.riskSummary.liquidationEvents', 'Liquidation Events')}</div>
              <div className={`font-medium ${analysis.liquidationCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.liquidationCount}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('RiskAssessment.riskSummary.maxDrawdown', 'Max Drawdown')}</div>
              <div className="font-medium">
                {analysis.maxDrawdownPercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('RiskAssessment.riskSummary.riskRating', 'Risk Rating')}</div>
              <div className={`font-medium ${getRiskColor(analysis.riskLevel)}`}>
                {t(`RiskAssessment.riskLevels.${analysis.riskLevel}`, analysis.riskLevel.toUpperCase())}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}
