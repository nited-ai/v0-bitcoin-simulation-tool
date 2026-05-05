# Bitcoin Price Data Refactor — PR3: Client Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `PriceDataService.ts`'s mocks with real `fetch('/api/bitcoin-prices')` calls. Rewrite `usePriceData()` as an SWR-based React hook over the new read endpoint. **No UI consumer changes** — old `centralizedDataService` paths still serve all UI; PR4 cuts consumers over.

**Architecture:** PR3 sits between PR2's backend (DB + API endpoints + cron) and PR4's UI cut-over. The SWR hook becomes the canonical data-access primitive that PR4's consumer migration will adopt.

**Tech Stack:** SWR (new dep), Next.js 15.5.15, React 19, the PR2 GET `/api/bitcoin-prices` endpoint.

**Spec sections covered:** §3 (architecture diagram — client side), §5 (PriceDataService rewrite), plus PR2 improvement-suggestions items: `DataServiceState` reconciliation, `experimental.after` cleanup.

**Out of scope for this PR (later PRs):**
- Switching UI consumers (ATHAlert, BasicParametersCard, charts) — PR4
- Removing the four hardcoded `124277.98` fallbacks — PR4
- Rotating API keys — PR4
- Deleting old services + routes + static JSON — PR5
- Wiring `fetchHistory` into cron `fillGaps` — separate concern, can land any time
- Per-IP rate limit on `?refresh=force` (D14) — still deferred

---

## File Structure for This PR

**Files to MODIFY:**

```
src/modules/price-data/
├── services/PriceDataService.ts       # Replace mocks with real fetch()
├── hooks/usePriceData.ts              # Rewrite as SWR hook
├── types/index.ts                     # Add ATH fields to DataServiceState (reconcile)
├── __tests__/
│   ├── PriceDataService.test.ts       # Update tests for new fetch behavior
│   └── (new) usePriceData.test.tsx    # New SWR hook tests

next.config.mjs                         # Remove experimental.after (no longer needed)
package.json                            # Add swr dependency
```

**Files to CREATE:**

```
src/modules/price-data/__tests__/usePriceData.test.tsx   # NEW (alongside existing PriceDataService.test.ts)
```

**Files NOT touched in this PR:**

- All UI components, parameter cards, charts (PR4)
- `lib/services/centralized-data-service.ts` — still imported by old code paths until PR4
- `app/simulation/hooks/{useATH,useCentralizedData,useHistoricalData}.ts` — still used by UI until PR4
- The 7 old `/api/bitcoin-prices/*` routes — until PR5
- Static JSON files in `public/data/bitcoin/` — until PR5
- PR2's PriceStore/PriceSource/PriceUpdater + new endpoints — they're stable, just consumed

---

## Task 0: Set Up Worktree + Pull Env Vars

**Files:** None — environment setup only.

PR2 is merged. Worktree was cleaned up. New branch needed for PR3.

- [ ] **Step 1: Create worktree**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git worktree add ../v0-bitcoin-simulation-tool-pr3 -b feature/pr3-client-layer
cd ../v0-bitcoin-simulation-tool-pr3
```

Expected: new worktree at `D:/Git/Repos/v0-bitcoin-simulation-tool-pr3` on branch `feature/pr3-client-layer`. Created from latest `main` which includes PR1 + PR2 merge commits.

- [ ] **Step 2: Install deps + Prisma generate**

```bash
pnpm install 2>&1 | tail -5
```

Expected: dependencies install. Postinstall runs `prisma generate` automatically.

- [ ] **Step 3: Pull env vars from Vercel**

The user manually fixed env-var scoping after PR2 (per PR2 improvement-suggestions). Pull to verify:

```bash
ls .vercel 2>/dev/null || pnpm dlx vercel link --project=v0-bitcoin-simulation-tool --yes 2>&1 | tail -3
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3

for k in DATABASE_URL DIRECT_URL CRON_SECRET COINCAP_API_KEY COINDESK_API_KEY; do
  grep -q "^${k}=" .env.local && echo "✓ $k" || echo "✗ $k missing"
done
```

Expected: all five present. If `CRON_SECRET` is somehow empty or missing, STOP and tell the user to verify in Vercel dashboard.

- [ ] **Step 4: Verify the live API endpoint works**

```bash
curl -s "https://firehodl.com/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | head -c 500
echo
```

Expected: HTTP 200 + JSON with `prices`, `currentPrice`, `ath`, `lastUpdated`, `isStale` fields. If 503 or 404, STOP — PR2's deploy may not have stuck or env vars are still misconfigured.

- [ ] **Step 5: No commit (workspace setup only)**

---

## Task 1: Add `swr` dependency + remove `experimental.after`

**Files:**
- Modify: `package.json` (add swr to dependencies)
- Modify: `next.config.mjs` (remove `experimental.after`)

Two small cleanups bundled. Both are PR3 prerequisites.

- [ ] **Step 1: Add `swr` to dependencies**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
pnpm add swr 2>&1 | tail -5
```

Expected: pnpm adds swr to `package.json` dependencies and updates `pnpm-lock.yaml`. As of May 2026, swr is at version 2.3.x — pin whatever pnpm picks.

- [ ] **Step 2: Remove `experimental.after` from `next.config.mjs`**

PR2 set this. Next.js 15.5.15 deprecated the flag (the feature is now stable by default). The build/dev logs warn `The experimental.after option is now stable and the experimental flag is no longer needed.`

Open `next.config.mjs`, find:
```javascript
experimental: {
  after: true,
},
```

Delete the entire `experimental` block (or just the `after: true` line if other experimental flags exist; check the file first). The `after()` import in `app/api/bitcoin-prices/route.ts` continues to work without the flag.

- [ ] **Step 3: Verify**

```bash
pnpm next info 2>&1 | head -5
pnpm test --run app/api/bitcoin-prices/__tests__/route.test.ts 2>&1 | tail -8
```

Expected:
- `next info` runs without errors
- All 8 read-route tests still pass (the `after()` import + `vi.mock('next/server', ...)` didn't break)

If the read-route tests break, the `experimental` block had something else important — restore the deleted line and only remove `after: true`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.mjs
git commit -m "chore(deps,next): add swr + drop experimental.after

- swr: dependency for the new usePriceData() React hook (PR3 Task 6).
- next.config.mjs: remove experimental.after — the after() API is
  stable in Next.js 15.5.15+ and the flag is no longer needed
  (warning fires every build/dev start without the change).

Per PR2 improvement-suggestions.md."
```

---

## Task 2: Reconcile `DataServiceState` shape mismatch

**Files:**
- Modify: `src/modules/price-data/types/index.ts` (add ATH fields)

**Why (PR2 improvement-suggestion, MUST address before PR4):**

Two `DataServiceState` definitions exist with different shapes:

`lib/services/centralized-data-service.ts` has:
```typescript
export interface DataServiceState {
  historicalData: HistoricalDataPoint[]
  currentPrice: CurrentPriceData | null
  ath: number | null
  athData: ATHData | null
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  isATHLoaded: boolean
  lastHistoricalDataLoad: number
  errors: string[]
  isInitializing: boolean
}
```

`src/modules/price-data/types/index.ts` has the same WITHOUT `ath`, `athData`, `isATHLoaded`. When PR4 deletes `centralized-data-service.ts`, any consumer using those three fields silently breaks.

This task adds the missing fields to the module-side definition so they survive PR4's deletion. Additive only — doesn't change runtime behavior.

- [ ] **Step 1: Read the current module-side definition**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
grep -nE "DataServiceState|ATHData" src/modules/price-data/types/index.ts | head -10
```

Capture the line numbers of the existing `DataServiceState` interface.

- [ ] **Step 2: Verify whether `ATHData` is already imported**

```bash
grep -E "ATHData" src/modules/price-data/types/index.ts
```

If `ATHData` is NOT yet defined in the file, you'll need to add a definition (or import it). Check the original in `lib/services/centralized-data-service.ts`:

```bash
grep -B 1 -A 12 "interface ATHData\|type ATHData" lib/services/centralized-data-service.ts
```

If `ATHData` IS defined elsewhere, there's also `lib/services/ath-service.ts` exporting it:

```bash
grep -A 12 "interface ATHData" lib/services/ath-service.ts
```

- [ ] **Step 3: Edit `src/modules/price-data/types/index.ts`**

Two sub-edits:

**(a)** If `ATHData` interface is missing, add it near the top of the file (after `CurrentPriceData`):

```typescript
/**
 * Bitcoin All-Time High data — matches the legacy public/data/bitcoin/ath.json shape
 * for compatibility with old consumers (PR4 will simplify to just `value` + `date` once
 * those consumers migrate).
 */
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
```

**(b)** Replace the existing `DataServiceState` interface with the full shape:

```typescript
export interface DataServiceState {
  historicalData: HistoricalDataPoint[]
  currentPrice: CurrentPriceData | null
  ath: number | null
  athData: ATHData | null
  isHistoricalDataLoaded: boolean
  isLoadingHistoricalData: boolean
  isATHLoaded: boolean
  lastHistoricalDataLoad: number
  errors: string[]
  isInitializing: boolean
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors. The additive change should not break any consumer (existing module consumers don't reference the missing fields; old consumers still go through `centralized-data-service.ts` for now).

If errors appear, they're likely from a consumer that accidentally narrowed `DataServiceState` somewhere. Fix the consumer, don't revert the type.

- [ ] **Step 5: Commit**

```bash
git add src/modules/price-data/types/index.ts
git commit -m "types: reconcile DataServiceState shape between modules

The module-side DataServiceState in src/modules/price-data/types/ was
missing ath/athData/isATHLoaded fields that lib/services/centralized-
data-service.ts exposes. PR4 will delete the latter; without this fix,
consumers relying on those fields silently break.

Additive change — adds the three missing fields plus an ATHData
interface (mirrored from the legacy ath-service.ts shape). No runtime
behavior change. Fulfills the MUST-address-before-PR4 item from
docs/superpowers/improvement-suggestions.md (2026-05-04 Task 6 entry)."
```

---

## Task 3: Write failing tests for fetch-based `PriceDataService`

**Files:**
- Modify: `src/modules/price-data/__tests__/PriceDataService.test.ts` (or create if doesn't exist)

The existing `PriceDataService.ts` has inline mocks (`centralizedDataService` and `enhancedBitcoinApiService` defined as constants returning fake data). PR3 replaces these with real `fetch('/api/bitcoin-prices')` calls. Tests must pin down the new behavior.

- [ ] **Step 1: Read the existing PriceDataService test file (if any)**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
ls src/modules/price-data/__tests__/
```

Expected entries should include `PriceDataService.test.ts` (existed in PR1's inventory) and `helpers/mockServices.ts`. Read PriceDataService.test.ts to see what's there:

```bash
cat src/modules/price-data/__tests__/PriceDataService.test.ts | head -80
```

If existing tests verify the mock behavior (e.g., `expect(price).toBe(50000)` from the old mock), they will break. Update them to test the new fetch behavior.

- [ ] **Step 2: Replace `PriceDataService.test.ts` contents**

This task fully replaces the test file with tests for the new fetch-based service:

```typescript
// src/modules/price-data/__tests__/PriceDataService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PriceDataService } from '../services/PriceDataService'
import type { HistoricalDataPoint } from '../types'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  // Reset singleton between tests
  ;(PriceDataService as any).instance = null
})

function mockApiResponse(body: any, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
    }),
  )
}

const SAMPLE_API_RESPONSE = {
  prices: [
    { date: '2026-05-01', close: 100000, high: 102000, low: 99000, open: 99500 },
    { date: '2026-05-02', close: 101000, high: 103000, low: 100000, open: 100000 },
  ],
  currentPrice: { value: 101000, fetchedAt: '2026-05-02T12:00:00.000Z' },
  ath: { value: 124773.51 },
  lastUpdated: '2026-05-02T12:00:00.000Z',
  isStale: false,
}

describe('PriceDataService.loadHistoricalData', () => {
  it('fetches /api/bitcoin-prices and returns HistoricalDataPoint[]', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    const data = await svc.loadHistoricalData({ useCache: false })

    expect(data).toHaveLength(2)
    expect(data[0]).toMatchObject({
      date: '2026-05-01',
      close: 100000,
    })
    // The fetch URL should be the unified read endpoint
    const fetchCall = (global.fetch as any).mock.calls[0]
    expect(fetchCall[0]).toMatch(/\/api\/bitcoin-prices/)
  })

  it('returns cached data on second call when useCache !== false', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    await svc.loadHistoricalData({ useCache: true })
    await svc.loadHistoricalData({ useCache: true })

    // Only ONE fetch — second call hit the cache
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on HTTP 503 (DB unavailable)', async () => {
    mockApiResponse({ error: 'db_unavailable' }, 503)
    const svc = PriceDataService.getInstance()

    await expect(svc.loadHistoricalData({ useCache: false })).rejects.toThrow(/503|db_unavailable/i)
  })
})

describe('PriceDataService.getCurrentPrice', () => {
  it('returns currentPrice.value from /api/bitcoin-prices', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    const price = await svc.getCurrentPrice({ useCache: false })

    expect(price).toBe(101000)
  })

  it('caches current price for 5 minutes by default', async () => {
    mockApiResponse(SAMPLE_API_RESPONSE)
    const svc = PriceDataService.getInstance()

    await svc.getCurrentPrice({ useCache: true })
    await svc.getCurrentPrice({ useCache: true })

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on HTTP failure', async () => {
    mockApiResponse({}, 500)
    const svc = PriceDataService.getInstance()

    await expect(svc.getCurrentPrice({ useCache: false })).rejects.toThrow(/500/)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail (against the still-mocked implementation)**

```bash
pnpm test --run src/modules/price-data/__tests__/PriceDataService.test.ts 2>&1 | tail -15
```

Expected: most tests fail because the current implementation:
- Returns `[]` (empty array) for `loadHistoricalData` (the inline mock)
- Returns `50000` for `getCurrentPrice` (the inline mock)
- Doesn't actually call fetch

The "throws on HTTP failure" test will incidentally pass (the mock doesn't throw, but it doesn't return correct shape either, so the assertion `expect price to be number` may still fail in the new shape).

The point: at this stage, RED. Task 4 implements GREEN.

- [ ] **Step 4: Commit failing tests**

```bash
git add src/modules/price-data/__tests__/PriceDataService.test.ts
git commit -m "test(price-data): failing tests for fetch-based PriceDataService

TDD step 1: pin down the new contract before changing the implementation
in Task 4. PriceDataService.loadHistoricalData / getCurrentPrice will
fetch from PR2's GET /api/bitcoin-prices instead of the inline mocks
that returned [] and 50000.

Tests cover: happy path, cache hit, HTTP failure (503/500)."
```

---

## Task 4: Implement fetch-based `PriceDataService`

**Files:**
- Modify: `src/modules/price-data/services/PriceDataService.ts`

Replace the inline mock objects with real fetch calls.

- [ ] **Step 1: Read the current implementation**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
cat src/modules/price-data/services/PriceDataService.ts
```

Note the structure: imports + inline `centralizedDataService` mock + inline `enhancedBitcoinApiService` mock + the `PriceDataService` class.

- [ ] **Step 2: Replace the mock objects with real fetch logic**

In `src/modules/price-data/services/PriceDataService.ts`:

**Delete** the two inline mock object definitions:
```typescript
const centralizedDataService = { ... }
const enhancedBitcoinApiService = { ... }
```

**Replace** with helper functions that fetch from `/api/bitcoin-prices`. Add this near the top of the file (below the imports):

```typescript
// === API client functions (replacing PR1/2's inline mocks) ===

interface PriceApiResponse {
  prices: Array<{ date: string; close: number; high: number; low: number; open: number }>
  currentPrice: { value: number; fetchedAt: string } | null
  ath: { value: number } | null
  lastUpdated: string | null
  isStale: boolean
}

/**
 * Determine the API base URL.
 * - Server-side (SSR/route handlers): use process.env.API_BASE_URL or default to relative path
 * - Browser: relative path works because the request hits the same origin
 *
 * For tests: vi.stubGlobal('fetch') intercepts before reaching this URL anyway.
 */
function getApiBase(): string {
  // In the browser or when the same Next.js process serves both UI and API, '' works.
  // For server-side rendering or external scripts, set NEXT_PUBLIC_API_BASE.
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ''
  }
  return ''
}

async function fetchPriceData(params: { from?: string; to?: string; refresh?: 'force' } = {}): Promise<PriceApiResponse> {
  const url = new URL('/api/bitcoin-prices', getApiBase() || 'http://localhost:3000')
  if (params.from) url.searchParams.set('from', params.from)
  if (params.to) url.searchParams.set('to', params.to)
  if (params.refresh) url.searchParams.set('refresh', params.refresh)

  // Use just the pathname+search when running in browser (same-origin)
  const fetchUrl = typeof window === 'undefined' ? url.toString() : `/api/bitcoin-prices${url.search}`

  const res = await fetch(fetchUrl)
  if (!res.ok) {
    throw new Error(`Price API: HTTP ${res.status} ${res.statusText}`)
  }
  return res.json()
}
```

**Update** the `PriceDataService.loadHistoricalData` method body. Find the existing method (after `getInstance()`, returns `Promise<HistoricalDataPoint[]>`) and replace its `centralizedDataService.loadHistoricalData()` call with:

```typescript
public async loadHistoricalData(options: DataFetchOptions = {}): Promise<HistoricalDataPoint[]> {
  const startTime = performance.now()
  const cacheKey = 'historical-data'

  try {
    // Check cache first if enabled
    if (options.useCache !== false) {
      const cachedData = this.cache.get<HistoricalDataPoint[]>(cacheKey)
      if (cachedData) {
        this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, true, true)
        console.log('📊 Historical data loaded from cache')
        return cachedData
      }
    }

    console.log('📡 Loading historical data from /api/bitcoin-prices...')
    const apiResponse = await fetchPriceData()
    // Convert API row shape -> HistoricalDataPoint shape
    const data: HistoricalDataPoint[] = apiResponse.prices.map((p) => ({
      time: Math.floor(new Date(p.date).getTime() / 1000),  // unix seconds
      date: p.date,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }))

    if (options.useCache !== false) {
      this.cache.set(cacheKey, data, options.maxAge)
    }

    this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, true, false)
    console.log(`✅ Historical data loaded: ${data.length} points`)
    return data
  } catch (error) {
    this.performanceMonitor.recordOperation('historical-data-load', performance.now() - startTime, false, false)
    console.error('❌ Failed to load historical data:', error)
    throw error
  }
}
```

**Update** `getCurrentPrice`:

```typescript
public async getCurrentPrice(options: DataFetchOptions = {}): Promise<number> {
  const startTime = performance.now()
  const cacheKey = 'current-price'

  try {
    if (!options.preferLive && options.useCache !== false) {
      const cachedPrice = this.cache.get<number>(cacheKey)
      if (cachedPrice) {
        this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, true, true)
        return cachedPrice
      }
    }

    console.log('💰 Fetching current price from /api/bitcoin-prices...')
    const apiResponse = await fetchPriceData(
      options.preferLive ? { refresh: 'force' } : {},
    )
    const price = apiResponse.currentPrice?.value
    if (typeof price !== 'number') {
      throw new Error('PriceDataService: API returned no currentPrice')
    }

    if (options.useCache !== false) {
      this.cache.set(cacheKey, price, 5 * 60 * 1000)  // 5 minutes
    }

    this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, true, false)
    console.log(`✅ Current price: $${price}`)
    return price
  } catch (error) {
    this.performanceMonitor.recordOperation('current-price-fetch', performance.now() - startTime, false, false)
    console.error('❌ Failed to fetch current price:', error)
    throw error
  }
}
```

The rest of the file (the class scaffolding, `generatePriceProjection`, `clearCache`, etc.) stays unchanged.

- [ ] **Step 3: Run the Task 3 tests, verify pass**

```bash
pnpm test --run src/modules/price-data/__tests__/PriceDataService.test.ts 2>&1 | tail -15
```

Expected: 6 tests pass.

If any fail:
- Read the failure carefully. The tests pin down behavior — adjust impl.
- Common gotchas:
  - The cache might already have data from a previous test — verify `beforeEach` resets the singleton (`(PriceDataService as any).instance = null`).
  - `URL` constructor on `new URL('/api/bitcoin-prices', '')` throws — the helper uses `'http://localhost:3000'` as a fallback base. Verify.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
pnpm test --run 2>&1 | tail -8
```

Expected: total stays in the ballpark of 1076-1080 passing / ~122 failing (PR2 baseline). Pre-existing failures unchanged.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/price-data/services/PriceDataService.ts
git commit -m "feat(price-data): wire PriceDataService to GET /api/bitcoin-prices

Replace the inline mock objects (centralizedDataService /
enhancedBitcoinApiService stubs that returned [] and 50000 respectively)
with real fetch calls to PR2's unified read endpoint.

- loadHistoricalData: fetches /api/bitcoin-prices, maps the API's
  { prices: [...] } shape to HistoricalDataPoint[] (the shape consumers
  expect). Cache layer untouched; honors options.useCache.
- getCurrentPrice: fetches the same endpoint, extracts currentPrice.value.
  options.preferLive maps to ?refresh=force on the API.
- Helper getApiBase() handles browser (relative URL) vs server-side
  rendering (absolute URL via VERCEL_URL or NEXT_PUBLIC_API_BASE).

Tests pinned in previous commit pass (6/6). No runtime behavior change
for the rest of the app — UI consumers still go through centralized-
data-service.ts until PR4 cuts them over to usePriceData() (Task 6)."
```

---

## Task 5: Write failing tests for SWR `usePriceData` hook

**Files:**
- Create: `src/modules/price-data/__tests__/usePriceData.test.tsx`

Test the new SWR-based hook that PR4 consumers will use.

- [ ] **Step 1: Verify swr is installed**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
grep '"swr"' package.json
```

Expected: a line like `"swr": "^2.3.x"`. If missing, Task 1 didn't run — go back.

- [ ] **Step 2: Create the test file**

```typescript
// src/modules/price-data/__tests__/usePriceData.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'
import { usePriceData } from '../hooks/usePriceData'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function mockApiResponse(body: any, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
    }),
  )
}

const SAMPLE_RESPONSE = {
  prices: [
    { date: '2026-05-01', close: 100000, high: 102000, low: 99000, open: 99500 },
    { date: '2026-05-02', close: 101000, high: 103000, low: 100000, open: 100000 },
  ],
  currentPrice: { value: 101000, fetchedAt: '2026-05-02T12:00:00.000Z' },
  ath: { value: 124773.51 },
  lastUpdated: '2026-05-02T12:00:00.000Z',
  isStale: false,
}

// Test harness — wrap hook in SWRConfig with provider:() => new Map() so each
// test gets a fresh SWR cache. Without this, swr's global cache leaks across tests.
function renderHook<T>(hookFn: () => T): { result: { current: T | null }; unmount: () => void } {
  const result: { current: T | null } = { current: null }
  function HookHarness() {
    result.current = hookFn()
    return null
  }
  const { unmount } = render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <HookHarness />
    </SWRConfig>,
  )
  return { result, unmount }
}

describe('usePriceData', () => {
  it('returns isLoading=true initially, then loads data', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    const { result } = renderHook(() => usePriceData())

    // Immediately after mount: SWR fires fetch, isLoading should be true
    expect(result.current?.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false)
    })

    expect(result.current?.prices).toHaveLength(2)
    expect(result.current?.currentPrice?.value).toBe(101000)
    expect(result.current?.ath?.value).toBe(124773.51)
    expect(result.current?.isStale).toBe(false)
    expect(result.current?.error).toBeUndefined()
  })

  it('exposes a refresh() that re-fetches', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    const { result } = renderHook(() => usePriceData())

    await waitFor(() => expect(result.current?.isLoading).toBe(false))

    // Now mock a different response for the refresh
    mockApiResponse({
      ...SAMPLE_RESPONSE,
      currentPrice: { value: 102000, fetchedAt: '2026-05-02T12:05:00.000Z' },
    })

    await result.current!.refresh()

    await waitFor(() => {
      expect(result.current?.currentPrice?.value).toBe(102000)
    })
  })

  it('exposes error when fetch fails', async () => {
    mockApiResponse({ error: 'db_unavailable' }, 503)
    const { result } = renderHook(() => usePriceData())

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false)
    })

    expect(result.current?.error).toBeDefined()
    expect(String(result.current?.error)).toMatch(/503|db_unavailable/i)
  })

  it('accepts ?from and ?to params and includes them in the fetch URL', async () => {
    mockApiResponse(SAMPLE_RESPONSE)
    renderHook(() => usePriceData({ from: '2026-01-01', to: '2026-05-04' }))

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const url = calls[0][0] as string
      expect(url).toContain('from=2026-01-01')
      expect(url).toContain('to=2026-05-04')
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test --run src/modules/price-data/__tests__/usePriceData.test.tsx 2>&1 | tail -15
```

Expected: tests fail because `usePriceData` doesn't yet have the new SWR-based shape (it still has the old class-wrapper shape with `historicalData`, `currentPrice as number`, etc.). Specifically, you'll see assertions like `expected isLoading to be true` failing because the old hook doesn't expose `isLoading` (it has `isLoadingHistorical`).

- [ ] **Step 4: Commit failing tests**

```bash
git add src/modules/price-data/__tests__/usePriceData.test.tsx
git commit -m "test(price-data): failing tests for SWR-based usePriceData

TDD step 1: pin the new hook contract before rewriting in Task 6.
The new shape mirrors PR2's GET /api/bitcoin-prices response:
{ prices, currentPrice, ath, lastUpdated, isStale, isLoading, error,
  refresh } — replaces the old class-wrapper hook's complex 16-field
shape that PR4 consumers won't need.

Tests cover: initial load, refresh, error path, ?from/?to query params."
```

---

## Task 6: Rewrite `usePriceData` as SWR hook

**Files:**
- Modify: `src/modules/price-data/hooks/usePriceData.ts`

- [ ] **Step 1: Read the existing hook to understand what's there**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
wc -l src/modules/price-data/hooks/usePriceData.ts
```

Expected: 200+ lines (the old class-wrapper hook). The rewrite trims this to ~50 lines.

- [ ] **Step 2: Replace `src/modules/price-data/hooks/usePriceData.ts`**

```typescript
// src/modules/price-data/hooks/usePriceData.ts
//
// SWR-based React hook over PR2's GET /api/bitcoin-prices endpoint.
// PR4 consumers will swap from useCentralizedData/useATH to this single
// hook. PR3 just adds the hook; doesn't migrate any consumer.
//
import useSWR from 'swr'

export interface PricePoint {
  date: string
  close: number
  high: number
  low: number
  open: number
}

export interface UsePriceDataResult {
  prices: PricePoint[]
  currentPrice: { value: number; fetchedAt: string } | null
  ath: { value: number } | null
  lastUpdated: string | null
  isStale: boolean
  isLoading: boolean
  error: Error | undefined
  refresh: () => Promise<void>
}

interface UsePriceDataOptions {
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Price API: HTTP ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function usePriceData(options: UsePriceDataOptions = {}): UsePriceDataResult {
  const params = new URLSearchParams()
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  const queryString = params.toString()
  const key = `/api/bitcoin-prices${queryString ? '?' + queryString : ''}`

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,        // don't auto-refetch on tab focus (avoids burst on tab switching)
    revalidateOnReconnect: true,
    dedupingInterval: 5000,          // 5-sec dedup window for identical concurrent calls
  })

  return {
    prices: data?.prices ?? [],
    currentPrice: data?.currentPrice ?? null,
    ath: data?.ath ?? null,
    lastUpdated: data?.lastUpdated ?? null,
    isStale: data?.isStale ?? false,
    isLoading,
    error,
    refresh: async () => {
      await mutate()
    },
  }
}
```

- [ ] **Step 3: Run the Task 5 tests, verify pass**

```bash
pnpm test --run src/modules/price-data/__tests__/usePriceData.test.tsx 2>&1 | tail -15
```

Expected: 4 tests pass.

If any fail:
- The most common issue is SWR's global cache leaking across tests. The test harness uses `<SWRConfig value={{ provider: () => new Map() }}>` to give each test a fresh cache — verify the import is correct.
- If the `refresh()` test fails because `mutate()` doesn't trigger re-fetch with the new mock: verify `mutate()` is called WITHOUT the `revalidate: false` option (which would prevent the re-fetch).

- [ ] **Step 4: Run full test suite + type-check**

```bash
pnpm test --run 2>&1 | tail -8
pnpm type-check 2>&1 | tail -3
```

Expected: tests at parity (~1076-1080 passing, ~122 failing); type-check 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/price-data/hooks/usePriceData.ts
git commit -m "feat(price-data): rewrite usePriceData as SWR hook over /api/bitcoin-prices

Replaces the old 200-line class-wrapper hook (with 16 return-shape
fields) with a focused 50-line SWR hook that mirrors PR2's GET
/api/bitcoin-prices response shape:

  { prices, currentPrice, ath, lastUpdated, isStale,
    isLoading, error, refresh }

Per spec D17 / red-team #2 mitigation: SWR's deduping + revalidation
gives consumers concurrent-safe access without each component re-
fetching. revalidateOnFocus is disabled (would cause burst on tab
switching); reconnect-revalidation is on.

PR4 will swap UI consumers (ATHAlert, BasicParametersCard, charts)
from useCentralizedData/useATH to this hook. PR3 just provides the
primitive — no consumer migration here.

4 unit tests pass with mocked fetch + isolated SWR cache via
SWRConfig provider:() => new Map()."
```

---

## Task 7: Local smoke test

**Files:** None — verification only.

Verify the new fetch-based service AND new SWR hook actually talk to the live API endpoint when the dev server runs locally.

- [ ] **Step 1: Start dev server**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
set -a; source .env.local; set +a
pnpm dev > /tmp/dev.log 2>&1 &
SERVER_PID=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  grep -q "Ready" /tmp/dev.log && break || sleep 2
done
grep "Ready" /tmp/dev.log || { echo "dev server failed"; tail -30 /tmp/dev.log; kill $SERVER_PID 2>/dev/null; exit 1; }
```

- [ ] **Step 2: Verify the read endpoint still serves data**

```bash
curl -s "http://localhost:3000/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | head -c 500
echo
```

Expected: JSON shape from PR2.

- [ ] **Step 3: Verify the live UI still works (regression check)**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3000/simulation"
```

Expected: HTTP 200. (The page server-renders; we're just confirming nothing in the new module breaks the build / the page still loads.)

- [ ] **Step 4: Stop dev server**

```bash
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
```

- [ ] **Step 5: No commit (verification-only)**

---

## Task 8: Push + PR + Vercel verify

**Files:** None — git/Vercel work only.

- [ ] **Step 1: Final pre-push verification**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr3
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -8
```

Expected:
- type-check: 0 errors
- tests: ~1086 passing (PR2 baseline 1076 + 6 PriceDataService + 4 usePriceData = +10)
- failing: ~122 (pre-existing only)

- [ ] **Step 2: Local build to COMPLETION**

```bash
set -a; source .env.local; set +a
pnpm build 2>&1 | tail -50
```

Wait for one of:
- **Success**: `Build Completed`. Route table shows `/api/bitcoin-prices`.
- **Windows-only EPERM**: `C:\Users\dwerw\Cookies` or `Anwendungsdaten` error. Acceptable.
- **Real failure**: STOP and report.

- [ ] **Step 3: Push the branch**

```bash
git push --set-upstream origin feature/pr3-client-layer 2>&1 | tail -5
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "PR3: Bitcoin price data refactor — client layer (PriceDataService + usePriceData)" \
  --body "$(cat <<'EOF'
## Summary

PR3 of 5 in the Bitcoin price data refactor (spec: `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`, plan: `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr3-client-layer.md`).

Replaces `PriceDataService.ts`'s mocks with real `fetch('/api/bitcoin-prices')` calls. Rewrites `usePriceData()` as an SWR hook over the new read endpoint. **No UI consumer changes** — PR4 cuts consumers over.

## Changes

**Service rewrites (in `src/modules/price-data/`):**
- `services/PriceDataService.ts`: drop inline mocks; `loadHistoricalData` and `getCurrentPrice` now fetch from `/api/bitcoin-prices`. Cache layer + class scaffolding unchanged.
- `hooks/usePriceData.ts`: SWR-based hook returning `{ prices, currentPrice, ath, lastUpdated, isStale, isLoading, error, refresh }`. Replaces the old 200-line class-wrapper.
- `types/index.ts`: add `ath`, `athData`, `isATHLoaded` to `DataServiceState` (reconciles PR2 improvement-suggestion #1 — MUST-FIX-before-PR4).

**Cleanups (per PR2 improvement-suggestions):**
- Remove `experimental.after` from `next.config.mjs` (Next 15.5.15+ no longer needs it).
- Add `swr` dependency.

## Test plan

- [x] 10 new unit tests across 2 files, all passing
- [x] Type-check: 0 errors
- [x] Local dev: read endpoint still serves data; /simulation still loads
- [ ] Vercel preview build green
- [ ] After merge: no UI behavior change (verify ATH banner still shows static-JSON value until PR4)

## Out of Scope (later PRs)

- PR4: cut over UI consumers (ATHAlert, BasicParametersCard, charts), remove hardcoded `124277.98` fallbacks, rotate API keys
- PR5: delete the 7 old routes, old services, static JSON files

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for + verify Vercel preview build**

```bash
PR_NUM=$(gh pr view --json number --jq .number)
until gh pr checks $PR_NUM --json bucket 2>/dev/null | jq -e 'length > 0 and all(.[]; .bucket != "pending")' >/dev/null; do
  sleep 15
done
echo "=== CHECKS DONE ==="
gh pr checks $PR_NUM
```

Expected: both checks `pass`. If Vercel build fails:
```bash
DEPLOY_ID=$(gh pr checks $PR_NUM --json link,name --jq '.[] | select(.name=="Vercel") | .link' | grep -oE 'dpl_[a-zA-Z0-9]+' | head -1)
pnpm dlx vercel inspect $DEPLOY_ID --logs 2>&1 | tail -50
```

If env-var scoping is the failure (DATABASE_URL missing for branch), the user's "all preview branches" fix from before PR3 didn't take — STOP and tell them.

- [ ] **Step 6: Smoke test deployed preview**

```bash
PREVIEW_URL=$(gh pr view --json comments --jq '.comments[].body' 2>&1 | grep -oE 'https://[a-z0-9-]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "Preview: $PREVIEW_URL"

if [ -n "$PREVIEW_URL" ]; then
  curl -s -i "$PREVIEW_URL/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | head -10
  curl -s -o /dev/null -w "Simulation page: HTTP %{http_code}\n" "$PREVIEW_URL/simulation"
fi
```

Expected: read endpoint 200 + JSON; simulation page 200.

- [ ] **Step 7: Report. User reviews + merges.**

---

## Self-Review Checklist

**Spec coverage** (every PR3 deliverable in spec §10 has a task):
- [x] Replace mocks in `PriceDataService.ts` → Task 4
- [x] Rewrite `usePriceData()` as SWR hook → Task 6
- [x] Add `swr` dependency → Task 1
- [x] (PR2 carryforward) Reconcile `DataServiceState` shape mismatch → Task 2
- [x] (PR2 carryforward) Remove `experimental.after` flag → Task 1
- [x] No consumer changes (UI still uses old paths) — preserved by NOT touching anything in `app/simulation/` or `lib/services/centralized-data-service.ts`

**Placeholder scan:** No "TBD", "TODO", or vague steps. Every step has explicit code/commands/expected output.

**Type consistency:** `PriceApiResponse` shape in Task 4 matches `UsePriceDataResult` shape in Task 6 (both reflect PR2's GET endpoint shape). `PricePoint` interface in usePriceData matches the `prices[]` element shape from PR2's route handler. `DataServiceState` from Task 2 includes the `ath`/`athData`/`isATHLoaded` fields that consumers (still on `lib/services/centralized-data-service.ts`) reference.

---

## What Comes After PR3

After PR3 is merged and verified:

- **PR4** — Cut over consumers (ATHAlert, BasicParametersCard, UnifiedPriceChart, HistoricalDataChart, calculationsService, price models, strategy services) from `useCentralizedData`/`useATH` to `usePriceData()`. Remove the four hardcoded `124277.98` fallbacks. Rotate API keys.
- **PR5** — Delete ~45 dead files (old routes, services, static JSON, root-level scripts).

I'll write Plan 4 (PR4) once PR3 is merged and verified.
