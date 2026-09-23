'use client'
import { Card,CardHeader,CardTitle,CardDescription,CardContent } from '@/components/ui/card'
import { useSimulation } from '../context/SimulationContext'
import { NumericField } from './StrategyControls'
export function StressControls() {
  const {params,setParams} = useSimulation()
  const stress = params.stress ?? {enabled:false,month:6,dropPercent:50}
  const update = (patch:Partial<typeof stress>) => setParams(p=>({...p,stress:{...(p.stress ?? stress),...patch}}))
  return <Card><CardHeader><CardTitle>Zusätzlichen Flashcrash prüfen</CardTitle><CardDescription>Ein Tagestief kann einen Kredit liquidieren, auch wenn der Kurs am Abend wieder erholt ist.</CardDescription></CardHeader><CardContent className="space-y-4">
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={stress.enabled} onChange={e=>update({enabled:e.target.checked})}/>Eintägigen Flashcrash in dieses Szenario einfügen</label>
    {stress.enabled && <div className="grid sm:grid-cols-2 gap-4"><NumericField label="Flashcrash am Stichtag von Monat" value={stress.month} min={1} max={params.simulationMonths} onChange={n=>update({month:n})}/><NumericField label="Tagestief unter Tageseröffnung (%)" value={stress.dropPercent} max={99} onChange={n=>update({dropPercent:n})}/></div>}
    <p className="text-sm text-muted-foreground">Der Schlusskurs bleibt gleich; nur das Tagestief wird abgesenkt. Chart, Kreditprüfung und Vergleich verwenden dasselbe Stressszenario. Das ist ein gezielter Belastungstest, keine Wahrscheinlichkeitsschätzung.</p>
  </CardContent></Card>
}
