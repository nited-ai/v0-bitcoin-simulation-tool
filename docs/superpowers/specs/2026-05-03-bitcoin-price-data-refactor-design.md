# Bitcoin Price Data Layer Refactor — Design

> **Status:** Approved (pending final user review)
> **Date:** 2026-05-03
> **Scope:** Maximum (S3) — data layer + structural cleanup of parallel modules
> **Author:** Daisy + Claude (brainstorming session)

## 1. Why this refactor exists

The application's Bitcoin price data has been frozen at the values committed in `public/data/bitcoin/*.json` on 2025-08-19, with a hardcoded `124277.98` ATH dated 2024-03-14 (a value internally inconsistent with that date). User-facing examples include the "Risk Level Presets" alert showing "Current price is 36.6% / $45,502 below ATH of $124,278" — a value that has been wrong for ~9 months.

Root causes (verified):
- **Two-system split:** `BitcoinPrice` Postgres table exists in Prisma schema, but the runtime app reads only from static JSON files. The DB is dormant.
- **Broken scheduler:** `DailyUpdateService` uses an in-process `setTimeout` for daily updates. This cannot work on Vercel serverless; functions are stateless.
- **No Vercel Cron configured:** `vercel.json` has no `crons` field.
- **Build does no DB work:** build script is `prisma generate && next build` — no migration, no seed.
- **No migration history committed:** `prisma/migrations/` is empty (`migration_lock.toml` only).
- **Hardcoded ATH fallback duplicated in 4 places:** `lib/services/ath-service.ts:10`, `app/simulation/tabs/parameters/calculationsService.ts:247`, `:699`, `app/simulation/tabs/parameters/ATHAlert.tsx:108`, plus `useATH.ts:28` initial state.
- **Three or four parallel incomplete refactor attempts** coexist (`lib/services/centralized-data-service.ts`, `lib/price-engine/`, `src/modules/price-data/` (with mocked services), `app/simulation/data/`).

## 2. Goals and non-goals

**Goals**
- Single source of truth for BTC price data (Postgres).
- Automatic updates that survive serverless deploys.
- ATH derived from price data, not stored separately.
- One read API, one cron endpoint, one client hook.
- Consolidate the parallel module attempts into a single canonical structure.
- Remove the hardcoded ATH fallbacks and the static JSON fallback path.

**Non-goals**
- Refactoring the simulation logic, strategy engine internals, or UI components beyond their data-fetching glue.
- Adding new features (multi-currency, alternative price sources beyond what already exists, etc.).
- Database hosting migration beyond "use Vercel Postgres."
- Touching authentication, i18n, or anything outside the price-data domain.

## 3. Architecture

```
        ┌──────────────────────┐         ┌──────────────────────────┐
        │ Vercel Cron (daily)  │         │ GitHub Action (hourly)   │
        │ "5 0 * * *"          │         │ "0 * * * *"              │
        └──────────┬───────────┘         └──────────┬───────────────┘
                   │                                │
                   └─────────────┬──────────────────┘
                                 ▼
            POST /api/cron/update-prices
            Auth: Authorization: Bearer ${CRON_SECRET}
                                 │
                                 ▼
              ┌───────────────────────────────────┐
              │  src/modules/price-data/          │
              │  services/PriceUpdater.ts         │
              │   • fillGaps()                    │
              │   • updateCurrent()               │
              └────────┬──────────────────────────┘
                       ▼
              ┌───────────────────────────────────┐
              │  src/modules/price-data/          │
              │  services/PriceSource.ts          │
              │  Multi-provider fallback chain:   │
              │  Binance → CoinCap → CryptoCompare│
              │  → Yahoo → CoinGecko → ...        │
              └────────┬──────────────────────────┘
                       ▼
              ┌───────────────────────────────────┐
              │  Vercel Postgres (Neon)           │
              │  bitcoin_prices  (+ fetchedAt)    │
              │  system_meta     (NEW)            │
              │  data_updates    (existing)       │
              └────────┬──────────────────────────┘
                       ▲
                       │ store.upsert / store.read
                       │
              ┌────────┴──────────────────────────┐
              │  src/modules/price-data/          │
              │  services/PriceStore.ts           │
              └────────┬──────────────────────────┘
                       ▼
   GET /api/bitcoin-prices?from=&to=&interval=&refresh=
   Returns: { prices, currentPrice, ath, lastUpdated, isStale }
   Headers: Cache-Control: s-maxage=60, stale-while-revalidate=300
                       │
                       │ stale-while-revalidate via Vercel Edge CDN
                       ▼
   ┌────────────────────────────────────────────────────────┐
   │  src/modules/price-data/hooks/usePriceData.ts (SWR)     │
   │  Returns: { prices, currentPrice, ath, isLoading,       │
   │             error, refresh() }                          │
   └────────────────────────────────────────────────────────┘
                       │
                       ▼
   All consumers: ATHAlert · BasicParametersCard · UnifiedPriceChart
                · HistoricalDataChart · price models · strategies · ...
```

### 3.1 Three-line behavioral contract
1. Every page load calls `usePriceData()` which fetches the read endpoint.
2. The endpoint returns last-known data immediately and silently fires a background refresh if the latest row's `fetchedAt` is older than 5 minutes.
3. A daily Vercel cron and an hourly GitHub Action both fill gaps independently, so data stays fresh even in the absence of user traffic and even if either scheduler is misconfigured.

## 4. Data model

### 4.1 Existing `bitcoin_prices` (modified)

Add one column:

```prisma
model BitcoinPrice {
  // ... existing columns unchanged ...
  fetchedAt DateTime @default(now()) @map("fetched_at")  // NEW

  @@index([fetchedAt])  // NEW — for cooldown queries
}
```

`fetchedAt` is updated whenever the row is touched by `PriceSource`. Used to gate lazy-refresh.

### 4.2 New `system_meta` table

```prisma
model SystemMeta {
  key       String   @id @db.VarChar(50)
  value     String   @db.Text
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_meta")
}
```

Stores singletons:
- `lastSuccessfulCronAt` — ISO timestamp; set by cron on success.
- `lastSeedRunAt` — ISO timestamp; set by seed script.

**Bootstrap (BLOCKER fix):** the `add_fetched_at_and_system_meta` migration must INSERT bootstrap rows so `lastSuccessfulCronAt` is never null on a fresh DB:
```sql
INSERT INTO system_meta (key, value, updated_at)
VALUES ('lastSuccessfulCronAt', '1970-01-01T00:00:00.000Z', NOW())
ON CONFLICT (key) DO NOTHING;
```
Defensive fallback in code: `priceStore.getMeta('lastSuccessfulCronAt')` returns `new Date(0).toISOString()` if the row is missing, never `undefined`. Without this, `new Date(undefined).getTime()` returns `NaN`, the `>25h` staleness check returns `false`, and the recovery `fillGaps()` would never fire on a fresh deploy — a silent failure.

The read endpoint checks `lastSuccessfulCronAt`; if it's >25 hours stale, the response includes `isStale: true` so the UI can warn, AND `waitUntil` fires a recovery `fillGaps()`.

### 4.3 ATH semantics (decided)

- **Display ATH** (the only place "ATH" appears as a metric to users): `SELECT MAX(high) FROM bitcoin_prices`. Cached.
- **Strategy-internal references** (in `AthBasedStrategy`, `AthCollateralStrategy`): unchanged — they iterate `historicalPriceData.close`. No code change needed there.
- This matches existing behavior: `HistoricalDataChart.tsx:217` already shows `MAX(high)`. The four hardcoded `124277.98` fallbacks were derived from a stale `MAX(high)`. Removing those fallbacks (and replacing with proper loading/error states) is the intended fix.

## 5. Module layout

The target structure consolidates onto `src/modules/price-data/`. The existing `src/modules/price-data/` skeleton has the right shape (`services/`, `hooks/`, `models/`, `types/`, `utils/`, `__tests__/`) but its `PriceDataService.ts` is wired to mock services. We replace the mocks with real implementations that talk to the new Postgres-backed API.

### 5.1 New / heavily modified files in `src/modules/price-data/`

```
src/modules/price-data/
├── services/
│   ├── PriceStore.ts      [NEW]  Wraps Prisma. Exports: getRange, getLatest,
│   │                              getATH, upsertDay, upsertMany.
│   ├── PriceSource.ts     [NEW]  Consolidates the existing two API services.
│   │                              Exports: fetchCurrentPrice, fetchHistory.
│   │                              Multi-provider fallback (see §6).
│   ├── PriceUpdater.ts    [NEW]  Orchestration. Exports: updateCurrent,
│   │                              fillGaps, runFullUpdate (cron entrypoint).
│   ├── PriceDataService.ts [REWRITE] Replace mocks with calls to
│   │                              GET /api/bitcoin-prices via fetch().
│   │                              This becomes a thin client of the API.
│   └── (existing) DataCache, ProjectionGenerator, ChartMerger,
│       PerformanceMonitor — unchanged.
├── hooks/
│   ├── usePriceData.ts    [REWRITE] SWR-based hook. Wraps the read API.
│   │                              Returns: { prices, currentPrice, ath,
│   │                              isLoading, error, refresh, isStale }.
│   ├── useHistoricalData.ts [DELETE] Functionality merged into usePriceData.
│   └── usePriceProjection.ts [KEEP unchanged]
├── types/
│   └── (existing) — augment to include the API response type.
└── __tests__/
    ├── PriceStore.test.ts       [NEW]
    ├── PriceSource.test.ts      [NEW]
    ├── PriceUpdater.test.ts     [NEW]
    └── usePriceData.test.tsx    [NEW]
```

### 5.2 New API routes

```
app/api/
├── bitcoin-prices/route.ts       [NEW]   Read endpoint.
└── cron/update-prices/route.ts   [NEW]   Cron endpoint.
```

The 7 existing routes under `app/api/bitcoin-prices/*/route.ts` are deleted in cleanup phase.

### 5.3 New scripts

```
scripts/
└── seed-from-coingecko.ts  [NEW]  One-shot seed. Idempotent (gated by row count).
                                    Fetches full OHLC history from CoinGecko's
                                    /coins/bitcoin/market_chart/range. ~5 min.
```

### 5.4 Configuration changes

- `vercel.json` — add `crons` block, remove broken `installCommand` legacy-peer-deps hack:
  ```json
  {
    "framework": "nextjs",
    "crons": [{ "path": "/api/cron/update-prices", "schedule": "5 0 * * *" }]
  }
  ```
- `package.json` — `build` becomes `prisma generate && (test -n "$DATABASE_URL" && prisma migrate deploy || echo 'No DATABASE_URL — skipping migrate deploy') && next build`. Update `db:seed` and `prisma.seed` to point to `scripts/seed-from-coingecko.ts`. Add `swr` dependency. Add `@upstash/ratelimit` (for §9.1).
- `prisma/schema.prisma` — add `fetchedAt`, add `SystemMeta` model.
- `prisma/migrations/<timestamp>_init/` — first real committed migration.
- `prisma/migrations/<timestamp>_add_fetched_at_and_system_meta/` — second migration. Includes the bootstrap `INSERT INTO system_meta` row (per §4.2).
- `next.config.mjs` — add `experimental: { after: true }` (per §7).
- `docker-compose.yml` [NEW] — Postgres 15 service for local dev (per §10 PR1).
- `.github/workflows/hourly-price-refresh.yml` [NEW] — hourly fallback cron via GitHub Actions.
- New env vars to set in Vercel project (production + preview): `CRON_SECRET`, `COINCAP_API_KEY`, `COINDESK_API_KEY`, optionally `COINMARKETCAP_API_KEY` and `MESSARI_API_KEY`. Initially seeded with the existing hardcoded values (rotation happens in PR4 — see §10).

### 5.5 Files to modify (consumers switching to new hook)

These files currently import `centralizedDataService` directly or use the deleted hooks. They need to switch to `usePriceData()`. The list below was generated by `grep -rln "centralized-data-service\|centralizedDataService" src/ app/ lib/` excluding tests and the spec itself. **The implementer must re-run this grep at PR4 time as the authoritative list** — files may shift between now and merge.

**Production files (17):**
- `app/simulation/tabs/parameters/ATHAlert.tsx` — uses `useATH()` → switch to `usePriceData().ath`. Remove the four hardcoded `124277.98` fallbacks. Show loading/error state instead.
- `app/simulation/tabs/parameters/calculationsService.ts` — same fallback removal (lines 247, 699).
- `app/simulation/tabs/parameters/BasicParametersCard.tsx` — "Load current price" button calls `fetch('/api/bitcoin-prices?refresh=force')` instead of external APIs from the browser.
- `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx` — switch to `usePriceData()`.
- `app/simulation/tabs/price-projection/PriceProjectionChart.tsx` — switch to `usePriceData()`.
- `app/simulation/price-models/PriceModelRegistry.ts` — `HistoricalDataPoint` import update (extracted to `src/modules/price-data/types/`).
- `app/simulation/price-models/types.ts` — same type-import update.
- `app/simulation/price-models/services/VolatilityService.ts` — same.
- `app/simulation/price-models/models/PowerLawModel.ts` — same.
- `app/simulation/price-models/models/CycleRepeatModel.ts` — same.
- `app/simulation/price-models/models/EnhancedCycleRepeatModel.ts` — same.
- `app/simulation/price-models/models/ManualGrowthModel.ts` — same.
- `app/simulation/price-models/models/LogarithmicCurveRepeatModel.ts` — same.
- `app/simulation/providers/DataServiceProvider.tsx` — replaced by SWR's `<SWRConfig>` provider.
- `app/simulation/hooks/useATH.ts`, `useCentralizedData.ts`, `useHistoricalData.ts` — deleted in §5.6 (this PR replaces them with `usePriceData()`).
- `src/modules/strategies/types/index.ts` — type-import update.
- `src/modules/strategies/services/StrategyExecutionService.ts` — type-import update.
- `src/modules/price-data/types/index.ts` — receives the canonical `HistoricalDataPoint` definition (Step 0 of PR1).
- `src/modules/price-data/services/PriceDataService.ts` — replace mocks with `fetch('/api/bitcoin-prices')` (PR3).

**Test files** (~12, found via `grep -rln "centralizedDataService" __tests__ src/ app/ lib/` — exact list at implementation time): mocks of `centralizedDataService` swap to mocks of `usePriceData` from SWR.

### 5.6 Files to delete

**Old data-layer services (10 files):**
- `lib/services/centralized-data-service.ts`
- `lib/services/ath-service.ts`
- `lib/services/bitcoin-json-data-service.ts`
- `lib/services/bitcoin-json-generator-service.ts`
- `lib/services/bitcoin-api-service.ts`
- `lib/services/multi-api-bitcoin-service.ts`
- `lib/services/daily-update-service.ts`
- `lib/services/comprehensive-gap-filler.ts`
- `lib/services/comprehensive-gap-analyzer.ts`
- `lib/services/service-initializer.ts`

**Dead localization services (7 files, none imported anywhere in the app):**
- `lib/services/integration-service.ts`
- `lib/services/pattern-matcher.ts`
- `lib/services/reporting-service.ts`
- `lib/services/string-detection-service.ts`
- `lib/services/translation-key-generator.ts`
- `lib/services/validation-service.ts`
- `lib/services/types/localization.ts`

**Old hooks (3 files):**
- `app/simulation/hooks/useATH.ts`
- `app/simulation/hooks/useHistoricalData.ts`
- `app/simulation/hooks/useCentralizedData.ts`

**Old API routes (7 files):**
- `app/api/bitcoin-prices/current/route.ts`
- `app/api/bitcoin-prices/historical/route.ts`
- `app/api/bitcoin-prices/stats/route.ts`
- `app/api/bitcoin-prices/update/route.ts`
- `app/api/bitcoin-prices/daily-update/route.ts`
- `app/api/bitcoin-prices/comprehensive-gap-fill/route.ts`
- `app/api/bitcoin-prices/regenerate-json/route.ts`

**Static data files (6 files):**
- `public/data/bitcoin/daily.json`
- `public/data/bitcoin/weekly.json`
- `public/data/bitcoin/monthly.json`
- `public/data/bitcoin/ath.json`
- `public/btc-price-history.csv`
- `prisma/dev.db` (use real Postgres locally too via `DATABASE_URL`)

**Old price-engine layer (parallel attempt; consolidated into `src/modules/price-data/`):**
- `lib/price-engine/` (entire folder — `index.ts`, `historical-data-loader.ts`, `database-historical-loader.ts`, `chart-merger.ts`, `projection-generator.ts`, `performance-monitor.ts`, `models/*`, `types.ts`)

**Old data folder under simulation:**
- `app/simulation/data/AutoUpdateService.ts`
- `app/simulation/data/bitcoinApiService.ts`
- `app/simulation/data/csvUpdateManager.ts`
- `app/simulation/data/database/` (entire subfolder — `DatabaseManager.ts` and any helpers)

Per-file consumer check before delete: `grep -rln "AutoUpdateService\|app/simulation/data/bitcoinApiService\|csvUpdateManager\|simulation/data/database" src/ app/ lib/`. Any remaining importers must be migrated to the new data layer first.

**Other unused files:**
- `lib/load-btc-price.ts` — verified unused except in 2 obsolete test files (`__tests__/library-consolidation*.test.ts`). Delete file + tests together.

**Old price-models folder under simulation (parallel attempt):**
- `app/simulation/price-models/` — verify each model is reachable via `src/modules/price-data/models/` first; if so, delete the duplicate.

**Root-level scripts and backup files (~17 files):**
- `analyze-api-status.ts`, `api-based-data-insert.ts`, `backup-data-inserter.ts`, `bitcoin-price-backup.json`, `bitcoin-price-insert.sql`, `check-database-schema.ts`, `check-db.ts`, `comprehensive-database-fix.ts`, `debug-api-issues.ts`, `direct-database-insert.ts`, `direct-postgres-seeder.ts`, `final-gap-filling-process.ts`, `final-verification.ts`, `resume-gap-filling.ts`, `simple-gap-filler.ts`, all `test-*.ts` and `test-*.js` files at root.

**Other dead routes:**
- `app/simulation-fixed/`, `app/simulation-new/` (verify these still exist; agent reported them as already deleted).

**Vestigial folder:**
- `app/simulation/components/` — move the single remaining `PowerLawEducationalPanel.tsx` into `app/simulation/tabs/`, then delete the `components/` folder.

### 5.7 Net file delta

Approximately **+15 files** (new modules, tests, migrations, workflow), **−45 files** (deletes), modifying **~12 files**. Net repo size decrease of ~30 files plus ~600 KB of static JSON.

## 6. Multi-provider fallback (PriceSource.ts)

The new `PriceSource` consolidates the existing 8-provider list from `multi-api-bitcoin-service.ts` and the 3-provider list from `bitcoin-api-service.ts` into one chain. CoinGecko is **deprioritized** to preserve its limited free-tier quota for the historical seed and gap-fills.

| Order | Provider | Auth | Rate limit | Notes |
|---|---|---|---|---|
| 1 | Binance | None | 1200/hr | Highest limit, exchange-native |
| 2 | CoinCap | API key (env) | 200/hr | Was hardcoded; move to `COINCAP_API_KEY` |
| 3 | CryptoCompare | None | 300/hr, 2k/day | Decent free tier |
| 4 | Yahoo Finance | None | 1000/hr | Reliable but quirky URL format |
| 5 | CoinGecko | None | 30/min, 10k/day | **Reserved as backup** |
| 6 | Messari | Optional key (env) | 500/hr | Already env-correct |
| 7 | CoinDesk | Bearer token (env) | 1k/hr | Was hardcoded; move to `COINDESK_API_KEY` |
| 8 | CoinMarketCap | API key (env) | 333/hr | Disabled until real key set |

Each call tries provider N; on failure (network error, rate limit, 5xx, or 4xx auth/quota), falls through to N+1. Logs which provider succeeded so we can monitor the chain.

### 6.1 Per-provider normalization

Each provider returns subtly different shapes (Binance: array of klines with timestamps in ms; CryptoCompare: nested `Data.Data[]` with seconds; Yahoo: chart series; CoinGecko: `[ts_ms, price]` tuples). To prevent leak of these formats into the rest of the system:

```typescript
// src/modules/price-data/services/PriceSource/types.ts
export interface NormalizedPricePoint {
  date: string       // ISO YYYY-MM-DD (UTC day boundary)
  close: number      // USD
  high: number       // USD (== close if provider doesn't supply OHLC)
  low: number        // USD (== close if provider doesn't supply OHLC)
  open: number       // USD (== close if provider doesn't supply OHLC)
  source: string     // e.g. "binance"
  fetchedAt: Date
}
```

Per-provider adapters live in `src/modules/price-data/services/PriceSource/providers/{binance,coincap,cryptocompare,yahoo,coingecko,messari,coindesk,coinmarketcap}.ts`. Each adapter handles timestamp conversion, unit conversion (none expected — all USD), and shape normalization. Adapters MUST throw on malformed responses so the fallback chain advances.

**Security cleanup:** The hardcoded API keys in `lib/services/multi-api-bitcoin-service.ts:445`, `:500`, `:841` must be **rotated as part of PR4** (not earlier — see §10 PR4 for rationale). Listed as a pre-PR5 action since the old service files are deleted in PR5.

## 7. The lazy-refresh mechanic (revised post-red-team)

Per red-team finding #2: never block the request path on external API calls. The corrected behavior:

**Next.js `after()` requirements (BLOCKER fix):**
- Requires Next.js 15.1+ (project pins `15.2.4` ✓).
- In Next.js 15.2.x, `after` is still under the experimental flag. Add to `next.config.mjs`:
  ```js
  module.exports = { experimental: { after: true } }
  ```
- Route handler must run on the Node.js runtime, not Edge:
  ```typescript
  export const runtime = 'nodejs'
  ```
- If `after` import fails at build time, fall back to importing `unstable_after as after` from `next/server`. Verify which symbol your installed Next.js version exports before writing the route.

```typescript
// Pseudocode in app/api/bitcoin-prices/route.ts
export const runtime = 'nodejs'
import { after } from 'next/server'  // or `unstable_after as after` on 15.2.x
import { priceUpdater, priceStore } from '@/src/modules/price-data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const force = searchParams.get('refresh') === 'force'

  // Always read DB synchronously — never wait on external APIs
  const [prices, latest, ath, meta] = await Promise.all([
    priceStore.getRange(/* parsed params */),
    priceStore.getLatest(),
    priceStore.getATH(),  // SELECT MAX(high) FROM bitcoin_prices
    priceStore.getMeta(),
  ])

  const ageMs = Date.now() - latest.fetchedAt.getTime()
  const COOLDOWN_MS = 5 * 60 * 1000
  const cronStaleHours = (Date.now() - new Date(meta.lastSuccessfulCronAt).getTime()) / 3.6e6

  // Decide whether to fire a background refresh
  if (force || ageMs > COOLDOWN_MS) {
    after(async () => {
      await priceUpdater.updateCurrent()  // background, won't block this request
    })
  }
  if (cronStaleHours > 25) {
    after(async () => {
      await priceUpdater.fillGaps()  // background recovery
    })
  }

  const body = {
    prices,
    currentPrice: { value: latest.close, fetchedAt: latest.fetchedAt },
    ath: { value: ath, asOf: latest.date },
    lastUpdated: latest.fetchedAt,
    isStale: cronStaleHours > 25,
  }

  return Response.json(body, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

Concurrency control inside `priceUpdater.updateCurrent`:

```typescript
// Per red-team #8: dedupe via inflight-promise pattern, not p-limit
let inflight: Promise<BitcoinPrice> | null = null

export async function updateCurrent(force = false): Promise<BitcoinPrice> {
  if (inflight) return inflight  // share the same in-flight promise

  inflight = (async () => {
    try {
      const latest = await priceStore.getLatest()
      const ageMs = Date.now() - latest.fetchedAt.getTime()
      if (!force && ageMs < 5 * 60 * 1000) return latest

      const fresh = await priceSource.fetchCurrentPrice()  // multi-provider fallback
      return await priceStore.upsertDay({
        date: isoDate(new Date()),
        close: fresh.close,
        high: Math.max(latest.high ?? fresh.close, fresh.close),
        low:  Math.min(latest.low  ?? fresh.close, fresh.close),
        open: latest.date === isoDate(new Date()) ? latest.open : fresh.close,
        source: fresh.source,
        fetchedAt: new Date(),
      })
    } finally {
      inflight = null
    }
  })()

  return inflight
}
```

This handles the within-instance burst case. Cross-instance bursts are absorbed by the Edge CDN cache header (`s-maxage=60`).

## 8. Cron endpoint

```typescript
// app/api/cron/update-prices/route.ts
import { priceUpdater, priceStore } from '@/src/modules/price-data'

export async function POST(req: Request) {
  // Per red-team #5: use Vercel's standard Authorization header pattern
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!auth || !timingSafeEqual(auth, expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await priceUpdater.runFullUpdate({ maxGaps: 100 })
  await priceStore.setMeta('lastSuccessfulCronAt', new Date().toISOString())
  return Response.json(result)
}
```

`timingSafeEqual` uses Node's `crypto.timingSafeEqual` after Buffer conversion, with length-equalizing padding.

The hourly GitHub Action calls the same endpoint:

```yaml
# .github/workflows/hourly-price-refresh.yml
name: Hourly BTC Price Refresh
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "${{ secrets.PROD_URL }}/api/cron/update-prices" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            --fail --silent --show-error
```

## 9. Error handling

| Failure | Behavior |
|---|---|
| DB connection down | Read endpoint returns `503 { error: 'db_unavailable' }`. Hook surfaces error; UI shows banner + retry. |
| External API fetch fails (in `updateCurrent`) | Caught in `PriceSource.fetchCurrentPrice` (multi-provider fallback). If ALL providers fail: log, return last known good DB row, do not throw. |
| All external APIs AND DB fail | Read endpoint returns 503. Nothing usable. Acceptable — total outage. |
| Cron job fails | Logged to `data_updates` table (`status = 'failed'`). Vercel dashboard shows red. Hourly GH Action covers persistent cron failures. Read endpoint detects via `lastSuccessfulCronAt` and triggers `waitUntil` recovery. |
| Concurrent lazy-refresh writes (within instance) | `inflight` promise dedup. |
| Concurrent lazy-refresh writes (across instances) | Idempotent `upsertDay` (Prisma `upsert` on unique `date`). Last write wins for `close`; `high`/`low` use Math.max/min. Edge cache absorbs most bursts. |
| Migration fails on deploy | `prisma migrate deploy` fails → `next build` never runs → Vercel keeps serving previous deployment. |
| Seed script run twice | Idempotent: gated by `if SELECT COUNT(*) FROM bitcoin_prices = 0`. Safe to re-run. |

**Removed safety net (deliberate):** no more hardcoded `124277.98` fallbacks. If the data layer is broken, the UI shows a loading/error state instead of confidently displaying a wrong number. This is correct behavior — silent wrong numbers in financial software are worse than visible loading states.

### 9.1 Read endpoint security

The read endpoint `/api/bitcoin-prices` is **publicly accessible** (no auth) — it's behind Vercel's Edge cache and serves the same data the UI shows. Concerns:

- **`?refresh=force` quota drain attack:** an attacker could loop `curl /api/bitcoin-prices?refresh=force` to burn through external API quotas. Mitigation: rate-limit the `force` path to **3 requests/minute/IP** via `@upstash/ratelimit` (or Vercel Edge middleware). Without `force`, the 5-minute cooldown inside `priceUpdater.updateCurrent` prevents abuse regardless.
- **CORS:** allow same-origin only by default. If the price data needs to be accessible from external sites later, that's a separate decision.
- **No rate limit on the non-force read path** — Edge cache absorbs reads; DB hits are negligible.
- **CRON_SECRET in GH Action logs:** ensure GitHub repo secrets are masked. They are by default (GitHub redacts secret values in workflow logs), but verify after first run.

## 10. Migration plan (multi-PR)

Per red-team #6: not a single big-bang PR. Five independently-reversible PRs.

### PR1 — Foundation (additive only, no user impact)
- **Provision DBs:**
  - Production: Vercel Postgres in dashboard. Set `DATABASE_URL`, `CRON_SECRET` env vars.
  - Preview deploys: enable Neon's branch-per-PR feature so each PR gets its own ephemeral DB. Alternatively, use a single shared `DATABASE_URL` for the `Preview` Vercel environment (acceptable for low PR volume).
  - Local: add `docker-compose.yml` with Postgres 15 service on `localhost:5432`. Document `pnpm db:up` shortcut.
- **Build script with safe gating (BLOCKER fix):** Update `package.json` build to:
  ```
  "build": "prisma generate && (test -n \"$DATABASE_URL\" && prisma migrate deploy || echo 'No DATABASE_URL — skipping migrate deploy') && next build"
  ```
  This prevents preview builds from crashing when `DATABASE_URL` isn't configured for them. Update `vercel.json` to remove the legacy `installCommand: "npm install --legacy-peer-deps"` hack.
- **Migrations:**
  - Create real Prisma migration: `prisma migrate dev --name init`. Commit `prisma/migrations/<ts>_init/migration.sql`.
  - Add `fetchedAt` column on `BitcoinPrice` and create `SystemMeta` table: second migration. Include the bootstrap `INSERT INTO system_meta` row (per §4.2).
- **Type extraction:** Extract `HistoricalDataPoint` type to `src/modules/price-data/types/index.ts`. Update all imports — confirmed importer count is ~17 production files (see §5.5 below) plus tests. Use `grep -rln "centralized-data-service" src/ app/ lib/ __tests__/` as the authoritative list.
- **Seed pipeline:**
  - Create `scripts/seed-from-coingecko.ts` (idempotent, gated by `SELECT COUNT(*) FROM bitcoin_prices = 0`).
  - Update `package.json`: `"db:seed": "tsx scripts/seed-from-coingecko.ts"`, `"prisma": { "seed": "tsx scripts/seed-from-coingecko.ts" }`.
  - Delete `prisma/seed.ts` (the old CSV-based seeder) — it's no longer the canonical seed and will break when CSV is deleted in PR5.
  - Run `pnpm db:seed` against the new prod DB. Verify row count ≈ 4400, ATH = `MAX(high)` matches expected.
- App still uses old static JSON path. Deploy. Verify nothing broke.

### PR2 — New endpoints and updater (parallel; no user impact)
- Set new env vars in Vercel (production + preview): `COINCAP_API_KEY`, `COINDESK_API_KEY`, optionally `COINMARKETCAP_API_KEY` and `MESSARI_API_KEY`. **Initially populated with the existing hardcoded values** so the new code path works at parity with the old. Key rotation happens in PR4, after the cut-over (rotating now would break the old code path that's still serving traffic).
- Build `src/modules/price-data/services/{PriceStore,PriceSource,PriceUpdater}.ts` with full unit test coverage. The new `PriceSource` reads all API keys from `process.env` from day 1.
- Build `app/api/bitcoin-prices/route.ts` and `app/api/cron/update-prices/route.ts`.
- Add `vercel.json` cron entry.
- Add `.github/workflows/hourly-price-refresh.yml`. Set `PROD_URL` and `CRON_SECRET` GH Action secrets in the GitHub repo.
- Smoke test: `curl` both endpoints in production. Verify cron runs once. Verify hourly action fires. Verify DB updates and `lastSuccessfulCronAt` is set.

### PR3 — Wire up the new hook and rewrite PriceDataService
- Replace mocks inside `src/modules/price-data/services/PriceDataService.ts` with `fetch('/api/bitcoin-prices')` calls.
- Rewrite `src/modules/price-data/hooks/usePriceData.ts` as an SWR-based hook over the read API.
- Old `centralizedDataService` and `useCentralizedData` still exist — both data paths now functional in parallel.

### PR4 — Cut-over (user-visible change)
- Switch all consumers (ATHAlert, BasicParametersCard, UnifiedPriceChart, HistoricalDataChart, calculationsService, price models, strategy services) from old hooks/services to new `usePriceData()`. Use the grep-generated list from §5.5.
- Remove the four hardcoded `124277.98` fallbacks. Show loading/error states.
- "Load current price" button calls `/api/bitcoin-prices?refresh=force`.
- **Rotate the previously-hardcoded API keys** (`COINCAP_API_KEY` source value at `lib/services/multi-api-bitcoin-service.ts:445,500`; `COINDESK_API_KEY` at `:841`). These were committed to git history and must be considered compromised. After rotation, the OLD code paths in `lib/services/multi-api-bitcoin-service.ts` will fail with auth errors — but they're unreachable post-cut-over. Verify by checking server logs for any unexpected calls to those services in the 48h before PR5.
- Deploys atomically. Old code paths remain in repo as safety net.
- Monitor for ≥1 week.

### PR5 — Cleanup (no functional change)
- Delete all 45 files listed in §5.6.
- Final repo: ~30 fewer files, ~600 KB lighter, single coherent data path.

**Total estimated work:** 4–6 days of focused engineering across the 5 PRs.

## 11. Testing strategy

| Layer | Approach | Tools |
|---|---|---|
| `PriceStore` unit tests | Mock Prisma client. Cover upsert idempotency, `MAX(high)` ATH query, range queries. | Vitest + `vitest-mock-extended` |
| `PriceSource` unit tests | Mock `fetch`. Verify fallback chain order; each provider failure cascades to next; final failure returns last known good. | Vitest |
| `PriceUpdater` unit tests | Mock `PriceStore` and `PriceSource`. Cover cooldown gating, force flag, `fillGaps` over multi-day windows, the `inflight` dedup. | Vitest |
| API route integration | Use Next.js `next/server` request mocking. Verify response shape, cache headers, 503 on DB outage, `isStale` flag. | Vitest + `@edge-runtime/vm` if needed |
| `usePriceData` hook | SWR test mode with cache reset between tests. Cover loading state, error state, `refresh()` action. | Vitest + React Testing Library |
| Migration smoke | `prisma migrate reset && pnpm db:seed` in CI smoke-test job against ephemeral Postgres. | GitHub Actions + `services.postgres` |
| Local dev DB | `docker-compose.yml` with Postgres 15. `DATABASE_URL` for app, `DATABASE_URL_TEST` for tests with per-test transaction rollback. | docker-compose, `pg-mem` for unit-only tests |
| Existing tests | The agent inventory found ~30 test files (mostly simulation logic). Tests mocking `centralizedDataService` (~12 files based on grep — re-run `grep -rln "centralizedDataService" __tests__/ src/ app/ lib/` at PR4 time for exact list) need their mocks updated to mock SWR's `usePriceData()` instead. | grep + targeted updates |

**ATH regression test (per red-team #1):** snapshot test that asserts (a) the displayed ATH equals `MAX(high)` from the test fixture DB, and (b) the underlying SQL query is `MAX(high)` not `MAX(close)`. This verifies *semantic correctness* — not numerical equivalence to pre-refactor values, since the whole point of the refactor is that the displayed ATH will change from the stale `124277.98` to the real current ATH. The test catches accidental switch from `MAX(high)` to `MAX(close)` regardless of whatever the actual fixture max happens to be.

## 12. Open risks not fully mitigated

- **CoinGecko API contract change:** if CoinGecko changes its `/market_chart/range` response format mid-seed, the seed script breaks. Mitigation: pin to versioned endpoint, add response shape validation. Fallback: seed from existing JSON close-only and accept a temporarily incorrect ATH.
- **Vercel Postgres free tier limits:** Hobby tier has 60 hours/month compute and 256 MB storage. This dataset (4400 rows × ~80 bytes ≈ 350 KB) is well within. Compute is the constraint — query frequency matters. With Edge cache `s-maxage=60`, real DB hits should average ~1/min globally. Comfortably under limits.
- **Edge cache miss patterns:** in low-traffic regions, every cold request rehits the DB. With low traffic, that's still negligible.
- **Migration to Vercel Postgres requires the user to provision it manually** in the Vercel dashboard. Not scriptable from a PR. Documented as a pre-PR1 step.

## 13. Decisions log (for reference)

| ID | Decision | Source |
|---|---|---|
| D1 | DB hosting: Vercel Postgres | User chose for single-dashboard simplicity |
| D2 | Update cadence: daily Vercel Cron + lazy refresh on traffic + hourly GH Action fallback | User chose lazy-refresh-on-traffic to save the Vercel Pro $20/mo; hourly GH Action added as red-team mitigation |
| D3 | Cooldown threshold: 5 minutes | User decision (fits all free tiers) |
| D4 | Initial seed: full OHLC history from CoinGecko `/market_chart/range` | Required by D5 (need OHLC for `MAX(high)` ATH) |
| D5 | ATH semantic: `MAX(high)` for display, `MAX(close)` unchanged inside strategies | User decision matching existing UI behavior |
| D6 | Refactor scope: maximum (data layer + module consolidation onto `src/modules/price-data/`) | User chose S3 with deep code analysis first |
| D7 | Concurrency control: in-flight promise dedup + Edge CDN cache (not `p-limit`) | Architecture red-team #2, #8 |
| D8 | CRON_SECRET pattern: `Authorization: Bearer ${SECRET}` (Vercel canonical) | Architecture red-team #5 |
| D9 | Migration strategy: 5 reversible PRs (not single atomic) | Architecture red-team #6 |
| D10 | API key rotation: PR4 (cut-over time), not PR2 | Spec red-team #8 — rotating in PR2 would break old code path still serving traffic |
| D11 | `lastSuccessfulCronAt` bootstrap: insert in migration + defensive fallback in code | Spec red-team #2 — `new Date(undefined)` would silently disable recovery |
| D12 | `next/server`'s `after()` requires `experimental: { after: true }` flag in Next.js 15.2.x | Spec red-team #1 — feature is stable in 15.3+; project pins 15.2.4 |
| D13 | Build script gates `prisma migrate deploy` on `DATABASE_URL` being set | Spec red-team #3 — prevents preview deploys from crashing |
| D14 | `?refresh=force` rate-limited to 3 req/min/IP via `@upstash/ratelimit` | Spec red-team #13 — prevents quota drain attacks |
| D15 | `prisma/seed.ts` deleted in PR1; `package.json` seed scripts repointed to `scripts/seed-from-coingecko.ts` | Spec red-team #5 — old seed reads CSV that's deleted in PR5 |
| D16 | Per-provider adapters in `src/modules/price-data/services/PriceSource/providers/*.ts` returning `NormalizedPricePoint` | Spec red-team #9 — prevents shape variance leaking into rest of system |
| D17 | Local dev via `docker-compose.yml` with Postgres 15 | Spec red-team #11 — `prisma/dev.db` SQLite is being deleted, no other local fallback |

## 14. Out of scope (explicitly)

- Multi-currency price support (USD only).
- Real-time WebSocket price feeds.
- Alternative cryptocurrencies.
- User-customizable update schedules.
- Historical data older than CoinGecko's coverage (2013-04 onward).
- Anything in `lib/strategy-engine/`, `lib/price-engine/models/` (consumed via the new data layer; their internal logic is untouched).
- The 10 dead localization services (`pattern-matcher`, `reporting-service`, etc.) — deleted as cleanup but their replacement (if any) is out of scope.
- Authentication, i18n, theme, anything UI-functional outside the data plumbing.
