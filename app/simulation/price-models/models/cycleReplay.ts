import type { HistoricalDataPoint } from '@/src/modules/price-data/types'
import type { PriceModelParams, PriceProjectionResult, ProjectionPoint } from '../types'
import type { DiminishingReturnsParams } from './EnhancedCycleRepeatModel'

const DAY = 86400000
export const REFERENCE_CYCLES = {
  '2016-2020': { start: '2016-07-09', end: '2020-05-11' },
  '2020-2024': { start: '2020-05-11', end: '2024-04-20' },
} as const

export function addCalendarMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.getTime()
}

/** Replays observed close returns; it does not fit or predict a price cycle. */
export function replayHistoricalCycle(history: HistoricalDataPoint[], params: PriceModelParams,
  settings: DiminishingReturnsParams): PriceProjectionResult {
  const today = Date.parse(new Date().toISOString().slice(0, 10))
  const data = history.filter(p => p.time * 1000 < today).sort((a, b) => a.time - b.time)
  if (data.length < 2) throw new Error('Für die Zykluswiederholung fehlen historische Tageskurse.')
  const cycle = settings.referenceCycle ?? 'trailing'
  if (cycle !== 'trailing' && !(cycle in REFERENCE_CYCLES)) throw new Error('Unbekannter Referenzzyklus.')
  const fixed = cycle === 'trailing' ? null : REFERENCE_CYCLES[cycle]
  const end = fixed ? Date.parse(fixed.end) : data[data.length - 1].time * 1000
  const start = fixed ? Date.parse(fixed.start) : addCalendarMonths(end, -48)
  const rows = data.filter(p => p.time * 1000 >= start && p.time * 1000 <= end)
  if (rows.length < 2 || rows[0].time * 1000 !== start || rows.at(-1)!.time * 1000 !== end) {
    throw new Error('Der gewählte Referenzzyklus ist nicht vollständig in den Kursdaten enthalten.')
  }
  rows.forEach((row, i) => {
    if (![row.close, row.open, row.low, row.high].every(n => Number.isFinite(n) && n > 0)) {
      throw new Error('Ungültige historische Tageskurse im Referenzzyklus.')
    }
    if (row.low > Math.min(row.open, row.close) || row.high < Math.max(row.open, row.close)) {
      throw new Error('Ungültige OHLC-Grenzen im Referenzzyklus.')
    }
    if (i && (row.time - rows[i - 1].time) * 1000 !== DAY) {
      throw new Error('Der Referenzzyklus enthält eine Lücke oder doppelte Tageskurse.')
    }
  })
  const phase = settings.phaseMonths ?? 0
  if (!Number.isInteger(phase) || phase < 0 || phase > 47) throw new Error('Zyklusphase muss zwischen 0 und 47 Monaten liegen.')
  const phaseDate = addCalendarMonths(start, phase)
  if (phaseDate >= end) throw new Error('Die Startphase liegt außerhalb des Referenzzyklus.')
  const offset = (phaseDate - start) / DAY
  const count = rows.length - 1
  const finish = addCalendarMonths(today, params.projectionMonths)
  const length = (finish - today) / DAY
  const points: ProjectionPoint[] = [{ timestamp: today, price: params.startPrice, confidence: 0 }]
  let price = params.startPrice
  for (let i = 0; i < length; i++) {
    const index = (offset + i) % count
    const previous = rows[index]
    const next = rows[index + 1]
    const movement = next.close / previous.close
    // These two legacy fields are the only effective dampening parameters.
    const gain = movement - 1
    const threshold = settings.cycleDegradation
    const adjusted = gain > threshold
      ? 1 + Math.max(gain * 0.1, threshold + (gain - threshold) * (1 - settings.diminishingFactor))
      : movement
    const opening = price * next.open / previous.close
    const low = price * next.low / previous.close
    const high = price * next.high / previous.close
    price *= adjusted
    if (!Number.isFinite(price) || price <= 0) throw new Error('Dieses Szenario überschreitet den gültigen Kursbereich.')
    points.push({ timestamp: today + (i + 1) * DAY, price, confidence: 0,
      metadata: { sourceDate: new Date(next.time * 1000).toISOString().slice(0, 10),
        open: opening, low: Math.min(low, opening, price), high: Math.max(high, opening, price),
        originalMovement: movement, adjustedMovement: adjusted,
      },
    })
  }
  return { modelName: 'Historical Cycle Replay', modelVersion: '3.0.0', projectionPoints: points,
    metadata: { totalMonths: params.projectionMonths,
      totalGrowth: (price / params.startPrice - 1) * 100,
      averageMonthlyGrowth: (Math.pow(price / params.startPrice, 1 / params.projectionMonths) - 1) * 100,
      confidence: 0, confidenceKind: 'not-estimated', generatedAt: new Date().toISOString(),
      referenceStart: new Date(start).toISOString().slice(0, 10),
      referenceEnd: new Date(end).toISOString().slice(0, 10),
      replayStartsAt: new Date(phaseDate).toISOString().slice(0, 10),
      historicalMovementsCount: count, cycleLengthDays: count,
      baseDiminishingReturnsParams: settings,
    },
  }
}
