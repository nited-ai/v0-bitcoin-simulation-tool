// lib/price-engine/historical-data-loader.ts

import Papa from "papaparse"
import type { HistoricalDataPoint } from "./types"
import { HistoricalDataCache } from "./cache-manager"
import { PerformanceMonitor } from "./performance-monitor"

// No conversion needed - keeping prices in USD

// Globale Cache-Instanz
const cache = new HistoricalDataCache()

/**
 * Loads historical Bitcoin price data from the local CSV file.
 * @returns A promise that resolves to an array of historical data points.
 */
async function loadPriceHistoryFromCsv(): Promise<HistoricalDataPoint[]> {
  try {
    // Fetch the local CSV file from the public folder
    const response = await fetch("/btc-price-history.csv")
    const csvText = await response.text()

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error("CSV Parsing errors:", results.errors)
            return reject(new Error("Failed to parse historical price CSV."))
          }

          const formattedData = results.data
            .map((row: any) => {
              // Check for valid row structure
              if (!row.Date || !row["Closing Price (USD)"]) {
                return null
              }
              const date = new Date(row.Date)
              const priceUsd =
                typeof row["Closing Price (USD)"] === "string"
                  ? Number.parseFloat(row["Closing Price (USD)"])
                  : row["Closing Price (USD)"]

              if (isNaN(date.getTime()) || isNaN(priceUsd)) {
                return null
              }

              return {
                time: Math.floor(date.getTime() / 1000),
                close: priceUsd, // Keep USD price as-is
              }
            })
            .filter((item): item is HistoricalDataPoint => item !== null)
            .sort((a, b) => a.time - b.time) // Ensure data is sorted chronologically

          resolve(formattedData)
        },
        error: (error: Error) => {
          console.error("PapaParse error:", error)
          reject(new Error("Failed to parse historical price CSV."))
        },
      })
    })
  } catch (error) {
    console.error("Error fetching or processing CSV:", error)
    throw new Error("Could not load historical price data from CSV file.")
  }
}

/**
 * Fetches recent daily prices for BTC in EUR from CryptoCompare.
 * This is only used to get data missing from the local CSV.
 * @param daysToFetch The number of days of historical data to retrieve.
 * @returns A promise that resolves to an array of historical data points.
 */
async function fetchRecentDailyPrices(daysToFetch: number): Promise<HistoricalDataPoint[]> {
  if (daysToFetch <= 0) {
    return []
  }

  // We use the public CryptoCompare API, which doesn't require a key for this type of request.
  const apiUrl = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=EUR&limit=${daysToFetch}`

  try {
    const res = await fetch(apiUrl)
    if (!res.ok) {
      throw new Error(`CryptoCompare API responded with status: ${res.status}`)
    }
    const json = await res.json()

    if (json && json.Response === "Success" && Array.isArray(json.Data.Data)) {
      // The API returns data including the current, possibly incomplete day.
      // We filter out the last entry if it's for the current day to only use complete daily data.
      const todayTimestamp = new Date().setUTCHours(0, 0, 0, 0) / 1000
      return json.Data.Data.filter((d: any) => d.time < todayTimestamp).map(
        (item: { time: number; close: number }) => ({
          time: item.time,
          close: item.close,
        }),
      )
    } else {
      console.error("CryptoCompare API error:", json.Message)
      return []
    }
  } catch (error) {
    console.error("Error fetching recent data from CryptoCompare:", error)
    return []
  }
}

/**
 * Main orchestrator function that loads, merges, and returns complete historical price data.
 * This function handles:
 * 1. Loading base data from the local CSV file
 * 2. Filtering data from 2016 halving onwards
 * 3. Detecting missing recent data
 * 4. Fetching missing data from CryptoCompare API
 * 5. Merging and deduplicating the datasets
 * 6. Returning a clean, chronologically sorted array
 *
 * @returns A promise that resolves to the complete historical price dataset.
 */
async function loadHistoricalPriceDataOriginal(): Promise<HistoricalDataPoint[]> {
  try {
    // Start from the 2016 halving as a reasonable baseline for modern Bitcoin price behavior
    const HALVING_2016_TIMESTAMP_SECONDS = Math.floor(new Date("2016-07-09T00:00:00Z").getTime() / 1000)

    // Load base data from CSV and filter to relevant timeframe
    let csvData = await loadPriceHistoryFromCsv()
    csvData = csvData.filter((d) => d.time >= HALVING_2016_TIMESTAMP_SECONDS)

    const lastEntry = csvData.length > 0 ? csvData[csvData.length - 1] : null

    if (lastEntry) {
      // Check if we need to fetch recent data to fill gaps
      const now = new Date()
      now.setUTCHours(0, 0, 0, 0)
      const lastDate = new Date(lastEntry.time * 1000)
      lastDate.setUTCHours(0, 0, 0, 0)

      const daysSinceLastEntry = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastEntry > 0) {
        // Fetch missing recent data
        const newData = await fetchRecentDailyPrices(daysSinceLastEntry)
        if (newData.length > 0) {
          // Merge datasets, using Map to automatically handle deduplication by timestamp
          const combined = new Map(csvData.map((d) => [d.time, d]))
          newData.forEach((d) => combined.set(d.time, d))
          csvData = Array.from(combined.values()).sort((a, b) => a.time - b.time)
        }
      }
    } else {
      // If no CSV data exists, fetch everything from the API
      const now = new Date()
      now.setUTCHours(0, 0, 0, 0)
      const daysToFetch = Math.floor((now.getTime() / 1000 - HALVING_2016_TIMESTAMP_SECONDS) / (60 * 60 * 24))
      const newData = await fetchRecentDailyPrices(daysToFetch)
      if (newData.length > 0) {
        csvData = newData.sort((a, b) => a.time - b.time)
      }
    }

    return csvData
  } catch (error) {
    console.error("Failed to load historical price data:", error)
    throw new Error("Could not load historical price data. Please check your connection and try again.")
  }
}

/**
 * Main export - now uses database-based loader with CSV fallback
 */
export async function loadHistoricalPriceData(): Promise<HistoricalDataPoint[]> {
  try {
    // Use the new database-based loader
    const { loadHistoricalPriceData: databaseLoader } = await import('./database-historical-loader')
    return await databaseLoader()
  } catch (error) {
    console.error("❌ Database loader failed, using original CSV method:", error)
    // Fallback to original CSV-based method
    return await loadHistoricalPriceDataWithCaching()
  }
}

/**
 * CSV-based loader with caching (renamed for fallback use)
 */
async function loadHistoricalPriceDataWithCaching(): Promise<HistoricalDataPoint[]> {
  console.log("🚀 Loading historical price data from CSV...")
  const startTime = performance.now()

  try {
    // 1. Cache prüfen
    const cachedData = await cache.loadFromCache()
    if (cachedData) {
      const updateCheck = cache.needsUpdate()

      if (!updateCheck.needsUpdate) {
        const loadTime = performance.now() - startTime
        PerformanceMonitor.recordLoadTime("cache-hit", loadTime)
        console.log(`⚡ Data loaded from cache in ${Math.round(loadTime)}ms (${cachedData.length} points)`)
        return cachedData
      }

      // Nur neue Daten laden
      console.log("🔄 Cache found but needs update, loading incremental data...")
      return await loadIncrementalData(cachedData, updateCheck.lastTimestamp)
    }

    // 2. Vollständiger Datenload (erster Besuch)
    console.log("📥 Performing full data load...")
    PerformanceMonitor.recordLoadTime("cache-miss", performance.now() - startTime)
    return await loadFullDataWithCache()

  } catch (error) {
    console.error("❌ Cache load failed, falling back to basic CSV load:", error)
    // Final fallback to basic CSV loading
    return await loadPriceHistoryFromCsv()
  }
}

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
