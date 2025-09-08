/**
 * Price Projection Tab Components
 * Barrel export for all price projection related components
 */

// Main price projection components
export { PriceModelSelector } from './PriceModelSelector'
export { default as UnifiedPriceChart } from './UnifiedPriceChart'
export { PriceProjectionChart } from './PriceProjectionChart'
export { GrowthRateAnalysis } from './GrowthRateAnalysis'
export { SimulationLengthControl } from './SimulationLengthControl'

// Manual growth model components
export { CustomGrowthRateSliders } from './manual/CustomGrowthRateSliders'
export { ManualGrowthControls } from './manual/ManualGrowthControls'
export { ManualGrowthModelInterface } from './manual/ManualGrowthModelInterface'
export { SimplifiedManualGrowthInterface } from './manual/SimplifiedManualGrowthInterface'
export { InteractiveProjectionChart } from './manual/InteractiveProjectionChart'

// Cycle repeat model components
export { DiminishingReturnsControls } from './cycle-repeat/DiminishingReturnsControls'

// Logarithmic curve model components
export { LogarithmicCurveControls } from './logarithmic-curve/LogarithmicCurveControls'
