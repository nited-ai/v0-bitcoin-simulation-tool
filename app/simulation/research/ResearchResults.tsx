"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STRATEGIES } from '@/src/modules/simulator/types'
import { useResearch } from './ResearchContext'
import { btc, collateral, dayLabel, downloadJournal, money, percent } from './resultsExport'

const control = 'h-10 rounded-md border border-input bg-background px-3 text-sm'
const cell = 'px-3 py-3 text-right whitespace-nowrap tabular-nums'
const pageSize = 20

export function ResearchResults() {
  const { plan, results, selectedStrategy, error, quality, loading } = useResearch()
  const [date, setDate] = useState('')
  const [view, setView] = useState('wealth')
  const [filter, setFilter] = useState('events')
  const [page, setPage] = useState(0)
  const result = results[selectedStrategy]
  const journal = result?.journal
  const firstDate = journal?.[0]?.date
  const lastDate = journal?.at(-1)?.date
  useEffect(() => {
    if (firstDate && lastDate) setDate(current => current >= firstDate && current <= lastDate ? current : lastDate)
  }, [firstDate, lastDate])
  const filtered = useMemo(() => (journal ?? []).filter(row => filter === 'all' || (filter === 'buys' ? row.boughtBtc > 0 : filter === 'risk' ? row.shortfall > 0.01 || /Liquidation|[Ff]älligkeit|Nachbesicherung/.test(row.event) : !!row.event || row.boughtBtc > 0)), [journal, filter])
  const chartData = useMemo(() => {
    const rows = journal ?? []
    const step = Math.max(1, Math.ceil(rows.length / 500))
    const keep = new Set<number>([0, rows.length - 1])
    for (let start = 0; start < rows.length; start += step) {
      let lowIndex = start, highIndex = start
      for (let i = start; i < Math.min(start + step, rows.length); i++) {
        if (rows[i].low < rows[lowIndex].low) lowIndex = i
        if (rows[i].price > rows[highIndex].price) highIndex = i
        if (/Liquidation|[Ff]älligkeit|Nachbesicherung/.test(rows[i].event) || rows[i].shortfall > 0.01 || rows[i].low < Math.min(rows[i].price, rows[Math.max(0, i - 1)].price) * 0.95) keep.add(i)
      }
      keep.add(start); keep.add(lowIndex); keep.add(highIndex)
    }
    return rows.filter((_, i) => keep.has(i))
  }, [journal])
  if (error) return <Card><CardContent className="pt-6 text-destructive" role="alert">{error}</CardContent></Card>
  if (loading) return <p className="py-8 text-muted-foreground" role="status">Tagesverlauf und Ergebnisse werden berechnet …</p>
  if (!plan || !result || !journal?.length) return <p className="py-8 text-muted-foreground">Bitte zuerst Parameter und einen vollständigen Kursverlauf festlegen.</p>
  const inspected = journal.find(row => row.date === date) ?? journal[journal.length - 1]
  const pledged = collateral(inspected, plan)
  const last = journal[journal.length - 1]
  const initialWealth = plan.initialCash + plan.initialBtc * journal[0].price
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const rows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const isLtv = view === 'ltv'
  const series = view === 'wealth' ? [['netWorth', 'Nettovermögen', '#f7931a'], ['cash', 'Cash', '#3b82f6'], ['debt', 'Schulden', '#dc2626']] : view === 'price' ? [['price', 'BTC-Schlusskurs', '#f7931a'], ['low', 'Tagestief', '#a16207'], ['liquidationPrice', 'Liquidationsschwelle', '#dc2626'], ['buyThreshold', 'Kaufschwelle', '#3b82f6']] : [['ltv', 'LTV am Tagesende', '#f7931a'], ['triggerLtv', 'Prüf-LTV am Tagestief', '#dc2626']]
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-bold">{STRATEGIES.find(strategy => strategy.id === selectedStrategy)?.name}</h2><p className="text-sm text-muted-foreground">{dayLabel(journal[0].date)} bis {dayLabel(last.date)} · {journal.length.toLocaleString('de-DE')} Tage · {quality}</p></div>
      <Button variant="outline" onClick={() => downloadJournal(result, plan)}>Alle Tage als CSV exportieren</Button>
    </div>
    <Card><CardHeader><CardTitle>Ergebnis dieses Kursverlaufs</CardTitle><CardDescription>Ein Szenario, keine Eintrittswahrscheinlichkeit. Alle Geldbeträge in USD.</CardDescription></CardHeader><CardContent className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        {[
          ['Nettovermögen am Ende', money(result.finalNetWorth)], ['BTC-Bestand', `${btc(result.finalBtc)} BTC`], ['Offene Schulden', money(result.finalDebt)], ['Gewinn inkl. Entnahmen', money(result.profit)],
          ['Cash am Ende', money(result.finalCash)], ['Real in Kaufkraft zum Start', money(result.realNetWorth)], ['Ausgezahlte Entnahmen', money(result.withdrawn)], ['Nicht gedeckte Entnahmen', money(result.shortfall)],
        ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      <div className="border-t pt-4 text-sm text-muted-foreground space-y-1"><p>Nettovermögen = BTC-Wert + Cash − Schulden. Bereits ausgezahlte Entnahmen sind darin nicht enthalten.</p><p>Gewinn = Nettovermögen + {money(result.withdrawn)} Entnahmen − {money(initialWealth)} Startvermögen − {money(result.contributions)} Einzahlungen.</p><p>Gebühren gesamt: {money(result.fees)} · Zinsen gesamt: {money(result.interest)}; beide sind bereits im Ergebnis berücksichtigt.</p></div>
      <div className="grid gap-3 border-t pt-4 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Rückgang vom Höchststand (TWR): </span><strong>{result.returnMetricsValid === false ? 'Nicht definiert' : percent(result.maxDrawdown)}</strong></p>
        <p><span className="text-muted-foreground">Zeitgewichtete Rendite (TWR): </span><strong>{result.returnMetricsValid === false ? 'Nicht definiert' : percent(result.timeWeightedReturn)}</strong></p>
        <p><span className="text-muted-foreground">Erste Liquidation: </span><strong className={result.firstLiquidation ? 'text-destructive' : ''}>{result.firstLiquidation ? dayLabel(result.firstLiquidation) : 'Keine in diesem Szenario'}</strong> · {result.liquidations} insgesamt</p>
        <p><span className="text-muted-foreground">Erste Entnahmelücke: </span><strong>{result.firstShortfall ? dayLabel(result.firstShortfall) : 'Keine in diesem Szenario'}</strong></p>
        <p><span className="text-muted-foreground">Höchster gemessener LTV: </span><strong>{percent(result.maxLtv)}</strong></p>
        <p><span className="text-muted-foreground">Liquidation ab LTV: </span><strong>{percent(plan.liquidationLtv)}</strong></p>
      </div>
      <p className="text-xs text-muted-foreground">TWR bereinigt Einzahlungen und Entnahmen. Ohne positives Startvermögen oder nach nichtpositivem Eigenkapital ist sie hier nicht definiert. Ihr Höchststand-Rückgang beschreibt den Renditeverlauf, nicht den absoluten Geldverlust. Eine ausgebliebene Liquidation belegt keine Sicherheit für andere Verläufe.</p>
    </CardContent></Card>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Verlauf</CardTitle><CardDescription>{isLtv ? 'Beleihung in Prozent' : view === 'price' ? 'Kurs und Schwellen in USD je BTC' : 'Vermögen, Cash und Schulden in USD'}</CardDescription></div><select aria-label="Diagramm auswählen" value={view} onChange={e => setView(e.target.value)} className={control}><option value="wealth">Vermögen & Schulden</option><option value="price">BTC-Kurs & Schwellen</option><option value="ltv">Beleihung (LTV)</option></select></CardHeader><CardContent>
      <div className="h-[320px]" role="img" aria-label={`Zeitverlauf ${view === 'wealth' ? 'Nettovermögen, Cash und Schulden' : view === 'price' ? 'BTC-Kurs, Liquidations- und Kaufschwelle' : 'LTV'}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 16, left: 12, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey="date" tickFormatter={value => dayLabel(String(value))} minTickGap={60} tick={{ fontSize: 11 }} /><YAxis width={75} tickFormatter={value => isLtv ? percent(Number(value)) : Number(value).toLocaleString('de-DE', { notation: 'compact' })} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={label => dayLabel(String(label))} formatter={(value: number) => isLtv ? percent(value) : money(value)} contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 8 }} /><Legend />{isLtv && <ReferenceLine y={plan.liquidationLtv} ifOverflow="extendDomain" stroke="#dc2626" strokeDasharray="5 5" label={{ value: "Liquidations-LTV", position: "insideTopRight", fontSize: 11 }} />}{series.map(([key, name, color]) => <Line key={key} dataKey={key} name={name} stroke={color} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
      <p className="mt-2 text-xs text-muted-foreground">Lange Verläufe werden für das Diagramm ausgedünnt. Tagesprüfung und CSV enthalten jeden Tag. Die Liquidationsschwelle an einem Liquidationstag zeigt die auslösende Schwelle vor dem Verkauf.</p>
    </CardContent></Card>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Einzelnen Tag prüfen</CardTitle><CardDescription>Bestände am Tagesende; Ereignisse und Käufe dieses Tages.</CardDescription></div><input className={control} aria-label="Tag prüfen" type="date" value={date} min={journal[0].date} max={last.date} onChange={e => setDate(e.target.value)} /></CardHeader><CardContent className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ['BTC-Kurs / Tagestief', `${money(inspected.price)} / ${money(inspected.low)}`], ['Nettovermögen', money(inspected.netWorth)], ['BTC gesamt', `${btc(inspected.btc)} BTC`], ['Verpfändet / frei', `${btc(pledged.pledged)} / ${btc(pledged.free)} BTC`],
        ['Cash / Schulden', `${money(inspected.cash)} / ${money(inspected.debt)}`], ['LTV am Tagesende', percent(inspected.ltv)], ['Liquidationsschwelle', inspected.liquidationPrice === null ? 'Keine aktive Schwelle' : money(inspected.liquidationPrice)], ['Zusätzlicher Kreditspielraum', money(inspected.borrowCapacity)],
        ['Gekauft', `${btc(inspected.boughtBtc)} BTC`], ['Kaufkurs', inspected.purchasePrice === null ? 'Kein Kauf' : money(inspected.purchasePrice)], ['Kaufschwelle', inspected.buyThreshold === null ? 'Keine aktive Schwelle' : money(inspected.buyThreshold)], ['Nachbesichert', `${btc(pledged.topUp)} BTC`],
        ['Einzahlung', money(inspected.contribution)], ['Entnahme geplant / gezahlt', `${money(inspected.requested)} / ${money(inspected.paid)}`], ['Entnahmelücke', money(inspected.shortfall)], ['Gebühren / Zinsen', `${money(inspected.fees)} / ${money(inspected.interest)}`],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd></div>)}</dl>
      <p className="rounded-md bg-muted p-3 text-sm">{inspected.event || (inspected.boughtBtc > 0 ? 'BTC-Kauf' : 'Keine Transaktion an diesem Tag.')}</p><p className="text-xs text-muted-foreground">Kreditspielraum ist die rechnerische zusätzliche Auszahlung nach Modellgebühren. Bei Strategien ohne Kreditaufnahme wird er nur als hypothetische Kapazität gezeigt. Verfügbarkeit und Refinanzierung sind Modellannahmen.</p>
    </CardContent></Card>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Tagesjournal</CardTitle><CardDescription>Datum anklicken, um alle Tageswerte oben zu prüfen. Beträge in USD, Bestände in BTC.</CardDescription></div><select className={control} aria-label="Tagesjournal filtern" value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }}><option value="events">Ereignisse</option><option value="all">Alle Tage</option><option value="buys">Käufe</option><option value="risk">Liquidation, Nachbesicherung & Lücken</option></select></CardHeader><CardContent>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-muted-foreground"><tr>{['Datum', 'Ereignis', 'Kurs USD', 'Netto USD', 'BTC', 'Verpfändet BTC', 'Schulden USD', 'LTV', 'Kauf BTC', 'Kaufkurs USD', 'Schwelle USD', 'Entnahme USD', 'Lücke USD', 'Gebühren USD', 'Zinsen USD'].map(label => <th key={label} className={`${cell} font-medium`}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.date} className="border-b hover:bg-muted/50"><td className={cell}><button className="text-primary underline underline-offset-4" onClick={() => setDate(row.date)}>{dayLabel(row.date)}</button></td><td className="min-w-[220px] px-3 py-3">{row.event || (row.boughtBtc > 0 ? 'BTC-Kauf' : '—')}</td><td className={cell}>{money(row.price)}</td><td className={cell}>{money(row.netWorth)}</td><td className={cell}>{btc(row.btc)}</td><td className={cell}>{btc(collateral(row, plan).pledged)}</td><td className={cell}>{money(row.debt)}</td><td className={cell}>{percent(row.ltv)}</td><td className={cell}>{btc(row.boughtBtc)}</td><td className={cell}>{row.purchasePrice === null ? '—' : money(row.purchasePrice)}</td><td className={cell}>{row.liquidationPrice === null ? '—' : money(row.liquidationPrice)}</td><td className={cell}>{money(row.paid)}</td><td className={`${cell} ${row.shortfall > 0.01 ? 'text-destructive' : ''}`}>{money(row.shortfall)}</td><td className={cell}>{money(row.fees)}</td><td className={cell}>{money(row.interest)}</td></tr>)}</tbody></table></div>
      {!rows.length && <p className="py-6 text-sm text-muted-foreground">Keine passenden Ereignisse.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{filtered.length.toLocaleString('de-DE')} Tage · Seite {currentPage + 1} von {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Zurück</Button><Button variant="outline" size="sm" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Weiter</Button></div></div>
    </CardContent></Card>
  </div>
}
