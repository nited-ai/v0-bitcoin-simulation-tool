"use client"

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STRATEGIES, type SimulationResult, type StrategyId } from '@/src/modules/simulator/types'
import { useResearch } from './ResearchContext'
import { btc, dayLabel, money, percent } from './resultsExport'

type Metric = 'finalNetWorth' | 'profit' | 'finalBtc' | 'finalDebt' | 'withdrawn' | 'shortfall' | 'maxDrawdown' | 'timeWeightedReturn' | 'maxLtv' | 'fees' | 'interest' | 'liquidations'
const metrics: { key: Metric; label: string; format: (value: number) => string }[] = [
  { key: 'finalNetWorth', label: 'Nettovermögen', format: money },
  { key: 'profit', label: 'Gewinn inkl. Entnahmen', format: money },
  { key: 'finalBtc', label: 'BTC am Ende', format: btc },
  { key: 'finalDebt', label: 'Restschuld', format: money },
  { key: 'withdrawn', label: 'Entnahmen gezahlt', format: money },
  { key: 'shortfall', label: 'Entnahmelücke', format: money },
  { key: 'maxDrawdown', label: 'Höchststand-Rückgang (TWR)', format: percent },
  { key: 'timeWeightedReturn', label: 'Zeitgewichtete Rendite', format: percent },
  { key: 'maxLtv', label: 'Max. LTV', format: percent },
  { key: 'fees', label: 'Gebühren', format: money },
  { key: 'interest', label: 'Zinsen', format: money },
  { key: 'liquidations', label: 'Liquidationen', format: value => String(value) },
]

export function ResearchComparison() {
  const { plan, path, results, error, quality, loading } = useResearch()
  const [selected, setSelected] = useState<StrategyId[]>(['hold', 'ath-dca', 'credit'])
  const [sort, setSort] = useState<Metric>('finalNetWorth')
  const [ascending, setAscending] = useState(false)
  const compared = useMemo(() => selected.map(id => results[id]).filter((result): result is SimulationResult => !!result), [results, selected])
  const sorted = useMemo(() => [...compared].sort((a, b) => ((sort === 'timeWeightedReturn' || sort === 'maxDrawdown') && a.returnMetricsValid === false ? 1 : (sort === 'timeWeightedReturn' || sort === 'maxDrawdown') && b.returnMetricsValid === false ? -1 : (a[sort] - b[sort]) * (ascending ? 1 : -1))), [compared, sort, ascending])
  const chartData = useMemo(() => {
    if (!compared.length) return []
    const length = compared[0].journal.length
    const step = Math.max(1, Math.ceil(length / 500))
    return compared[0].journal.flatMap((row, index) => {
      if (index % step !== 0 && index !== length - 1 && !compared.some(result => /Liquidation|[Ff]älligkeit|Nachbesicherung/.test(result.journal[index]?.event ?? '') || (result.journal[index]?.shortfall ?? 0) > 0.01)) return []
      const point: Record<string, string | number> = { date: row.date }
      for (const result of compared) {
        const day = result.journal[index]
        if (day?.date === row.date) point[result.strategy] = day.netWorth
      }
      return [point]
    })
  }, [compared])
  if (error) return <Card><CardContent className="pt-6 text-destructive" role="alert">{error}</CardContent></Card>
  if (loading) return <p className="py-8 text-muted-foreground" role="status">Strategien werden auf demselben Kursverlauf berechnet …</p>
  if (!plan || !path.length || !Object.keys(results).length) return <p className="py-8 text-muted-foreground">Für den Vergleich bitte zuerst Parameter und Kursverlauf festlegen.</p>
  const initialWealth = plan.initialBtc * path[0].close + plan.initialCash
  const toggle = (id: StrategyId) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const changeSort = (key: Metric) => { if (sort === key) setAscending(!ascending); else { setSort(key); setAscending(false) } }
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Strategien vergleichen</h2><p className="mt-1 text-sm text-muted-foreground">Ein identischer Kursverlauf und identische Budgets für alle Strategien · {quality}</p></div>
    <Card><CardHeader><CardTitle>Gemeinsame Ausgangslage</CardTitle><CardDescription>{dayLabel(path[0].date)} bis {dayLabel(path[path.length - 1].date)} · Alle Geldbeträge in USD.</CardDescription></CardHeader><CardContent className="space-y-5">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ['Startvermögen', money(initialWealth)], ['Davon BTC / Cash', `${btc(plan.initialBtc)} BTC / ${money(plan.initialCash)}`], ['Monatliche Sparrate zum Start', money(plan.contribution)], ['Monatliche Wunschentnahme', `${money(plan.withdrawal)} ab Monat ${plan.withdrawalStart}`],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}</dl>
      <p className="text-sm text-muted-foreground">Sparrate: {plan.contributionIncrease.toLocaleString('de-DE')} % jährliche Anpassung. Entnahmen: {plan.inflation.toLocaleString('de-DE')} % jährliche Inflationsanpassung. Geplante Einzahlungen und Entnahmen sind gleich; tatsächlich finanzierbare Entnahmen können abweichen.</p>
      <fieldset className="border-t pt-4"><legend className="px-1 text-sm font-medium">Strategien im Vergleich</legend><div className="flex flex-wrap gap-x-6 gap-y-3">{STRATEGIES.map(strategy => <label key={strategy.id} className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={selected.includes(strategy.id)} onChange={() => toggle(strategy.id)} /><span className="h-2 w-2 rounded-full" style={{ backgroundColor: strategy.color }} aria-hidden="true" />{strategy.name}</label>)}</div></fieldset>
    </CardContent></Card>
    {!compared.length ? <p className="rounded-md border p-6 text-muted-foreground">Mindestens eine Strategie für den Vergleich auswählen.</p> : <>
      <Card><CardHeader><CardTitle>Nettovermögen im gleichen Szenario</CardTitle><CardDescription>BTC-Wert + Cash − Schulden in USD. Bereits ausgezahlte Entnahmen sind nicht enthalten.</CardDescription></CardHeader><CardContent>
        <div className="h-[360px]" role="img" aria-label="Nettovermögen der ausgewählten Strategien über denselben Kursverlauf"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 16, left: 12, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="date" tickFormatter={value => dayLabel(String(value))} minTickGap={60} tick={{ fontSize: 11 }} /><YAxis width={75} tickFormatter={value => Number(value).toLocaleString('de-DE', { notation: 'compact' })} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={label => dayLabel(String(label))} formatter={(value: number) => money(value)} contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 8 }} /><Legend />{STRATEGIES.filter(strategy => selected.includes(strategy.id)).map(strategy => <Line key={strategy.id} dataKey={strategy.id} name={strategy.name} stroke={strategy.color} strokeWidth={2} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
        <p className="mt-2 text-xs text-muted-foreground">Ein einzelner Verlauf zeigt keine Wahrscheinlichkeit und bestimmt keine allgemein beste Strategie. Lange Verläufe werden im Diagramm ausgedünnt; Kennzahlen nutzen alle Tage.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Ertrag, Bestand und Risiko</CardTitle><CardDescription>Spaltenüberschrift anklicken, um auf- oder absteigend zu sortieren. Horizontal scrollen für alle Kennzahlen.</CardDescription></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-muted-foreground"><tr><th scope="col" className="min-w-[200px] px-3 py-3 text-left">Strategie</th>{metrics.map(metric => <th key={metric.key} scope="col" aria-sort={sort === metric.key ? ascending ? 'ascending' : 'descending' : 'none'} className="min-w-[150px] px-3 py-3 text-right font-medium"><button className="text-right hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => changeSort(metric.key)}>{metric.label}{sort === metric.key ? ascending ? ' ↑' : ' ↓' : ' ↕'}</button></th>)}<th scope="col" className="min-w-[220px] px-3 py-3 text-left">Erste Liquidation</th><th scope="col" className="min-w-[220px] px-3 py-3 text-left">Erste Entnahmelücke</th></tr></thead><tbody>{sorted.map(result => <tr key={result.strategy} className="border-b hover:bg-muted/50"><th scope="row" className="px-3 py-4 text-left font-medium">{STRATEGIES.find(strategy => strategy.id === result.strategy)?.name}</th>{metrics.map(metric => <td key={metric.key} className={`px-3 py-4 text-right whitespace-nowrap tabular-nums ${metric.key === 'shortfall' && result.shortfall > 0.01 ? 'text-destructive' : ''}`}>{((metric.key === 'maxDrawdown' || metric.key === 'timeWeightedReturn') && result.returnMetricsValid === false) ? 'Nicht definiert' : metric.format(result[metric.key])}</td>)}<td className="px-3 py-4">{result.firstLiquidation ? dayLabel(result.firstLiquidation) : 'Keine in diesem Szenario'}</td><td className="px-3 py-4">{result.firstShortfall ? dayLabel(result.firstShortfall) : 'Keine in diesem Szenario'}</td></tr>)}</tbody></table></div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground"><p>Gewinn = Nettovermögen + ausgezahlte Entnahmen − Startvermögen − Einzahlungen. Gebühren und Zinsen sind darin bereits berücksichtigt. Ein höherer BTC-Bestand kann zugleich mit höheren Schulden verbunden sein.</p><p>Die zeitgewichtete Rendite (TWR) bereinigt externe Zahlungsströme. Ohne positives Startvermögen oder nach nichtpositivem Eigenkapital wird sie als nicht definiert angezeigt. Der Höchststand-Rückgang misst den stärksten Rückgang dieses Renditeverlaufs, nicht den absoluten Verlust in USD. Keine Liquidation in diesem Szenario ist keine Sicherheitszusage.</p></div>
      </CardContent></Card>
    </>}
  </div>
}
