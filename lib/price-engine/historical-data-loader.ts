/**
 * DEPRECATED: Historical Data Loader
 *
 * This module has been replaced by the centralized data service.
 * It's kept for backward compatibility but should not be used in new code.
 *
 * Use the centralized data service instead:
 * - lib/services/centralized-data-service.ts
 * - app/simulation/hooks/useCentralizedData.ts
 *
 * @deprecated Use centralized-data-service instead
 */

import { centralizedDataService, type HistoricalDataPoint } from '../services/centralized-data-service'

/**
 * @deprecated Use centralizedDataService.loadHistoricalData() instead
 */
export async function loadHistoricalPriceData(): Promise<HistoricalDataPoint[]> {
  console.warn('⚠️ loadHistoricalPriceData is deprecated. Use centralizedDataService.loadHistoricalData() instead.')

  try {
    return await centralizedDataService.loadHistoricalData()
  } catch (error) {
    console.error('❌ Failed to load historical data via centralized service:', error)
    throw error
  }
}

/**
 * @deprecated Use centralizedDataService.loadHistoricalData() instead
 */
export async function loadHistoricalPriceDataWithFallbacks(): Promise<HistoricalDataPoint[]> {
  console.warn('⚠️ loadHistoricalPriceDataWithFallbacks is deprecated. Use centralizedDataService.loadHistoricalData() instead.')

  return await loadHistoricalPriceData()
}

/**
 * @deprecated Use centralizedDataService.loadHistoricalData() instead
 */
export async function loadHistoricalDataWithFallbacks(): Promise<HistoricalDataPoint[]> {
  console.warn('⚠️ loadHistoricalDataWithFallbacks is deprecated. Use centralizedDataService.loadHistoricalData() instead.')

  return await loadHistoricalPriceData()
}

// Re-export the type for backward compatibility
export type { HistoricalDataPoint }

/**
 * Lädt nur neue Daten seit dem letzten Cache-Update
 */
async function loadIncrementalData(
  cachedData: HistoricalDataPoint[],
  lastTimestamp?: number
): Promise<HistoricalDataPoint[]> {
  try {
    const now = new Date()
    now.setUTCHours(0, 0, 0, 0)

    const lastCacheDate = lastTimestamp ? new Date(lastTimestamp * 1000) : new Date(0)
    lastCacheDate.setUTCHours(0, 0, 0, 0)

    const daysSinceLastUpdate = Math.floor((now.getTime() - lastCacheDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastUpdate <= 0) {
      console.log("📊 Cache is up to date")
      return cachedData
    }

    // Nur fehlende Tage von API laden
    console.log(`📡 Fetching ${daysSinceLastUpdate} missing days from API...`)
    const newData = await fetchRecentDailyPrices(daysSinceLastUpdate)

    // Daten mergen
    const mergedData = cache.mergeWithNewData(cachedData, newData)

    // Cache aktualisieren
    await cache.saveToCache(mergedData)

    console.log(`✅ Updated cache with ${newData.length} new data points`)
    return mergedData

  } catch (error) {
    console.error("Incremental load failed:", error)
    // Bei Fehler cached Daten zurückgeben
    return cachedData
  }
}

/**
 * Vollständiger Datenload mit anschließendem Caching
 */
async function loadFullDataWithCache(): Promise<HistoricalDataPoint[]> {
  const startTime = performance.now()

  // Ursprüngliche Logik verwenden
  const data = await loadHistoricalPriceDataOriginal()

  // Daten cachen für zukünftige Verwendung
  await cache.saveToCache(data)

  const loadTime = performance.now() - startTime
  PerformanceMonitor.recordLoadTime("full-load", loadTime)
  console.log(`💾 Full data loaded and cached in ${Math.round(loadTime)}ms (${data.length} points)`)

  return data
}

/**
 * Minimaler Fallback mit statischen Daten
 */
async function loadMinimalFallbackData(): Promise<HistoricalDataPoint[]> {
  console.log("🆘 Using minimal fallback data")
  // Minimaler Datensatz für Notfälle
  const now = Math.floor(Date.now() / 1000)
  return [
    { time: now - 365 * 24 * 60 * 60, close: 30000 }, // 1 Jahr zurück
    { time: now - 30 * 24 * 60 * 60, close: 50000 },  // 1 Monat zurück
    { time: now, close: 100000 } // Heute
  ]
}

/**
 * Robuste Fehlerbehandlung mit mehreren Fallback-Strategien
 */
export async function loadHistoricalPriceDataWithFallbacks(): Promise<HistoricalDataPoint[]> {
  const strategies = [
    () => loadHistoricalPriceData(),
    () => loadHistoricalPriceDataWithCaching(),
    () => loadMinimalFallbackData()
  ]

  for (const [index, strategy] of strategies.entries()) {
    try {
      console.log(`🔄 Trying strategy ${index + 1}/${strategies.length}`)
      const result = await strategy()
      if (result.length > 0) {
        return result
      }
    } catch (error) {
      console.warn(`Strategy ${index + 1} failed:`, error)
      if (index === strategies.length - 1) {
        throw error
      }
    }
  }

  throw new Error("All loading strategies failed")
}
