import type { ProjectionPoint } from '../types'
import { addCalendarMonths } from './cycleReplay'

export function projectionMetrics(points: ProjectionPoint[], startPrice: number) {
  const finalPrice = points.at(-1)?.price ?? startPrice
  let peak = startPrice, maxDecline = 0
  for (const point of points) {
    peak = Math.max(peak, point.price)
    maxDecline = Math.min(maxDecline, (point.price / peak - 1) * 100)
  }
  const start = points[0]?.timestamp ?? 0
  const end = points.at(-1)?.timestamp ?? start
  const years = (end - start) / (365.2425 * 86400000)
  const avgAnnualGrowth = years > 0 ? (Math.pow(finalPrice / startPrice, 1 / years) - 1) * 100 : 0
  const priceAt = (timestamp: number) => {
    const right = points.findIndex(point => point.timestamp >= timestamp)
    if (right <= 0) return points[Math.max(0, right)]?.price ?? startPrice
    const left = points[right - 1], next = points[right]
    const fraction = (timestamp - left.timestamp) / (next.timestamp - left.timestamp)
    return left.price * Math.pow(next.price / left.price, fraction)
  }
  const annualReturns: number[] = []
  for (let year = 1; addCalendarMonths(start, year * 12) <= end; year++) {
    const previous = year === 1 ? startPrice : priceAt(addCalendarMonths(start, (year - 1) * 12))
    annualReturns.push((priceAt(addCalendarMonths(start, year * 12)) / previous - 1) * 100)
  }
  return { finalPrice, totalGrowth: (finalPrice / startPrice - 1) * 100, maxDecline,
    avgAnnualGrowth, peakGrowth: annualReturns.length ? Math.max(...annualReturns) : null }
}
