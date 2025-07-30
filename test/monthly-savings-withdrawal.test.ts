// Test for Monthly Savings/Withdrawal functionality

import { DEFAULT_PARAMS } from '../app/simulation/types/simulation'
import { runStrategySimulation } from '../lib/strategy-engine'
import type { StrategyEngineParams, PriceChartDataPoint, HistoricalDataPoint } from '../lib/strategy-engine/types'

// Mock price data for testing
const mockPriceData: PriceChartDataPoint[] = [
  { date: '2024-01-01', simulationPath: 100000, historical: 100000 },
  { date: '2024-02-01', simulationPath: 105000, historical: 105000 },
  { date: '2024-03-01', simulationPath: 110000, historical: 110000 },
]

const mockHistoricalData: HistoricalDataPoint[] = [
  { date: '2024-01-01', price: 100000 },
  { date: '2024-02-01', price: 105000 },
  { date: '2024-03-01', price: 110000 },
]

describe('Monthly Savings/Withdrawal Functionality', () => {
  
  test('Positive monthlyWithdrawalAmount should add BTC to stack (savings)', async () => {
    const params: StrategyEngineParams = {
      ...DEFAULT_PARAMS,
      monthlyWithdrawalAmount: 1000, // €1000 monthly savings
      simulationMonths: 3,
      investmentStrategy: 'default',
      expectedAnnualInflation: 2.0,
      btcAccumulation: true
    }

    const results = await runStrategySimulation(params, mockPriceData, mockHistoricalData)
    
    // Check that BTC amount increases over time due to savings
    expect(results[0].currentBtcAmount).toBeGreaterThan(DEFAULT_PARAMS.btcAmount)
    expect(results[1].currentBtcAmount).toBeGreaterThan(results[0].currentBtcAmount)
    expect(results[2].currentBtcAmount).toBeGreaterThan(results[1].currentBtcAmount)
    
    // Check that withdrawal amounts are positive (indicating savings)
    expect(results[0].withdrawalAmount).toBeGreaterThan(0)
    expect(results[1].withdrawalAmount).toBeGreaterThan(0)
    expect(results[2].withdrawalAmount).toBeGreaterThan(0)
  })

  test('Negative monthlyWithdrawalAmount should remove BTC from stack (withdrawal)', async () => {
    const params: StrategyEngineParams = {
      ...DEFAULT_PARAMS,
      monthlyWithdrawalAmount: -1000, // €1000 monthly withdrawal
      simulationMonths: 3,
      investmentStrategy: 'default',
      expectedAnnualInflation: 2.0,
      btcAccumulation: true
    }

    const results = await runStrategySimulation(params, mockPriceData, mockHistoricalData)
    
    // Check that withdrawal amounts are negative (indicating withdrawals)
    expect(results[0].withdrawalAmount).toBeLessThan(0)
    expect(results[1].withdrawalAmount).toBeLessThan(0)
    expect(results[2].withdrawalAmount).toBeLessThan(0)
  })

  test('Zero monthlyWithdrawalAmount should have no effect', async () => {
    const params: StrategyEngineParams = {
      ...DEFAULT_PARAMS,
      monthlyWithdrawalAmount: 0, // No savings or withdrawals
      simulationMonths: 3,
      investmentStrategy: 'default',
      expectedAnnualInflation: 2.0,
      btcAccumulation: true
    }

    const results = await runStrategySimulation(params, mockPriceData, mockHistoricalData)
    
    // Check that withdrawal amounts are zero
    expect(results[0].withdrawalAmount).toBe(0)
    expect(results[1].withdrawalAmount).toBe(0)
    expect(results[2].withdrawalAmount).toBe(0)
  })

  test('Default value should be 150 (savings)', () => {
    expect(DEFAULT_PARAMS.monthlyWithdrawalAmount).toBe(150)
  })
})
