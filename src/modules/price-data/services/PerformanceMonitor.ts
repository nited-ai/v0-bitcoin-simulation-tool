/**
 * Performance Monitor Service
 * 
 * Tracks and reports performance metrics for price data operations.
 * Migrated from lib/price-engine/performance-monitor.ts
 */

import type { PerformanceMetrics } from '../types'

interface OperationMetrics {
  operation: string
  totalCalls: number
  totalDuration: number
  averageDuration: number
  successCount: number
  failureCount: number
  cacheHits: number
  cacheMisses: number
  lastCall: Date
  recentDurations: number[]
}

/**
 * Service for monitoring and reporting performance metrics.
 */
export class PerformanceMonitor {
  private metrics = new Map<string, OperationMetrics>()
  private maxRecentDurations = 10

  /**
   * Record a performance metric for an operation.
   */
  public recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    cacheHit?: boolean
  ): void {
    const existing = this.metrics.get(operation) || {
      operation,
      totalCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      successCount: 0,
      failureCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastCall: new Date(),
      recentDurations: []
    }

    // Update metrics
    existing.totalCalls++
    existing.totalDuration += duration
    existing.averageDuration = existing.totalDuration / existing.totalCalls
    existing.lastCall = new Date()

    if (success) {
      existing.successCount++
    } else {
      existing.failureCount++
    }

    if (cacheHit !== undefined) {
      if (cacheHit) {
        existing.cacheHits++
      } else {
        existing.cacheMisses++
      }
    }

    // Track recent durations for trend analysis
    existing.recentDurations.push(duration)
    if (existing.recentDurations.length > this.maxRecentDurations) {
      existing.recentDurations.shift()
    }

    this.metrics.set(operation, existing)
  }

  /**
   * Record load time for backward compatibility.
   */
  public recordLoadTime(operation: string, timeMs: number): void {
    this.recordOperation(operation, timeMs, true)
  }

  /**
   * Get average load time for an operation.
   */
  public getAverageLoadTime(operation: string): number {
    const metrics = this.metrics.get(operation)
    return metrics?.averageDuration || 0
  }

  /**
   * Get all performance metrics.
   */
  public getMetrics(): Map<string, OperationMetrics> {
    return new Map(this.metrics)
  }

  /**
   * Get metrics for a specific operation.
   */
  public getOperationMetrics(operation: string): OperationMetrics | null {
    return this.metrics.get(operation) || null
  }

  /**
   * Get cache efficiency statistics.
   */
  public getCacheEfficiency(): { 
    cacheHits: number
    cacheMisses: number
    hitRate: number 
  } {
    let totalHits = 0
    let totalMisses = 0

    for (const metrics of this.metrics.values()) {
      totalHits += metrics.cacheHits
      totalMisses += metrics.cacheMisses
    }

    const total = totalHits + totalMisses
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0

    return {
      cacheHits: totalHits,
      cacheMisses: totalMisses,
      hitRate
    }
  }

  /**
   * Get success rate for operations.
   */
  public getSuccessRate(): number {
    let totalSuccess = 0
    let totalFailures = 0

    for (const metrics of this.metrics.values()) {
      totalSuccess += metrics.successCount
      totalFailures += metrics.failureCount
    }

    const total = totalSuccess + totalFailures
    return total > 0 ? (totalSuccess / total) * 100 : 0
  }

  /**
   * Get performance trends for an operation.
   */
  public getPerformanceTrend(operation: string): {
    improving: boolean
    degrading: boolean
    stable: boolean
    trendPercentage: number
  } {
    const metrics = this.metrics.get(operation)
    if (!metrics || metrics.recentDurations.length < 3) {
      return { improving: false, degrading: false, stable: true, trendPercentage: 0 }
    }

    const recent = metrics.recentDurations
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100
    const threshold = 10 // 10% threshold for trend detection

    return {
      improving: trendPercentage < -threshold,
      degrading: trendPercentage > threshold,
      stable: Math.abs(trendPercentage) <= threshold,
      trendPercentage
    }
  }

  /**
   * Log comprehensive performance report.
   */
  public logPerformanceReport(): void {
    console.group("📊 Performance Report")
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const successRate = (metrics.successCount / metrics.totalCalls) * 100
      const cacheHitRate = metrics.cacheHits + metrics.cacheMisses > 0 
        ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 
        : 0

      console.log(`${operation}:`)
      console.log(`  Average: ${Math.round(metrics.averageDuration)}ms`)
      console.log(`  Calls: ${metrics.totalCalls}`)
      console.log(`  Success Rate: ${Math.round(successRate)}%`)
      if (metrics.cacheHits + metrics.cacheMisses > 0) {
        console.log(`  Cache Hit Rate: ${Math.round(cacheHitRate)}%`)
      }
      console.log(`  Last Call: ${metrics.lastCall.toISOString()}`)
    }
    
    console.groupEnd()
  }

  /**
   * Get slowest operations.
   */
  public getSlowestOperations(limit: number = 5): Array<{
    operation: string
    averageDuration: number
    totalCalls: number
  }> {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
      .map(metrics => ({
        operation: metrics.operation,
        averageDuration: metrics.averageDuration,
        totalCalls: metrics.totalCalls
      }))
  }

  /**
   * Get most frequently called operations.
   */
  public getMostFrequentOperations(limit: number = 5): Array<{
    operation: string
    totalCalls: number
    averageDuration: number
  }> {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, limit)
      .map(metrics => ({
        operation: metrics.operation,
        totalCalls: metrics.totalCalls,
        averageDuration: metrics.averageDuration
      }))
  }

  /**
   * Reset all metrics.
   */
  public reset(): void {
    this.metrics.clear()
    console.log('🔄 Performance metrics reset')
  }

  /**
   * Reset metrics for a specific operation.
   */
  public resetOperation(operation: string): boolean {
    const deleted = this.metrics.delete(operation)
    if (deleted) {
      console.log(`🔄 Performance metrics reset for operation: ${operation}`)
    }
    return deleted
  }

  /**
   * Export metrics as JSON for analysis.
   */
  public exportMetrics(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: Array.from(this.metrics.entries()).map(([operationName, metrics]) => ({
        ...metrics,
        lastCall: metrics.lastCall.toISOString()
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Get performance summary.
   */
  public getSummary(): {
    totalOperations: number
    totalCalls: number
    averageResponseTime: number
    successRate: number
    cacheEfficiency: number
  } {
    let totalCalls = 0
    let totalDuration = 0
    let totalSuccess = 0
    let totalFailures = 0
    const cacheStats = this.getCacheEfficiency()

    for (const metrics of this.metrics.values()) {
      totalCalls += metrics.totalCalls
      totalDuration += metrics.totalDuration
      totalSuccess += metrics.successCount
      totalFailures += metrics.failureCount
    }

    return {
      totalOperations: this.metrics.size,
      totalCalls,
      averageResponseTime: totalCalls > 0 ? totalDuration / totalCalls : 0,
      successRate: totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0,
      cacheEfficiency: cacheStats.hitRate
    }
  }
}
