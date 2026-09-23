import type { JournalRow, Plan, SimulationResult } from '@/src/modules/simulator/types'

export const money = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
export const btc = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 8 })
export const percent = (value: number) => Number.isFinite(value) ? `${(value * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %` : '∞'
export const dayLabel = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC' })

export function collateral(row: JournalRow, plan: Plan) {
  const detail = row as JournalRow & { collateralBtc?: number; freeBtc?: number; topUpBtc?: number }
  const pledged = detail.collateralBtc ?? (row.debt > 0 ? Math.min(row.btc, row.debt / (row.price * plan.maxLtv)) : 0)
  return { pledged, free: detail.freeBtc ?? Math.max(0, row.btc - pledged), topUp: detail.topUpBtc ?? 0 }
}

/** Exact daily engine values; display rounding never feeds the export. */
export function journalCsv(result: SimulationResult, plan: Plan): string {
  const columns: [string, (row: JournalRow) => string | number | null][] = [
    ['Datum', r => r.date], ['Strategie', () => result.strategy],
    ['BTC_Kurs_USD', r => r.price], ['Tagestief_USD', r => r.low],
    ['BTC_Bestand', r => r.btc], ['BTC_Verpfändet', r => collateral(r, plan).pledged],
    ['BTC_Frei', r => collateral(r, plan).free], ['BTC_Nachbesicherung', r => collateral(r, plan).topUp],
    ['Cash_USD', r => r.cash], ['Schulden_USD', r => r.debt],
    ['Nettovermoegen_USD', r => r.netWorth], ['Nettovermoegen_real_USD', r => r.realNetWorth],
    ['Einzahlung_USD', r => r.contribution], ['Entnahme_geplant_USD', r => r.requested],
    ['Entnahme_gezahlt_USD', r => r.paid], ['Entnahmeluecke_USD', r => r.shortfall],
    ['Gebuehren_USD', r => r.fees], ['Zinsen_USD', r => r.interest],
    ['LTV_Anteil', r => r.ltv], ['Pruef_LTV_Tagestief_Anteil', r => r.triggerLtv],
    ['Liquidationsschwelle_USD', r => r.liquidationPrice], ['Kreditspielraum_USD', r => r.borrowCapacity],
    ['Gekaufte_BTC', r => r.boughtBtc], ['Kaufkurs_USD', r => r.purchasePrice],
    ['Signal_ATH_USD', r => r.signalAth], ['Kaufschwelle_USD', r => r.buyThreshold],
    ['Ereignis', r => r.event],
  ]
  const escape = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return '\uFEFF' + [columns.map(([name]) => escape(name)).join(';'), ...result.journal.map(row => columns.map(([, get]) => escape(get(row))).join(';'))].join('\r\n')
}

export function downloadJournal(result: SimulationResult, plan: Plan) {
  const url = URL.createObjectURL(new Blob([journalCsv(result, plan)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `btc-${result.strategy}-${plan.startDate}-tagesjournal.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
