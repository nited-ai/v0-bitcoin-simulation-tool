/**
 * Data Cache
 * 
 * In-memory cache for price data with TTL support and LRU eviction.
 * Provides fast access to frequently requested data.
 */

import type {
  IDataCache,
  CacheEntry,
  CacheStats,
  CacheConfig
} from '../types'

/**
 * Data Cache Implementation
 */
export class DataCache implements IDataCache {
  private cache: Map<string, CacheEntry> = new Map()
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      maxSize: 100, // 100MB default
      ttl: 3600000, // 1 hour default
      strategy: 'lru',
      persistToDisk: false,
      ...config
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null
    }

    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check TTL
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hits++

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    try {
      const size = this.calculateSize(data)
      const entryTtl = ttl || this.config.ttl
      
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl: entryTtl,
        size,
        accessCount: 1,
        lastAccessed: Date.now()
      }

      // Check if we need to evict entries
      await this.ensureCapacity(size)

      this.cache.set(key, entry)
      return true

    } catch (error) {
      console.error('Failed to set cache entry:', error)
      return false
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<boolean> {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
    return true
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // Check TTL
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Get cache size (number of entries)
   */
  async size(): Promise<number> {
    return this.cache.size
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const entries = Array.from(this.cache.values())
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    const totalRequests = this.stats.hits + this.stats.misses
    
    let oldestEntry = Date.now()
    let newestEntry = 0
    
    entries.forEach(entry => {
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp
      }
    })

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictionCount: this.stats.evictions,
      oldestEntry: new Date(oldestEntry),
      newestEntry: new Date(newestEntry),
      memoryUsage: totalSize / (1024 * 1024) // MB
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    return cleanedCount
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data)
      return new Blob([jsonString]).size
    } catch (error) {
      // Fallback estimation
      return 1024 // 1KB default
    }
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024 // Convert MB to bytes
    const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
    
    if (currentSize + newEntrySize <= maxSizeBytes) {
      return // Enough capacity
    }

    // Need to evict entries
    const entries = Array.from(this.cache.entries())
    
    // Sort by eviction strategy
    switch (this.config.strategy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
        break
      case 'fifo':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)
        break
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount)
        break
    }

    // Evict entries until we have enough space
    let freedSpace = 0
    let evictedCount = 0
    
    for (const [key, entry] of entries) {
      if (currentSize - freedSpace + newEntrySize <= maxSizeBytes) {
        break
      }
      
      this.cache.delete(key)
      freedSpace += entry.size
      evictedCount++
    }
    
    this.stats.evictions += evictedCount
    
    if (evictedCount > 0) {
      console.log(`🗑️ Evicted ${evictedCount} cache entries to free ${Math.round(freedSpace / 1024)}KB`)
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startPeriodicCleanup(intervalMs: number = 300000): void { // 5 minutes default
    setInterval(async () => {
      const cleaned = await this.cleanup()
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired cache entries`)
      }
    }, intervalMs)
  }
}

// Export singleton instance
export const dataCache = new DataCache()
