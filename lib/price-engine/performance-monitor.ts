export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static recordLoadTime(operation: string, timeMs: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    this.metrics.get(operation)!.push(timeMs)
    
    // Nur die letzten 10 Messungen behalten
    const times = this.metrics.get(operation)!
    if (times.length > 10) {
      times.shift()
    }
  }

  static getAverageLoadTime(operation: string): number {
    const times = this.metrics.get(operation) || []
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  static logPerformanceReport(): void {
    console.group("📊 Performance Report")
    for (const [operation, times] of this.metrics.entries()) {
      const avg = this.getAverageLoadTime(operation)
      console.log(`${operation}: ${Math.round(avg)}ms average (${times.length} samples)`)
    }
    console.groupEnd()
  }

  static getCacheEfficiency(): { cacheHits: number; cacheMisses: number; hitRate: number } {
    const hits = this.metrics.get("cache-hit")?.length || 0
    const misses = this.metrics.get("cache-miss")?.length || 0
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total) * 100 : 0
    
    return { cacheHits: hits, cacheMisses: misses, hitRate }
  }
}
