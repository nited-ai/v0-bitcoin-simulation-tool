/**
 * DataCache Tests
 * 
 * Test suite for the DataCache service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DataCache } from '../services/DataCache'
import type { CacheConfiguration } from '../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('DataCache', () => {
  let cache: DataCache
  const defaultConfig: CacheConfiguration = {
    maxSize: 100,
    maxAge: 60000, // 1 minute
    persistToLocalStorage: true,
    compressionEnabled: false
  }

  beforeEach(() => {
    cache = new DataCache(defaultConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    cache.clear()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data)
      const retrieved = cache.get(key)

      expect(retrieved).toEqual(data)
    })

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should check if key exists', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      expect(cache.has(key)).toBe(false)

      cache.set(key, data)
      expect(cache.has(key)).toBe(true)
    })

    it('should delete entries', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data)
      expect(cache.has(key)).toBe(true)

      const deleted = cache.delete(key)
      expect(deleted).toBe(true)
      expect(cache.has(key)).toBe(false)
    })

    it('should clear all entries', () => {
      cache.set('key1', 'data1')
      cache.set('key2', 'data2')

      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(true)

      cache.clear()

      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('Expiration', () => {
    it('should expire entries after maxAge', async () => {
      const shortConfig: CacheConfiguration = {
        ...defaultConfig,
        maxAge: 100 // 100ms
      }
      const shortCache = new DataCache(shortConfig)

      const key = 'test-key'
      const data = { value: 'test-data' }

      shortCache.set(key, data)
      expect(shortCache.get(key)).toEqual(data)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(shortCache.get(key)).toBeNull()
    })

    it('should respect custom maxAge on set', async () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data, 100) // 100ms custom expiration
      expect(cache.get(key)).toEqual(data)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(cache.get(key)).toBeNull()
    })

    it('should cleanup expired entries', async () => {
      const shortConfig: CacheConfiguration = {
        ...defaultConfig,
        maxAge: 100 // 100ms
      }
      const shortCache = new DataCache(shortConfig)

      shortCache.set('key1', 'data1')
      shortCache.set('key2', 'data2')

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      const removedCount = shortCache.cleanup()
      expect(removedCount).toBe(2)
    })
  })

  describe('Size Management', () => {
    it('should enforce max size', () => {
      const smallConfig: CacheConfiguration = {
        ...defaultConfig,
        maxSize: 2
      }
      const smallCache = new DataCache(smallConfig)

      smallCache.set('key1', 'data1')
      smallCache.set('key2', 'data2')
      smallCache.set('key3', 'data3') // Should evict key1

      expect(smallCache.has('key1')).toBe(false)
      expect(smallCache.has('key2')).toBe(true)
      expect(smallCache.has('key3')).toBe(true)
    })

    it('should report current size', () => {
      expect(cache.getCurrentSize()).toBe(0)

      cache.set('key1', 'data1')
      expect(cache.getCurrentSize()).toBeGreaterThan(0)

      cache.set('key2', 'data2')
      expect(cache.getCurrentSize()).toBeGreaterThan(0)
    })
  })

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      // Initial stats
      let stats = cache.getStats()
      expect(stats.totalRequests).toBe(0)
      expect(stats.cacheHits).toBe(0)
      expect(stats.cacheMisses).toBe(0)

      // Cache miss
      cache.get(key)
      stats = cache.getStats()
      expect(stats.totalRequests).toBe(1)
      expect(stats.cacheMisses).toBe(1)
      expect(stats.hitRate).toBe(0)

      // Cache hit
      cache.set(key, data)
      cache.get(key)
      stats = cache.getStats()
      expect(stats.totalRequests).toBe(2)
      expect(stats.cacheHits).toBe(1)
      expect(stats.cacheMisses).toBe(1)
      expect(stats.hitRate).toBe(50)
    })

    it('should calculate hit rate correctly', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data)

      // 3 hits, 1 miss
      cache.get(key) // hit
      cache.get(key) // hit
      cache.get(key) // hit
      cache.get('non-existent') // miss

      const stats = cache.getStats()
      expect(stats.hitRate).toBe(75) // 3/4 = 75%
    })
  })

  describe('LocalStorage Integration', () => {
    it('should save to localStorage when enabled', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `price-cache-${key}`,
        expect.any(String)
      )
    })

    it('should not save to localStorage when disabled', () => {
      const noLocalStorageConfig: CacheConfiguration = {
        ...defaultConfig,
        persistToLocalStorage: false
      }
      const noLocalStorageCache = new DataCache(noLocalStorageConfig)

      const key = 'test-key'
      const data = { value: 'test-data' }

      noLocalStorageCache.set(key, data)

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const key = 'test-key'
      const data = { value: 'test-data' }

      expect(() => cache.set(key, data)).not.toThrow()
    })

    it('should remove from localStorage on delete', () => {
      const key = 'test-key'
      const data = { value: 'test-data' }

      cache.set(key, data)
      cache.delete(key)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`price-cache-${key}`)
    })
  })

  describe('Data Types', () => {
    it('should handle different data types', () => {
      const testCases = [
        { key: 'string', data: 'test string' },
        { key: 'number', data: 42 },
        { key: 'boolean', data: true },
        { key: 'array', data: [1, 2, 3] },
        { key: 'object', data: { nested: { value: 'test' } } },
        { key: 'null', data: null },
        { key: 'undefined', data: undefined }
      ]

      testCases.forEach(({ key, data }) => {
        cache.set(key, data)
        const retrieved = cache.get(key)
        expect(retrieved).toEqual(data)
      })
    })

    it('should handle large objects', () => {
      const largeObject = {
        data: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: `item-${i}`,
          nested: { deep: { value: i * 2 } }
        }))
      }

      const key = 'large-object'
      cache.set(key, largeObject)
      const retrieved = cache.get(key)

      expect(retrieved).toEqual(largeObject)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty keys', () => {
      const data = { value: 'test' }
      
      cache.set('', data)
      const retrieved = cache.get('')
      
      expect(retrieved).toEqual(data)
    })

    it('should handle special characters in keys', () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key@with#special$chars%'
      ]

      specialKeys.forEach(key => {
        const data = { key, value: `data for ${key}` }
        cache.set(key, data)
        const retrieved = cache.get(key)
        expect(retrieved).toEqual(data)
      })
    })

    it('should handle concurrent operations', () => {
      const promises = []

      // Simulate concurrent set operations
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              cache.set(`key-${i}`, `data-${i}`)
              resolve()
            }, Math.random() * 10)
          })
        )
      }

      return Promise.all(promises).then(() => {
        // Verify all data was set correctly
        for (let i = 0; i < 10; i++) {
          expect(cache.get(`key-${i}`)).toBe(`data-${i}`)
        }
      })
    })
  })
})
