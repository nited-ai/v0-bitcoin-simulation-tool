'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Repeat2 } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import { DIMINISHING_RETURNS_PRESETS, type DiminishingReturnsParams } from '../../../price-models/models/EnhancedCycleRepeatModel'
import { readCycleSettings } from '../../../price-models/scenarioParams'

export function DiminishingReturnsControls({ className }: { className?: string }) {
  const { params, setParams, priceProjection } = useSimulation()
  const settings = params.cycleReplaySettings ?? readCycleSettings()
  const change = (patch: Partial<DiminishingReturnsParams>) => setParams(previous => ({
    ...previous, cycleReplaySettings: { ...(previous.cycleReplaySettings ?? settings), ...patch },
  }))
  const metadata = priceProjection?.metadata
  const period = settings.referenceCycle ?? 'trailing'
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Repeat2 className="h-5 w-5 text-primary" />Historischen Zyklus wiederholen</CardTitle>
        <CardDescription>
          Tagesbewegungen eines beobachteten Bitcoin-Zyklus auf deinen Startkurs übertragen.
          Damit bleiben Rallys, Bärenmärkte und Erholungen in ihrer historischen Reihenfolge erhalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="reference-cycle">Historische Vorlage</Label>
            <Select value={period} onValueChange={value => change({ referenceCycle: value as DiminishingReturnsParams['referenceCycle'], phaseMonths: 0 })}>
              <SelectTrigger id="reference-cycle"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trailing">Letzte vier verfügbare Datenjahre</SelectItem>
                <SelectItem value="2020-2024">Halving-Zyklus 2020–2024</SelectItem>
                <SelectItem value="2016-2020">Halving-Zyklus 2016–2020</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="cycle-phase">Einstieg: {settings.phaseMonths ?? 0} Monate nach {period === 'trailing' ? 'Beginn der Vorlage' : 'dem Halving'}</Label>
            <Slider id="cycle-phase" aria-label="Einstieg im historischen Zyklus" min={0} max={period === '2016-2020' ? 45 : 47} step={1}
              value={[settings.phaseMonths ?? 0]} onValueChange={values => change({ phaseMonths: values[0] })} />
            <p className="text-xs text-muted-foreground">Verschiebe den Einstieg, um unterschiedliche Zyklusphasen zu prüfen. Am Ende wird die Vorlage wiederholt.</p>
          </div>
        </div>
        <div className="space-y-3 border-t pt-5">
          <Label>Dämpfung positiver Tagesbewegungen</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => change({ diminishingFactor: 0 })}>Originalbewegungen</Button>
            {(['conservative', 'moderate', 'optimistic'] as const).map((key, index) => (
              <Button key={key} variant="outline" size="sm" onClick={() => change({
                diminishingFactor: DIMINISHING_RETURNS_PRESETS[key].params.diminishingFactor,
                cycleDegradation: DIMINISHING_RETURNS_PRESETS[key].params.cycleDegradation,
              })}>{['Starke Dämpfung', 'Mittlere Dämpfung', 'Geringe Dämpfung'][index]}</Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <Label>Dämpfung: {(settings.diminishingFactor * 100).toFixed(0)} %</Label>
              <Slider aria-label="Dämpfung positiver Tagesbewegungen" value={[settings.diminishingFactor * 100]} min={0} max={100} step={5}
                onValueChange={values => change({ diminishingFactor: values[0] / 100 })} />
            </div>
            <div className="space-y-3">
              <Label>Erst oberhalb von {(settings.cycleDegradation * 100).toFixed(1)} % Tagesgewinn</Label>
              <Slider aria-label="Schwelle für die Dämpfung" value={[settings.cycleDegradation * 100]} min={0} max={50} step={0.5}
                onValueChange={values => change({ cycleDegradation: values[0] / 100 })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Nur der Gewinnanteil über der Schwelle wird abgeschwächt; mindestens 10 % des ursprünglichen Tagesgewinns bleiben erhalten.
            Verlusttage bleiben unverändert. Diese Annahme macht das Szenario vorsichtiger, ist aber keine gemessene Marktreife.
          </p>
        </div>
        {metadata?.referenceStart && <p className="text-sm border-t pt-4">
          Datengrundlage: {metadata.referenceStart} bis {metadata.referenceEnd} · {metadata.historicalMovementsCount} Tagesbewegungen.
          Dein Verlauf beginnt mit den Bewegungen nach {metadata.replayStartsAt}.
        </p>}
        <p className="text-xs text-muted-foreground">
          Halvings halbieren die neue Blocksubvention, legen aber keine Kursbewegung fest. Dieser Verlauf ist ein historisches Was-wäre-wenn-Szenario.
          Die Zukunft kann andere Zykluslängen, Tiefs und Erholungen zeigen. Es wird keine Eintrittswahrscheinlichkeit berechnet.
        </p>
      </CardContent>
    </Card>
  )
}
