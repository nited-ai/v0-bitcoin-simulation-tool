/**
 * ATH (All-Time High) Service
 * 
 * Manages Bitcoin ATH data from server-side JSON file with automatic updates
 * when new all-time highs are detected. Follows the same pattern as historical
 * price data JSON files.
 */

// Fallback ATH constant - the actual last ATH before any new highs
const FALLBACK_ATH = 124277.98

export interface ATHData {
  meta: {
    lastUpdated: string
    source: string
    version: string
    description?: string
  }
  ath: {
    value: number
    date: string
    timestamp: number
    source: string
  }
}

export class ATHService {
  private readonly ATH_JSON_URL = '/data/bitcoin/ath.json'
  private cache: ATHData | null = null
  private cacheExpiry: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get current ATH value from JSON file with fallback to constant
   */
  async getCurrentATH(): Promise<number> {
    try {
      const athData = await this.loadATHData()
      return athData?.ath?.value ?? FALLBACK_ATH
    } catch (error) {
      console.warn('⚠️ Failed to load ATH data, using fallback:', error)
      return FALLBACK_ATH
    }
  }

  /**
   * Get full ATH data including metadata
   */
  async getATHData(): Promise<ATHData | null> {
    try {
      return await this.loadATHData()
    } catch (error) {
      console.warn('⚠️ Failed to load ATH data:', error)
      return null
    }
  }

  /**
   * Check if current price exceeds ATH and should trigger an update
   */
  async checkAndUpdateATH(currentPrice: number): Promise<boolean> {
    try {
      const currentATH = await this.getCurrentATH()
      
      if (currentPrice > currentATH) {
        console.log(`🚀 New ATH detected! Current: ${currentPrice}, Previous: ${currentATH}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error checking ATH:', error)
      return false
    }
  }

  /**
   * Update ATH value (server-side operation)
   * Note: This method indicates when an update should happen, but the actual
   * JSON file update occurs server-side in the daily update service
   */
  async updateATH(newValue: number, date: string, timestamp: number): Promise<boolean> {
    try {
      // In a real implementation, this would make an API call to update the server-side JSON file
      // For now, we log the update that should happen
      console.log(`📝 ATH update needed: ${newValue} on ${date}`)
      
      // Clear cache to force reload on next access
      this.clearCache()
      
      return true
    } catch (error) {
      console.error('❌ Error updating ATH:', error)
      return false
    }
  }

  /**
   * Load ATH data from JSON file with caching
   */
  private async loadATHData(): Promise<ATHData | null> {
    // Check cache first
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache
    }

    try {
      console.log('📡 Loading ATH data from JSON file...')
      const response = await fetch(this.ATH_JSON_URL)
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Validate data structure
      if (!this.isValidATHData(data)) {
        throw new Error('Invalid ATH data structure')
      }

      // Cache the data
      this.cache = data
      this.cacheExpiry = Date.now() + this.CACHE_DURATION

      console.log(`✅ ATH data loaded: $${data.ath.value} from ${data.ath.date}`)
      return data

    } catch (error) {
      console.error('❌ Failed to load ATH data:', error)
      throw error
    }
  }

  /**
   * Validate ATH data structure
   */
  private isValidATHData(data: any): data is ATHData {
    return (
      data &&
      typeof data === 'object' &&
      data.meta &&
      typeof data.meta.lastUpdated === 'string' &&
      typeof data.meta.source === 'string' &&
      typeof data.meta.version === 'string' &&
      data.ath &&
      typeof data.ath.value === 'number' &&
      typeof data.ath.date === 'string' &&
      typeof data.ath.timestamp === 'number' &&
      typeof data.ath.source === 'string'
    )
  }

  /**
   * Clear cached data
   */
  private clearCache(): void {
    this.cache = null
    this.cacheExpiry = 0
  }

  /**
   * Get fallback ATH constant
   */
  getFallbackATH(): number {
    return FALLBACK_ATH
  }
}

// Export singleton instance
export const athService = new ATHService()
