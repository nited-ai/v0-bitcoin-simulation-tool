import type { HistoricalDataPoint } from "./types"

interface CacheMetadata {
  lastUpdated: number // Unix timestamp
  dataVersion: string // Version für Cache-Invalidierung
  lastDataPoint: number // Timestamp des letzten Datenpunkts
  totalPoints: number // Anzahl der Datenpunkte
}

interface CachedHistoricalData {
  metadata: CacheMetadata
  data: HistoricalDataPoint[]
}

export class HistoricalDataCache {
  private static readonly CACHE_KEY = "btc-historical-data-v2"
  private static readonly METADATA_KEY = "btc-historical-metadata-v2"
  private static readonly MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000 // 24 Stunden
  private static readonly CURRENT_VERSION = "2.0"
  
  private memoryCache: HistoricalDataPoint[] | null = null
  private cacheMetadata: CacheMetadata | null = null

  /**
   * Lädt Daten aus dem Cache (localStorage + Memory)
   */
  async loadFromCache(): Promise<HistoricalDataPoint[] | null> {
    try {
      // 1. Memory Cache prüfen
      if (this.memoryCache && this.isCacheValid()) {
        console.log("📦 Using memory cache for historical data")
        return this.memoryCache
      }

      // 2. localStorage Cache prüfen
      const cachedData = localStorage.getItem(HistoricalDataCache.CACHE_KEY)
      const cachedMetadata = localStorage.getItem(HistoricalDataCache.METADATA_KEY)
      
      if (!cachedData || !cachedMetadata) {
        console.log("❌ No cache found")
        return null
      }

      const metadata: CacheMetadata = JSON.parse(cachedMetadata)
      
      // 3. Cache-Validität prüfen
      if (!this.isMetadataValid(metadata)) {
        console.log("⚠️ Cache invalid, clearing...")
        this.clearCache()
        return null
      }

      const data: HistoricalDataPoint[] = JSON.parse(cachedData)
      
      // 4. Memory Cache aktualisieren
      this.memoryCache = data
      this.cacheMetadata = metadata
      
      console.log(`✅ Loaded ${data.length} points from cache`)
      return data
      
    } catch (error) {
      console.error("Cache load error:", error)
      this.clearCache()
      return null
    }
  }

  /**
   * Speichert Daten im Cache
   */
  async saveToCache(data: HistoricalDataPoint[]): Promise<void> {
    try {
      const metadata: CacheMetadata = {
        lastUpdated: Date.now(),
        dataVersion: HistoricalDataCache.CURRENT_VERSION,
        lastDataPoint: data.length > 0 ? data[data.length - 1].time : 0,
        totalPoints: data.length
      }

      // localStorage speichern
      localStorage.setItem(HistoricalDataCache.CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(HistoricalDataCache.METADATA_KEY, JSON.stringify(metadata))
      
      // Memory Cache aktualisieren
      this.memoryCache = data
      this.cacheMetadata = metadata
      
      console.log(`💾 Cached ${data.length} historical data points`)
      
    } catch (error) {
      console.error("Cache save error:", error)
      // Bei Speicher-Problemen Cache leeren
      if (error instanceof DOMException && error.code === 22) {
        console.warn("localStorage full, clearing cache...")
        this.clearCache()
      }
    }
  }

  /**
   * Prüft ob nur neue Daten geladen werden müssen
   */
  needsUpdate(): { needsUpdate: boolean; lastTimestamp?: number } {
    if (!this.cacheMetadata) {
      return { needsUpdate: true }
    }

    const now = Date.now()
    const cacheAge = now - this.cacheMetadata.lastUpdated
    
    // Tägliches Update erforderlich
    if (cacheAge > HistoricalDataCache.MAX_CACHE_AGE_MS) {
      return { 
        needsUpdate: true, 
        lastTimestamp: this.cacheMetadata.lastDataPoint 
      }
    }

    return { needsUpdate: false }
  }

  /**
   * Merged neue Daten mit Cache
   */
  mergeWithNewData(cachedData: HistoricalDataPoint[], newData: HistoricalDataPoint[]): HistoricalDataPoint[] {
    if (newData.length === 0) return cachedData

    // Map für Deduplizierung
    const combined = new Map(cachedData.map((d) => [d.time, d]))
    newData.forEach((d) => combined.set(d.time, d))
    
    // Sortiert zurückgeben
    return Array.from(combined.values()).sort((a, b) => a.time - b.time)
  }

  /**
   * Cache leeren
   */
  clearCache(): void {
    localStorage.removeItem(HistoricalDataCache.CACHE_KEY)
    localStorage.removeItem(HistoricalDataCache.METADATA_KEY)
    this.memoryCache = null
    this.cacheMetadata = null
    console.log("🗑️ Cache cleared")
  }

  private isCacheValid(): boolean {
    if (!this.cacheMetadata) return false
    
    const now = Date.now()
    const cacheAge = now - this.cacheMetadata.lastUpdated
    
    return cacheAge < HistoricalDataCache.MAX_CACHE_AGE_MS &&
           this.cacheMetadata.dataVersion === HistoricalDataCache.CURRENT_VERSION
  }

  private isMetadataValid(metadata: CacheMetadata): boolean {
    const now = Date.now()
    const cacheAge = now - metadata.lastUpdated
    
    return cacheAge < HistoricalDataCache.MAX_CACHE_AGE_MS &&
           metadata.dataVersion === HistoricalDataCache.CURRENT_VERSION &&
           metadata.totalPoints > 0
  }
}
