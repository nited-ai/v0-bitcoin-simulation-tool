// scripts/gap-fill-prices.ts
//
// Gap-fill script: fills the date range from MAX(date) in bitcoin_prices to today
// by pulling daily OHLC from CoinGecko. Handles both fresh DB (full backfill from
// 2013-11-01) and incremental gap-fill (from latest_date + 1).
//
// Usage:
//   pnpm db:seed            (wired up in Task 10)
//
// Idempotent: createMany uses skipDuplicates so re-running is a no-op for existing rows.
//
// Spec: docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md §5.3
//
import { PrismaClient } from "@/lib/generated/prisma"

// === Types ===

export interface CoinGeckoMarketChartResponse {
  prices: Array<[number, number]>         // [timestamp_ms, price_usd]
  market_caps: Array<[number, number]>
  total_volumes: Array<[number, number]>  // [timestamp_ms, volume_usd]
}

export interface ParsedRow {
  date: string         // YYYY-MM-DD (UTC day boundary)
  timestamp: bigint
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  source: string
}

export interface GapFillResult {
  skipped: boolean
  reason?: string
  rowsInserted: number
  fromDate?: string
  toDate?: string
  durationMs: number
}

// === Constants ===

// 2013-11-01 in unix seconds — earliest reliable BTC daily data from CoinGecko free tier
const EARLIEST_DATE = "2013-11-01"
const EARLIEST_DATE_SECONDS = 1383264000

// === Pure functions ===

/**
 * Parse a CoinGecko market_chart response into BitcoinPrice rows.
 * Free-tier CoinGecko returns only close prices; open/high/low default to close.
 * Throws if the response shape is invalid.
 */
export function parseCoinGeckoResponse(
  response: CoinGeckoMarketChartResponse,
  source: string,
): ParsedRow[] {
  if (!response || !Array.isArray(response.prices)) {
    throw new Error("Malformed CoinGecko response: prices array missing")
  }

  const volumeByTs = new Map<number, number>()
  for (const [ts, vol] of response.total_volumes ?? []) {
    volumeByTs.set(ts, vol)
  }

  return response.prices.map(([tsMs, close]) => ({
    date: new Date(tsMs).toISOString().slice(0, 10),
    timestamp: BigInt(tsMs),
    open: close,
    high: close,
    low: close,
    close,
    volume: volumeByTs.get(tsMs) ?? null,
    source,
  }))
}

/**
 * Compute the date range that needs gap-filling.
 * Returns null if DB is already up to date or ahead of today.
 *
 * @param latestDateInDb YYYY-MM-DD of the most recent row in bitcoin_prices, or null if empty.
 * @param today YYYY-MM-DD of "now" (UTC date).
 * @returns { from, to } range to fetch (both inclusive YYYY-MM-DD strings), or null if no gap.
 */
export function detectGapRange(
  latestDateInDb: string | null,
  today: string,
): { from: string; to: string } | null {
  if (latestDateInDb === null) {
    return { from: EARLIEST_DATE, to: today }
  }

  // Compare ISO dates lexicographically (works because YYYY-MM-DD is fixed-width)
  if (latestDateInDb >= today) return null

  // from = latest + 1 day
  const next = new Date(latestDateInDb + "T00:00:00.000Z")
  next.setUTCDate(next.getUTCDate() + 1)
  const fromDate = next.toISOString().slice(0, 10)

  return { from: fromDate, to: today }
}

// === Orchestration ===

/**
 * Fetch and insert any missing daily prices from CoinGecko into the bitcoin_prices table.
 * Returns GapFillResult; throws on external fetch failure (so caller exits non-zero).
 */
export async function gapFillFromCoinGecko(
  prisma: Pick<PrismaClient, "bitcoinPrice" | "systemMeta">,
): Promise<GapFillResult> {
  const start = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  const latest = await prisma.bitcoinPrice.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  })
  const latestDate = latest?.date ?? null

  const range = detectGapRange(latestDate, today)
  if (!range) {
    return {
      skipped: true,
      reason: `bitcoin_prices is up to date (latest = ${latestDate ?? "unknown"})`,
      rowsInserted: 0,
      durationMs: Date.now() - start,
    }
  }

  // Convert YYYY-MM-DD to unix seconds (UTC midnight)
  const fromSeconds =
    latestDate === null
      ? EARLIEST_DATE_SECONDS
      : Math.floor(new Date(range.from + "T00:00:00.000Z").getTime() / 1000)
  const toSeconds = Math.floor(new Date(range.to + "T23:59:59.000Z").getTime() / 1000)

  const url =
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range" +
    `?vs_currency=usd&from=${fromSeconds}&to=${toSeconds}`

  console.log(`Fetching ${range.from} -> ${range.to} from CoinGecko...`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CoinGecko fetch failed: HTTP ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as CoinGeckoMarketChartResponse
  const rows = parseCoinGeckoResponse(json, "coingecko")
  console.log(`Parsed ${rows.length} rows; bulk-inserting (skipDuplicates)...`)

  // Bulk insert with skipDuplicates as the idempotency safety net
  // (createMany with unique 'date' index already prevents true duplicates;
  //  skipDuplicates makes it explicit and avoids unique-constraint errors)
  const result = await prisma.bitcoinPrice.createMany({
    data: rows,
    skipDuplicates: true,
  })

  await prisma.systemMeta.upsert({
    where: { key: "lastSeedRunAt" },
    update: { value: new Date().toISOString() },
    create: { key: "lastSeedRunAt", value: new Date().toISOString() },
  })

  return {
    skipped: false,
    rowsInserted: result.count,
    fromDate: range.from,
    toDate: range.to,
    durationMs: Date.now() - start,
  }
}

// === CLI entry point ===

async function main() {
  const prisma = new PrismaClient()
  try {
    const result = await gapFillFromCoinGecko(prisma)
    if (result.skipped) {
      console.log(`Gap-fill skipped: ${result.reason}`)
    } else {
      console.log(
        `Gap-fill complete: ${result.rowsInserted} rows inserted ` +
          `(${result.fromDate} -> ${result.toDate}) in ${result.durationMs}ms`,
      )
    }
  } catch (err) {
    console.error("Gap-fill failed:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
