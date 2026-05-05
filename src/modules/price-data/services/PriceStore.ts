// src/modules/price-data/services/PriceStore.ts
//
// DB layer for the new price-data architecture (PR2 of the refactor).
// Single place that knows how to query/write bitcoin_prices and system_meta.
// No external API knowledge — pure DB.
//
import type { PrismaClient, BitcoinPrice } from '@/lib/generated/prisma'

export interface UpsertDayInput {
  date: string         // YYYY-MM-DD
  timestamp: bigint
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
  source: string
  fetchedAt: Date
}

export interface PriceStore {
  getLatest(): Promise<BitcoinPrice | null>
  getRange(from: string, to: string): Promise<BitcoinPrice[]>
  getATH(): Promise<number | null>  // MAX(high) per spec D5
  upsertDay(input: UpsertDayInput): Promise<BitcoinPrice>
  getMeta(key: string): Promise<string | null>
  setMeta(key: string, value: string): Promise<void>
}

export function createPriceStore(prisma: PrismaClient): PriceStore {
  return {
    async getLatest() {
      return prisma.bitcoinPrice.findFirst({ orderBy: { date: 'desc' } })
    },

    async getRange(from, to) {
      return prisma.bitcoinPrice.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      })
    },

    async getATH() {
      const r = await prisma.bitcoinPrice.aggregate({ _max: { high: true } })
      return r._max.high ?? null
    },

    async upsertDay(input) {
      // Upsert by unique date key. On conflict, refresh the OHLC sensibly:
      // - close: always update to latest fetch (most recent close-of-period)
      // - high: take new (caller — PriceUpdater — handles MAX logic if needed)
      // - low:  take new (caller handles MIN if needed)
      // - source/fetchedAt/volume: always update
      return prisma.bitcoinPrice.upsert({
        where: { date: input.date },
        create: {
          date: input.date,
          timestamp: input.timestamp,
          open: input.open,
          high: input.high,
          low: input.low,
          close: input.close,
          volume: input.volume ?? null,
          source: input.source,
          fetchedAt: input.fetchedAt,
        },
        update: {
          close: input.close,
          high: input.high,
          low: input.low,
          volume: input.volume ?? null,
          source: input.source,
          fetchedAt: input.fetchedAt,
        },
      })
    },

    async getMeta(key) {
      const row = await prisma.systemMeta.findUnique({ where: { key } })
      return row?.value ?? null
    },

    async setMeta(key, value) {
      await prisma.systemMeta.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    },
  }
}
