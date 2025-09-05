/**
 * CoinDesk API Adapter
 * 
 * Adapter for integrating with CoinDesk API for Bitcoin price data.
 * Handles API requests, response transformation, and error handling.
 */

import type {
  IAPIAdapter,
  APIResponse,
  PriceDataSource,
  PriceDataPoint,
  HistoricalDataPoint,
  CoinDeskCurrentPrice
} from '../types'
import type { ValidationResult } from '@/modules/shared/types'

/**
 * CoinDesk API Adapter Implementation
 */
export class CoinDeskAdapter implements IAPIAdapter {
  private readonly baseUrl = 'https://api.coindesk.com/v1/bpi'
  private readonly apiKey: string
  private readonly rateLimit = 100 // requests per minute

  constructor(apiKey: string = '3e9ba37b23ad618af9308dfea087cd26884b1a91c666c514403cc4e41103343e') {
    this.apiKey = apiKey
  }

  /**
   * Fetch current price for a symbol
   */
  async fetchCurrentPrice(symbol: string): Promise<APIResponse<number>> {
    try {
      // CoinDesk only supports Bitcoin
      if (!this.isBitcoin(symbol)) {
        return {
          success: false,
          error: 'CoinDesk API only supports Bitcoin',
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      const url = `${this.baseUrl}/currentprice.json`
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      const data: CoinDeskCurrentPrice = await response.json()
      
      if (!data.bpi || !data.bpi.USD || typeof data.bpi.USD.rate_float !== 'number') {
        return {
          success: false,
          error: 'Invalid response format',
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      return {
        success: true,
        data: data.bpi.USD.rate_float,
        timestamp: Date.now(),
        source: 'coindesk'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        source: 'coindesk'
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
      // CoinDesk only supports Bitcoin
      if (!this.isBitcoin(symbol)) {
        return {
          success: false,
          error: 'CoinDesk API only supports Bitcoin',
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      const startDateStr = this.formatDate(startDate)
      const endDateStr = this.formatDate(endDate)
      
      const url = `${this.baseUrl}/historical/close.json?start=${startDateStr}&end=${endDateStr}`
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      const data = await response.json()
      
      if (!data.bpi || typeof data.bpi !== 'object') {
        return {
          success: false,
          error: 'Invalid response format',
          timestamp: Date.now(),
          source: 'coindesk'
        }
      }

      const historicalData: HistoricalDataPoint[] = Object.entries(data.bpi).map(([dateStr, price]) => {
        const date = new Date(dateStr)
        const priceValue = typeof price === 'number' ? price : parseFloat(String(price))
        
        return {
          time: date.getTime(),
          close: priceValue,
          high: priceValue, // CoinDesk only provides close price
          low: priceValue,
          open: priceValue,
          volume: 0 // Not available
        }
      }).sort((a, b) => a.time - b.time)

      return {
        success: true,
        data: historicalData,
        timestamp: Date.now(),
        source: 'coindesk'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        source: 'coindesk'
      }
    }
  }

  /**
   * Validate API response
   */
  validateResponse(response: any): ValidationResult {
    const errors: string[] = []

    if (!response) {
      errors.push('Response is null or undefined')
      return { isValid: false, errors }
    }

    if (typeof response !== 'object') {
      errors.push('Response is not an object')
      return { isValid: false, errors }
    }

    // Check for CoinDesk specific structure
    if (!response.bpi) {
      errors.push('Missing bpi field in response')
    }

    if (response.disclaimer && typeof response.disclaimer !== 'string') {
      errors.push('Invalid disclaimer field')
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
        source: 'coindesk',
        open: point.open
      }
    }))
  }

  /**
   * Get source information
   */
  getSourceInfo(): PriceDataSource {
    return {
      id: 'coindesk',
      name: 'CoinDesk API',
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      rateLimit: this.rateLimit,
      enabled: true,
      priority: 8 // Lower priority than CoinCap
    }
  }

  /**
   * Test connection to API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/currentprice.json`, {
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
      'Accept': 'application/json',
      'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    return headers
  }

  /**
   * Check if symbol is Bitcoin
   */
  private isBitcoin(symbol: string): boolean {
    const bitcoinSymbols = ['bitcoin', 'btc', 'BTC']
    return bitcoinSymbols.includes(symbol.toLowerCase()) || bitcoinSymbols.includes(symbol)
  }

  /**
   * Format date for CoinDesk API (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }
}

// Export singleton instance
export const coinDeskAdapter = new CoinDeskAdapter()
