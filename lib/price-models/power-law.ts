// lib/price-models/power-law.ts

export const GENESIS_DATE = new Date("2009-01-03")

// This model is now based on the exact parameters from Giovanni Santostasi's Power Law model.
// Price = 10^intercept * (days)^slope
// This corresponds to a straight line in a log-log plot.
const POWER_LAW_MODELS = {
  // Central fit line based on the formula: slope = 5.68, intercept = -16.493
  fit: { slope: 5.68, intercept: -16.493 },
  // Support and Resistance lines are calibrated to frame the historical data within the log-log model.
  support: { slope: 5.85, intercept: -17.55 },
  resistance: { slope: 5.57, intercept: -15.75 },
}

export type PowerLawLine = keyof typeof POWER_LAW_MODELS

/**
 * Calculates the number of days between a given date and the Bitcoin genesis date.
 * @param date The target date.
 * @returns The number of days elapsed.
 */
export const getDaysSinceGenesis = (date: Date): number => {
  // Exported for use in chart
  const diffTime = Math.abs(date.getTime() - GENESIS_DATE.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculates the predicted Bitcoin price for a given date based on the Power Law model.
 * @param date The date for which to predict the price.
 * @param line The Power Law line to use for the calculation (fit, support, or resistance).
 * @returns The predicted price in EUR.
 */
export const getPowerLawPrice = (date: Date, line: PowerLawLine): number => {
  const days = getDaysSinceGenesis(date)
  if (days <= 0) return 0

  const model = POWER_LAW_MODELS[line]
  const logPrice = model.slope * Math.log10(days) + model.intercept
  const priceUsd = Math.pow(10, logPrice)

  // Using a static conversion rate for simplicity. In a real app, this should be dynamic.
  const usdToEurRate = 0.92
  return priceUsd * usdToEurRate
}

/**
 * Generates a series of data points for the Power Law model chart.
 * @param startDate The start date for the data series.
 * @param endDate The end date for the data series.
 * @param intervalDays The interval in days between data points.
 * @returns An array of data points with date and prices for each line.
 */
export const generatePowerLawChartData = (startDate: Date, endDate: Date, intervalDays = 1) => {
  const data = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    data.push({
      date: currentDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
      days: getDaysSinceGenesis(currentDate),
      fit: getPowerLawPrice(currentDate, "fit"),
      support: getPowerLawPrice(currentDate, "support"),
      resistance: getPowerLawPrice(currentDate, "resistance"),
    })
    currentDate.setDate(currentDate.getDate() + intervalDays)
  }

  return data
}
