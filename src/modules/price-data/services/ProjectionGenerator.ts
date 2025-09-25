/**
 * Projection Generator Service
 * 
 * Generates price projection paths for different models.
 * Migrated from lib/price-engine/projection-generator.ts
 */

import type { PriceEngineParams, ProjectionPathPoint } from '../types'

/**
 * Service for generating price projections using various models.
 */
export class ProjectionGenerator {
  
  /**
   * Generate price projection path for the selected model.
   * This is separated from historical data processing for better performance.
   */
  public generateProjectionPath(params: PriceEngineParams & {
    projectionStartDate?: Date
  }): ProjectionPathPoint[] {
    console.log(`🎯 Generating projection for model: ${params.priceModel}`)

    // Use projectionStartDate if provided, otherwise use current date
    let startDate: Date
    if (params.projectionStartDate) {
      startDate = params.projectionStartDate instanceof Date
        ? params.projectionStartDate
        : new Date(params.projectionStartDate)
    } else {
      startDate = new Date()
    }

    const projectionParams = { ...params, projectionStartDate: startDate }

    switch (params.priceModel) {
      case "manual":
        const manualPath = this.generateManualPath(projectionParams)
        console.log(`📈 Manual path generated: ${manualPath.length} points (starting from ${startDate.toISOString().split('T')[0]})`)
        return manualPath

      case "powerLaw":
        const powerLawPath = this.generatePowerLawPath(projectionParams)
        console.log(`📈 Power Law path generated: ${powerLawPath.length} points (line: ${params.powerLawSettings.prognosisLine})`)
        return powerLawPath

      case "cycleRepeat":
        const cycleRepeatPath = this.generateCycleRepeatPath(projectionParams)
        console.log(`📈 Cycle Repeat path generated: ${cycleRepeatPath.length} points`)
        return cycleRepeatPath

      case "cycleRepeatPowerLaw":
        const cycleRepeatPowerLawPath = this.generateCycleRepeatPowerLawPath(projectionParams)
        console.log(`📈 Cycle Repeat Power Law path generated: ${cycleRepeatPowerLawPath.length} points`)
        return cycleRepeatPowerLawPath

      default:
        throw new Error(`Unknown price model: ${params.priceModel}`)
    }
  }

  /**
   * Generate manual growth path based on annual growth rates.
   */
  private generateManualPath(params: PriceEngineParams & {
    projectionStartDate?: Date
  }): ProjectionPathPoint[] {
    const { simulationMonths, initialBtcPrice, annualGrowthRates, projectionStartDate } = params
    const path: ProjectionPathPoint[] = []
    const simulationStartDate = projectionStartDate || new Date()

    let lastPrice = initialBtcPrice
    const totalDays = Math.floor((simulationMonths / 12) * 365)

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(simulationStartDate)
      currentDate.setDate(currentDate.getDate() + day)

      // Calculate which year we're in and get the appropriate growth rate
      const yearIndex = Math.floor(day / 365)
      const growthRate = annualGrowthRates[Math.min(yearIndex, annualGrowthRates.length - 1)] || 0

      // Calculate daily growth rate from annual rate
      const dailyGrowthRate = Math.pow(1 + growthRate / 100, 1 / 365) - 1
      
      // Apply daily growth
      if (day > 0) {
        lastPrice *= (1 + dailyGrowthRate)
      }

      path.push({
        date: currentDate,
        price: lastPrice
      })
    }

    return path
  }

  /**
   * Generate Power Law projection path.
   * Placeholder - will be implemented with actual Power Law model.
   */
  private generatePowerLawPath(params: PriceEngineParams & {
    projectionStartDate?: Date
  }): ProjectionPathPoint[] {
    // This is a placeholder implementation
    // The actual Power Law model will be imported from the models directory
    const { simulationMonths, initialBtcPrice, projectionStartDate } = params
    const path: ProjectionPathPoint[] = []
    const simulationStartDate = projectionStartDate || new Date()

    const totalDays = Math.floor((simulationMonths / 12) * 365)
    
    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(simulationStartDate)
      currentDate.setDate(currentDate.getDate() + day)

      // Placeholder Power Law calculation
      // This will be replaced with actual Power Law model implementation
      const daysSinceGenesis = this.getDaysSinceGenesis(currentDate)
      const price = this.calculatePowerLawPrice(daysSinceGenesis, params.powerLawSettings.prognosisLine)

      path.push({
        date: currentDate,
        price: price || initialBtcPrice
      })
    }

    return path
  }

  /**
   * Generate Cycle Repeat projection path.
   * Placeholder - will be implemented with actual Cycle Repeat model.
   */
  private generateCycleRepeatPath(params: PriceEngineParams & {
    projectionStartDate?: Date
  }): ProjectionPathPoint[] {
    // Placeholder implementation
    const { simulationMonths, initialBtcPrice, projectionStartDate } = params
    const path: ProjectionPathPoint[] = []
    const simulationStartDate = projectionStartDate || new Date()

    const totalDays = Math.floor((simulationMonths / 12) * 365)
    
    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(simulationStartDate)
      currentDate.setDate(currentDate.getDate() + day)

      // Placeholder cycle repeat calculation
      const price = initialBtcPrice * Math.pow(1.001, day) // Simple growth for now

      path.push({
        date: currentDate,
        price
      })
    }

    return path
  }

  /**
   * Generate Cycle Repeat Power Law projection path.
   * Placeholder - will be implemented with actual model.
   */
  private generateCycleRepeatPowerLawPath(params: PriceEngineParams & {
    projectionStartDate?: Date
  }): ProjectionPathPoint[] {
    // Placeholder implementation
    const { simulationMonths, initialBtcPrice, projectionStartDate } = params
    const path: ProjectionPathPoint[] = []
    const simulationStartDate = projectionStartDate || new Date()

    const totalDays = Math.floor((simulationMonths / 12) * 365)
    
    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(simulationStartDate)
      currentDate.setDate(currentDate.getDate() + day)

      // Placeholder calculation combining cycle repeat and power law
      const price = initialBtcPrice * Math.pow(1.0015, day) // Simple growth for now

      path.push({
        date: currentDate,
        price
      })
    }

    return path
  }

  /**
   * Calculate days since Bitcoin genesis block (January 3, 2009).
   */
  private getDaysSinceGenesis(date: Date): number {
    const genesisDate = new Date('2009-01-03')
    const diffTime = date.getTime() - genesisDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Calculate Power Law price for a given date and line type.
   * Based on Giovanni Santostasi's Power Law Theory: Price = constant × (days since Genesis Block)^5.8
   */
  private calculatePowerLawPrice(daysSinceGenesis: number, lineType: string): number {
    // Exact straight line fit between $0.53 (2011-01-01) and $4,785,285.25 (2040-01-01)
    const exponent = 5.836656989322271 // Exact slope from straight line fit
    const exactConstant = 1.0447124016e-17 // Exact constant from straight line fit

    // Line-specific adjustments using log-space differences
    let lineMultiplier = 1
    switch (lineType) {
      case 'support':
        lineMultiplier = Math.pow(10, -0.15) // 0.15 lower in log space
        break
      case 'resistance':
        lineMultiplier = Math.pow(10, 0.15) // 0.15 higher in log space
        break
      case 'fit':
      default:
        lineMultiplier = 1
        break
    }

    return exactConstant * Math.pow(daysSinceGenesis, exponent) * lineMultiplier
  }
}
