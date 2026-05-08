# Real OHLC Backfill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake-OHLC seed/gap-fill mechanism with real Binance Klines OHLC, including the live-price provider, then run once against production to fix the displayed ATH.

**Architecture:** New `scripts/backfill-and-seed-prices.ts` (replaces `gap-fill-prices.ts`) uses Binance Klines `/api/v3/klines?interval=1d` for 2017-08-17+ rows; pre-2017 rows untouched. Live-provider `binance.ts:fetchCurrent` switched from `/ticker/price` (close-only) to `/klines?limit=1` (real OHLC). Idempotent upsert by date key; pre-run JSON snapshot enables `--restore` rollback.

**Tech Stack:** TypeScript + Vitest, Prisma 6 + Vercel/Neon Postgres, `tsx` runner.

**Spec:** `docs/superpowers/specs/2026-05-06-real-ohlc-backfill-design.md` (v2 post-red-team)

**Why every commit chains `pnpm type-check`:** `next.config.mjs:8` has `typescript.ignoreBuildErrors: true` — `pnpm build` won't catch type errors. Every commit step in this plan uses `pnpm type-check && git commit ...` so a failed type-check blocks the commit. (Established convention from PR5.)

---

## File Structure

```
[CREATE]  scripts/backfill-and-seed-prices.ts
[CREATE]  scripts/__tests__/backfill-and-seed-prices.test.ts
[MODIFY]  src/modules/price-data/services/PriceSource/providers/binance.ts
          (fetchCurrent: /ticker/price → /klines?limit=1; add fetchHistoricalKlines export)
[MODIFY]  src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts
          (or create if absent)
[MODIFY]  package.json
          (db:seed and prisma.seed → new script)
[MODIFY]  .gitignore
          (add bitcoin_prices_pre_pr6_*.json snapshot pattern)
[DELETE]  scripts/gap-fill-prices.ts
[DELETE]  scripts/__tests__/gap-fill-prices.test.ts
```

---

## Task 0: Worktree Setup + Baseline

**Files:** None — environment setup.

- [ ] **Step 1: Create worktree from latest main**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git checkout main
git pull --ff-only origin main
git worktree add ../v0-bitcoin-simulation-tool-pr6 -b feature/pr6-real-ohlc
cd ../v0-bitcoin-simulation-tool-pr6
```

- [ ] **Step 2: Install + capture baseline**

```bash
pnpm install 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
pnpm type-check 2>&1 | tail -3
```

Capture passing/failing test counts. Type-check should be 0.

- [ ] **Step 3: Verify Binance Klines endpoint shape (one curl)**

```bash
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=2" | head -c 500
```

Expected: an array of two 12-element arrays. Confirm shape:
`[openTime_ms, open_str, high_str, low_str, close_str, volume_str, closeTime_ms, ...]`

If the shape differs from spec §4.4 expectations: STOP and re-read Binance docs.

- [ ] **Step 4: Confirm first BTCUSDT date**

```bash
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=1502841600000&endTime=1503100800000" | python -c "
import sys, json
arr = json.load(sys.stdin)
for row in arr:
    from datetime import datetime, timezone
    t = datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc).isoformat()
    print(t, row[1:5])
"
```

Expected: first row's date is `2017-08-17T00:00:00+00:00`. If different, update the constant `BINANCE_FIRST_DATE` accordingly throughout the plan.

- [ ] **Step 5: No commit**

---

## Task 1: Type Definitions for OHLC Helpers

**Files:**
- Modify: `src/modules/price-data/services/PriceSource/types.ts`

This task adds a `DailyOHLC` interface used by both the historical-klines helper and the backfill script. Done first to lock down the shape.

- [ ] **Step 1: Read current types.ts**

```bash
cat src/modules/price-data/services/PriceSource/types.ts
```

- [ ] **Step 2: Append `DailyOHLC` interface to the file**

Use Edit to add the following after the existing `PriceProvider` interface (last lines of the file):

```typescript

/**
 * Real daily OHLC parsed from a Binance Klines response.
 * Used by historical backfill (scripts/backfill-and-seed-prices.ts)
 * and by the live fetchCurrent() in binance.ts.
 */
export interface DailyOHLC {
  date: string         // YYYY-MM-DD (UTC day boundary)
  openTime: number     // Unix ms (Binance openTime field)
  open: number         // USD
  high: number         // USD
  low: number          // USD
  close: number        // USD
  volume: number       // BTC (Binance returns base-asset volume)
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors (purely additive).

- [ ] **Step 4: Commit**

```bash
git add src/modules/price-data/services/PriceSource/types.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(price-data): add DailyOHLC type for klines-based OHLC

Lock down the shape used by both the new historical-backfill helper
and the rewritten fetchCurrent. Pure type addition — no runtime change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Binance `parseKlinesResponse` Helper (TDD)

**Files:**
- Modify: `src/modules/price-data/services/PriceSource/providers/binance.ts` (add helper, don't change `fetchCurrent` yet)
- Create or modify: `src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts`

We extract the parsing logic into a pure function so it can be tested in isolation (no fetch mocking needed for the parse step).

- [ ] **Step 1: Check if test file exists**

```bash
ls src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1
```

If it doesn't exist, Step 2 creates it. If it does, Step 2 appends.

- [ ] **Step 2: Write the failing test for `parseKlinesResponse`**

Either create or append to `src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseKlinesResponse } from '../binance'

describe('parseKlinesResponse', () => {
  // Binance kline = [openTime, open, high, low, close, volume, closeTime, ...]
  const sampleKline = [
    1502928000000,             // openTime: 2017-08-17T00:00:00Z (ms)
    '4261.48000000',           // open
    '4485.39000000',           // high
    '4200.74000000',           // low
    '4285.08000000',           // close
    '795.15014300',            // volume
    1503014399999,             // closeTime
    '3454770.0',               // quoteAssetVolume
    3427,                      // trades
    '616.24230400',            // takerBuyBase
    '2678216.4',               // takerBuyQuote
    '0',                       // ignore
  ]

  it('parses a single kline tuple into DailyOHLC with UTC date', () => {
    const [row] = parseKlinesResponse([sampleKline])
    expect(row.date).toBe('2017-08-17')
    expect(row.openTime).toBe(1502928000000)
    expect(row.open).toBeCloseTo(4261.48, 2)
    expect(row.high).toBeCloseTo(4485.39, 2)
    expect(row.low).toBeCloseTo(4200.74, 2)
    expect(row.close).toBeCloseTo(4285.08, 2)
    expect(row.volume).toBeCloseTo(795.15, 2)
  })

  it('coerces string-typed numerics to numbers', () => {
    const [row] = parseKlinesResponse([sampleKline])
    expect(typeof row.open).toBe('number')
    expect(typeof row.high).toBe('number')
    expect(typeof row.low).toBe('number')
    expect(typeof row.close).toBe('number')
    expect(typeof row.volume).toBe('number')
  })

  it('returns empty array for empty input', () => {
    expect(parseKlinesResponse([])).toEqual([])
  })

  it('throws on malformed kline (fewer than 6 fields)', () => {
    const malformed = [[1502928000000, '4261.48']] as unknown as number[][]
    expect(() => parseKlinesResponse(malformed)).toThrow(/malformed/i)
  })

  it('throws on non-array root', () => {
    expect(() => parseKlinesResponse({} as unknown as number[][])).toThrow(/array/i)
  })

  it('parses multiple klines preserving order', () => {
    const k1 = [...sampleKline]
    const k2 = [...sampleKline]
    k2[0] = 1503014400000  // 2017-08-18
    const result = parseKlinesResponse([k1, k2])
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2017-08-17')
    expect(result[1].date).toBe('2017-08-18')
  })
})
```

- [ ] **Step 3: Run test — expect FAIL (`parseKlinesResponse` not exported)**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -15
```

Expected: failure mentioning the missing export.

- [ ] **Step 4: Implement `parseKlinesResponse` in binance.ts**

Edit `src/modules/price-data/services/PriceSource/providers/binance.ts`. Add the helper BEFORE the existing `binance` export. The full file becomes:

```typescript
// src/modules/price-data/services/PriceSource/providers/binance.ts
import type { PriceProvider, NormalizedPricePoint, DailyOHLC } from '../types'

const BINANCE_BASE = 'https://api.binance.com'

/**
 * Parse a Binance Klines response (array of 12-element arrays) into DailyOHLC[].
 * Coerces string-typed numerics (Binance returns prices as strings).
 * Pure function — no fetching.
 */
export function parseKlinesResponse(klines: unknown[]): DailyOHLC[] {
  if (!Array.isArray(klines)) {
    throw new Error('binance: klines response is not an array')
  }
  return klines.map((row) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error('binance: malformed kline row (expected 12-tuple)')
    }
    const [openTime, open, high, low, close, volume] = row as [number, string, string, string, string, string]
    return {
      date: new Date(openTime).toISOString().slice(0, 10),
      openTime,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }
  })
}

export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=BTCUSDT`)
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { symbol?: string; price?: string }
    if (typeof json.price !== 'string') throw new Error('binance: malformed response (price missing)')
    const close = parseFloat(json.price)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
```

(Note: this preserves `fetchCurrent`'s old behavior unchanged. Task 4 rewrites it.)

- [ ] **Step 5: Run test — expect PASS**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -10
```

Expected: 6 passing.

- [ ] **Step 6: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3

git add src/modules/price-data/services/PriceSource/providers/binance.ts \
        src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(price-data): add parseKlinesResponse helper to binance provider

Pure function that coerces Binance's 12-tuple kline rows
(with string-typed numerics) into DailyOHLC. Tested with TDD.
fetchCurrent unchanged — Task 4 rewrites it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Binance `fetchHistoricalKlines` (TDD)

**Files:**
- Modify: `src/modules/price-data/services/PriceSource/providers/binance.ts`
- Modify: `src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts`

`fetchHistoricalKlines(from, to)` paginates Binance's klines endpoint at `limit=1500` until the returned page is shorter than 1500. Throws on HTTP failure.

- [ ] **Step 1: Append failing tests for `fetchHistoricalKlines`**

Append to `src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts`:

```typescript
import { fetchHistoricalKlines } from '../binance'

describe('fetchHistoricalKlines', () => {
  // Build a stub Binance kline tuple
  const k = (openTimeMs: number, close: number) => [
    openTimeMs, String(close), String(close + 100), String(close - 100),
    String(close), '1000', openTimeMs + 86_399_999,
    '0', 0, '0', '0', '0',
  ]

  function makeFetch(pages: unknown[][]) {
    let call = 0
    return async (_url: string) => {
      const body = pages[call] ?? []
      call++
      return {
        ok: true,
        async json() { return body },
      } as Response
    }
  }

  it('returns parsed klines for a single page', async () => {
    const page = [k(1502928000000, 4285)]  // 2017-08-17
    const f = makeFetch([page])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-17T23:59:59Z'),
      f as typeof fetch,
    )
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2017-08-17')
  })

  it('paginates across multiple pages', async () => {
    // Page 1: 1500 rows (full)
    const page1 = Array.from({ length: 1500 }, (_, i) => k(1502928000000 + i * 86_400_000, 1000 + i))
    // Page 2: 50 rows (partial → terminate)
    const page2Start = 1502928000000 + 1500 * 86_400_000
    const page2 = Array.from({ length: 50 }, (_, i) => k(page2Start + i * 86_400_000, 2500 + i))
    const f = makeFetch([page1, page2])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2024-01-01T00:00:00Z'),
      f as typeof fetch,
    )
    expect(result).toHaveLength(1550)
    // Order preserved
    expect(result[0].close).toBeCloseTo(1000, 2)
    expect(result[1499].close).toBeCloseTo(2499, 2)
    expect(result[1549].close).toBeCloseTo(2549, 2)
  })

  it('terminates on empty response', async () => {
    const f = makeFetch([[]])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-18T00:00:00Z'),
      f as typeof fetch,
    )
    expect(result).toEqual([])
  })

  it('throws on non-OK HTTP response', async () => {
    const f = (async () => ({ ok: false, status: 429, statusText: 'Too Many Requests' })) as unknown as typeof fetch
    await expect(
      fetchHistoricalKlines(
        new Date('2017-08-17T00:00:00Z'),
        new Date('2017-08-18T00:00:00Z'),
        f,
      ),
    ).rejects.toThrow(/429/)
  })

  it('uses milliseconds for startTime and endTime in URL', async () => {
    const captured: string[] = []
    const f = (async (url: string) => {
      captured.push(url)
      return { ok: true, async json() { return [] } }
    }) as unknown as typeof fetch
    await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-18T00:00:00Z'),
      f,
    )
    expect(captured[0]).toContain('startTime=1502928000000')
    expect(captured[0]).toContain('endTime=1503014400000')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (`fetchHistoricalKlines` not exported)**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Implement `fetchHistoricalKlines` in binance.ts**

Edit `binance.ts` — add this BEFORE the `binance` export, AFTER `parseKlinesResponse`:

```typescript
const KLINES_LIMIT = 1500
const ONE_DAY_MS = 86_400_000

/**
 * Paginate Binance Klines (interval=1d) for [from, to] inclusive.
 * Pagination terminates when a page returns fewer rows than KLINES_LIMIT.
 * The fetch impl is injected so tests can mock it; defaults to globalThis.fetch.
 */
export async function fetchHistoricalKlines(
  from: Date,
  to: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<DailyOHLC[]> {
  const all: DailyOHLC[] = []
  let cursor = from.getTime()
  const endMs = to.getTime()

  while (cursor <= endMs) {
    const url =
      `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d` +
      `&startTime=${cursor}&endTime=${endMs}&limit=${KLINES_LIMIT}`
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`binance klines: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as unknown[]
    const page = parseKlinesResponse(json)
    if (page.length === 0) break
    all.push(...page)
    if (page.length < KLINES_LIMIT) break
    cursor = page[page.length - 1].openTime + ONE_DAY_MS
  }
  return all
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -10
```

Expected: 11 passing (6 from Task 2 + 5 new).

- [ ] **Step 5: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3

git add src/modules/price-data/services/PriceSource/providers/binance.ts \
        src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(price-data): add fetchHistoricalKlines to binance provider

Paginated Binance Klines fetch at limit=1500. Used by:
- the new backfill script (Task 5)
- the rewritten fetchCurrent (Task 4)
TDD-tested with mocked fetch including pagination, empty response,
HTTP failure, and ms-timestamp URL construction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Switch `fetchCurrent` to `/klines?limit=1` (TDD)

**Files:**
- Modify: `src/modules/price-data/services/PriceSource/providers/binance.ts`
- Modify: `src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts`

The live-price provider switches from `/ticker/price` (close-only) to `/klines?limit=1` so today's row written by the cron / lazy refresh has real OHLC.

- [ ] **Step 1: Append failing test for `fetchCurrent` → klines**

Append to `binance.test.ts`:

```typescript
import { binance } from '../binance'

describe('binance.fetchCurrent (klines-based)', () => {
  const todayKline = [
    Date.UTC(2026, 4, 8, 0, 0, 0),  // 2026-05-08T00:00:00Z
    '85000.00', '88000.00', '83000.00', '87500.00',
    '1234.567', Date.UTC(2026, 4, 8, 23, 59, 59, 999),
    '0', 0, '0', '0', '0',
  ]

  it('uses /klines endpoint and returns real OHLC from today candle', async () => {
    let capturedUrl = ''
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      capturedUrl = url
      return { ok: true, async json() { return [todayKline] } }
    }) as unknown as typeof fetch

    try {
      const result = await binance.fetchCurrent()
      expect(capturedUrl).toContain('/klines')
      expect(capturedUrl).toContain('limit=1')
      expect(result.open).toBeCloseTo(85000, 2)
      expect(result.high).toBeCloseTo(88000, 2)
      expect(result.low).toBeCloseTo(83000, 2)
      expect(result.close).toBeCloseTo(87500, 2)
      // open/high/low NOT all equal — real OHLC
      expect(result.high).not.toBe(result.close)
      expect(result.low).not.toBe(result.close)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('preserves source=binance and date=YYYY-MM-DD UTC', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => ({
      ok: true,
      async json() { return [todayKline] },
    })) as unknown as typeof fetch

    try {
      const result = await binance.fetchCurrent()
      expect(result.source).toBe('binance')
      expect(result.date).toBe('2026-05-08')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('throws on HTTP failure', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => ({
      ok: false, status: 503, statusText: 'Service Unavailable',
    })) as unknown as typeof fetch
    try {
      await expect(binance.fetchCurrent()).rejects.toThrow(/503/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('throws on empty klines response (no candle for today)', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => ({
      ok: true,
      async json() { return [] },
    })) as unknown as typeof fetch
    try {
      await expect(binance.fetchCurrent()).rejects.toThrow(/empty/i)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (still using /ticker/price)**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -15
```

The existing `fetchCurrent` calls `/ticker/price` — at minimum the URL assertion fails.

- [ ] **Step 3: Rewrite `fetchCurrent` to use `/klines?limit=1`**

Replace the `binance` export in `binance.ts` with:

```typescript
export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch(`${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1`)
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as unknown
    const parsed = parseKlinesResponse(json as unknown[])
    if (parsed.length === 0) throw new Error('binance: empty klines response')
    const k = parsed[0]
    const now = new Date()
    return {
      date: k.date,
      timestamp: k.openTime,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test --run src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts 2>&1 | tail -10
```

Expected: 15 passing (11 prior + 4 new).

- [ ] **Step 5: Run full test suite — confirm no regression**

```bash
pnpm test --run 2>&1 | tail -10
```

Expected: failing-count not growing vs baseline. Existing PriceSource integration tests may need a small update if they relied on `/ticker/price` URL — investigate any new failures, fix in-place (it's the same provider just calling a different URL).

- [ ] **Step 6: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3

git add src/modules/price-data/services/PriceSource/providers/binance.ts \
        src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(price-data): switch binance.fetchCurrent to /klines for real OHLC

Was: /api/v3/ticker/price → close-only, written as open=high=low=close
     (fake OHLC, suppressed intraday wicks → wrong displayed ATH)
Now: /api/v3/klines?interval=1d&limit=1 → real today's OHLC

Volume now populated from Binance base-asset volume (BTC).
Today's candle is incomplete mid-day; subsequent refreshes converge
to final by UTC midnight. Acceptable per spec §3.6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Backfill Script — Pure Helpers (TDD)

**Files:**
- Create: `scripts/backfill-and-seed-prices.ts`
- Create: `scripts/__tests__/backfill-and-seed-prices.test.ts`

This task adds the script with ONLY pure helpers exported (`sanityValidate`, `computeDryRunDiff`, `parseCliArgs`). The actual orchestration (`runBackfill`, `runRestore`) lands in Task 6 with their own tests, then Task 7 wires them via the CLI entry point.

- [ ] **Step 1: Create the test file with failing tests for pure helpers**

Create `scripts/__tests__/backfill-and-seed-prices.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  sanityValidate,
  computeDryRunDiff,
  parseCliArgs,
  BINANCE_FIRST_DATE,
} from '../backfill-and-seed-prices'
import type { DailyOHLC } from '../../src/modules/price-data/services/PriceSource/types'

const goodRow = (date: string, high: number): DailyOHLC => ({
  date, openTime: new Date(date + 'T00:00:00Z').getTime(),
  open: high - 100, high, low: high - 200, close: high - 50, volume: 100,
})

describe('sanityValidate', () => {
  it('accepts a plausible row', () => {
    expect(() => sanityValidate(goodRow('2025-10-07', 126_272))).not.toThrow()
  })
  it('rejects high < low', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.high = 50_000
    expect(() => sanityValidate(bad)).toThrow(/high.*low/i)
  })
  it('rejects close > high', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.close = 150_000
    expect(() => sanityValidate(bad)).toThrow(/close.*high/i)
  })
  it('rejects open < low', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.open = 50_000  // less than low (99_800)
    expect(() => sanityValidate(bad)).toThrow(/open.*low/i)
  })
  it('rejects non-positive prices', () => {
    const bad = goodRow('2025-10-07', 100_000)
    bad.low = 0
    expect(() => sanityValidate(bad)).toThrow(/positive/i)
  })
  it('rejects implausibly high price (> 10M)', () => {
    expect(() => sanityValidate(goodRow('2025-10-07', 12_000_000))).toThrow(/implausible/i)
  })
})

describe('computeDryRunDiff', () => {
  it('emits delta records for changed highs', () => {
    const newRows: DailyOHLC[] = [goodRow('2025-10-07', 126_272)]
    const existing = new Map([['2025-10-07', { high: 124_773, low: 124_773, open: 124_773, close: 124_773 }]])
    const diff = computeDryRunDiff(newRows, existing)
    expect(diff).toHaveLength(1)
    expect(diff[0].date).toBe('2025-10-07')
    expect(diff[0].oldHigh).toBeCloseTo(124_773, 0)
    expect(diff[0].newHigh).toBeCloseTo(126_272, 0)
    expect(diff[0].deltaHigh).toBeGreaterThan(0)
  })
  it('emits records for new dates (no existing row)', () => {
    const diff = computeDryRunDiff([goodRow('2025-10-07', 126_272)], new Map())
    expect(diff).toHaveLength(1)
    expect(diff[0].oldHigh).toBeNull()
  })
  it('emits zero-delta records for unchanged rows', () => {
    const diff = computeDryRunDiff(
      [goodRow('2025-10-07', 100_000)],
      new Map([['2025-10-07', { high: 100_000, low: 99_800, open: 99_900, close: 99_950 }]]),
    )
    expect(diff[0].deltaHigh).toBe(0)
  })
})

describe('parseCliArgs', () => {
  it('defaults to incremental mode', () => {
    const args = parseCliArgs([])
    expect(args.mode).toBe('incremental')
    expect(args.dryRun).toBe(false)
    expect(args.from).toBeUndefined()
    expect(args.to).toBeUndefined()
    expect(args.restoreFile).toBeUndefined()
  })
  it('--full → mode=full', () => {
    expect(parseCliArgs(['--full']).mode).toBe('full')
  })
  it('--dry-run sets dryRun=true', () => {
    expect(parseCliArgs(['--dry-run']).dryRun).toBe(true)
  })
  it('--from --to override range', () => {
    const args = parseCliArgs(['--from', '2024-01-01', '--to', '2024-12-31'])
    expect(args.from).toBe('2024-01-01')
    expect(args.to).toBe('2024-12-31')
  })
  it('--restore <file> → mode=restore', () => {
    const args = parseCliArgs(['--restore', 'snapshot.json'])
    expect(args.mode).toBe('restore')
    expect(args.restoreFile).toBe('snapshot.json')
  })
  it('throws on invalid date format', () => {
    expect(() => parseCliArgs(['--from', '2024/01/01'])).toThrow(/YYYY-MM-DD/)
  })
  it('throws when --from > --to', () => {
    expect(() => parseCliArgs(['--from', '2025-01-01', '--to', '2024-01-01'])).toThrow(/from.*to/i)
  })
})

describe('BINANCE_FIRST_DATE', () => {
  it('is the first BTCUSDT day', () => {
    expect(BINANCE_FIRST_DATE).toBe('2017-08-17')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module doesn't exist)**

```bash
pnpm test --run scripts/__tests__/backfill-and-seed-prices.test.ts 2>&1 | tail -10
```

Expected: "Failed to resolve import" pointing at `../backfill-and-seed-prices`.

- [ ] **Step 3: Create `scripts/backfill-and-seed-prices.ts` with helpers only**

Create the file with this content:

```typescript
// scripts/backfill-and-seed-prices.ts
//
// Real-OHLC backfill + seed for bitcoin_prices table. Replaces
// gap-fill-prices.ts. Sources daily OHLC from Binance Klines for
// 2017-08-17+; pre-2017 rows are NOT touched (Binance has no data
// before BTCUSDT launched).
//
// Modes (see parseCliArgs):
//   (none)      incremental gap-fill: MAX(date)+1 → today
//   --full      full sweep: 2017-08-17 → yesterday UTC (production fix)
//   --dry-run   preview top deltas, write nothing
//   --from/--to explicit range
//   --restore <file>  rollback from JSON snapshot
//
// Spec: docs/superpowers/specs/2026-05-06-real-ohlc-backfill-design.md
//
import type { DailyOHLC } from '../src/modules/price-data/services/PriceSource/types'

export const BINANCE_FIRST_DATE = '2017-08-17'
const MAX_PLAUSIBLE_PRICE = 10_000_000  // sanity ceiling

// === Pure helpers (testable without IO) ===

export function sanityValidate(row: DailyOHLC): void {
  const { open, high, low, close, date } = row
  if (low <= 0 || open <= 0 || close <= 0 || high <= 0) {
    throw new Error(`sanityValidate: non-positive price on ${date}`)
  }
  if (high >= MAX_PLAUSIBLE_PRICE) {
    throw new Error(`sanityValidate: implausible high on ${date}: ${high}`)
  }
  if (low > high) {
    throw new Error(`sanityValidate: high < low on ${date} (${high} < ${low})`)
  }
  if (open < low || open > high) {
    throw new Error(`sanityValidate: open outside [low,high] on ${date}`)
  }
  if (close < low || close > high) {
    throw new Error(`sanityValidate: close outside [low,high] on ${date}`)
  }
}

export interface DryRunDelta {
  date: string
  oldHigh: number | null   // null if row was missing
  newHigh: number
  deltaHigh: number        // newHigh - (oldHigh ?? newHigh)
}

export interface ExistingRow {
  high: number
  low: number
  open: number
  close: number
}

export function computeDryRunDiff(
  newRows: DailyOHLC[],
  existing: Map<string, ExistingRow>,
): DryRunDelta[] {
  return newRows.map((r) => {
    const old = existing.get(r.date)
    const oldHigh = old?.high ?? null
    return {
      date: r.date,
      oldHigh,
      newHigh: r.high,
      deltaHigh: oldHigh === null ? 0 : r.high - oldHigh,
    }
  })
}

// === CLI argument parsing ===

export interface CliArgs {
  mode: 'incremental' | 'full' | 'restore'
  dryRun: boolean
  from?: string         // YYYY-MM-DD
  to?: string           // YYYY-MM-DD
  restoreFile?: string  // path to snapshot JSON
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = { mode: 'incremental', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--full') args.mode = 'full'
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--from') {
      const v = argv[++i]
      if (!ISO_DATE_RE.test(v)) throw new Error(`--from must be YYYY-MM-DD, got ${v}`)
      args.from = v
    } else if (a === '--to') {
      const v = argv[++i]
      if (!ISO_DATE_RE.test(v)) throw new Error(`--to must be YYYY-MM-DD, got ${v}`)
      args.to = v
    } else if (a === '--restore') {
      const v = argv[++i]
      if (!v) throw new Error('--restore requires a file path')
      args.mode = 'restore'
      args.restoreFile = v
    } else {
      throw new Error(`unknown argument: ${a}`)
    }
  }
  if (args.from && args.to && args.from > args.to) {
    throw new Error(`--from (${args.from}) must be <= --to (${args.to})`)
  }
  return args
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test --run scripts/__tests__/backfill-and-seed-prices.test.ts 2>&1 | tail -10
```

Expected: 19 passing.

- [ ] **Step 5: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3

git add scripts/backfill-and-seed-prices.ts scripts/__tests__/backfill-and-seed-prices.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(scripts): backfill-and-seed-prices.ts pure helpers (TDD)

Adds:
- sanityValidate: rejects nonsense OHLC (low > high, prices <= 0,
  implausible >= 10M, open/close outside [low,high])
- computeDryRunDiff: delta records old vs new high
- parseCliArgs: --full/--dry-run/--from/--to/--restore
- BINANCE_FIRST_DATE constant (2017-08-17)

Orchestration (runBackfill/runRestore + main entrypoint) lands in
Tasks 6 and 7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Backfill Script — Orchestration with Mocked Prisma (TDD)

**Files:**
- Modify: `scripts/backfill-and-seed-prices.ts` (add `runBackfill`, `runRestore`, `dumpSnapshot`)
- Modify: `scripts/__tests__/backfill-and-seed-prices.test.ts`

The orchestrator takes injected dependencies (`fetchKlines`, `prismaLike`, `fsLike`) so it's fully testable without live HTTP, real DB, or real filesystem.

- [ ] **Step 1: Append failing tests for orchestration**

Append to `scripts/__tests__/backfill-and-seed-prices.test.ts`:

```typescript
import {
  runBackfill,
  runRestore,
  dumpSnapshot,
} from '../backfill-and-seed-prices'

interface FakeRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  source: string
}

function makeFakePrisma(initialRows: FakeRow[] = []) {
  const table = new Map<string, FakeRow>(initialRows.map((r) => [r.date, r]))
  return {
    table,
    bitcoinPrice: {
      async findMany() {
        return [...table.values()]
      },
      async upsert(args: {
        where: { date: string }
        create: FakeRow & { timestamp: bigint; volume: number | null }
        update: Partial<FakeRow>
      }) {
        const existing = table.get(args.where.date)
        if (existing) {
          table.set(args.where.date, { ...existing, ...args.update })
        } else {
          table.set(args.where.date, args.create)
        }
        return table.get(args.where.date)
      },
      async deleteMany() {
        const count = table.size
        table.clear()
        return { count }
      },
      async createMany({ data }: { data: FakeRow[] }) {
        for (const r of data) table.set(r.date, r)
        return { count: data.length }
      },
    },
  }
}

describe('runBackfill — happy path', () => {
  it('upserts new rows when DB is empty', async () => {
    const prisma = makeFakePrisma([])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(1)
    expect(result.updated).toBe(0)
    expect(prisma.table.get('2025-10-07')?.high).toBe(126_272)
    expect(prisma.table.get('2025-10-07')?.source).toBe('binance-klines-1d')
  })

  it('updates fake-OHLC rows in place with real OHLC', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(1)
    expect(prisma.table.get('2025-10-07')?.high).toBe(126_272)
    expect(prisma.table.get('2025-10-07')?.source).toBe('binance-klines-1d')
  })

  it('reports oldAth and newAth in result', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.oldAth).toBe(124_773)
    expect(result.newAth).toBe(126_272)
  })
})

describe('runBackfill — dry-run', () => {
  it('writes nothing and returns deltas', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    const fetched: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 124_000, high: 126_272, low: 123_500, close: 124_500, volume: 100 },
    ]
    const result = await runBackfill({
      mode: 'full',
      dryRun: true,
      prisma: prisma as any,
      fetchKlines: async () => fetched,
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.deltas?.[0].deltaHigh).toBe(126_272 - 124_773)
    expect(prisma.table.get('2025-10-07')?.high).toBe(124_773)  // untouched
  })
})

describe('runBackfill — sanity check rejection', () => {
  it('throws and writes nothing if any row fails sanityValidate', async () => {
    const prisma = makeFakePrisma([])
    const bad: DailyOHLC[] = [
      { date: '2025-10-07', openTime: 1, open: 100, high: 50, low: 200, close: 100, volume: 1 },
    ]
    await expect(
      runBackfill({
        mode: 'full',
        dryRun: false,
        prisma: prisma as any,
        fetchKlines: async () => bad,
        now: () => new Date('2026-05-08T12:00:00Z'),
      }),
    ).rejects.toThrow(/sanityValidate/)
    expect(prisma.table.size).toBe(0)
  })
})

describe('runBackfill — endTime cutoff in --full mode', () => {
  it('passes endTime = yesterday UTC midnight to fetchKlines', async () => {
    const prisma = makeFakePrisma([])
    let captured: { from: Date; to: Date } | null = null
    await runBackfill({
      mode: 'full',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async (from, to) => {
        captured = { from, to }
        return []
      },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    // yesterday UTC = 2026-05-07T23:59:59.999Z (approx)
    expect(captured!.to.toISOString().slice(0, 10)).toBe('2026-05-07')
    expect(captured!.from.toISOString().slice(0, 10)).toBe('2017-08-17')
  })
})

describe('runBackfill — incremental mode', () => {
  it('starts from MAX(date)+1', async () => {
    const prisma = makeFakePrisma([
      { date: '2026-05-05', open: 80000, high: 80000, low: 80000, close: 80000, source: 'binance' },
      { date: '2026-05-06', open: 81000, high: 81000, low: 81000, close: 81000, source: 'binance' },
    ])
    let captured: Date | null = null
    await runBackfill({
      mode: 'incremental',
      dryRun: false,
      prisma: prisma as any,
      fetchKlines: async (from, _to) => {
        captured = from
        return []
      },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(captured!.toISOString().slice(0, 10)).toBe('2026-05-07')
  })
})

describe('dumpSnapshot', () => {
  it('writes a JSON file containing every row', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 124_773, high: 124_773, low: 124_773, close: 124_773, source: 'coingecko' },
    ])
    let written: { path: string; content: string } | null = null
    const path = await dumpSnapshot({
      prisma: prisma as any,
      writeFile: async (p, c) => { written = { path: p, content: String(c) } },
      now: () => new Date('2026-05-08T12:00:00Z'),
    })
    expect(path).toMatch(/bitcoin_prices_pre_pr6_.*\.json$/)
    expect(written!.path).toBe(path)
    const parsed = JSON.parse(written!.content)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].date).toBe('2025-10-07')
  })
})

describe('runRestore', () => {
  it('clears table and reinstates rows from snapshot', async () => {
    const prisma = makeFakePrisma([
      { date: '2025-10-07', open: 999, high: 999, low: 999, close: 999, source: 'wrong' },
    ])
    const snapshot = JSON.stringify([
      { date: '2025-10-07', timestamp: '1759795200000', open: 124_773, high: 124_773, low: 124_773, close: 124_773, volume: null, source: 'coingecko' },
    ])
    const result = await runRestore({
      prisma: prisma as any,
      readFile: async () => snapshot,
      restoreFile: 'fake.json',
    })
    expect(result.deleted).toBe(1)
    expect(result.inserted).toBe(1)
    expect(prisma.table.get('2025-10-07')?.high).toBe(124_773)
    expect(prisma.table.get('2025-10-07')?.source).toBe('coingecko')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (orchestrators not exported)**

```bash
pnpm test --run scripts/__tests__/backfill-and-seed-prices.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Append orchestrators to `scripts/backfill-and-seed-prices.ts`**

Append to the END of the file:

```typescript
// === Orchestration ===

export interface BackfillDeps {
  mode: 'incremental' | 'full'
  dryRun: boolean
  prisma: {
    bitcoinPrice: {
      findMany(): Promise<Array<{ date: string; high: number; low: number; open: number; close: number }>>
      upsert(args: {
        where: { date: string }
        create: {
          date: string; timestamp: bigint
          open: number; high: number; low: number; close: number
          volume: number | null; source: string
        }
        update: {
          open: number; high: number; low: number; close: number
          volume: number | null; source: string
        }
      }): Promise<unknown>
    }
  }
  fetchKlines: (from: Date, to: Date) => Promise<DailyOHLC[]>
  now: () => Date
  from?: string  // YYYY-MM-DD override
  to?: string    // YYYY-MM-DD override
}

export interface BackfillResult {
  inserted: number
  updated: number
  oldAth: number
  newAth: number
  deltas?: DryRunDelta[]
  fetchedRows: number
}

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dateStringToUtcMidnight(s: string): Date {
  return new Date(s + 'T00:00:00.000Z')
}

export async function runBackfill(deps: BackfillDeps): Promise<BackfillResult> {
  const { mode, dryRun, prisma, fetchKlines, now } = deps

  // Compute fetch range
  let fromDate: Date
  let toDate: Date

  if (deps.from) {
    fromDate = dateStringToUtcMidnight(deps.from)
  } else if (mode === 'incremental') {
    const all = await prisma.bitcoinPrice.findMany()
    const maxDate = all.reduce<string | null>((m, r) => (m === null || r.date > m ? r.date : m), null)
    if (maxDate === null) {
      fromDate = dateStringToUtcMidnight(BINANCE_FIRST_DATE)
    } else {
      const next = new Date(maxDate + 'T00:00:00.000Z')
      next.setUTCDate(next.getUTCDate() + 1)
      fromDate = next
    }
  } else {
    // full
    fromDate = dateStringToUtcMidnight(BINANCE_FIRST_DATE)
  }

  if (deps.to) {
    toDate = dateStringToUtcMidnight(deps.to)
    toDate.setUTCHours(23, 59, 59, 999)
  } else {
    // default: yesterday UTC end-of-day (avoid partial today candle)
    const yesterday = utcMidnight(now())
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(23, 59, 59, 999)
    toDate = yesterday
  }

  // Fetch
  const fetched = await fetchKlines(fromDate, toDate)

  // Sanity validate ALL rows BEFORE any write
  for (const r of fetched) sanityValidate(r)

  // Snapshot of existing rows for diff/comparison
  const allExisting = await prisma.bitcoinPrice.findMany()
  const existingMap = new Map(
    allExisting.map((r) => [r.date, { high: r.high, low: r.low, open: r.open, close: r.close }]),
  )
  const oldAth = allExisting.reduce((m, r) => Math.max(m, r.high), 0)

  if (dryRun) {
    const deltas = computeDryRunDiff(fetched, existingMap)
    const newAthFromFetch = fetched.reduce((m, r) => Math.max(m, r.high), oldAth)
    return { inserted: 0, updated: 0, oldAth, newAth: newAthFromFetch, deltas, fetchedRows: fetched.length }
  }

  // Upsert
  let inserted = 0
  let updated = 0
  for (const r of fetched) {
    const exists = existingMap.has(r.date)
    await prisma.bitcoinPrice.upsert({
      where: { date: r.date },
      create: {
        date: r.date,
        timestamp: BigInt(r.openTime),
        open: r.open, high: r.high, low: r.low, close: r.close,
        volume: r.volume, source: 'binance-klines-1d',
      },
      update: {
        open: r.open, high: r.high, low: r.low, close: r.close,
        volume: r.volume, source: 'binance-klines-1d',
      },
    })
    if (exists) updated++
    else inserted++
  }

  const allAfter = await prisma.bitcoinPrice.findMany()
  const newAth = allAfter.reduce((m, r) => Math.max(m, r.high), 0)

  return { inserted, updated, oldAth, newAth, fetchedRows: fetched.length }
}

// === Snapshot + restore ===

export interface DumpSnapshotDeps {
  prisma: {
    bitcoinPrice: { findMany(): Promise<unknown[]> }
  }
  writeFile: (path: string, content: string) => Promise<void>
  now: () => Date
}

export async function dumpSnapshot(deps: DumpSnapshotDeps): Promise<string> {
  const rows = await deps.prisma.bitcoinPrice.findMany()
  const ts = deps.now().toISOString().replace(/[:.]/g, '-')
  const path = `bitcoin_prices_pre_pr6_${ts}.json`
  // Custom JSON to handle BigInt → string
  const json = JSON.stringify(rows, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  )
  await deps.writeFile(path, json)
  return path
}

export interface RestoreDeps {
  prisma: {
    bitcoinPrice: {
      deleteMany(): Promise<{ count: number }>
      createMany(args: { data: unknown[] }): Promise<{ count: number }>
    }
  }
  readFile: (path: string) => Promise<string>
  restoreFile: string
}

export async function runRestore(deps: RestoreDeps): Promise<{ deleted: number; inserted: number }> {
  const json = await deps.readFile(deps.restoreFile)
  const rows = JSON.parse(json) as Array<Record<string, unknown>>
  if (!Array.isArray(rows)) throw new Error('restore: snapshot file does not contain an array')

  // Coerce timestamp string back to BigInt
  const dataForCreate = rows.map((r) => ({
    ...r,
    timestamp: typeof r.timestamp === 'string' ? BigInt(r.timestamp) : r.timestamp,
  }))

  const { count: deleted } = await deps.prisma.bitcoinPrice.deleteMany()
  const { count: inserted } = await deps.prisma.bitcoinPrice.createMany({ data: dataForCreate })
  return { deleted, inserted }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test --run scripts/__tests__/backfill-and-seed-prices.test.ts 2>&1 | tail -10
```

Expected: 26 passing (19 prior + 7 new).

- [ ] **Step 5: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3

git add scripts/backfill-and-seed-prices.ts scripts/__tests__/backfill-and-seed-prices.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(scripts): backfill orchestrators with mocked Prisma (TDD)

Adds runBackfill, dumpSnapshot, runRestore. All take injected
dependencies (prisma, fetchKlines, now, fs) so they're fully
testable without DB or HTTP. 7 new tests cover:
- empty DB → insert path
- existing fake-OHLC → in-place update (source becomes binance-klines-1d)
- dry-run writes nothing
- sanity validation rejects bad rows BEFORE any write
- --full mode passes endTime = yesterday UTC
- incremental mode resumes from MAX(date)+1
- snapshot dump + restore round-trip

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CLI Entry Point + Live Wiring

**Files:**
- Modify: `scripts/backfill-and-seed-prices.ts` (append `main()` and shebang-equivalent)

The CLI entry point wires the helpers to real Prisma + real fetch + real fs. Not unit-tested (it's just plumbing); verified manually in Task 9.

- [ ] **Step 1: Append CLI entry point to `scripts/backfill-and-seed-prices.ts`**

Append at the END of the file:

```typescript
// === CLI entry ===

async function main(): Promise<void> {
  const { PrismaClient } = await import('@/lib/generated/prisma')
  const { writeFile, readFile } = await import('node:fs/promises')
  const { fetchHistoricalKlines } = await import(
    '../src/modules/price-data/services/PriceSource/providers/binance'
  )

  const args = parseCliArgs(process.argv.slice(2))
  const prisma = new PrismaClient()
  try {
    if (args.mode === 'restore') {
      console.log(`Restoring from snapshot: ${args.restoreFile}`)
      const { deleted, inserted } = await runRestore({
        prisma,
        readFile: (p) => readFile(p, 'utf8'),
        restoreFile: args.restoreFile!,
      })
      console.log(`Restore complete: deleted ${deleted} rows, inserted ${inserted}`)
      return
    }

    // For --full and incremental, snapshot first if writing
    if (args.mode === 'full' && !args.dryRun) {
      const path = await dumpSnapshot({
        prisma,
        writeFile: (p, c) => writeFile(p, c),
        now: () => new Date(),
      })
      console.log(`Snapshot written: ${path}`)
    }

    const result = await runBackfill({
      mode: args.mode === 'restore' ? 'incremental' : args.mode,
      dryRun: args.dryRun,
      prisma,
      fetchKlines: fetchHistoricalKlines,
      now: () => new Date(),
      from: args.from,
      to: args.to,
    })

    if (args.dryRun) {
      console.log(`DRY RUN — no writes`)
      console.log(`Fetched ${result.fetchedRows} rows`)
      console.log(`Old ATH: ${result.oldAth}`)
      console.log(`New ATH (after merge): ${result.newAth}`)
      console.log(`ATH delta: +${(result.newAth - result.oldAth).toFixed(2)}`)
      const top = (result.deltas ?? [])
        .filter((d) => d.deltaHigh > 0)
        .sort((a, b) => b.deltaHigh - a.deltaHigh)
        .slice(0, 50)
      console.log(`Top 50 high-deltas:`)
      for (const d of top) {
        console.log(`  ${d.date}: ${d.oldHigh} -> ${d.newHigh} (+${d.deltaHigh.toFixed(2)})`)
      }
    } else {
      console.log(`Inserted: ${result.inserted}`)
      console.log(`Updated:  ${result.updated}`)
      console.log(`Old ATH: ${result.oldAth}`)
      console.log(`New ATH: ${result.newAth}`)
      console.log(`ATH delta: +${(result.newAth - result.oldAth).toFixed(2)}`)
    }
  } catch (err) {
    console.error('backfill-and-seed-prices failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
```

- [ ] **Step 2: Verify the script imports without runtime error**

```bash
pnpm tsx -e "require('./scripts/backfill-and-seed-prices.ts')" 2>&1 | tail -5
```

Expected: no errors (the file loads). It will print nothing because `require.main === module` is false in this invocation.

- [ ] **Step 3: Type-check + tests + commit**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run scripts/__tests__/backfill-and-seed-prices.test.ts 2>&1 | tail -3

git add scripts/backfill-and-seed-prices.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(scripts): CLI entry point for backfill-and-seed-prices

Wires the orchestrators to real Prisma + real fetch + real fs.
Snapshot dump is automatic in --full non-dry-run mode (rollback
safety net per spec §3.2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Replace `gap-fill-prices.ts` Wiring

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Delete: `scripts/gap-fill-prices.ts`
- Delete: `scripts/__tests__/gap-fill-prices.test.ts`

- [ ] **Step 1: Update `package.json`**

Use Edit to change line 18 and the `prisma.seed` value:

```diff
-    "db:seed": "tsx scripts/gap-fill-prices.ts",
+    "db:seed": "tsx scripts/backfill-and-seed-prices.ts",
```

```diff
   "prisma": {
-    "seed": "tsx scripts/gap-fill-prices.ts"
+    "seed": "tsx scripts/backfill-and-seed-prices.ts"
   }
```

- [ ] **Step 2: Append snapshot pattern to `.gitignore`**

Append to `.gitignore`:

```
# PR6 backfill snapshots (do not commit DB dumps)
bitcoin_prices_pre_pr6_*.json
```

- [ ] **Step 3: Delete the old script + tests**

```bash
git rm scripts/gap-fill-prices.ts scripts/__tests__/gap-fill-prices.test.ts
```

- [ ] **Step 4: Type-check + tests + commit**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

Expected: type-check 0; test count drops by ~13 (gap-fill tests gone), no new failures.

```bash
git add package.json .gitignore
pnpm type-check && git commit -m "$(cat <<'EOF'
chore: replace gap-fill-prices.ts with backfill-and-seed-prices

- package.json db:seed and prisma.seed → new script
- .gitignore: add bitcoin_prices_pre_pr6_*.json snapshot pattern
- Delete scripts/gap-fill-prices.ts + its 13 tests

The new script is the single source of truth for seed + gap-fill
+ backfill + restore. Old script is preserved in git history
(commit before this one) if anyone needs CoinGecko-based pre-2017
fallback in the future.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Push, PR, Vercel Verify

**Files:** None — git/Vercel work only.

- [ ] **Step 1: Final pre-push verification**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr6
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -8
git log --oneline main..HEAD
```

Expected: 0 type errors. ~8 commits ahead of main.

- [ ] **Step 2: Push**

```bash
git push --set-upstream origin feature/pr6-real-ohlc 2>&1 | tail -3
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "PR6: Real OHLC backfill — fix stale ATH on Parameters page" \
  --body "$(cat <<'EOF'
## Summary

Fixes the stale ATH displayed on the Parameters page. Root cause: the entire `bitcoin_prices` table has fake OHLC (`open == high == low == close`) because the seed script used CoinGecko's free-tier endpoint which only returns close prices. Bitstamp shows BTC peaked at $126,272 on 2025-10-07; DB stored $124,773 (the close), suppressing $1,498 of intraday wick.

## Two-part fix

1. **Backfill script:** New `scripts/backfill-and-seed-prices.ts` replaces `gap-fill-prices.ts`. Uses Binance Klines `/api/v3/klines?interval=1d` for real daily OHLC from 2017-08-17 onwards. Pre-2017 rows untouched (Binance has no BTCUSDT data before then; pre-2017 BTC was much lower so doesn't affect ATH).

2. **Live provider:** `binance.ts` `fetchCurrent` switched from `/ticker/price` (close-only) to `/klines?limit=1` so every NEW day's row written by the daily cron / lazy refresh has real OHLC from the start.

Spec: `docs/superpowers/specs/2026-05-06-real-ohlc-backfill-design.md` (v2 post-red-team)
Plan: `docs/superpowers/plans/2026-05-08-real-ohlc-backfill.md`

## Tested

- 26 unit tests across `parseKlinesResponse`, `fetchHistoricalKlines`, `fetchCurrent` rewrite, sanity validation, dry-run diff, CLI parsing, orchestration with mocked Prisma, snapshot dump, restore round-trip.
- TDD throughout — every implementation step preceded by a failing test.
- `pnpm type-check`: 0 errors at every commit (chained — `next.config.mjs` has `ignoreBuildErrors: true`).

## Production-fix preflight

The actual one-shot run against production happens AFTER merge, manually, per spec §8 checklist:

```
1. vercel env pull .env.production.local --environment=production
2. Pause GitHub Action (hourly-price-refresh.yml) or run between :08-:59
3. pnpm tsx scripts/backfill-and-seed-prices.ts --dry-run  (verify deltas)
4. pnpm tsx scripts/backfill-and-seed-prices.ts --full     (write JSON snapshot, then upsert)
5. Re-enable GitHub Action
6. Verify: curl /api/bitcoin-prices?refresh=force → ath.value > 124773
```

## Rollback

`--full` automatically dumps a JSON snapshot before any write. To rollback:

```
pnpm tsx scripts/backfill-and-seed-prices.ts --restore <snapshot.json>
```

Per spec §9.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1
```

- [ ] **Step 4: Wait for Vercel checks**

```bash
PR_NUM=$(gh pr view --json number --jq .number)
echo "PR #$PR_NUM"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  STATUS=$(gh pr checks $PR_NUM --json bucket 2>/dev/null | jq -r '[.[] | .bucket] | unique | join(",")')
  echo "[$i] checks status: $STATUS"
  if [ -n "$STATUS" ] && [[ "$STATUS" != *"pending"* ]]; then
    break
  fi
  sleep 15
done
gh pr checks $PR_NUM 2>&1
```

Expected: SUCCESS. If `Module not found` cache issue, redeploy without build cache.

- [ ] **Step 5: Report PR URL. User reviews + merges (squash).**

---

## Task 10: Production-Fix One-Shot (Post-Merge)

**Files:** None — runs the script against production DB after PR merge.

This task is performed by the human (or a final agent) after PR6 is merged to main. Runs the script against the production DB to actually fix the ATH.

- [ ] **Step 1: Pull production env**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git checkout main && git pull --ff-only origin main
pnpm install 2>&1 | tail -3
pnpm dlx vercel env pull .env.production.local --environment=production 2>&1 | tail -3
```

- [ ] **Step 2: Pause GitHub Action OR pick a safe minute window**

The hourly action runs at minute :07 UTC. Run between :08 and :05+59 of the same hour, or temporarily disable the workflow:

```bash
# Option A: disable workflow via gh
gh workflow disable hourly-price-refresh.yml 2>&1
```

Vercel daily cron runs at 00:05 UTC. Avoid that window too.

- [ ] **Step 3: Dry-run against production**

```bash
DOTENV_CONFIG_PATH=.env.production.local pnpm tsx -r dotenv/config scripts/backfill-and-seed-prices.ts --full --dry-run 2>&1 | tail -60
```

Expected: top-50 deltas log shows positive `deltaHigh` for high-volatility days (especially 2025-10-07 ~$1500 delta). Old ATH = $124,773; new ATH > $124,773 (Binance's recorded high for 2025-10-07).

If the diff looks suspicious (e.g., new ATH > $200k, or deltas are zero everywhere): STOP and investigate.

- [ ] **Step 4: Run for real**

```bash
DOTENV_CONFIG_PATH=.env.production.local pnpm tsx -r dotenv/config scripts/backfill-and-seed-prices.ts --full 2>&1 | tail -30
```

Expected output:
- "Snapshot written: bitcoin_prices_pre_pr6_<ts>.json"
- "Inserted: 0" or small (gap fill)
- "Updated: ~3200" (rows from 2017-08-17 onwards)
- "New ATH > Old ATH"

Save the printed snapshot path somewhere safe (e.g., `~/Documents/`).

- [ ] **Step 5: Re-enable GitHub Action**

```bash
gh workflow enable hourly-price-refresh.yml 2>&1
```

- [ ] **Step 6: Verify production**

```bash
curl -s "https://v0-bitcoin-simulation-tool.vercel.app/api/bitcoin-prices?refresh=force" \
  | python -c "import sys, json; d=json.load(sys.stdin); print('ATH:', d['ath']['value'])"
```

Expected: ATH value > 124773.

Also check the Parameters page in the browser — the displayed ATH should match the API output.

- [ ] **Step 7: Mark plan complete**

If the new ATH matches expectations and no other regression appears, the bug is fixed.

---

## Self-Review

**Spec coverage:**
- §2 Goal: real OHLC for 2017-08-17+ ✓ Tasks 5,6 (script) + Task 4 (live provider)
- §3.1 No CoinGecko branch ✓ Tasks 5-7 (Binance only)
- §3.2 Idempotent upsert + JSON snapshot rollback ✓ Task 6 (`runBackfill`, `dumpSnapshot`, `runRestore`)
- §3.3 Pagination at 1500 ✓ Task 3 (`fetchHistoricalKlines`)
- §3.4 Source attribution `'binance-klines-1d'` ✓ Task 6 (upsert payload)
- §3.5 CLI flags --full/--dry-run/--from/--to/--restore ✓ Task 5 (`parseCliArgs`)
- §3.6 Live provider `fetchCurrent` uses /klines ✓ Task 4
- §4.1 sanityValidate + bounds ✓ Task 5
- §4.3 package.json edits ✓ Task 8
- §4.5 Delete gap-fill-prices.ts ✓ Task 8
- §6 Error handling: HTTP 4xx, sanity rejection, snapshot file malformed ✓ Tasks 3,5,6
- §7 No DB integration test ✓ Mocked Prisma in Task 6
- §8 Production preflight ✓ Task 10 (post-merge)
- §9 Rollback via --restore ✓ Task 6 (`runRestore`)

**Placeholder scan:** None.

**Type consistency:** `DailyOHLC` defined in Task 1, used in Tasks 2,3,4,5,6. `CliArgs.mode` is `'incremental' | 'full' | 'restore'` in Task 5; `runBackfill` accepts `'incremental' | 'full'` in Task 6 (the `'restore'` case is routed before `runBackfill` in the CLI in Task 7). `BackfillResult` field names (`inserted`/`updated`/`oldAth`/`newAth`/`deltas`/`fetchedRows`) consistent across tests and impl in Task 6. `source: 'binance-klines-1d'` literal used identically in upsert.create/update in Task 6 and in spec §3.4.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-08-real-ohlc-backfill.md`.

**Approach:** Subagent-Driven Development — fresh Opus subagent per task batch, two-stage review pattern from PR1-5. Same workflow as PR1-5.
