/**
 * Data Cache Service
 * 
 * Provides in-memory and localStorage caching for price data.
 * Includes cache invalidation, compression, and performance monitoring.
 */

import type { CacheConfiguration, CacheStats } from '../types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  size: number
}

/**
 * High-performance data cache with multiple storage layers.
 */
export class DataCache {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private config: CacheConfiguration
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdated: new Date()
  }

  constructor(config: CacheConfiguration) {
    this.config = config
    this.initializeFromLocalStorage()
    this.startCleanupInterval()
  }

  /**
   * Store data in cache with optional expiration.
   */
  public set<T>(key: string, data: T, maxAge?: number): void {
    const now = Date.now()
    const expiresAt = now + (maxAge || this.config.maxAge)
    const size = this.estimateSize(data)

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      size
    }

    // Store in memory cache
    this.memoryCache.set(key, entry)

    // Store in localStorage if enabled
    if (this.config.persistToLocalStorage) {
      this.saveToLocalStorage(key, entry)
    }

    // Cleanup if cache is too large
    this.enforceMaxSize()
  }

  /**
   * Retrieve data from cache.
   */
  public get<T>(key: string): T | null {
    this.stats.totalRequests++

    // Check memory cache first
    const entry = this.memoryCache.get(key)
    
    if (entry) {
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key)
        this.stats.cacheMisses++
        return null
      }

      this.stats.cacheHits++
      return entry.data as T
    }

    // Check localStorage if enabled
    if (this.config.persistToLocalStorage) {
      const localEntry = this.loadFromLocalStorage(key)
      if (localEntry && Date.now() <= localEntry.expiresAt) {
        // Restore to memory cache
        this.memoryCache.set(key, localEntry)
        this.stats.cacheHits++
        return localEntry.data as T
      }
    }

    this.stats.cacheMisses++
    return null
  }

  /**
   * Check if key exists in cache and is not expired.
   */
  public has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete specific cache entry.
   */
  public delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key)
    
    if (this.config.persistToLocalStorage) {
      try {
        localStorage.removeItem(`price-cache-${key}`)
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error)
      }
    }

    return deleted
  }

  /**
   * Clear all cache entries.
   */
  public clear(): void {
    this.memoryCache.clear()
    
    if (this.config.persistToLocalStorage) {
      try {
        // Remove all price cache entries from localStorage
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('price-cache-')) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error)
      }
    }

    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastUpdated: new Date()
    }
  }

  /**
   * Get cache statistics.
   */
  public getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
      : 0

    return {
      hitRate,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      cacheSize: this.memoryCache.size,
      lastUpdated: this.stats.lastUpdated
    }
  }

  /**
   * Get current cache size in bytes (estimated).
   */
  public getCurrentSize(): number {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  /**
   * Cleanup expired entries.
   */
  public cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key)
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Estimate the size of data in bytes.
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries.
   */
  private enforceMaxSize(): void {
    if (this.memoryCache.size <= this.config.maxSize) {
      return
    }

    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    // Remove oldest entries until under max size
    const toRemove = this.memoryCache.size - this.config.maxSize
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i]
      this.delete(key)
    }
  }

  /**
   * Save cache entry to localStorage.
   */
  private saveToLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      const serialized = JSON.stringify(entry)
      localStorage.setItem(`price-cache-${key}`, serialized)
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  /**
   * Load cache entry from localStorage.
   */
  private loadFromLocalStorage(key?: string): CacheEntry<any> | null {
    if (!key) return null

    try {
      const serialized = localStorage.getItem(`price-cache-${key}`)
      if (!serialized) return null

      return JSON.parse(serialized)
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
      return null
    }
  }

  /**
   * Load all cache entries from localStorage on initialization.
   */
  private initializeFromLocalStorage(): void {
    if (!this.config.persistToLocalStorage) return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(storageKey => {
        if (storageKey.startsWith('price-cache-')) {
          const cacheKey = storageKey.replace('price-cache-', '')
          const entry = this.loadFromLocalStorage(cacheKey)

          if (entry && Date.now() <= entry.expiresAt) {
            this.memoryCache.set(cacheKey, entry)
          } else if (entry) {
            // Remove expired entry
            localStorage.removeItem(storageKey)
          }
        }
      })
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error)
    }
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  private startCleanupInterval(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      const removed = this.cleanup()
      if (removed > 0) {
        console.log(`🧹 Cache cleanup: removed ${removed} expired entries`)
      }
    }, 5 * 60 * 1000)
  }
}
