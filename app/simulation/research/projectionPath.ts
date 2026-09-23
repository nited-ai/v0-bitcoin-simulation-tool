import type { PriceProjectionResult, ProjectionPoint } from '../price-models/types'
import type { StressSettings } from './settings'
import type { PriceDay } from '@/src/modules/simulator/types'
import { DAY, addMonths, timestamp } from '@/src/modules/simulator/paths'

/** Turn monthly anchors into daily assumptions, preserving every supplied daily candle. */
export function dailyProjection(source: PriceProjectionResult, stress?: StressSettings): PriceProjectionResult {
  const points = source.projectionPoints
  if (points.length < 2) throw new Error('Für die Simulation fehlen Kursstände.')
  points.forEach((p, i) => {
    if (!Number.isFinite(p.price) || p.price <= 0 || !Number.isFinite(p.timestamp) || p.timestamp % DAY !== 0 ||
      (i > 0 && p.timestamp <= points[i - 1].timestamp)) throw new Error('Ungültige oder unsortierte Projektionspunkte.')
  })
  const start = points[0].timestamp
  const end = timestamp(addMonths(new Date(start).toISOString().slice(0, 10), source.metadata.totalMonths))
  if (points.at(-1)!.timestamp !== end) throw new Error('Die Projektion deckt den Simulationszeitraum nicht vollständig ab.')
  const hasReplay = points.slice(1).every((p, i) => p.timestamp - points[i].timestamp === DAY && p.metadata?.low !== undefined)
  const output: ProjectionPoint[] = []
  let next = 1
  for (let time = start; time <= end; time += DAY) {
    while (next < points.length - 1 && points[next].timestamp < time) next++
    const left = points[next - 1], right = points[next]
    const exact = time === left.timestamp ? left : time === right.timestamp ? right : undefined
    const fraction = (time - left.timestamp) / (right.timestamp - left.timestamp)
    const price = exact?.price ?? left.price * Math.pow(right.price / left.price, fraction)
    const open = exact?.metadata?.open ?? output.at(-1)?.price ?? price
    const low = exact?.metadata?.low ?? Math.min(open, price)
    const high = exact?.metadata?.high ?? Math.max(open, price)
    if (![open, low, high].every(x => typeof x === 'number' && Number.isFinite(x) && x > 0) ||
      low > Math.min(open, price) || high < Math.max(open, price)) throw new Error('Ungültige Tagesgrenzen in der Projektion.')
    output.push({ ...exact, timestamp: time, price, confidence: 0,
      metadata: { ...exact?.metadata, open, low, high, candleKind: hasReplay ? 'cycle-replay' : 'interpolated' } })
  }
  if (stress?.enabled) {
    if (!Number.isInteger(stress.month) || stress.month < 1 || stress.month > source.metadata.totalMonths ||
      !Number.isFinite(stress.dropPercent) || stress.dropPercent < 0 || stress.dropPercent > 99) throw new Error('Flashcrash: gültigen Monat und Rückgang von 0 bis 99 % wählen.')
    const day = timestamp(addMonths(new Date(start).toISOString().slice(0, 10), stress.month))
    const point = output[(day - start) / DAY]
    point.metadata!.low = Math.min(point.metadata!.low, point.metadata!.open * (1 - stress.dropPercent / 100))
    point.metadata!.stress = true
  }
  return { ...source, projectionPoints: output, metadata: { ...source.metadata, daily: true,
    candleKind: hasReplay ? 'cycle-replay' : 'interpolated', stress: stress?.enabled ? stress : null } }
}

export function projectionPath(projection: PriceProjectionResult): PriceDay[] {
  return projection.projectionPoints.map(p => ({ date: new Date(p.timestamp).toISOString().slice(0, 10),
    close: p.price, open: p.metadata?.open ?? p.price, high: p.metadata?.high ?? p.price, low: p.metadata?.low ?? p.price }))
}
