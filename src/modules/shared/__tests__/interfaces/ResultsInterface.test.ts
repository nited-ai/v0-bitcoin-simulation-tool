import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { 
  ResultsAnalysisService, 
  EnhancedResultsAnalysis,
  ProjectionAccuracyMetrics,
  StrategyPerformanceMetrics,
  RiskAssessmentData,
  ComparisonData,
  DeviationMetrics
} from '../../interfaces/ResultsInterface'
import type { StrategyExecutionResult } from '../../interfaces/StrategyInterface'
import type { PriceProjectionResult } from '../../types'

describe('ResultsInterface', () => {
  let mockResultsAnalysisService: ResultsAnalysisService
  let mockStrategyResults: StrategyExecutionResult
  let mockOriginalProjection: PriceProjectionResult

  beforeEach(() => {
    mockOriginalProjection = {
      modelName: 'Manual Growth',
      modelVersion: '1.0.0',
      projectionPoints: [
        {
          timestamp: 1704067200000,
          price: 70000,
          support: 65000,
          resistance: 75000,
          confidence: 0.9,
          metadata: {}
        },
        {
          timestamp: 1706745600000,
          price: 72000,
          support: 67000,
          resistance: 77000,
          confidence: 0.85,
          metadata: {}
        }
      ],
      metadata: {
        totalMonths: 12,
        totalGrowth: 20,
        averageMonthlyGrowth: 1.67,
        confidence: 0.8,
        generatedAt: '2025-01-09T00:00:00.000Z'
      }
    }

    mockStrategyResults = {
      monthlyResults: [
        {
          month: 1,
          dateString: '2024-01-01',
          btcPrice: 70000,
          collateralValue: 70000,
          realCollateralValue: 70000,
          totalDebt: 10000,
          realTotalDebt: 10000,
          withdrawalAmount: 150,
          newLoanPrincipal: 0,
          repaymentsDue: 0,
          reinvestment: 0,
          currentBtcAmount: 1,
          freeBtc: 0.857,
          lockedBtc: 0.143,
          loanCount: 1,
          highestLtv: 14.3,
          events: []
        }
      ],
      priceProjectionUsed: {
        projectionPoints: [
          {
            timestamp: 1704067200000,
            price: 70000,
            supportPrice: 65000,
            resistancePrice: 75000,
            confidence: 0.9
          }
        ],
        metadata: {
          totalMonths: 12,
          totalGrowth: 20,
          averageMonthlyGrowth: 1.67,
          confidence: 0.8,
          generatedAt: '2025-01-09T00:00:00.000Z'
        }
      },
      strategyMetadata: {
        name: 'Default Strategy',
        version: '1.0.0',
        description: 'Basic loan strategy',
        riskLevel: 'moderate',
        complexity: 'beginner'
      },
      executionSummary: {
        totalMonths: 144,
        finalPortfolioValue: 150000,
        totalReturn: 80000,
        maxDrawdown: 15000,
        liquidationCount: 0,
        averageLtv: 25.5,
        successRate: 100
      }
    }

    mockResultsAnalysisService = {
      analyzeWithPriceProjection: vi.fn()
    }
  })

  describe('analyzeWithPriceProjection', () => {
    it('should return EnhancedResultsAnalysis with correct structure', async () => {
      const mockAccuracyMetrics: ProjectionAccuracyMetrics = {
        modelUsed: 'Manual Growth',
        projectionConfidence: 0.8,
        actualVsProjected: [
          {
            timestamp: 1704067200000,
            projected: 70000,
            actual: 70000,
            deviation: 0,
            deviationPercent: 0
          }
        ],
        accuracyScore: 95.5,
        deviationAnalysis: {
          meanAbsoluteError: 1500,
          rootMeanSquareError: 2000,
          meanAbsolutePercentageError: 2.1,
          maxDeviation: 5000,
          minDeviation: 0
        }
      }

      const mockPerformanceMetrics: StrategyPerformanceMetrics = {
        totalReturn: 80000,
        totalReturnPercent: 114.3,
        annualizedReturn: 12.5,
        sharpeRatio: 1.8,
        maxDrawdown: 15000,
        maxDrawdownPercent: 21.4,
        winRate: 85.7,
        profitFactor: 2.3,
        averageMonthlyReturn: 1.04
      }

      const mockRiskAssessment: RiskAssessmentData = {
        overallRiskScore: 6.5,
        liquidationRisk: 'low',
        volatilityRisk: 'medium',
        concentrationRisk: 'high',
        riskFactors: [
          'High Bitcoin concentration',
          'Interest rate sensitivity'
        ],
        recommendations: [
          'Consider diversification',
          'Monitor LTV ratios closely'
        ]
      }

      const expectedResult: EnhancedResultsAnalysis = {
        monthlyResults: mockStrategyResults.monthlyResults,
        priceProjectionAccuracy: mockAccuracyMetrics,
        strategyPerformance: mockPerformanceMetrics,
        riskAssessment: mockRiskAssessment
      }

      vi.mocked(mockResultsAnalysisService.analyzeWithPriceProjection)
        .mockResolvedValue(expectedResult)

      const result = await mockResultsAnalysisService.analyzeWithPriceProjection(
        mockStrategyResults,
        mockOriginalProjection
      )

      expect(result).toEqual(expectedResult)
      expect(result.monthlyResults).toHaveLength(1)
      expect(result.priceProjectionAccuracy).toHaveProperty('accuracyScore')
      expect(result.strategyPerformance).toHaveProperty('totalReturn')
      expect(result.riskAssessment).toHaveProperty('overallRiskScore')
    })

    it('should validate ProjectionAccuracyMetrics structure', () => {
      const validMetrics: ProjectionAccuracyMetrics = {
        modelUsed: 'Manual Growth',
        projectionConfidence: 0.8,
        actualVsProjected: [
          {
            timestamp: 1704067200000,
            projected: 70000,
            actual: 70000,
            deviation: 0,
            deviationPercent: 0
          }
        ],
        accuracyScore: 95.5,
        deviationAnalysis: {
          meanAbsoluteError: 1500,
          rootMeanSquareError: 2000,
          meanAbsolutePercentageError: 2.1,
          maxDeviation: 5000,
          minDeviation: 0
        }
      }

      expect(validMetrics.modelUsed).toBeTypeOf('string')
      expect(validMetrics.projectionConfidence).toBeTypeOf('number')
      expect(validMetrics.actualVsProjected).toBeInstanceOf(Array)
      expect(validMetrics.accuracyScore).toBeTypeOf('number')
      expect(validMetrics.deviationAnalysis).toBeTypeOf('object')
      
      // Test ranges
      expect(validMetrics.projectionConfidence).toBeGreaterThanOrEqual(0)
      expect(validMetrics.projectionConfidence).toBeLessThanOrEqual(1)
      expect(validMetrics.accuracyScore).toBeGreaterThanOrEqual(0)
      expect(validMetrics.accuracyScore).toBeLessThanOrEqual(100)
    })

    it('should validate StrategyPerformanceMetrics structure', () => {
      const validMetrics: StrategyPerformanceMetrics = {
        totalReturn: 80000,
        totalReturnPercent: 114.3,
        annualizedReturn: 12.5,
        sharpeRatio: 1.8,
        maxDrawdown: 15000,
        maxDrawdownPercent: 21.4,
        winRate: 85.7,
        profitFactor: 2.3,
        averageMonthlyReturn: 1.04
      }

      expect(validMetrics.totalReturn).toBeTypeOf('number')
      expect(validMetrics.totalReturnPercent).toBeTypeOf('number')
      expect(validMetrics.annualizedReturn).toBeTypeOf('number')
      expect(validMetrics.sharpeRatio).toBeTypeOf('number')
      expect(validMetrics.maxDrawdown).toBeTypeOf('number')
      expect(validMetrics.maxDrawdownPercent).toBeTypeOf('number')
      expect(validMetrics.winRate).toBeTypeOf('number')
      expect(validMetrics.profitFactor).toBeTypeOf('number')
      expect(validMetrics.averageMonthlyReturn).toBeTypeOf('number')
      
      // Test ranges
      expect(validMetrics.winRate).toBeGreaterThanOrEqual(0)
      expect(validMetrics.winRate).toBeLessThanOrEqual(100)
      expect(validMetrics.profitFactor).toBeGreaterThanOrEqual(0)
    })

    it('should validate RiskAssessmentData structure', () => {
      const validRiskAssessment: RiskAssessmentData = {
        overallRiskScore: 6.5,
        liquidationRisk: 'low',
        volatilityRisk: 'medium',
        concentrationRisk: 'high',
        riskFactors: [
          'High Bitcoin concentration',
          'Interest rate sensitivity'
        ],
        recommendations: [
          'Consider diversification',
          'Monitor LTV ratios closely'
        ]
      }

      expect(validRiskAssessment.overallRiskScore).toBeTypeOf('number')
      expect(validRiskAssessment.liquidationRisk).toBeTypeOf('string')
      expect(validRiskAssessment.volatilityRisk).toBeTypeOf('string')
      expect(validRiskAssessment.concentrationRisk).toBeTypeOf('string')
      expect(validRiskAssessment.riskFactors).toBeInstanceOf(Array)
      expect(validRiskAssessment.recommendations).toBeInstanceOf(Array)
      
      // Test risk score range
      expect(validRiskAssessment.overallRiskScore).toBeGreaterThanOrEqual(0)
      expect(validRiskAssessment.overallRiskScore).toBeLessThanOrEqual(10)
      
      // Test risk level values
      const validRiskLevels = ['low', 'medium', 'high', 'critical']
      expect(validRiskLevels).toContain(validRiskAssessment.liquidationRisk)
      expect(validRiskLevels).toContain(validRiskAssessment.volatilityRisk)
      expect(validRiskLevels).toContain(validRiskAssessment.concentrationRisk)
    })
  })
})
