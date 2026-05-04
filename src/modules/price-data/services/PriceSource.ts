// src/modules/price-data/services/PriceSource.ts
//
// Multi-provider fallback chain. Tries providers in order; returns the first
// successful NormalizedPricePoint. Throws if all fail.
//
import type { PriceProvider, NormalizedPricePoint } from './PriceSource/types'
import { binance } from './PriceSource/providers/binance'
import { coincap } from './PriceSource/providers/coincap'
import { cryptocompare } from './PriceSource/providers/cryptocompare'
import { yahoo } from './PriceSource/providers/yahoo'
import { coingecko } from './PriceSource/providers/coingecko'

// Default chain per spec §6 priority order.
// CoinGecko intentionally last (preserve free-tier quota for historical seeds).
export const defaultChain: PriceProvider[] = [
  binance,
  coincap,
  cryptocompare,
  yahoo,
  coingecko,
]

export async function fetchCurrentWithFallback(
  chain: PriceProvider[] = defaultChain,
): Promise<NormalizedPricePoint> {
  if (chain.length === 0) throw new Error('PriceSource: empty provider chain')
  const errors: string[] = []
  for (const provider of chain) {
    try {
      const result = await provider.fetchCurrent()
      if (errors.length > 0) {
        console.warn(`✓ ${provider.name} succeeded after ${errors.length} failures: ${errors.join('; ')}`)
      }
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${provider.name}: ${msg}`)
    }
  }
  throw new Error(`PriceSource: all providers failed — ${errors.join('; ')}`)
}

export type { NormalizedPricePoint, PriceProvider } from './PriceSource/types'
