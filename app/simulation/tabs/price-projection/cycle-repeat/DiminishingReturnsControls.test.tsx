import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SimulationProvider, useSimulation } from '../../../context/SimulationContext'
import { DiminishingReturnsControls } from './DiminishingReturnsControls'
vi.mock('@/components/ui/slider', () => ({ Slider: (props: any) => <input type="range" aria-label={props['aria-label']} value={props.value[0]} min={props.min} max={props.max} onChange={event => props.onValueChange([Number(event.target.value)])} /> }))
function Probe() { const { params } = useSimulation(); return <output data-testid="settings">{JSON.stringify(params.cycleReplaySettings)}</output> }
function settings() { return JSON.parse(screen.getByTestId('settings').textContent || '{}') }
beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(cleanup)
function mount() { return render(<SimulationProvider><DiminishingReturnsControls /><Probe /></SimulationProvider>) }
describe('cycle controls', () => {
  it('applies the last selected preset directly to the shared scenario', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Starke Dämpfung' }))
    fireEvent.click(screen.getByRole('button', { name: 'Geringe Dämpfung' }))
    expect(settings().diminishingFactor).toBe(0.2)
    expect(settings().cycleDegradation).toBe(0.3)
  })
  it('can restore original movements', () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Originalbewegungen' }))
    expect(settings().diminishingFactor).toBe(0)
  })
  it('preserves the chosen phase when changing dampening', () => {
    mount(); fireEvent.change(screen.getByRole('slider', { name: 'Einstieg im historischen Zyklus' }), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Starke Dämpfung' }))
    expect(settings().phaseMonths).toBe(12)
    expect(settings().diminishingFactor).toBe(0.8)
  })
  it('shows effective parameters without a random seed or inactive economic factors', () => {
    mount()
    expect(screen.getByText('Historische Vorlage')).toBeTruthy()
    expect(screen.queryByText(/Verlaufsnummer|Institutional Saturation|Market Maturity Threshold/)).toBeNull()
  })
})
