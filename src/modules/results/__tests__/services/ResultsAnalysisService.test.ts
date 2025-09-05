import { describe, it, expect, beforeEach } from 'vitest'
import { ResultsAnalysisService } from '../../services/ResultsAnalysisService'
import type { 
  ResultsAnalysisRequest,
  ResultsAnalysisResponse,
  EnhancedMonthlyResult,
  ResultsSummary,
  RiskAssessment
} from '../../types'
import type { MonthlyResult } from '@/modules/strategies/types'
import type { PriceProjectionResult } from '@/modules/price-projection/types'

describe('ResultsAnalysisService', () => {
  let service: ResultsAnalysisService
  let mockResults: MonthlyResult[]
  let mockProjection: PriceProjectionResult
  let mockRequest: ResultsAnalysisRequest

  beforeEach(() => {
    service = new ResultsAnalysisService()
    
    // Create mock monthly results
    mockResults = [
      {
        month: 1,
        dateString: '01/2024',
        btcPrice: 70000,
        collateralValue: 70000,
        realCollateralValue: 70000,
        totalDebt: 35000,
        realTotalDebt: 35000,
        withdrawalAmount: 2000,
        newLoanPrincipal: 37000,
        repaymentsDue: 0,
        reinvestment: 35000,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 1,
        highestLtv: 50,
        events: []
      },
      {
        month: 2,
        dateString: '02/2024',
        btcPrice: 72000,
        collateralValue: 72000,
        realCollateralValue: 71640,
        totalDebt: 35200,
        realTotalDebt: 35024,
        withdrawalAmount: 2000,
        newLoanPrincipal: 2000,
        repaymentsDue: 0,
        reinvestment: 0,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 2,
        highestLtv: 48.9,
        events: []
      },
      {
        month: 3,
        dateString: '03/2024',
        btcPrice: 68000,
        collateralValue: 68000,
        realCollateralValue: 67320,
        totalDebt: 35400,
        realTotalDebt: 35048,
        withdrawalAmount: 2000,
        newLoanPrincipal: 2000,
        repaymentsDue: 0,
        reinvestment: 0,
        currentBtcAmount: 1.0,
        freeBtc: 0.5,
        lockedBtc: 0.5,
        loanCount: 3,
        highestLtv: 52.1,
        events: []
      }
    ]

    // Create mock projection
    mockProjection = {
      modelName: 'Test Model',
      modelVersion: '1.0.0',
      projectionPoints: [
        {
          timestamp: 1704067200000, // 2024-01-01
          price: 70000,
          support: 65000,
          resistance: 75000,
          confidence: 0.9,
          metadata: { month: 1 }
        },
        {
          timestamp: 1706745600000, // 2024-02-01
          price: 72000,
          support: 67000,
          resistance: 77000,
          confidence: 0.85,
          metadata: { month: 2 }
        },
        {
          timestamp: 1709251200000, // 2024-03-01
          price: 68000,
          support: 63000,
          resistance: 73000,
          confidence: 0.8,
          metadata: { month: 3 }
        }
      ],
      metadata: {
        totalMonths: 3,
        totalGrowth: -2.86,
        averageMonthlyGrowth: -0.95,
        confidence: 0.85,
        generatedAt: '2024-01-01T00:00:00.000Z'
      }
    }

    mockRequest = {
      results: mockResults,
      projectionContext: mockProjection,
      analysisOptions: {
        includeRiskAssessment: true,
        includePerformanceMetrics: true,
        includeCashFlowAnalysis: true,
        includeProjectionComparison: true
      }
    }
  })

  describe('Results Analysis', () => {
    it('should analyze results successfully', async () => {
      const response = await service.analyzeResults(mockRequest)
      
      expect(response.success).toBe(true)
      expect(response.enhancedResults).toBeDefined()
      expect(response.summary).toBeDefined()
      expect(response.riskAssessment).toBeDefined()
      expect(response.chartData).toBeDefined()
      expect(response.analysisTime).toBeGreaterThan(0)
    })

    it('should enhance results with additional metrics', async () => {
      const response = await service.analyzeResults(mockRequest)
      
      expect(response.success).toBe(true)
      expect(response.enhancedResults).toHaveLength(3)
      
      const firstResult = response.enhancedResults![0]
      expect(firstResult).toHaveProperty('portfolioValue')
      expect(firstResult).toHaveProperty('totalReturn')
      expect(firstResult).toHaveProperty('currentLtv')
      expect(firstResult).toHaveProperty('liquidationDistance')
      expect(firstResult).toHaveProperty('netCashFlow')
      expect(firstResult).toHaveProperty('projectionContext')
    })

    it('should calculate portfolio values correctly', async () => {
      const response = await service.analyzeResults(mockRequest)
      
      const firstResult = response.enhancedResults![0]
      expect(firstResult.portfolioValue).toBe(70000) // 1.0 BTC * 70000
      expect(firstResult.currentLtv).toBe(50) // 35000 / 70000 * 100
      
      const secondResult = response.enhancedResults![1]
      expect(secondResult.portfolioValue).toBe(72000) // 1.0 BTC * 72000
      expect(secondResult.currentLtv).toBeCloseTo(48.9, 1)
    })

    it('should handle results without projection context', async () => {
      const requestWithoutProjection = {
        ...mockRequest,
        projectionContext: undefined
      }
      
      const response = await service.analyzeResults(requestWithoutProjection)
      
      expect(response.success).toBe(true)
      expect(response.enhancedResults).toBeDefined()
      expect(response.enhancedResults![0].projectionContext).toBeUndefined()
    })

    it('should handle empty results gracefully', async () => {
      const emptyRequest = {
        ...mockRequest,
        results: []
      }
      
      const response = await service.analyzeResults(emptyRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toContain('Results cannot be empty')
    })
  })

  describe('Summary Generation', () => {
    it('should generate comprehensive summary', async () => {
      const response = await service.analyzeResults(mockRequest)
      const summary = response.summary!
      
      expect(summary.totalMonths).toBe(3)
      expect(summary.finalBtcAmount).toBe(1.0)
      expect(summary.finalPortfolioValue).toBe(68000)
      expect(summary.maxLtv).toBeCloseTo(52.1, 1)
      expect(summary.averageLtv).toBeGreaterThan(0)
      expect(summary.totalWithdrawals).toBe(6000) // 3 months * 2000
      expect(summary.netCashFlow).toBeGreaterThan(0) // Net inflow due to loans exceeding withdrawals
    })

    it('should identify best and worst performing months', async () => {
      const response = await service.analyzeResults(mockRequest)
      const summary = response.summary!
      
      expect(summary.bestMonth).toBeDefined()
      expect(summary.worstMonth).toBeDefined()
      expect(summary.bestMonth.month).toBe(2) // Price increased to 72000
      expect(summary.worstMonth.month).toBe(3) // Price decreased to 68000
    })

    it('should calculate returns correctly', async () => {
      const response = await service.analyzeResults(mockRequest)
      const summary = response.summary!
      
      // Total return should be negative due to price drop and withdrawals
      expect(summary.totalReturn).toBeLessThan(0)
      expect(summary.realTotalReturn).toBeLessThan(summary.totalReturn) // Inflation adjusted
      expect(summary.annualizedReturn).toBeDefined()
    })
  })

  describe('Risk Assessment', () => {
    it('should assess liquidation risk', async () => {
      const response = await service.analyzeResults(mockRequest)
      const risk = response.riskAssessment!
      
      expect(risk.liquidationRisk).toBeDefined()
      expect(risk.liquidationRisk.score).toBeGreaterThan(0)
      expect(risk.liquidationRisk.score).toBeLessThanOrEqual(10)
      expect(risk.liquidationRisk.probability).toBeGreaterThanOrEqual(0)
      expect(risk.liquidationRisk.probability).toBeLessThanOrEqual(1)
    })

    it('should assess concentration risk', async () => {
      const response = await service.analyzeResults(mockRequest)
      const risk = response.riskAssessment!
      
      expect(risk.concentrationRisk).toBeDefined()
      expect(risk.concentrationRisk.btcConcentration).toBe(100) // 100% BTC
      expect(risk.concentrationRisk.score).toBeGreaterThan(5) // High concentration
    })

    it('should assess leverage risk', async () => {
      const response = await service.analyzeResults(mockRequest)
      const risk = response.riskAssessment!
      
      expect(risk.leverageRisk).toBeDefined()
      expect(risk.leverageRisk.averageLeverage).toBeGreaterThan(1)
      expect(risk.leverageRisk.maxLeverage).toBeGreaterThanOrEqual(risk.leverageRisk.averageLeverage)
    })

    it('should provide overall risk score', async () => {
      const response = await service.analyzeResults(mockRequest)
      const risk = response.riskAssessment!
      
      expect(risk.overallRiskScore).toBeGreaterThan(0)
      expect(risk.overallRiskScore).toBeLessThanOrEqual(10)
      expect(risk.recommendations).toBeInstanceOf(Array)
      expect(risk.warnings).toBeInstanceOf(Array)
    })
  })

  describe('Projection Comparison', () => {
    it('should compare results with projection accurately', async () => {
      const comparison = await service.compareWithProjection(mockResults, mockProjection)
      
      expect(comparison.accuracy).toBeGreaterThan(0)
      expect(comparison.accuracy).toBeLessThanOrEqual(100)
      expect(comparison.averageDeviation).toBeGreaterThanOrEqual(0)
      expect(comparison.correlationCoefficient).toBeGreaterThanOrEqual(-1)
      expect(comparison.correlationCoefficient).toBeLessThanOrEqual(1)
      expect(comparison.deviationsByMonth).toHaveLength(3)
    })

    it('should calculate price deviations correctly', async () => {
      const comparison = await service.compareWithProjection(mockResults, mockProjection)
      
      const firstDeviation = comparison.deviationsByMonth[0]
      expect(firstDeviation.month).toBe(1)
      expect(firstDeviation.actualPrice).toBe(70000)
      expect(firstDeviation.projectedPrice).toBe(70000)
      expect(firstDeviation.deviation).toBe(0)
      expect(firstDeviation.deviationPercent).toBe(0)
    })
  })

  describe('Insights Generation', () => {
    it('should generate meaningful insights', async () => {
      const response = await service.analyzeResults(mockRequest)
      const insights = await service.generateInsights(response.enhancedResults!)
      
      expect(insights.keyFindings).toBeInstanceOf(Array)
      expect(insights.performanceHighlights).toBeInstanceOf(Array)
      expect(insights.riskWarnings).toBeInstanceOf(Array)
      expect(insights.optimizationSuggestions).toBeInstanceOf(Array)
      expect(insights.marketObservations).toBeInstanceOf(Array)
      
      expect(insights.keyFindings.length).toBeGreaterThan(0)
    })

    it('should identify performance patterns', async () => {
      const response = await service.analyzeResults(mockRequest)
      const insights = await service.generateInsights(response.enhancedResults!)
      
      // Should identify the price volatility pattern
      const hasVolatilityObservation = insights.marketObservations.some(obs => 
        obs.toLowerCase().includes('volatility') || obs.toLowerCase().includes('price')
      )
      expect(hasVolatilityObservation).toBe(true)
    })
  })

  describe('Export Functionality', () => {
    it('should export results in CSV format', async () => {
      const response = await service.analyzeResults(mockRequest)
      const exportResult = await service.exportResults(response.enhancedResults!, {
        format: 'csv',
        filename: 'test-results.csv',
        includeCharts: false,
        includeRawData: true,
        includeSummary: true,
        includeRiskAssessment: true
      })
      
      expect(exportResult.success).toBe(true)
      expect(exportResult.format).toBe('csv')
      expect(exportResult.data).toBeDefined()
      expect(exportResult.size).toBeGreaterThan(0)
    })

    it('should export results in JSON format', async () => {
      const response = await service.analyzeResults(mockRequest)
      const exportResult = await service.exportResults(response.enhancedResults!, {
        format: 'json',
        includeCharts: true,
        includeRawData: true,
        includeSummary: true,
        includeRiskAssessment: true
      })
      
      expect(exportResult.success).toBe(true)
      expect(exportResult.format).toBe('json')
      expect(exportResult.data).toBeDefined()
      
      // Should be valid JSON
      const parsedData = JSON.parse(exportResult.data as string)
      expect(parsedData).toBeDefined()
      expect(parsedData.results).toBeInstanceOf(Array)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid results data', async () => {
      const invalidRequest = {
        ...mockRequest,
        results: [{ invalid: 'data' }] as any
      }
      
      const response = await service.analyzeResults(invalidRequest)
      
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should handle analysis errors gracefully', async () => {
      // Create results with extreme values that might cause calculation errors
      const extremeResults = [{
        ...mockResults[0],
        btcPrice: Number.MAX_SAFE_INTEGER,
        totalDebt: Number.MAX_SAFE_INTEGER
      }]
      
      const extremeRequest = {
        ...mockRequest,
        results: extremeResults
      }
      
      const response = await service.analyzeResults(extremeRequest)
      
      // Should either succeed with reasonable values or fail gracefully
      expect(typeof response.success).toBe('boolean')
      if (!response.success) {
        expect(response.error).toBeDefined()
      }
    })
  })
})
