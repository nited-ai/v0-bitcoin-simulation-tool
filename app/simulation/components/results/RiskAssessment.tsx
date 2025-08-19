"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, TrendingDown, Target, Zap, Activity } from "lucide-react"
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

/**
 * Risk Assessment Component
 * 
 * Provides comprehensive risk analysis including liquidation risk,
 * volatility assessment, stress testing, and risk recommendations.
 */
export function RiskAssessment() {
  const { results, params } = useSimulation()
  const analysis = useResultsAnalysis(results, params)

  // Calculate detailed risk metrics
  const riskMetrics: RiskMetric[] = useMemo(() => {
    if (!analysis) return []

    return [
      {
        name: "Liquidation Risk",
        value: analysis.liquidationCount > 0 ? 100 : analysis.maxLTV > 85 ? 80 : analysis.maxLTV > 80 ? 60 : analysis.maxLTV > 70 ? 40 : 20,
        maxValue: 100,
        level: analysis.liquidationCount > 0 ? 'extreme' : analysis.maxLTV > 85 ? 'high' : analysis.maxLTV > 70 ? 'medium' : 'low',
        description: analysis.liquidationCount > 0 
          ? `${analysis.liquidationCount} liquidation events occurred`
          : `Max LTV reached ${analysis.maxLTV.toFixed(1)}%`,
        icon: AlertTriangle,
      },
      {
        name: "Volatility Risk",
        value: Math.min(100, analysis.maxDrawdownPercent * 2),
        maxValue: 100,
        level: analysis.maxDrawdownPercent > 50 ? 'extreme' : analysis.maxDrawdownPercent > 30 ? 'high' : analysis.maxDrawdownPercent > 15 ? 'medium' : 'low',
        description: `Maximum drawdown of ${analysis.maxDrawdownPercent.toFixed(1)}%`,
        icon: TrendingDown,
      },
      {
        name: "Debt Exposure",
        value: Math.min(100, (analysis.maxDebt / (analysis.finalPortfolioValue || 1)) * 100),
        maxValue: 100,
        level: analysis.averageLTV > 70 ? 'high' : analysis.averageLTV > 50 ? 'medium' : 'low',
        description: `Average LTV of ${analysis.averageLTV.toFixed(1)}%`,
        icon: Target,
      },
      {
        name: "Concentration Risk",
        value: params.initialBtcAmount > 10 ? 20 : params.initialBtcAmount > 5 ? 40 : params.initialBtcAmount > 1 ? 60 : 80,
        maxValue: 100,
        level: params.initialBtcAmount > 10 ? 'low' : params.initialBtcAmount > 5 ? 'medium' : 'high',
        description: `${params.initialBtcAmount} BTC concentrated in single asset`,
        icon: Zap,
      },
      {
        name: "Strategy Risk",
        value: params.investmentStrategy === 'default' ? 30 : params.investmentStrategy === 'athBased' ? 50 : 70,
        maxValue: 100,
        level: params.investmentStrategy === 'default' ? 'low' : params.investmentStrategy === 'athBased' ? 'medium' : 'high',
        description: `Using ${params.investmentStrategy} strategy`,
        icon: Activity,
      },
    ]
  }, [analysis, params])

  // Calculate overall risk score
  const overallRiskScore = useMemo(() => {
    if (riskMetrics.length === 0) return 0
    return Math.round(riskMetrics.reduce((sum, metric) => sum + metric.value, 0) / riskMetrics.length)
  }, [riskMetrics])

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
      recommendations.push("Consider reducing target LTV to avoid liquidations")
    }

    if (analysis.maxLTV > 80) {
      recommendations.push("Your maximum LTV exceeded 80% - consider more conservative parameters")
    }

    if (analysis.maxDrawdownPercent > 30) {
      recommendations.push("High volatility detected - consider diversification or lower leverage")
    }

    if (params.initialBtcAmount < 1) {
      recommendations.push("Small BTC holdings increase concentration risk - consider accumulating more")
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
            Risk Assessment
          </CardTitle>
          <CardDescription>
            Comprehensive risk analysis and recommendations
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Assessment
        </CardTitle>
        <CardDescription>
          Comprehensive risk analysis for your simulation parameters
        </CardDescription>
        
        {/* Overall Risk Score */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Risk Score</span>
            <Badge className={getRiskBadgeColor(overallRiskLevel)}>
              {overallRiskLevel.toUpperCase()}
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
                </div>
                <Badge className={getRiskBadgeColor(metric.level)}>
                  {metric.level.toUpperCase()}
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
          <h4 className="text-sm font-medium mb-2">Risk Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Liquidation Events</div>
              <div className={`font-medium ${analysis.liquidationCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.liquidationCount}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Max Drawdown</div>
              <div className="font-medium">
                {analysis.maxDrawdownPercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Risk Rating</div>
              <div className={`font-medium ${getRiskColor(analysis.riskLevel)}`}>
                {analysis.riskLevel.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
