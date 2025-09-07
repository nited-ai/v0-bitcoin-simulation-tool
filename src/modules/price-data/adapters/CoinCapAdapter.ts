/**
 * CoinCap API Adapter
 * 
 * Adapter for integrating with CoinCap API for price data.
 * Handles API requests, response transformation, and error handling.
 */

import type {
  IAPIAdapter,
  APIResponse,
  PriceDataSource,
  PriceDataPoint,
  HistoricalDataPoint,
  CoinCapAsset,
  CoinCapHistoryPoint
} from '../types'
import type { ValidationResult, ValidationError } from '@/modules/shared/types'

/**
 * CoinCap API Adapter Implementation
 */
export class CoinCapAdapter implements IAPIAdapter {
  private readonly baseUrl = 'https://api.coincap.io/v2'
  private readonly apiKey: string
  private readonly rateLimit = 200 // requests per minute

  constructor(apiKey: string = '1566c56f-f8a4-43b9-8d62-20e5105c298b') {
    this.apiKey = apiKey
  }

  /**
   * Fetch current price for a symbol
   */
  async fetchCurrentPrice(symbol: string): Promise<APIResponse<number>> {
    try {
      const assetId = this.normalizeSymbol(symbol)
      const url = `${this.baseUrl}/assets/${assetId}`
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
          source: 'coincap'
        }
      }

      const data = await response.json()
      
      if (!data.data || !data.data.priceUsd) {
        return {
          success: false,
          error: 'Invalid response format',
          timestamp: Date.now(),
          source: 'coincap'
        }
      }

      const price = parseFloat(data.data.priceUsd)
      
      return {
        success: true,
        data: price,
        timestamp: Date.now(),
        source: 'coincap'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        source: 'coincap'
      }
    }
  }

  /**
   * Fetch historical data for a symbol
   */
  async fetchHistoricalData(
    symbol: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<APIResponse<HistoricalDataPoint[]>> {
    try {
      const assetId = this.normalizeSymbol(symbol)
      const interval = this.determineInterval(startDate, endDate)
      
      const url = `${this.baseUrl}/assets/${assetId}/history?interval=${interval}&start=${startDate.getTime()}&end=${endDate.getTime()}`
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
          source: 'coincap'
        }
      }

      const data = await response.json()
      
      if (!data.data || !Array.isArray(data.data)) {
        return {
          success: false,
          error: 'Invalid response format',
          timestamp: Date.now(),
          source: 'coincap'
        }
      }

      const historicalData: HistoricalDataPoint[] = data.data.map((point: CoinCapHistoryPoint) => ({
        time: point.time,
        close: parseFloat(point.priceUsd),
        high: parseFloat(point.priceUsd), // CoinCap doesn't provide OHLC, use price for all
        low: parseFloat(point.priceUsd),
        open: parseFloat(point.priceUsd),
        volume: 0 // Not available in this endpoint
      }))

      return {
        success: true,
        data: historicalData,
        timestamp: Date.now(),
        source: 'coincap'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        source: 'coincap'
      }
    }
  }

  /**
   * Validate API response
   */
  validateResponse(response: any): ValidationResult {
    const errors: ValidationError[] = []

    if (!response) {
      errors.push('Response is null or undefined')
      return { isValid: false, errors }
    }

    if (typeof response !== 'object') {
      errors.push('Response is not an object')
      return { isValid: false, errors }
    }

    // Check for CoinCap specific structure
    if (!response.data) {
      errors.push('Missing data field in response')
    }

    if (response.error) {
      errors.push(`API error: ${response.error}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Transform API response to standard format
   */
  transformResponse(response: any): PriceDataPoint[] {
    if (!response || !Array.isArray(response)) {
      return []
    }

    return response.map((point: HistoricalDataPoint) => ({
      timestamp: point.time,
      price: point.close,
      high: point.high,
      low: point.low,
      volume: point.volume,
      metadata: {
        source: 'coincap',
        open: point.open
      }
    }))
  }

  /**
   * Get source information
   */
  getSourceInfo(): PriceDataSource {
    return {
      id: 'coincap',
      name: 'CoinCap API',
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      rateLimit: this.rateLimit,
      enabled: true,
      priority: 10 // Highest priority
    }
  }

  /**
   * Test connection to API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/assets/bitcoin`, {
        headers: this.getHeaders()
      })
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Normalize symbol for CoinCap API
   */
  private normalizeSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'bitcoin': 'bitcoin',
      'btc': 'bitcoin',
      'ethereum': 'ethereum',
      'eth': 'ethereum',
      'litecoin': 'litecoin',
      'ltc': 'litecoin'
    }

    const normalized = symbol.toLowerCase()
    return symbolMap[normalized] || normalized
  }

  /**
   * Determine appropriate interval based on date range
   */
  private determineInterval(startDate: Date, endDate: Date): string {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1) {
      return 'h1' // 1 hour
    } else if (diffDays <= 7) {
      return 'h6' // 6 hours
    } else if (diffDays <= 30) {
      return 'd1' // 1 day
    } else {
      return 'd1' // 1 day (CoinCap's maximum granularity for long periods)
    }
  }
}

// Export singleton instance
export const coinCapAdapter = new CoinCapAdapter()
