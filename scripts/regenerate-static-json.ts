// scripts/regenerate-static-json.ts
//
// One-shot: regenerate public/data/bitcoin/{daily,weekly,monthly,ath}.json
// from the live Neon DB. Pre-PR4 patch: the runtime app still reads these
// files until PR4 cuts over to the DB-backed API endpoint.
//
// Usage:
//   set -a; source .env.local; set +a; pnpm tsx scripts/regenerate-static-json.ts
//
import { Client } from 'pg'
import * as fs from 'fs/promises'
import * as path from 'path'

interface PriceRow {
  date: string             // YYYY-MM-DD
  timestamp: bigint
  open: number
  high: number
  low: number
  close: number
}

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'bitcoin')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')

  const client = new Client({ connectionString: url })
  await client.connect()

  console.log('Fetching all bitcoin_prices rows...')
  const res = await client.query<PriceRow>(`
    SELECT date, timestamp, open, high, low, close
    FROM bitcoin_prices
    ORDER BY date ASC
  `)
  const rows = res.rows
  console.log(`Got ${rows.length} rows from ${rows[0]?.date} to ${rows.at(-1)?.date}`)

  // Find ATH = max(high), tie-break by earliest date
  const ath = rows.reduce((acc, r) =>
    r.high > acc.high || (r.high === acc.high && r.date < acc.date) ? r : acc,
    rows[0]
  )
  console.log(`ATH: $${ath.high} on ${ath.date}`)

  // === daily.json ===
  const daily = rows.map(r => [Number(r.timestamp), round2(r.close)])
  await writeJson('daily.json', {
    meta: {
      startDate: rows[0].date,
      endDate: rows.at(-1)!.date,
      interval: 'daily',
      count: daily.length,
      lastUpdated: new Date().toISOString(),
    },
    data: daily,
  })

  // === weekly.json ===
  // Aggregation: take the LAST row of each ISO-week.
  // ISO week starts Monday. We bucket each row by its ISO-week-year + week number.
  const weeklyMap = new Map<string, PriceRow>()
  for (const row of rows) {
    const d = new Date(row.date + 'T00:00:00.000Z')
    const yw = isoYearWeek(d)  // e.g., "2025-W34"
    weeklyMap.set(yw, row)  // last row in iteration order wins (rows are date-ascending)
  }
  const weeklyRows = Array.from(weeklyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const weekly = weeklyRows.map(r => [Number(r.timestamp), round2(r.close)])
  await writeJson('weekly.json', {
    meta: {
      startDate: weeklyRows[0].date,
      endDate: weeklyRows.at(-1)!.date,
      interval: 'weekly',
      count: weekly.length,
      lastUpdated: new Date().toISOString(),
    },
    data: weekly,
  })

  // === monthly.json ===
  // Aggregation: take the LAST row of each calendar month (YYYY-MM).
  const monthlyMap = new Map<string, PriceRow>()
  for (const row of rows) {
    const ym = row.date.slice(0, 7)  // "YYYY-MM"
    monthlyMap.set(ym, row)
  }
  const monthlyRows = Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const monthly = monthlyRows.map(r => [Number(r.timestamp), round2(r.close)])
  await writeJson('monthly.json', {
    meta: {
      startDate: monthlyRows[0].date,
      endDate: monthlyRows.at(-1)!.date,
      interval: 'monthly',
      count: monthly.length,
      lastUpdated: new Date().toISOString(),
    },
    data: monthly,
  })

  // === ath.json ===
  await writeJson('ath.json', {
    meta: {
      lastUpdated: new Date().toISOString(),
      source: 'historical_analysis',
      version: '1.0.0',
      description: 'Bitcoin All-Time High (ATH) data - regenerated from Postgres',
    },
    ath: {
      value: round2(ath.high),
      date: ath.date,
      timestamp: Number(ath.timestamp),
      source: 'historical_data',
    },
  })

  await client.end()
  console.log('All 4 JSON files regenerated.')
}

/** Round to 2 decimals to match the existing JSON file format and keep payload size sane. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function writeJson(filename: string, data: unknown) {
  const filePath = path.join(OUTPUT_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  const size = (await fs.stat(filePath)).size
  console.log(`  ${filename} (${(size / 1024).toFixed(1)} KB)`)
}

/** ISO year-week label, e.g., "2025-W34". Monday is day 1 per ISO 8601. */
function isoYearWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Set to nearest Thursday (current date + 4 - current day number, with Sunday as 0)
  const dayNum = (t.getUTCDay() + 6) % 7  // Mon=0, Sun=6
  t.setUTCDate(t.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  const diff = (t.getTime() - firstThursday.getTime()) / 86400000
  const week = 1 + Math.floor((diff - ((firstThursday.getUTCDay() + 6) % 7) + 3) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

main().catch((err) => { console.error('ERROR:', err); process.exit(1) })
