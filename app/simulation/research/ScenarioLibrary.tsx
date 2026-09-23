'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSimulation } from '../context/SimulationContext'
import type { SimulationParams } from '../types/simulation'
import { readCycleSettings } from '../price-models/scenarioParams'

const key = 'firehodl-scenarios-v1'
type Saved = { id: string; name: string; params: SimulationParams }
export function ScenarioLibrary() {
  const {params,setParams} = useSimulation()
  const [saved,setSaved] = useState<Saved[]>([])
  const [name,setName] = useState('')
  const [selected,setSelected] = useState('')
  const [message,setMessage] = useState('')
  useEffect(()=>{try {const data=JSON.parse(localStorage.getItem(key)??'[]');if(Array.isArray(data))setSaved(data.filter(x=>x?.params&&typeof x.name==='string'&&typeof x.id==='string'))} catch {setMessage('Gespeicherte Szenarien konnten nicht gelesen werden.')}},[])
  function save() {
    if (!name.trim()) {setMessage('Bitte einen Namen für dein Szenario eingeben.');return}
    const id = crypto.randomUUID()
    const next = [...saved,{id,name:name.trim().slice(0,80),params:{...params,cycleReplaySettings:params.cycleReplaySettings??readCycleSettings()}}]
    try {localStorage.setItem(key,JSON.stringify(next));setSaved(next);setSelected(id);setName('');setMessage('Szenario mit Kursmodell, Strategie, Budget und Kreditkonditionen in diesem Browser gespeichert.')} catch {setMessage('Der Browserspeicher ist nicht verfügbar oder voll.')}
  }
  function load() {
    const item=saved.find(x=>x.id===selected)
    if(!item)return
    // JSON encodes an open-ended loan as null.
    setParams({...item.params,loanTermMonths:item.params.loanTermMonths===null ? Infinity : item.params.loanTermMonths})
    setMessage(`„${item.name}“ geladen. Die Projektion startet heute mit den gespeicherten Annahmen.`)
  }
  return <div className="mb-6 border-b pb-4 space-y-2">
    <div className="flex flex-wrap gap-2 items-center"><span className="text-sm font-medium mr-2">Meine Szenarien</span>
      <Input className="w-full sm:w-56" aria-label="Szenarioname" placeholder="z. B. DCA im Bärenmarkt" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/><Button variant="outline" onClick={save}>Szenario speichern</Button>
      <select aria-label="Gespeichertes Szenario" className="h-10 w-full sm:w-56 border rounded-md bg-background px-3 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Gespeichertes auswählen</option>{saved.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><Button variant="outline" disabled={!selected} onClick={load}>Laden</Button>
    </div>{message&&<p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>
}
