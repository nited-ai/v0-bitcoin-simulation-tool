import { useEffect } from 'react'
import { useSimulation } from '../context/SimulationContext'
import { priceModelRegistry } from '../price-models/PriceModelRegistry'
import { scenarioModelParams } from '../price-models/scenarioParams'
import { dailyProjection } from '../research/projectionPath'
import { PriceProjectionAdapter } from '@/src/modules/shared/adapters/PriceProjectionAdapter'

/** One owner in SimulationPage; all tabs consume the same generated scenario. */
export function usePriceGeneration(enabled = false) {
  const { params, historicalPriceData, setChartLoading, setPriceProjection,
    setPriceChartData, setErrors } = useSimulation()
  const modelKey = JSON.stringify(scenarioModelParams(params))
  const stressKey = JSON.stringify(params.stress ?? null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setChartLoading(true)
    setPriceProjection(null)
    setPriceChartData([])
    const timer = setTimeout(async () => {
      try {
        const model = priceModelRegistry.getModel(params.priceModel)
        if (!model) throw new Error('Das gewählte Kursmodell ist nicht verfügbar.')
        const input = JSON.parse(modelKey)
        if (!model.validateParams(input)) throw new Error('Bitte die Einstellungen des Kursmodells prüfen.')
        const result = dailyProjection(await model.generateProjection(historicalPriceData, input), JSON.parse(stressKey) ?? undefined)
        if (cancelled) return
        setPriceProjection(result)
        setPriceChartData(PriceProjectionAdapter.toLegacyFormat(result, historicalPriceData))
        setErrors(previous => previous.filter(message => !message.startsWith('Projektion: ')))
      } catch (error) {
        if (!cancelled) setErrors(previous => [...previous.filter(message => !message.startsWith('Projektion: ')),
          'Projektion: ' + (error instanceof Error ? error.message : 'Berechnung fehlgeschlagen.')])
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [enabled, params.priceModel, modelKey, stressKey, historicalPriceData,
    setChartLoading, setPriceProjection, setPriceChartData, setErrors])
}
