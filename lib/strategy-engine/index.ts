// lib/strategy-engine/index.ts

import type { 
  StrategyEngineParams, 
  MonthlyResult, 
  Loan, 
  MonthlyEvent,
  HistoricalDataPoint,
  PriceChartDataPoint,
  InvestmentStrategyInterface,
  StrategyContext
} from "./types"

import { DefaultStrategy } from "./strategies/default"
import { AthBasedStrategy } from "./strategies/ath-based"
import { MovingAverageStrategy } from "./strategies/moving-average"

// Platform constants
const PLATFORM_LTV_NEW_LOANS = 50

/**
 * The main dispatcher for the Strategy Engine.
 * This function orchestrates the entire simulation process using the selected strategy.
 */
export async function runStrategySimulation(
  params: StrategyEngineParams,
  priceChartData: PriceChartDataPoint[],
  historicalPriceData: HistoricalDataPoint[]
): Promise<MonthlyResult[]> {
  
  // Get the appropriate strategy instance
  const strategy = getStrategyInstance(params.investmentStrategy)
  
  // Create a fast lookup map for prices
  const priceLookup = new Map<string, number>()
  priceChartData.forEach((p) => {
    if (p.simulationPath) {
      priceLookup.set(p.date, p.simulationPath)
    }
  })

  const tempResults: MonthlyResult[] = []
  let activeLoans: Loan[] = []
  let totalBtcAmount = params.btcAmount
  let nextLoanId = 1
  const simulationStartDate = new Date()
  const monthlyInflationRate = Math.pow(1 + params.expectedAnnualInflation / 100, 1 / 12) - 1
  let cumulativeInflationFactor = 1

  for (let month = 1; month <= params.simulationMonths; month++) {
    cumulativeInflationFactor *= 1 + monthlyInflationRate
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)
    const dateStringForTable = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`
    const dateStringForLookup = currentDate.toISOString().split("T")[0]

    // Get the pre-calculated BTC price from our lookup map
    const btcPrice = priceLookup.get(dateStringForLookup) ?? params.initialBtcPrice

    const monthlyEvents: MonthlyEvent[] = []
    const collateralValue = totalBtcAmount * btcPrice
    const debtCapacity = collateralValue * (params.riskManagement.targetLtv / 100)

    // Create strategy context
    const strategyContext: StrategyContext = {
      month,
      currentDate,
      btcPrice,
      totalBtcAmount,
      activeLoans: [...activeLoans], // Copy to prevent mutation
      collateralValue,
      debtCapacity,
      historicalPriceData,
      priceChartData,
      params
    }

    // Get strategy decision
    const decision = strategy.makeDecision(strategyContext)

    // Process loan maturities
    const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
    const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
    const debtFromOngoingLoans = activeLoans
      .filter((l) => l.maturityMonth !== month)
      .reduce((sum, l) => sum + l.repaymentAmount, 0)

    // Apply strategy decision for withdrawal
    let withdrawalThisMonth = decision.allowWithdrawal ? decision.withdrawalAmount : 0
    if (!decision.allowWithdrawal && params.monthlyWithdrawalAmount > 0) {
      monthlyEvents.push({ type: "withdrawal_skipped" })
    }

    // Calculate principal needed for basic needs
    let principalForNeeds = (repaymentDue + withdrawalThisMonth) / (1 - params.loanOriginationFeePercent / 100)
    let principalForReinvestment = 0

    const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

    // Apply strategy decision for investment
    if (decision.allowInvestment && projectedDebtAfterNeeds <= debtCapacity) {
      const remainingDebtCapacity = debtCapacity - projectedDebtAfterNeeds
      principalForReinvestment = remainingDebtCapacity * decision.investmentMultiplier
    } else if (projectedDebtAfterNeeds > debtCapacity) {
      // Need to handle debt capacity overflow
      principalForReinvestment = 0
      
      // Check if we can at least cover repayments
      principalForNeeds = repaymentDue / (1 - params.loanOriginationFeePercent / 100)
      const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForNeeds
      
      if (projectedDebtForRepaymentOnly > debtCapacity) {
        // Need to deleverage
        const shortfall = projectedDebtForRepaymentOnly - debtCapacity
        const btcToSell = shortfall / btcPrice

        if (totalBtcAmount > btcToSell) {
          totalBtcAmount -= btcToSell
          monthlyEvents.push({ type: "deleveraged", amount: btcToSell })
          principalForNeeds = debtCapacity - debtFromOngoingLoans
        } else {
          // Liquidation scenario
          totalBtcAmount = 0
          activeLoans.forEach((l) => monthlyEvents.push({ type: "liquidated", id: l.id }))
          principalForNeeds = 0
        }
      }
    }

    // Remove matured loans
    activeLoans = activeLoans.filter((l) => l.maturityMonth !== month)

    // Create new loans
    const totalNewPrincipal = principalForNeeds + principalForReinvestment
    const interestFactor = 1 + (params.annualInterestRate / 100) * (params.loanTermMonths / 12)

    let principalLeftToCreate = totalNewPrincipal
    while (principalLeftToCreate > 1) {
      const loanPrincipal = Math.min(principalLeftToCreate, params.maxLoanAmount)
      const newRepaymentAmount = loanPrincipal * interestFactor
      const btcToLock = newRepaymentAmount / (btcPrice * (PLATFORM_LTV_NEW_LOANS / 100))

      if (totalBtcAmount < btcToLock) break

      activeLoans.push({
        id: nextLoanId++,
        month: month,
        principal: loanPrincipal,
        maturityMonth: month + params.loanTermMonths,
        repaymentAmount: newRepaymentAmount,
        lockedBtc: btcToLock,
      })
      principalLeftToCreate -= loanPrincipal
    }

    // Handle reinvestment
    let reinvestmentAmount = 0
    if (principalForReinvestment > 0) {
      const proceeds = principalForReinvestment * (1 - params.loanOriginationFeePercent / 100)
      const btcBought = proceeds / btcPrice
      totalBtcAmount += btcBought
      reinvestmentAmount = proceeds
    }

    // Calculate final values for this month
    const finalTotalDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
    const finalCollateralValue = totalBtcAmount * btcPrice
    const finalLockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
    const finalFreeBtc = totalBtcAmount - finalLockedBtc
    const highestLtv = activeLoans.length > 0
      ? Math.max(...activeLoans.map((l) => (l.repaymentAmount / (l.lockedBtc * btcPrice)) * 100))
      : 0

    tempResults.push({
      month,
      dateString: dateStringForTable,
      btcPrice: Math.round(btcPrice),
      collateralValue: Math.round(finalCollateralValue),
      realCollateralValue: Math.round(finalCollateralValue / cumulativeInflationFactor),
      totalDebt: Math.round(finalTotalDebt),
      realTotalDebt: Math.round(finalTotalDebt / cumulativeInflationFactor),
      withdrawalAmount: Math.round(withdrawalThisMonth),
      newLoanPrincipal: Math.round(totalNewPrincipal),
      repaymentsDue: Math.round(repaymentDue),
      reinvestment: Math.round(reinvestmentAmount),
      currentBtcAmount: totalBtcAmount,
      freeBtc: finalFreeBtc,
      lockedBtc: finalLockedBtc,
      loanCount: activeLoans.length,
      highestLtv: isFinite(highestLtv) ? Math.round(highestLtv) : 0,
      events: monthlyEvents,
    })
  }

  return tempResults
}

/**
 * Get the appropriate strategy instance based on the strategy type
 */
function getStrategyInstance(strategyType: string): InvestmentStrategyInterface {
  switch (strategyType) {
    case "default":
      return new DefaultStrategy()
    case "athBased":
      return new AthBasedStrategy()
    case "movingAverage":
      return new MovingAverageStrategy()
    default:
      console.warn(`Unknown strategy type: ${strategyType}, falling back to default`)
      return new DefaultStrategy()
  }
}

/**
 * Get all available strategies with their metadata
 */
export function getAvailableStrategies(): Array<{
  id: string
  name: string
  description: string
  metadata: any
  detailedDescription: string
  functionality: string
  suitability: string
}> {
  const defaultStrategy = new DefaultStrategy()
  const athBasedStrategy = new AthBasedStrategy()
  const movingAverageStrategy = new MovingAverageStrategy()

  return [
    {
      id: "default",
      name: defaultStrategy.getName(),
      description: defaultStrategy.getDescription(),
      metadata: defaultStrategy.getMetadata(),
      detailedDescription: defaultStrategy.getDetailedDescription(),
      functionality: defaultStrategy.getFunctionality(),
      suitability: defaultStrategy.getSuitability()
    },
    {
      id: "athBased",
      name: athBasedStrategy.getName(),
      description: athBasedStrategy.getDescription(),
      metadata: athBasedStrategy.getMetadata(),
      detailedDescription: athBasedStrategy.getDetailedDescription(),
      functionality: athBasedStrategy.getFunctionality(),
      suitability: athBasedStrategy.getSuitability()
    },
    {
      id: "movingAverage",
      name: movingAverageStrategy.getName(),
      description: movingAverageStrategy.getDescription(),
      metadata: movingAverageStrategy.getMetadata(),
      detailedDescription: movingAverageStrategy.getDetailedDescription(),
      functionality: movingAverageStrategy.getFunctionality(),
      suitability: movingAverageStrategy.getSuitability()
    }
  ]
}
