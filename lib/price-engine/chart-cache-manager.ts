import type { PriceChartDataPoint, PriceEngineParams } from "./types"

interface ChartCacheMetadata {
  lastUpdated: number
  paramsHash: string
  dataVersion: string
  totalPoints: number
}

interface CachedChartData {
  metadata: ChartCacheMetadata
  data: PriceChartDataPoint[]
}

export class ChartDataCache {
  private static readonly CACHE_KEY = "btc-chart-data-v1"
  private static readonly METADATA_KEY = "btc-chart-metadata-v1"
  private static readonly MAX_CACHE_AGE_MS = 60 * 60 * 1000 // 1 Stunde
  private static readonly CURRENT_VERSION = "1.0"
  
  private memoryCache: Map<string, PriceChartDataPoint[]> = new Map()
  private cacheMetadata: Map<string, ChartCacheMetadata> = new Map()

  /**
   * Erstellt einen Hash aus den relevanten Parametern für Cache-Schlüssel
   */
  private createParamsHash(params: PriceEngineParams): string {
    // Einfache, deterministische Hash-Generierung
    // WICHTIG: powerLawPrognosisLine an den Anfang setzen, damit es in den ersten 64 Zeichen enthalten ist
    const hashData = {
      powerLawPrognosisLine: params.powerLawSettings?.prognosisLine || 'fit',
      priceModel: params.priceModel,
      initialBtcPrice: params.initialBtcPrice,
      simulationMonths: params.simulationMonths,
      annualGrowthRates: params.annualGrowthRates,
      historicalDataLength: params.historicalDailyMultipliers?.length || 0
    }

    // Deterministische Serialisierung
    const hashString = JSON.stringify(hashData)
    const fullHash = btoa(hashString).replace(/[^a-zA-Z0-9]/g, '')
    const hash = fullHash.substring(0, 64) // Längerer Hash für bessere Unterscheidung

    // Debug-Logging (kann bei Bedarf aktiviert werden)
    // console.log(`🔍 Chart cache hash: ${hash} for prognosis: ${hashData.powerLawPrognosisLine}`)
    // console.log(`🔍 Full hash data:`, hashData)
    // console.log(`🔍 Hash string: ${hashString}`)

    return hash
  }

  /**
   * Lädt Chart-Daten aus dem Cache
   */
  async loadFromCache(params: PriceEngineParams): Promise<PriceChartDataPoint[] | null> {
    const paramsHash = this.createParamsHash(params)

    try {
      // 1. Memory Cache prüfen
      if (this.memoryCache.has(paramsHash)) {
        const metadata = this.cacheMetadata.get(paramsHash)
        if (metadata && this.isMetadataValid(metadata)) {
          console.log(`📦 Using memory cache for chart data (${paramsHash.substring(0, 8)}...)`)
          return this.memoryCache.get(paramsHash)!
        }
      }

      // 2. localStorage Cache prüfen
      const cacheKey = `${ChartDataCache.CACHE_KEY}_${paramsHash}`
      const metadataKey = `${ChartDataCache.METADATA_KEY}_${paramsHash}`
      
      const cachedData = localStorage.getItem(cacheKey)
      const cachedMetadata = localStorage.getItem(metadataKey)
      
      if (!cachedData || !cachedMetadata) {
        console.log(`❌ No chart cache found for params ${paramsHash.substring(0, 8)}...`)
        return null
      }

      const metadata: ChartCacheMetadata = JSON.parse(cachedMetadata)
      
      // 3. Cache-Validität prüfen
      if (!this.isMetadataValid(metadata)) {
        console.log(`⚠️ Chart cache invalid for params ${paramsHash.substring(0, 8)}..., clearing...`)
        this.clearCacheForParams(paramsHash)
        return null
      }

      const data: PriceChartDataPoint[] = JSON.parse(cachedData)
      
      // 4. Memory Cache aktualisieren
      this.memoryCache.set(paramsHash, data)
      this.cacheMetadata.set(paramsHash, metadata)
      
      console.log(`✅ Loaded ${data.length} chart points from cache (${paramsHash.substring(0, 8)}...)`)
      return data
      
    } catch (error) {
      console.error("Chart cache load error:", error)
      this.clearCacheForParams(paramsHash)
      return null
    }
  }

  /**
   * Speichert Chart-Daten im Cache
   */
  async saveToCache(params: PriceEngineParams, data: PriceChartDataPoint[]): Promise<void> {
    const paramsHash = this.createParamsHash(params)
    
    try {
      const metadata: ChartCacheMetadata = {
        lastUpdated: Date.now(),
        paramsHash,
        dataVersion: ChartDataCache.CURRENT_VERSION,
        totalPoints: data.length
      }

      // localStorage speichern
      const cacheKey = `${ChartDataCache.CACHE_KEY}_${paramsHash}`
      const metadataKey = `${ChartDataCache.METADATA_KEY}_${paramsHash}`
      
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(metadataKey, JSON.stringify(metadata))
      
      // Memory Cache aktualisieren
      this.memoryCache.set(paramsHash, data)
      this.cacheMetadata.set(paramsHash, metadata)
      
      console.log(`💾 Cached ${data.length} chart data points (${paramsHash.substring(0, 8)}...)`)
      
    } catch (error) {
      console.error("Chart cache save error:", error)
      // Bei Speicher-Problemen Cache leeren
      if (error instanceof DOMException && error.code === 22) {
        console.warn("localStorage full, clearing chart cache...")
        this.clearAllCache()
      }
    }
  }

  /**
   * Cache für bestimmte Parameter leeren
   */
  private clearCacheForParams(paramsHash: string): void {
    const cacheKey = `${ChartDataCache.CACHE_KEY}_${paramsHash}`
    const metadataKey = `${ChartDataCache.METADATA_KEY}_${paramsHash}`
    
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(metadataKey)
    this.memoryCache.delete(paramsHash)
    this.cacheMetadata.delete(paramsHash)
  }

  /**
   * Gesamten Chart-Cache leeren
   */
  clearAllCache(): void {
    // localStorage durchsuchen und alle Chart-Cache-Einträge entfernen
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(ChartDataCache.CACHE_KEY) || key.startsWith(ChartDataCache.METADATA_KEY))) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Memory Cache leeren
    this.memoryCache.clear()
    this.cacheMetadata.clear()
    
    console.log("🗑️ Chart cache cleared")
  }

  private isMetadataValid(metadata: ChartCacheMetadata): boolean {
    const now = Date.now()
    const cacheAge = now - metadata.lastUpdated
    
    return cacheAge < ChartDataCache.MAX_CACHE_AGE_MS &&
           metadata.dataVersion === ChartDataCache.CURRENT_VERSION &&
           metadata.totalPoints > 0
  }

  /**
   * Cache-Statistiken für Debugging
   */
  getCacheStats(): { memoryCacheSize: number; localStorageEntries: number } {
    let localStorageEntries = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith(ChartDataCache.CACHE_KEY) || key.startsWith(ChartDataCache.METADATA_KEY))) {
        localStorageEntries++
      }
    }
    
    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageEntries
    }
  }
}
