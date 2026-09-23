'use client'
import { useId } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSimulation } from '../context/SimulationContext'
import { STRATEGIES } from '@/src/modules/simulator/types'
import { researchSettings, type ResearchSettings } from './settings'
import { useResearch } from './ResearchContext'

export function NumericField({label,value,onChange,min=0,max,step=1}: {label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number}) {
  const id = useId()
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min={min} max={max} step={step} value={value} onChange={e => { if (e.target.value !== '') onChange(Number(e.target.value)) }} /></div>
}
export function StrategyControls() {
  const {params,setParams} = useSimulation()
  const {plan,error} = useResearch()
  const s = researchSettings(params)
  const update = (patch: Partial<ResearchSettings>) => setParams(p => ({...p,research:{...researchSettings(p),...patch}}))
  const field = (key: keyof ResearchSettings, label:string,min=0,max?:number,step=1) => <NumericField label={label} value={s[key] as number} onChange={n=>update({[key]:n})} min={min} max={max} step={step}/>
  const loan = s.strategy === 'loan' || s.strategy === 'credit'
  const rule = s.strategy === 'ath-dca' || s.strategy === 'ma-dca'
  return <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card><CardHeader><CardTitle>Anlagestrategie</CardTitle><CardDescription>Was soll mit deinem Bestand und dem verfügbaren Geld passieren?</CardDescription></CardHeader>
        <CardContent className="space-y-3"><Label htmlFor="research-strategy">Strategie auswählen</Label>
          <select id="research-strategy" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={s.strategy} onChange={e=>update({strategy:e.target.value as ResearchSettings['strategy']})}>
            {STRATEGIES.map(x=><option key={x.id} value={x.id}>{x.id === 'loan' ? 'FireHODL · BTC mit Kredit' : x.name}</option>)}
          </select><p className="text-sm text-muted-foreground">{STRATEGIES.find(x=>x.id===s.strategy)?.description}</p>
          <p className="text-sm text-muted-foreground">Vorhandene BTC und Kreditkonditionen kommen aus „Parameter“. Alle Strategien lassen sich unter „Vergleich“ mit demselben Budget prüfen.</p>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Budget & Zahlungsströme</CardTitle><CardDescription>Start-Cash zusätzlich zum BTC-Bestand. Erste Monatsrate nach einem vollen Monat.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('initialCash','Start-Cash (USD)',0,1e10,100)}{field('contribution','Monatliche Sparrate (USD)',0,1e8,50)}
          {field('withdrawal','Monatliche Entnahme (USD)',0,1e8,50)}{field('withdrawalStart','Entnahme ab Monat',1,361)}
          <NumericField label="Sparrate jährlich erhöhen (%)" value={params.annualSavingsIncrease ?? 0} onChange={n=>setParams(p=>({...p,annualSavingsIncrease:n}))} max={100}/>
          {field('inflation','Inflation / Entnahmesteigerung (% p. a.)',0,30,0.5)}
          {field('tradingFee','Kauf- und Verkaufsgebühr (%)',0,10,0.05)}
        </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Regeln der gewählten Strategie</CardTitle><CardDescription>Jede Ausführung erscheint mit Datum, Kurs und Betrag im Ergebnisjournal.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {s.strategy === 'ath-dca' && <><div className="grid sm:grid-cols-2 gap-4">{field('dipPercent','Kaufen ab Rückgang vom ATH (%)',0,99)}{field('referenceAth','Eigenes Start-ATH (USD; 0 = Datenhistorie)',0,1e12,1000)}</div>
          <p className="text-sm text-muted-foreground">Bei 50 % wird gekauft, sobald der Vortag bei höchstens der Hälfte des bis dahin bekannten höchsten Tageskurses endet. Ausführung zur nächsten Tageseröffnung. Start-ATH: {plan?.referenceAth?.toLocaleString('de-DE',{maximumFractionDigits:0}) ?? '–'} USD. Bei 0 werden verfügbare historische Tageshochs berücksichtigt; bei veralteten Daten kann ein neueres ATH fehlen.</p></>}
        {s.strategy === 'ma-dca' && <><div className="grid sm:grid-cols-2 gap-4">{field('maDays','Gleitender Durchschnitt (Tage)',2,1460)}{field('maDiscount','Kaufen unter dem Durchschnitt (%)',0,99)}</div><p className="text-sm text-muted-foreground">Signal aus abgeschlossenen Tageskursen, Kauf zur nächsten Eröffnung. Erst nach einem vollständigen Durchschnitt wird gekauft. Verfügbare direkt vorausgehende Kurse: {plan?.warmupCloses?.length ?? 0} Tage.</p></>}
        {rule && <><div className="grid sm:grid-cols-3 gap-4">{field('buyFraction','Cash je Kaufsignal (%)',0,100)}{field('buyMax','Maximaler Kauf je Signal (USD)',0,1e10,100)}<div className="space-y-2"><Label htmlFor="buy-frequency">Signale prüfen</Label><select id="buy-frequency" className="w-full h-10 rounded-md border bg-background px-3" value={s.buyFrequency} onChange={e=>update({buyFrequency:e.target.value as 'daily'|'monthly'})}><option value="daily">Täglich</option><option value="monthly">Monatlich am Stichtag</option></select></div></div><p className="text-sm text-muted-foreground">Ohne Kaufsignal bleibt die Sparrate als Cash liegen. Wiederholte Signale können weitere Käufe auslösen. Am Monatsstichtag wird die neue Sparrate erst zum Tagesschluss verfügbar.</p></>}
        {s.strategy === 'staged' && field('entryMonths','Start-Cash auf Monate verteilen',1,120)}
        {s.strategy === 'rebalance' && <NumericField label="Zielanteil BTC am Vermögen (%)" value={s.btcWeight*100} min={0} max={100} onChange={n=>update({btcWeight:n/100})}/>}
        {loan && <><p className="text-sm">{s.strategy === 'loan' ? 'Zu Beginn BTC mit Kredit kaufen. Bei Verlängerung wird bis zur gewählten Kreditquote aufgestockt, soweit Sicherheiten und Kreditlimit reichen.' : 'Entnahmen zuerst aus Cash, danach über besicherte Kredite. Reicht die Kreditkapazität nicht, wird eine Auszahlungslücke ausgewiesen.'}</p>
          <div className="flex flex-col gap-4"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={s.refinance} onChange={e=>update({refinance:e.target.checked})}/>Kredit bei Fälligkeit verlängern, wenn die Besicherung reicht</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={s.autoTopUp} onChange={e=>update({autoTopUp:e.target.checked})}/>Freie BTC bei steigendem LTV automatisch nachbesichern</label></div>
          <p className="text-sm text-muted-foreground">Nachbesicherung wird als sofort verfügbar angenommen. Das bildet keine Überweisungsdauer oder Reaktionszeit eines Anbieters ab. Ohne diese Annahme kann die Position früher liquidiert werden. Plattform-Presets bleiben unter „Parameter“ editierbar.</p></>}
        {s.strategy === 'hold' && <p className="text-sm">Start-Cash wird sofort investiert, Sparraten am Monatsstichtag. Entnahmen werden aus Cash und danach durch BTC-Verkäufe gedeckt. Keine Kredite.</p>}
        {s.strategy === 'cash' && <p className="text-sm">Vorhandene BTC bleiben im Bestand. Start-Cash und Sparraten werden nicht investiert. Entnahmen nutzen zuerst Cash, dann BTC-Verkäufe.</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button asChild><Link href="?tab=results">Ergebnisse ansehen</Link></Button>
      </CardContent></Card>
  </div>
}
