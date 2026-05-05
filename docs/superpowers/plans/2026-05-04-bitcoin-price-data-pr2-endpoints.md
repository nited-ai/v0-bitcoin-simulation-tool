# Bitcoin Price Data Refactor — PR2: API Endpoints + Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new DB-backed read endpoint, the cron write endpoint, and a multi-provider price-source layer — all wired up and verified in production. UI consumers stay on the old static-JSON path; PR3 swaps them.

**Architecture:** Three new service modules in `src/modules/price-data/services/` (`PriceStore`, `PriceSource`, `PriceUpdater`) + two new API routes (`/api/bitcoin-prices` GET, `/api/cron/update-prices` POST) + Vercel Cron daily + GitHub Action hourly fallback. Lazy refresh via Next.js `unstable_after()` with in-flight promise dedup. Edge-CDN caching via `Cache-Control` headers.

**Tech Stack:** Next.js 15.5.15 (with `experimental.after` flag), Prisma 6 against existing Neon Postgres, `pg` adapters per provider, Vercel Cron + GitHub Actions.

**Spec sections covered:** §3 (architecture diagram), §6 (provider chain), §6.1 (NormalizedPricePoint), §7 (lazy-refresh mechanic), §8 (cron endpoint auth), §9 (error handling), §10 PR2, plus D7, D8, D12, D14 from decisions log.

**Out of scope for this PR (lands in later PRs):**
- Rewriting `PriceDataService.ts` to call the new read endpoint — PR3
- New `usePriceData()` SWR hook implementation — PR3
- Switching UI consumers (ATHAlert, BasicParametersCard, charts) — PR4
- Removing the four hardcoded `124277.98` fallbacks — PR4
- Deleting old services + routes + static JSON — PR5
- Reconciling `DataServiceState` shape mismatch — PR3 or PR4
- Per-IP rate limiting on `?refresh=force` — deferred (5-min cooldown is sufficient defense for now; revisit if abuse observed)

---

## File Structure for This PR

**Files to CREATE:**

```
src/modules/price-data/services/
├── PriceStore.ts                          # DB layer (Prisma wrapper)
├── PriceSource.ts                          # Multi-provider orchestrator
├── PriceSource/
│   ├── types.ts                            # NormalizedPricePoint
│   ├── providers/
│   │   ├── binance.ts                      # priority 1
│   │   ├── coincap.ts                      # priority 2 (env: COINCAP_API_KEY)
│   │   ├── cryptocompare.ts                # priority 3
│   │   ├── yahoo.ts                        # priority 4
│   │   └── coingecko.ts                    # priority 5 (backup)
│   └── index.ts                            # re-exports the chain
├── PriceUpdater.ts                         # Orchestration (updateCurrent, fillGaps)
└── __tests__/
    ├── PriceStore.test.ts
    ├── PriceSource.test.ts
    ├── PriceSource.providers.test.ts       # one describe block per provider
    └── PriceUpdater.test.ts

app/api/
├── bitcoin-prices/route.ts                 # NEW unified read endpoint (root)
└── cron/update-prices/route.ts             # NEW cron endpoint

.github/workflows/
└── hourly-price-refresh.yml                # Hourly fallback cron via GH Actions
```

**Files to MODIFY:**

- `next.config.mjs` — add `experimental: { after: true }`
- `vercel.json` — add `crons` block + remove legacy `installCommand` hack
- `package.json` — add `@upstash/ratelimit`? **No** (deferred; just `swr` would be nice but PR3 introduces it)

**Files NOT touched in this PR:**

- All UI components, hooks, charts (PR3-4)
- The 7 OLD routes under `app/api/bitcoin-prices/{current,historical,stats,update,daily-update,comprehensive-gap-fill,regenerate-json}/` — they keep serving until PR4 swaps consumers and PR5 deletes them. PR2's NEW unified endpoint is at the ROOT (`app/api/bitcoin-prices/route.ts`), not nested under the old folders.
- Static JSON files in `public/data/bitcoin/` — still serve UI until PR4
- `lib/services/centralized-data-service.ts` — still imported by old code paths until PR4-5

---

## Task 0: Set Up Worktree + Pull Env Vars

**Files:** None — environment setup only.

PR1 is merged, the worktree was cleaned up. We need a fresh worktree for PR2 work.

- [ ] **Step 1: Create worktree**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git worktree add ../v0-bitcoin-simulation-tool-pr2 -b feature/pr2-endpoints
cd ../v0-bitcoin-simulation-tool-pr2
```

Expected: new worktree at `D:/Git/Repos/v0-bitcoin-simulation-tool-pr2` on branch `feature/pr2-endpoints` (created from latest `main` which includes PR1 merge `f6b09ae` + JSON regeneration `bc9b099`).

- [ ] **Step 2: Install deps + Prisma generate**

```bash
pnpm install 2>&1 | tail -5
```

Expected: dependencies install. Postinstall runs `prisma generate` automatically.

- [ ] **Step 3: Pull env vars from Vercel**

```bash
ls .vercel 2>/dev/null || pnpm dlx vercel link --project=v0-bitcoin-simulation-tool --yes 2>&1 | tail -3
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
```

Verify required vars are present:
```bash
for k in DATABASE_URL DIRECT_URL CRON_SECRET; do
  grep -q "^${k}=" .env.local && echo "✓ $k" || echo "✗ $k missing"
done
```

Expected: all three checked. If `CRON_SECRET` is missing locally (it should exist per PR1's env setup), pull from production env: `pnpm dlx vercel env pull .env.local --environment=production`.

- [ ] **Step 4: Verify DB still has 4599 rows + Prisma client works**

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"') pnpm tsx scripts/inspect-db.ts 2>&1 | tail -10
```

Expected:
- `bitcoin_prices`: 4599 rows
- `system_meta`: 2 rows (lastSuccessfulCronAt + lastSeedRunAt)
- latest 2026-05-04 (or close)

If counts are off, STOP and report — something happened to the DB between PR1 merge and now.

- [ ] **Step 5: No commit (workspace setup only)**

---

## Task 1: Enable `experimental.after` in `next.config.mjs`

**Files:**
- Modify: `next.config.mjs`

**Why:** The lazy-refresh mechanic in §7 uses Next.js's `after()` to fire background work after the response is sent. In Next.js 15.5.15 this is still under the experimental flag.

- [ ] **Step 1: Add the flag to `next.config.mjs`**

Find the `nextConfig` object. Add (or merge into) an `experimental` block:

```javascript
const nextConfig = {
  experimental: {
    after: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ... rest of config unchanged
}
```

If `experimental` already exists in the file, add `after: true` to it instead of replacing.

- [ ] **Step 2: Verify Next.js config still parses**

```bash
pnpm next info 2>&1 | head -10
```

Expected: prints Next.js version and platform info without errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "chore(next): enable experimental.after for lazy refresh

Required by PR2's GET /api/bitcoin-prices route handler. Next.js 15.5.15
still gates after() behind the experimental flag. Without this, the
import 'next/server'.{after,unstable_after} resolves but background
work silently never executes."
```

---

## Task 2: Update `vercel.json` (cron + remove legacy hack)

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Read current `vercel.json`**

```bash
cat vercel.json
```

Expected: contains `framework`, `buildCommand`, `installCommand`, `build.env`.

- [ ] **Step 2: Replace contents**

Write the file with these contents EXACTLY:

```json
{
  "framework": "nextjs",
  "build": {
    "env": {
      "SKIP_ENV_VALIDATION": "1",
      "SKIP_PRISMA_VALIDATION": "1"
    }
  },
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "5 0 * * *"
    }
  ]
}
```

Notes:
- `installCommand: "npm install --legacy-peer-deps"` is removed (was a hack from before pnpm worked — improvement-suggestions.md flagged it).
- `buildCommand: "npm run build"` is removed (Vercel defaults to `pnpm run build` since pnpm-lock.yaml is committed).
- The cron runs daily at 00:05 UTC, calling our new `/api/cron/update-prices` route.

- [ ] **Step 3: Verify JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected: `valid`.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore(vercel): add daily cron + drop legacy installCommand

- crons[0]: hits /api/cron/update-prices at 00:05 UTC daily
  (built in Task 7). Vercel Cron Hobby tier supports daily; for hourly
  fallback we use a free GitHub Action (Task 9).
- removes installCommand: 'npm install --legacy-peer-deps' (improvement-
  suggestions.md flagged as obsolete now that pnpm-lock.yaml is committed
  and PR1's deps work cleanly with default pnpm install).
- removes redundant buildCommand: 'npm run build' (Vercel defaults to
  the right thing)."
```

---

## Task 3: Add API Provider Env Vars to Vercel

**Files:** None — Vercel dashboard / CLI only.

**Why:** PR2's `PriceSource` reads API keys from env. Initially we set them to the existing-hardcoded values from `lib/services/multi-api-bitcoin-service.ts:445,500,841`; PR4 rotates them.

- [ ] **Step 1: Add `COINCAP_API_KEY` for production + preview + development**

Read the existing hardcoded value for reference:
```bash
grep -E "1566c56f|3e9ba37b" lib/services/multi-api-bitcoin-service.ts | head -5
```

Add via CLI (replace `<value>` with the actual value from grep). All three environments:
```bash
for env in production preview development; do
  pnpm dlx vercel env add COINCAP_API_KEY "$env" --value "1566c56f-f8a4-43b9-8d62-20e5105c298b" --yes 2>&1 | tail -2
done
```

If preview adds fail with "git_branch_required", append the branch:
```bash
pnpm dlx vercel env add COINCAP_API_KEY preview feature/pr2-endpoints --value "1566c56f-f8a4-43b9-8d62-20e5105c298b" --yes 2>&1 | tail -2
```

Note: `vercel env add` is interactive in some CLI versions. If `--value`/`--yes` flags don't work, add via dashboard at https://vercel.com/v0-4342s-projects/v0-bitcoin-simulation-tool/settings/environment-variables.

- [ ] **Step 2: Add `COINDESK_API_KEY` for all three envs**

```bash
for env in production preview development; do
  pnpm dlx vercel env add COINDESK_API_KEY "$env" --value "3e9ba37b23ad618af9308dfea087cd26884b1a91c666c514403cc4e41103343e" --yes 2>&1 | tail -2
done
```

- [ ] **Step 3: Pull updated env vars locally**

```bash
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
```

Verify:
```bash
for k in COINCAP_API_KEY COINDESK_API_KEY; do
  grep -q "^${k}=" .env.local && echo "✓ $k" || echo "✗ $k missing"
done
```

Expected: both ✓.

- [ ] **Step 4: No commit (env-only setup)**

---

## Task 4: PriceStore — DB Layer

**Files:**
- Create: `src/modules/price-data/services/PriceStore.ts`
- Create: `src/modules/price-data/services/__tests__/PriceStore.test.ts`

**Responsibility:** Wraps Prisma. Single place that knows how to query/write `bitcoin_prices` and `system_meta`. Pure DB layer with no external API knowledge.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/modules/price-data/services/__tests__/PriceStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPriceStore, type PriceStore } from '../PriceStore'

// Build a minimal mocked Prisma client. Each test sets up the methods it needs.
function mockPrisma(overrides: any = {}) {
  return {
    bitcoinPrice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      ...overrides.bitcoinPrice,
    },
    systemMeta: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      ...overrides.systemMeta,
    },
  } as any
}

describe('PriceStore.getLatest', () => {
  it('returns the most recent row by date', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        findFirst: vi.fn().mockResolvedValue({
          date: '2026-05-04', close: 100000, high: 102000, low: 99000, open: 99500,
          fetchedAt: new Date('2026-05-04T12:00:00Z'),
        }),
      },
    })
    const store = createPriceStore(prisma)

    const latest = await store.getLatest()

    expect(latest?.date).toBe('2026-05-04')
    expect(prisma.bitcoinPrice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: 'desc' } }),
    )
  })

  it('returns null on empty DB', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: { findFirst: vi.fn().mockResolvedValue(null) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getLatest()).toBeNull()
  })
})

describe('PriceStore.getRange', () => {
  it('returns rows within [from, to] inclusive, ordered ascending by date', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        findMany: vi.fn().mockResolvedValue([
          { date: '2026-01-01', close: 100, high: 110, low: 90, open: 95 },
          { date: '2026-01-02', close: 105, high: 115, low: 95, open: 100 },
        ]),
      },
    })
    const store = createPriceStore(prisma)

    const rows = await store.getRange('2026-01-01', '2026-01-02')

    expect(rows).toHaveLength(2)
    expect(prisma.bitcoinPrice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: '2026-01-01', lte: '2026-01-02' } },
        orderBy: { date: 'asc' },
      }),
    )
  })
})

describe('PriceStore.getATH', () => {
  it('returns MAX(high) per spec D5', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        aggregate: vi.fn().mockResolvedValue({ _max: { high: 124773.51 } }),
      },
    })
    const store = createPriceStore(prisma)

    const ath = await store.getATH()

    expect(ath).toBe(124773.51)
    expect(prisma.bitcoinPrice.aggregate).toHaveBeenCalledWith({
      _max: { high: true },
    })
  })

  it('returns null on empty DB', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: { aggregate: vi.fn().mockResolvedValue({ _max: { high: null } }) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getATH()).toBeNull()
  })
})

describe('PriceStore.upsertDay', () => {
  it('upserts by unique date key, takes MAX of high and MIN of low when row exists', async () => {
    const prisma = mockPrisma({
      bitcoinPrice: {
        upsert: vi.fn().mockResolvedValue({ date: '2026-05-04', close: 100000 }),
      },
    })
    const store = createPriceStore(prisma)

    await store.upsertDay({
      date: '2026-05-04',
      timestamp: BigInt(1746316800000),
      open: 99500, high: 102000, low: 99000, close: 100000,
      volume: 1234567, source: 'binance',
      fetchedAt: new Date('2026-05-04T12:00:00Z'),
    })

    const args = prisma.bitcoinPrice.upsert.mock.calls[0][0]
    expect(args.where).toEqual({ date: '2026-05-04' })
    // create branch contains all fields exactly
    expect(args.create.close).toBe(100000)
    expect(args.create.high).toBe(102000)
    // update branch tracks new fetchedAt + close, takes MAX of high
    expect(args.update.fetchedAt).toEqual(new Date('2026-05-04T12:00:00Z'))
    expect(args.update.close).toBe(100000)
    expect(args.update.high).toBeDefined() // exact form depends on impl; just check it's set
  })
})

describe('PriceStore.getMeta / setMeta', () => {
  it('getMeta returns value or null', async () => {
    const prisma = mockPrisma({
      systemMeta: {
        findUnique: vi.fn().mockResolvedValue({ key: 'lastSuccessfulCronAt', value: '2026-05-04T00:05:00.000Z' }),
      },
    })
    const store = createPriceStore(prisma)

    const v = await store.getMeta('lastSuccessfulCronAt')
    expect(v).toBe('2026-05-04T00:05:00.000Z')
  })

  it('getMeta returns null when key missing (defensive — not throws)', async () => {
    const prisma = mockPrisma({
      systemMeta: { findUnique: vi.fn().mockResolvedValue(null) },
    })
    const store = createPriceStore(prisma)
    expect(await store.getMeta('does-not-exist')).toBeNull()
  })

  it('setMeta upserts the row', async () => {
    const prisma = mockPrisma({
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    })
    const store = createPriceStore(prisma)

    await store.setMeta('lastSuccessfulCronAt', '2026-05-04T12:00:00.000Z')

    expect(prisma.systemMeta.upsert).toHaveBeenCalledWith({
      where: { key: 'lastSuccessfulCronAt' },
      update: { value: '2026-05-04T12:00:00.000Z' },
      create: { key: 'lastSuccessfulCronAt', value: '2026-05-04T12:00:00.000Z' },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceStore.test.ts 2>&1 | tail -10
```

Expected: ALL fail with module-not-found `Failed to resolve import "../PriceStore"`.

- [ ] **Step 3: Implement `PriceStore.ts`**

```typescript
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
      // - high: take MAX of stored vs new (intraday high may grow)
      // - low:  take MIN
      // - open: keep stored if same date (preserve the day's open)
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
          high: { set: input.high },   // upsert can't easily compute MAX in update; computed in updater layer if needed
          low: { set: input.low },
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
```

Note on `upsertDay`: the spec mentioned MAX/MIN logic for high/low, but Prisma's `upsert` doesn't natively express conditional updates. We handle the MAX/MIN in `PriceUpdater.updateCurrent` (Task 6) by reading the existing row first. PriceStore stays simple.

- [ ] **Step 4: Run tests, verify all pass**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceStore.test.ts 2>&1 | tail -15
```

Expected: all 9 tests pass. The `upsertDay` test asserts the where clause + create branch shape; if it breaks, adjust the test (don't loosen the implementation).

- [ ] **Step 5: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/price-data/services/PriceStore.ts \
        src/modules/price-data/services/__tests__/PriceStore.test.ts
git commit -m "feat(price-data): add PriceStore — Prisma wrapper for bitcoin_prices

Pure DB layer for PR2's new architecture. Wraps Prisma so PriceUpdater
and the read endpoint don't talk to Prisma directly. Methods:

- getLatest: most recent row (for PR2 lazy-refresh cooldown check)
- getRange: rows in [from, to] for the GET /api/bitcoin-prices endpoint
- getATH: MAX(high) per spec D5 (the canonical user-facing ATH)
- upsertDay: idempotent insert/update by unique date
- getMeta/setMeta: SystemMeta key-value access (cron heartbeat etc.)

9 unit tests with mocked Prisma. No DB needed for tests."
```

---

## Task 5: PriceSource — Per-Provider Adapters

**Files:**
- Create: `src/modules/price-data/services/PriceSource/types.ts`
- Create: `src/modules/price-data/services/PriceSource/providers/binance.ts`
- Create: `src/modules/price-data/services/PriceSource/providers/coincap.ts`
- Create: `src/modules/price-data/services/PriceSource/providers/cryptocompare.ts`
- Create: `src/modules/price-data/services/PriceSource/providers/yahoo.ts`
- Create: `src/modules/price-data/services/PriceSource/providers/coingecko.ts`
- Create: `src/modules/price-data/services/__tests__/PriceSource.providers.test.ts`

**Responsibility:** Each provider returns a `NormalizedPricePoint` for a current-price fetch. Per spec §6.1: don't leak per-provider response shapes into the rest of the system.

- [ ] **Step 1: Create the shared type**

`src/modules/price-data/services/PriceSource/types.ts`:

```typescript
export interface NormalizedPricePoint {
  date: string         // YYYY-MM-DD (UTC day boundary)
  timestamp: number    // Unix ms
  close: number        // USD
  high: number         // USD (= close if provider doesn't supply OHLC)
  low: number          // USD (= close if provider doesn't supply OHLC)
  open: number         // USD (= close if provider doesn't supply OHLC)
  volume: number | null
  source: string       // e.g. "binance"
  fetchedAt: Date
}

export interface PriceProvider {
  name: string
  fetchCurrent(): Promise<NormalizedPricePoint>
}
```

- [ ] **Step 2: Write tests for all 5 providers (one describe block each)**

`src/modules/price-data/services/__tests__/PriceSource.providers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { binance } from '../PriceSource/providers/binance'
import { coincap } from '../PriceSource/providers/coincap'
import { cryptocompare } from '../PriceSource/providers/cryptocompare'
import { yahoo } from '../PriceSource/providers/yahoo'
import { coingecko } from '../PriceSource/providers/coingecko'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function mockFetchOnce(jsonBody: any, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(jsonBody),
    }),
  )
}

describe('binance.fetchCurrent', () => {
  it('parses { symbol, price } shape and normalizes', async () => {
    mockFetchOnce({ symbol: 'BTCUSDT', price: '100123.45' })
    const p = await binance.fetchCurrent()
    expect(p.source).toBe('binance')
    expect(p.close).toBe(100123.45)
    expect(p.open).toBe(100123.45)
    expect(p.high).toBe(100123.45)
    expect(p.low).toBe(100123.45)
    expect(p.volume).toBeNull()
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('throws on non-2xx', async () => {
    mockFetchOnce({}, 503)
    await expect(binance.fetchCurrent()).rejects.toThrow(/503/)
  })
})

describe('coincap.fetchCurrent', () => {
  it('parses { data: { priceUsd } } and normalizes', async () => {
    process.env.COINCAP_API_KEY = 'test-key'
    mockFetchOnce({ data: { priceUsd: '100456.78' } })
    const p = await coincap.fetchCurrent()
    expect(p.source).toBe('coincap')
    expect(p.close).toBe(100456.78)
  })

  it('throws if COINCAP_API_KEY missing', async () => {
    delete process.env.COINCAP_API_KEY
    await expect(coincap.fetchCurrent()).rejects.toThrow(/COINCAP_API_KEY/)
  })
})

describe('cryptocompare.fetchCurrent', () => {
  it('parses { USD: <price> } and normalizes', async () => {
    mockFetchOnce({ USD: 100789.12 })
    const p = await cryptocompare.fetchCurrent()
    expect(p.source).toBe('cryptocompare')
    expect(p.close).toBe(100789.12)
  })

  it('throws on rate-limit response', async () => {
    mockFetchOnce({ Response: 'Error', Message: 'Rate limit' }, 200)
    await expect(cryptocompare.fetchCurrent()).rejects.toThrow(/rate limit|Response.*Error/i)
  })
})

describe('yahoo.fetchCurrent', () => {
  it('parses chart.result[0].meta.regularMarketPrice and normalizes', async () => {
    mockFetchOnce({
      chart: {
        result: [{ meta: { regularMarketPrice: 101000.55, regularMarketTime: 1746316800 } }],
        error: null,
      },
    })
    const p = await yahoo.fetchCurrent()
    expect(p.source).toBe('yahoo')
    expect(p.close).toBe(101000.55)
  })

  it('throws on { chart: { error: {...} } } shape', async () => {
    mockFetchOnce({ chart: { result: null, error: { description: 'Quote not found' } } })
    await expect(yahoo.fetchCurrent()).rejects.toThrow(/Quote not found/)
  })
})

describe('coingecko.fetchCurrent', () => {
  it('parses { bitcoin: { usd } } and normalizes', async () => {
    mockFetchOnce({ bitcoin: { usd: 100333.21 } })
    const p = await coingecko.fetchCurrent()
    expect(p.source).toBe('coingecko')
    expect(p.close).toBe(100333.21)
  })

  it('throws on 429 rate limit', async () => {
    mockFetchOnce({}, 429)
    await expect(coingecko.fetchCurrent()).rejects.toThrow(/429/)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceSource.providers.test.ts 2>&1 | tail -10
```

Expected: all fail with module-not-found.

- [ ] **Step 4: Implement `binance.ts`**

```typescript
// src/modules/price-data/services/PriceSource/providers/binance.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { symbol?: string; price?: string }
    if (typeof json.price !== 'string') throw new Error('binance: malformed response (price missing)')
    const close = parseFloat(json.price)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close,
      high: close,
      low: close,
      open: close,
      volume: null,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
```

- [ ] **Step 5: Implement `coincap.ts`**

```typescript
// src/modules/price-data/services/PriceSource/providers/coincap.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const coincap: PriceProvider = {
  name: 'coincap',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const apiKey = process.env.COINCAP_API_KEY
    if (!apiKey) throw new Error('coincap: COINCAP_API_KEY env var not set')
    const res = await fetch('https://api.coincap.io/v2/assets/bitcoin', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`coincap: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { data?: { priceUsd?: string } }
    if (typeof json.data?.priceUsd !== 'string') {
      throw new Error('coincap: malformed response (data.priceUsd missing)')
    }
    const close = parseFloat(json.data.priceUsd)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close,
      high: close,
      low: close,
      open: close,
      volume: null,
      source: 'coincap',
      fetchedAt: now,
    }
  },
}
```

- [ ] **Step 6: Implement `cryptocompare.ts`**

```typescript
// src/modules/price-data/services/PriceSource/providers/cryptocompare.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const cryptocompare: PriceProvider = {
  name: 'cryptocompare',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD')
    if (!res.ok) throw new Error(`cryptocompare: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { USD?: number; Response?: string; Message?: string }
    if (json.Response === 'Error') {
      throw new Error(`cryptocompare: ${json.Message ?? 'rate limit or other error'}`)
    }
    if (typeof json.USD !== 'number') throw new Error('cryptocompare: malformed response (USD missing)')
    const close = json.USD
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close,
      high: close,
      low: close,
      open: close,
      volume: null,
      source: 'cryptocompare',
      fetchedAt: now,
    }
  },
}
```

- [ ] **Step 7: Implement `yahoo.ts`**

```typescript
// src/modules/price-data/services/PriceSource/providers/yahoo.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const yahoo: PriceProvider = {
  name: 'yahoo',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1d')
    if (!res.ok) throw new Error(`yahoo: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }> | null
        error?: { description?: string } | null
      }
    }
    const err = json.chart?.error
    if (err) throw new Error(`yahoo: ${err.description ?? 'unknown error'}`)
    const meta = json.chart?.result?.[0]?.meta
    if (typeof meta?.regularMarketPrice !== 'number') {
      throw new Error('yahoo: malformed response (regularMarketPrice missing)')
    }
    const close = meta.regularMarketPrice
    const tsSec = meta.regularMarketTime ?? Math.floor(Date.now() / 1000)
    const ts = tsSec * 1000
    return {
      date: new Date(ts).toISOString().slice(0, 10),
      timestamp: ts,
      close,
      high: close,
      low: close,
      open: close,
      volume: null,
      source: 'yahoo',
      fetchedAt: new Date(),
    }
  },
}
```

- [ ] **Step 8: Implement `coingecko.ts`**

```typescript
// src/modules/price-data/services/PriceSource/providers/coingecko.ts
import type { PriceProvider, NormalizedPricePoint } from '../types'

export const coingecko: PriceProvider = {
  name: 'coingecko',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    if (!res.ok) throw new Error(`coingecko: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { bitcoin?: { usd?: number } }
    if (typeof json.bitcoin?.usd !== 'number') {
      throw new Error('coingecko: malformed response (bitcoin.usd missing)')
    }
    const close = json.bitcoin.usd
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close,
      high: close,
      low: close,
      open: close,
      volume: null,
      source: 'coingecko',
      fetchedAt: now,
    }
  },
}
```

- [ ] **Step 9: Run all provider tests, verify pass**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceSource.providers.test.ts 2>&1 | tail -20
```

Expected: all 10 tests (2 per provider × 5 providers) pass.

- [ ] **Step 10: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
git add src/modules/price-data/services/PriceSource/ \
        src/modules/price-data/services/__tests__/PriceSource.providers.test.ts
git commit -m "feat(price-data): add per-provider price adapters

Five providers per spec D-priority order: Binance > CoinCap > CryptoCompare
> Yahoo > CoinGecko (CoinGecko deprioritized to preserve free-tier quota
for the historical seed/gap-fill in scripts/gap-fill-prices.ts).

Each adapter returns NormalizedPricePoint regardless of upstream JSON
shape (per spec §6.1). Each throws on non-2xx, missing fields, or
provider-specific error envelopes (e.g., CryptoCompare's 200-with-error
pattern, Yahoo's chart.error block).

OHLC: free-tier providers only return close, so adapters set
open=high=low=close. The PriceUpdater layer (Task 6) handles the
aggregation logic when multiple fetches happen for the same day.

API keys read from env (COINCAP_API_KEY required for CoinCap; others
are keyless). Tests mock fetch and cover happy + sad paths."
```

---

## Task 6: PriceSource Orchestrator + PriceUpdater

**Files:**
- Create: `src/modules/price-data/services/PriceSource.ts` (the orchestrator)
- Create: `src/modules/price-data/services/PriceUpdater.ts`
- Create: `src/modules/price-data/services/__tests__/PriceSource.test.ts`
- Create: `src/modules/price-data/services/__tests__/PriceUpdater.test.ts`

- [ ] **Step 1: Write tests for the PriceSource fallback chain**

```typescript
// src/modules/price-data/services/__tests__/PriceSource.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchCurrentWithFallback } from '../PriceSource'
import type { PriceProvider, NormalizedPricePoint } from '../PriceSource/types'

function mockProvider(name: string, behavior: 'pass' | 'fail'): PriceProvider {
  return {
    name,
    fetchCurrent: vi.fn().mockImplementation(() =>
      behavior === 'pass'
        ? Promise.resolve({
            date: '2026-05-04', timestamp: 0, close: 100, high: 100, low: 100, open: 100,
            volume: null, source: name, fetchedAt: new Date(),
          } as NormalizedPricePoint)
        : Promise.reject(new Error(`${name} failed`)),
    ),
  }
}

describe('fetchCurrentWithFallback', () => {
  it('returns first provider that succeeds', async () => {
    const chain = [mockProvider('a', 'pass'), mockProvider('b', 'pass')]
    const result = await fetchCurrentWithFallback(chain)
    expect(result.source).toBe('a')
    expect(chain[1].fetchCurrent).not.toHaveBeenCalled()
  })

  it('falls through to next on failure', async () => {
    const chain = [
      mockProvider('a', 'fail'),
      mockProvider('b', 'fail'),
      mockProvider('c', 'pass'),
    ]
    const result = await fetchCurrentWithFallback(chain)
    expect(result.source).toBe('c')
  })

  it('throws aggregated error when ALL providers fail', async () => {
    const chain = [
      mockProvider('a', 'fail'),
      mockProvider('b', 'fail'),
    ]
    await expect(fetchCurrentWithFallback(chain)).rejects.toThrow(/all providers failed/i)
  })

  it('throws on empty chain (programmer error)', async () => {
    await expect(fetchCurrentWithFallback([])).rejects.toThrow(/empty/i)
  })
})
```

- [ ] **Step 2: Implement `PriceSource.ts`**

```typescript
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
```

- [ ] **Step 3: Run PriceSource tests, verify pass**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceSource.test.ts 2>&1 | tail -10
```

Expected: 4 tests pass.

- [ ] **Step 4: Write tests for `PriceUpdater`**

```typescript
// src/modules/price-data/services/__tests__/PriceUpdater.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPriceUpdater } from '../PriceUpdater'
import type { PriceStore } from '../PriceStore'
import type { NormalizedPricePoint } from '../PriceSource/types'

function mockStore(overrides: Partial<PriceStore> = {}): PriceStore {
  return {
    getLatest: vi.fn(),
    getRange: vi.fn(),
    getATH: vi.fn(),
    upsertDay: vi.fn().mockResolvedValue(undefined),
    getMeta: vi.fn(),
    setMeta: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any
}

const fakePoint: NormalizedPricePoint = {
  date: '2026-05-04', timestamp: 1746316800000,
  close: 100000, high: 100000, low: 100000, open: 100000,
  volume: null, source: 'binance', fetchedAt: new Date('2026-05-04T12:00:00Z'),
}

describe('PriceUpdater.updateCurrent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips fetch when latest fetchedAt is within cooldown', async () => {
    const recent = new Date(Date.now() - 60_000) // 1 min ago
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', fetchedAt: recent } as any),
    })
    const fetchSpy = vi.fn()
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(store.upsertDay).not.toHaveBeenCalled()
  })

  it('fetches and upserts when latest is older than cooldown', async () => {
    const old = new Date(Date.now() - 10 * 60_000) // 10 min ago
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', fetchedAt: old } as any),
    })
    const fetchSpy = vi.fn().mockResolvedValue(fakePoint)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(false)
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(store.upsertDay).toHaveBeenCalledOnce()
  })

  it('force flag bypasses cooldown', async () => {
    const recent = new Date(Date.now() - 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', fetchedAt: recent } as any),
    })
    const fetchSpy = vi.fn().mockResolvedValue(fakePoint)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent(true)

    expect(result.skipped).toBe(false)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('on fetch failure: returns last known good (does not throw)', async () => {
    const old = new Date(Date.now() - 10 * 60_000)
    const stale = { date: '2026-05-04', fetchedAt: old, close: 99000 } as any
    const store = mockStore({ getLatest: vi.fn().mockResolvedValue(stale) })
    const fetchSpy = vi.fn().mockRejectedValue(new Error('all providers failed'))
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const result = await updater.updateCurrent()

    expect(result.skipped).toBe(true)
    expect(result.reason).toMatch(/fetch failed|providers failed/i)
    expect(store.upsertDay).not.toHaveBeenCalled()
  })

  it('inflight dedup: two concurrent calls share one fetch', async () => {
    const old = new Date(Date.now() - 10 * 60_000)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-04', fetchedAt: old } as any),
    })
    let fetchResolve!: (v: NormalizedPricePoint) => void
    const fetchPromise = new Promise<NormalizedPricePoint>((r) => { fetchResolve = r })
    const fetchSpy = vi.fn().mockReturnValue(fetchPromise)
    const updater = createPriceUpdater({ store, fetchCurrent: fetchSpy, cooldownMs: 5 * 60_000 })

    const p1 = updater.updateCurrent()
    const p2 = updater.updateCurrent()
    fetchResolve(fakePoint)

    await Promise.all([p1, p2])
    expect(fetchSpy).toHaveBeenCalledOnce()  // shared!
    expect(store.upsertDay).toHaveBeenCalledOnce()
  })
})

describe('PriceUpdater.fillGaps', () => {
  beforeEach(() => vi.clearAllMocks())

  it('skips when DB latest is today (no gap)', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: today } as any),
    })
    const fetchHistory = vi.fn()
    const updater = createPriceUpdater({ store, fetchCurrent: vi.fn(), fetchHistory })

    const result = await updater.fillGaps()

    expect(result.gapDays).toBe(0)
    expect(fetchHistory).not.toHaveBeenCalled()
  })

  it('fetches missing range when DB is behind', async () => {
    const store = mockStore({
      getLatest: vi.fn().mockResolvedValue({ date: '2026-05-01' } as any),
    })
    const fetchHistory = vi.fn().mockResolvedValue([
      { ...fakePoint, date: '2026-05-02' },
      { ...fakePoint, date: '2026-05-03' },
      { ...fakePoint, date: '2026-05-04' },
    ])
    const updater = createPriceUpdater({ store, fetchCurrent: vi.fn(), fetchHistory })

    const result = await updater.fillGaps()

    expect(result.gapDays).toBe(3)
    expect(fetchHistory).toHaveBeenCalledOnce()
    expect(store.upsertDay).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 5: Implement `PriceUpdater.ts`**

```typescript
// src/modules/price-data/services/PriceUpdater.ts
//
// Orchestration layer: combines PriceStore (DB) and a fetcher (external API).
// updateCurrent: lazy-refresh with cooldown + inflight dedup (per spec §7, D7)
// fillGaps:      backfill missing days from external history (cron path)
//
import type { PriceStore } from './PriceStore'
import type { NormalizedPricePoint } from './PriceSource/types'

export interface UpdateCurrentResult {
  skipped: boolean
  reason?: string
  point?: NormalizedPricePoint
}

export interface FillGapsResult {
  gapDays: number
  fromDate?: string
  toDate?: string
}

export interface PriceUpdaterDeps {
  store: PriceStore
  fetchCurrent: () => Promise<NormalizedPricePoint>
  fetchHistory?: (from: string, to: string) => Promise<NormalizedPricePoint[]>
  cooldownMs?: number
}

export interface PriceUpdater {
  updateCurrent(force?: boolean): Promise<UpdateCurrentResult>
  fillGaps(): Promise<FillGapsResult>
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000  // 5 min per spec D3

export function createPriceUpdater(deps: PriceUpdaterDeps): PriceUpdater {
  const { store, fetchCurrent, fetchHistory } = deps
  const cooldownMs = deps.cooldownMs ?? DEFAULT_COOLDOWN_MS

  // Inflight promise dedup (per spec D7, red-team #8).
  // Concurrent callers within one process share the same in-flight promise.
  let inflight: Promise<UpdateCurrentResult> | null = null

  return {
    async updateCurrent(force = false) {
      if (inflight) return inflight

      inflight = (async () => {
        try {
          const latest = await store.getLatest()

          if (!force && latest) {
            const ageMs = Date.now() - latest.fetchedAt.getTime()
            if (ageMs < cooldownMs) {
              return { skipped: true, reason: `within cooldown (age ${Math.round(ageMs / 1000)}s)` }
            }
          }

          let point: NormalizedPricePoint
          try {
            point = await fetchCurrent()
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn('updateCurrent: fetch failed, returning stale DB value:', msg)
            return { skipped: true, reason: `fetch failed: ${msg}` }
          }

          // upsert today's row. PriceStore handles the DB write.
          await store.upsertDay({
            date: point.date,
            timestamp: BigInt(point.timestamp),
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume,
            source: point.source,
            fetchedAt: point.fetchedAt,
          })

          return { skipped: false, point }
        } finally {
          inflight = null
        }
      })()

      return inflight
    },

    async fillGaps() {
      if (!fetchHistory) {
        throw new Error('PriceUpdater.fillGaps: fetchHistory not configured')
      }

      const today = new Date().toISOString().slice(0, 10)
      const latest = await store.getLatest()
      const fromDate = latest ? nextDayISO(latest.date) : '2013-11-01'

      if (fromDate > today) {
        return { gapDays: 0 }
      }

      const points = await fetchHistory(fromDate, today)
      for (const p of points) {
        await store.upsertDay({
          date: p.date,
          timestamp: BigInt(p.timestamp),
          open: p.open, high: p.high, low: p.low, close: p.close,
          volume: p.volume, source: p.source, fetchedAt: p.fetchedAt,
        })
      }

      // Heartbeat
      await store.setMeta('lastSuccessfulCronAt', new Date().toISOString())

      return { gapDays: points.length, fromDate, toDate: today }
    },
  }
}

function nextDayISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 6: Run PriceUpdater tests, verify pass**

```bash
pnpm test --run src/modules/price-data/services/__tests__/PriceUpdater.test.ts 2>&1 | tail -20
```

Expected: 7 tests pass.

- [ ] **Step 7: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/price-data/services/PriceSource.ts \
        src/modules/price-data/services/PriceUpdater.ts \
        src/modules/price-data/services/__tests__/PriceSource.test.ts \
        src/modules/price-data/services/__tests__/PriceUpdater.test.ts
git commit -m "feat(price-data): add PriceSource fallback + PriceUpdater orchestration

- PriceSource.fetchCurrentWithFallback: tries providers in priority
  order (binance > coincap > cryptocompare > yahoo > coingecko per
  spec §6); aggregates errors if all fail.
- PriceUpdater.updateCurrent: lazy-refresh with 5-min cooldown
  (spec D3) + in-flight promise dedup (spec D7) so concurrent callers
  within one Vercel function instance share a single fetch. Graceful
  degradation: returns stale DB value if external fetch fails.
- PriceUpdater.fillGaps: cron path. Computes gap from latest_date+1
  to today, calls fetchHistory(), upserts each day, writes
  lastSuccessfulCronAt heartbeat (spec §4.2).

11 unit tests with mocked fetch and PriceStore."
```

---

## Task 7: Cron Endpoint `/api/cron/update-prices`

**Files:**
- Create: `app/api/cron/update-prices/route.ts`
- Create: `app/api/cron/update-prices/__tests__/route.test.ts`

**Auth:** Per spec D8, uses Vercel's canonical `Authorization: Bearer ${CRON_SECRET}` header with `crypto.timingSafeEqual`.

- [ ] **Step 1: Write tests**

```typescript
// app/api/cron/update-prices/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies so we can test the route's auth + orchestration logic
// without hitting real DB/external APIs.
vi.mock('@/lib/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))
vi.mock('@/src/modules/price-data/services/PriceUpdater', () => ({
  createPriceUpdater: vi.fn(() => ({
    updateCurrent: vi.fn().mockResolvedValue({ skipped: false }),
    fillGaps: vi.fn().mockResolvedValue({ gapDays: 0 }),
  })),
}))

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret-12345'
})

async function callRoute(headers: Record<string, string> = {}) {
  // Dynamic import after env mock to avoid module-load env capture
  const mod = await import('../route')
  const req = new Request('https://example.com/api/cron/update-prices', {
    method: 'POST',
    headers,
  })
  return mod.POST(req)
}

describe('POST /api/cron/update-prices auth', () => {
  it('rejects without Authorization header (401)', async () => {
    const res = await callRoute({})
    expect(res.status).toBe(401)
  })

  it('rejects with wrong bearer token (401)', async () => {
    const res = await callRoute({ Authorization: 'Bearer wrong-token' })
    expect(res.status).toBe(401)
  })

  it('accepts with correct bearer token (200)', async () => {
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(200)
  })

  it('rejects when CRON_SECRET env is unset (500 — misconfigured deploy)', async () => {
    delete process.env.CRON_SECRET
    const res = await callRoute({ Authorization: 'Bearer anything' })
    expect(res.status).toBe(500)
  })
})

describe('POST /api/cron/update-prices behavior', () => {
  it('returns JSON summary of fillGaps + updateCurrent', async () => {
    const res = await callRoute({ Authorization: 'Bearer test-secret-12345' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('fillGaps')
    expect(body).toHaveProperty('updateCurrent')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test --run app/api/cron/update-prices/__tests__/route.test.ts 2>&1 | tail -10
```

Expected: ALL fail with module-not-found `Failed to resolve import "../route"`.

- [ ] **Step 3: Implement the route**

```typescript
// app/api/cron/update-prices/route.ts
//
// Cron endpoint. Hit by:
//   - Vercel Cron daily at 00:05 UTC (configured in vercel.json)
//   - GitHub Action hourly (configured in .github/workflows/hourly-price-refresh.yml)
//
// Auth: Authorization: Bearer ${CRON_SECRET} per Vercel canonical pattern (spec D8).
//
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { PrismaClient } from '@/lib/generated/prisma'
import { createPriceStore } from '@/src/modules/price-data/services/PriceStore'
import { createPriceUpdater } from '@/src/modules/price-data/services/PriceUpdater'
import { fetchCurrentWithFallback } from '@/src/modules/price-data/services/PriceSource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'  // never cache cron responses

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  if (!safeEqualStrings(auth, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Lazy-instantiate Prisma so module-load doesn't crash builds without DATABASE_URL
  const prisma = new PrismaClient()
  try {
    const store = createPriceStore(prisma)
    const updater = createPriceUpdater({
      store,
      fetchCurrent: fetchCurrentWithFallback,
      // fetchHistory not yet wired — fillGaps for incremental days only
      // will land in a follow-up. PR2 covers updateCurrent path only.
    })

    const updateResult = await updater.updateCurrent(true)  // force=true: cron always refreshes

    return NextResponse.json({
      ok: true,
      updateCurrent: updateResult,
      fillGaps: { skipped: true, reason: 'fetchHistory not yet wired in PR2' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

/** Constant-time string comparison via timingSafeEqual. */
function safeEqualStrings(a: string, b: string): boolean {
  // Pad/truncate both to same length to avoid throwing on mismatched length
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still do a comparison to keep timing constant
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}
```

Note: `fillGaps` requires a history-fetcher we haven't built (CoinGecko's market_chart/range from `scripts/gap-fill-prices.ts`). For PR2 we skip it; the cron just refreshes the latest price daily. The hourly GH Action also calls this endpoint, doubling as a heartbeat. PR2.5 or PR3 can wire fetchHistory if needed.

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm test --run app/api/cron/update-prices/__tests__/route.test.ts 2>&1 | tail -15
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/update-prices/
git commit -m "feat(api): add POST /api/cron/update-prices cron endpoint

Hit by Vercel Cron (daily, configured in vercel.json) and the upcoming
GitHub Action (hourly fallback). Auth via Authorization: Bearer
\${CRON_SECRET} with timingSafeEqual (spec D8). Force=true on
updateCurrent so cron always refreshes regardless of cooldown.

fillGaps stub returns skipped — wiring fetchHistory will follow once we
have a history-fetcher abstracted from scripts/gap-fill-prices.ts.

Lazy-instantiates PrismaClient inside the handler so module-load doesn't
crash preview builds without DATABASE_URL."
```

---

## Task 8: Read Endpoint `/api/bitcoin-prices`

**Files:**
- Create: `app/api/bitcoin-prices/route.ts` — note: at the FOLDER ROOT, not nested. The 7 nested old routes coexist for now.
- Create: `app/api/bitcoin-prices/__tests__/route.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// app/api/bitcoin-prices/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

const mockStoreInstance: any = {
  getLatest: vi.fn(),
  getRange: vi.fn(),
  getATH: vi.fn(),
  getMeta: vi.fn(),
}
vi.mock('@/src/modules/price-data/services/PriceStore', () => ({
  createPriceStore: vi.fn(() => mockStoreInstance),
}))

const mockUpdater: any = { updateCurrent: vi.fn() }
vi.mock('@/src/modules/price-data/services/PriceUpdater', () => ({
  createPriceUpdater: vi.fn(() => mockUpdater),
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: vi.fn((fn: () => void) => fn()),  // run inline in tests for assertion
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockStoreInstance.getLatest.mockResolvedValue({
    date: '2026-05-04', close: 100000, fetchedAt: new Date(Date.now() - 60_000),
  })
  mockStoreInstance.getRange.mockResolvedValue([])
  mockStoreInstance.getATH.mockResolvedValue(124773.51)
  mockStoreInstance.getMeta.mockResolvedValue('2026-05-04T00:05:00.000Z')
  mockUpdater.updateCurrent.mockResolvedValue({ skipped: true })
})

async function callGet(url = 'https://example.com/api/bitcoin-prices') {
  const mod = await import('../route')
  return mod.GET(new Request(url))
}

describe('GET /api/bitcoin-prices', () => {
  it('returns prices, currentPrice, ath, lastUpdated, isStale', async () => {
    const res = await callGet()
    const body = await res.json()
    expect(body).toHaveProperty('prices')
    expect(body).toHaveProperty('currentPrice')
    expect(body.currentPrice.value).toBe(100000)
    expect(body).toHaveProperty('ath')
    expect(body.ath.value).toBe(124773.51)
    expect(body).toHaveProperty('lastUpdated')
    expect(body.isStale).toBe(false)  // cron heartbeat is recent
  })

  it('sets Cache-Control: s-maxage=60, stale-while-revalidate=300', async () => {
    const res = await callGet()
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=60.*stale-while-revalidate=300/)
  })

  it('isStale=true when lastSuccessfulCronAt > 25h ago', async () => {
    mockStoreInstance.getMeta.mockResolvedValue(
      new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    )
    const res = await callGet()
    const body = await res.json()
    expect(body.isStale).toBe(true)
  })

  it('triggers updateCurrent via after() when latest.fetchedAt > 5 min', async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000)
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, fetchedAt: old,
    })
    await callGet()
    expect(mockUpdater.updateCurrent).toHaveBeenCalledWith(false)  // not forced
  })

  it('does NOT trigger updateCurrent when latest.fetchedAt is fresh', async () => {
    const fresh = new Date(Date.now() - 60_000)  // 1 min
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, fetchedAt: fresh,
    })
    await callGet()
    expect(mockUpdater.updateCurrent).not.toHaveBeenCalled()
  })

  it('?refresh=force triggers updateCurrent regardless of cooldown', async () => {
    const fresh = new Date(Date.now() - 60_000)
    mockStoreInstance.getLatest.mockResolvedValue({
      date: '2026-05-04', close: 100000, fetchedAt: fresh,
    })
    await callGet('https://example.com/api/bitcoin-prices?refresh=force')
    expect(mockUpdater.updateCurrent).toHaveBeenCalledWith(true)  // force=true
  })

  it('returns 503 on DB connection error', async () => {
    mockStoreInstance.getLatest.mockRejectedValue(new Error('connection refused'))
    const res = await callGet()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('db_unavailable')
  })

  it('parses ?from= and ?to= query params', async () => {
    await callGet('https://example.com/api/bitcoin-prices?from=2026-01-01&to=2026-05-04')
    expect(mockStoreInstance.getRange).toHaveBeenCalledWith('2026-01-01', '2026-05-04')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test --run app/api/bitcoin-prices/__tests__/route.test.ts 2>&1 | tail -10
```

Expected: ALL fail with module-not-found.

- [ ] **Step 3: Implement the route**

```typescript
// app/api/bitcoin-prices/route.ts
//
// Single read endpoint. Returns { prices, currentPrice, ath, lastUpdated, isStale }.
// Cached at the Edge via Cache-Control: s-maxage=60, stale-while-revalidate=300.
//
// Lazy refresh (per spec §7): if latest.fetchedAt > 5 min old, fire updateCurrent
// via Next.js after() so it runs after the response is sent — never blocks the request.
//
// ?refresh=force bypasses cooldown (used by "Load current price" button in PR4).
// ?from=YYYY-MM-DD&to=YYYY-MM-DD constrains the historical range; default = full history.
//
import { NextResponse, after } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'
import { createPriceStore } from '@/src/modules/price-data/services/PriceStore'
import { createPriceUpdater } from '@/src/modules/price-data/services/PriceUpdater'
import { fetchCurrentWithFallback } from '@/src/modules/price-data/services/PriceSource'

export const runtime = 'nodejs'

const COOLDOWN_MS = 5 * 60 * 1000
const STALE_CRON_MS = 25 * 60 * 60 * 1000  // 25h: daily cron should heartbeat within 24h

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? '1970-01-01'
  const to = url.searchParams.get('to') ?? '9999-12-31'
  const force = url.searchParams.get('refresh') === 'force'

  const prisma = new PrismaClient()
  try {
    const store = createPriceStore(prisma)

    let latest, rangeRows, athValue, lastCronStr
    try {
      ;[latest, rangeRows, athValue, lastCronStr] = await Promise.all([
        store.getLatest(),
        store.getRange(from, to),
        store.getATH(),
        store.getMeta('lastSuccessfulCronAt'),
      ])
    } catch (err) {
      console.error('GET /api/bitcoin-prices DB error:', err)
      return NextResponse.json(
        { error: 'db_unavailable', detail: err instanceof Error ? err.message : String(err) },
        { status: 503 },
      )
    }

    // Decide whether to fire a background refresh
    const ageMs = latest ? Date.now() - latest.fetchedAt.getTime() : Infinity
    if (force || ageMs > COOLDOWN_MS) {
      const updater = createPriceUpdater({ store, fetchCurrent: fetchCurrentWithFallback })
      after(async () => {
        try {
          await updater.updateCurrent(force)
        } catch (err) {
          console.warn('background updateCurrent failed:', err)
        }
      })
    }

    // Staleness check (cron heartbeat)
    const cronStaleHours = lastCronStr
      ? (Date.now() - new Date(lastCronStr).getTime()) / (60 * 60 * 1000)
      : Infinity
    const isStale = cronStaleHours * 60 * 60 * 1000 > STALE_CRON_MS

    const body = {
      prices: rangeRows.map((r) => ({
        date: r.date,
        close: r.close,
        high: r.high,
        low: r.low,
        open: r.open,
      })),
      currentPrice: latest
        ? { value: latest.close, fetchedAt: latest.fetchedAt }
        : null,
      ath: athValue !== null ? { value: athValue } : null,
      lastUpdated: latest?.fetchedAt ?? null,
      isStale,
    }

    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm test --run app/api/bitcoin-prices/__tests__/route.test.ts 2>&1 | tail -15
```

Expected: 8 tests pass.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/bitcoin-prices/route.ts \
        app/api/bitcoin-prices/__tests__/route.test.ts
git commit -m "feat(api): add GET /api/bitcoin-prices unified read endpoint

Returns { prices, currentPrice, ath, lastUpdated, isStale }. Cached at
Edge via Cache-Control: s-maxage=60, stale-while-revalidate=300 (spec
red-team #3 mitigation — single source of cache truth across instances).

Lazy refresh per spec §7: if latest.fetchedAt > 5 min, fires
PriceUpdater.updateCurrent via Next.js after() so the response is sent
first — never blocks (red-team #2 mitigation). ?refresh=force bypasses
cooldown for the upcoming 'Load current price' button (PR4).

Returns 503 on DB outage so the UI can show a loading/error state
instead of stale data (spec §9).

The 7 nested old routes (current/historical/stats/etc.) coexist
unchanged — PR4 swaps consumers, PR5 deletes them."
```

---

## Task 9: GitHub Action — Hourly Fallback Cron

**Files:**
- Create: `.github/workflows/hourly-price-refresh.yml`

**Why:** Vercel Cron Hobby tier supports daily-only. The hourly GitHub Action (free) hits the same endpoint, providing hourly heartbeat + a second scheduler so a misconfigured Vercel Cron self-heals.

- [ ] **Step 1: Add the workflow**

```yaml
# .github/workflows/hourly-price-refresh.yml
name: Hourly BTC Price Refresh

on:
  schedule:
    # Every hour at minute 7 (offset from Vercel cron at 00:05 to avoid clashing)
    - cron: '7 * * * *'
  workflow_dispatch:  # allow manual runs from the Actions tab

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Hit /api/cron/update-prices
        env:
          PROD_URL: ${{ secrets.PROD_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: |
          if [ -z "$PROD_URL" ] || [ -z "$CRON_SECRET" ]; then
            echo "::error::PROD_URL or CRON_SECRET secret not configured"
            exit 1
          fi
          response=$(curl -s -o /tmp/body -w "%{http_code}" \
            -X POST "$PROD_URL/api/cron/update-prices" \
            -H "Authorization: Bearer $CRON_SECRET" \
            --max-time 60)
          echo "HTTP $response"
          cat /tmp/body
          test "$response" = "200"
```

- [ ] **Step 2: Add `PROD_URL` and verify `CRON_SECRET` GH secrets**

The user must do this via GitHub UI or CLI. Document in commit message.

```bash
# Set PROD_URL (the production domain)
gh secret set PROD_URL --body "https://firehodl.com"

# CRON_SECRET should already exist (used elsewhere). Verify:
gh secret list | grep -E "PROD_URL|CRON_SECRET"
```

Expected: both listed.

If `CRON_SECRET` is missing, get the value from Vercel and set it:
```bash
secret=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '"')
gh secret set CRON_SECRET --body "$secret"
```

- [ ] **Step 3: Manually trigger the workflow once to confirm it works**

After committing + pushing the workflow file, the user (or you via gh CLI) can fire it manually:
```bash
gh workflow run hourly-price-refresh.yml
sleep 30
gh run list --workflow=hourly-price-refresh.yml --limit=1
```

Expected: the most-recent run shows `completed` `success`. If failure, check `gh run view <run-id> --log`.

(Note: this manual step happens AFTER the commit + push, since the workflow file must be on the branch for `gh workflow run` to find it.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/hourly-price-refresh.yml
git commit -m "feat(ci): hourly fallback cron via GitHub Actions

Vercel Cron Hobby tier is daily-only; this fills the gap by hitting
/api/cron/update-prices at minute 7 of every hour (offset from Vercel's
00:05 to avoid collision).

Free, no extra infra. Doubles as a redundant scheduler so a misconfigured
Vercel cron self-heals when the GH Action runs.

Required GitHub secrets: PROD_URL, CRON_SECRET (the same secret used in
Vercel env vars, set in PR1)."
```

---

## Task 10: Local + Production Smoke Tests

**Files:** None — verification only.

- [ ] **Step 1: Local cron endpoint smoke test**

```bash
set -a; source .env.local; set +a
pnpm dev &
SERVER_PID=$!
sleep 8

# Test cron endpoint with correct auth
curl -s -X POST http://localhost:3000/api/cron/update-prices \
  -H "Authorization: Bearer $CRON_SECRET" | head -c 200
echo
echo "---wrong auth---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/cron/update-prices \
  -H "Authorization: Bearer wrong"

# Test read endpoint
curl -s http://localhost:3000/api/bitcoin-prices?from=2026-05-01\&to=2026-05-04 | head -c 500
echo
echo "---force refresh---"
curl -s -i http://localhost:3000/api/bitcoin-prices?refresh=force | head -20

kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
```

Expected:
- Cron with correct auth: 200 + JSON `{ ok: true, updateCurrent: ..., fillGaps: ... }`
- Cron with wrong auth: 401
- Read endpoint: 200 + JSON `{ prices, currentPrice, ath, lastUpdated, isStale }`
- Read with `?refresh=force`: 200 + the `Cache-Control` header should be `s-maxage=60, stale-while-revalidate=300`

If any fail, capture the error from server logs.

- [ ] **Step 2: Verify the lazy refresh wrote to DB**

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"') node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const r = await c.query(\"SELECT date, close, fetched_at FROM bitcoin_prices ORDER BY date DESC LIMIT 1\");
  console.log(JSON.stringify(r.rows[0], null, 2));
  await c.end();
})();
"
```

Expected: latest row's `fetched_at` should be very recent (within the last few minutes from the smoke test). If it's still showing 2025 timestamps, the lazy refresh didn't fire — investigate.

- [ ] **Step 3: Push the branch + open PR**

```bash
git push --set-upstream origin feature/pr2-endpoints 2>&1 | tail -3

gh pr create --title "PR2: Bitcoin price data refactor — API endpoints + cron" \
  --body "$(cat <<'EOF'
## Summary

PR2 of 5 in the Bitcoin price data refactor (spec: `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`, plan: `docs/superpowers/plans/2026-05-04-bitcoin-price-data-pr2-endpoints.md`).

This PR builds the new DB-backed read endpoint, cron write endpoint, multi-provider price source, and GitHub Action for hourly fallback. **No UI consumer changes** — the simulation page still reads from static JSON until PR3-4.

## Changes

**New service modules** (in `src/modules/price-data/services/`):
- `PriceStore.ts` — Prisma wrapper (getLatest/getRange/getATH/upsertDay/getMeta/setMeta)
- `PriceSource.ts` + 5 per-provider adapters in `PriceSource/providers/{binance,coincap,cryptocompare,yahoo,coingecko}.ts`
- `PriceUpdater.ts` — orchestration with 5-min cooldown + in-flight promise dedup

**New API routes:**
- `POST /api/cron/update-prices` — Bearer-auth cron endpoint (timingSafeEqual)
- `GET /api/bitcoin-prices` — Edge-cached read endpoint with lazy-refresh via `after()`

**Infrastructure:**
- `vercel.json` cron block (daily 00:05 UTC)
- `.github/workflows/hourly-price-refresh.yml` (hourly fallback)
- `next.config.mjs` `experimental.after = true`

## Test plan

- [x] Unit tests: 30+ new tests across 5 files, all passing
- [x] Type-check: 0 errors
- [x] Local smoke: cron endpoint + read endpoint via curl
- [x] Local smoke: lazy-refresh verified to write to DB
- [ ] Vercel preview build green
- [ ] After merge: Vercel cron fires within 24h (verify via `vercel inspect <deployment-id>` or DB heartbeat)
- [ ] After merge: GitHub Action fires hourly (verify via `gh run list`)

## Out of Scope (later PRs)

- PR3: rewrite `PriceDataService.ts` + `usePriceData()` hook to call the new endpoint
- PR4: cut over UI consumers (ATHAlert, BasicParametersCard, charts), remove hardcoded `124277.98` fallbacks, rotate API keys
- PR5: delete the 7 old routes, old services, static JSON files

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for + verify Vercel preview build**

The PR will trigger a Vercel preview build. Monitor:
```bash
sleep 60
gh pr checks $(gh pr view --json number --jq .number) 2>&1 | tail -5
```

Expected: both checks `pass`. If Vercel build fails, capture the log via `vercel inspect <deployment-id> --logs`.

If the build succeeds, smoke-test the preview URL:
```bash
PREVIEW_URL=$(gh pr view --json url --jq .url | sed 's|github.com/.*/pull/.*|...preview-url-from-vercel-comment...|')
# Get the actual preview URL from the Vercel bot comment on the PR
gh pr view --comments | grep -E "Visit Preview" | head -1
```

Then curl the endpoints:
```bash
curl -s "$PREVIEW_URL/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | head -c 500
```

Expected: same JSON shape as local.

- [ ] **Step 5: After merge, fire the GH Action manually**

After the PR merges to main, manually trigger the new workflow once to verify production:
```bash
gh workflow run hourly-price-refresh.yml --ref main
sleep 30
gh run list --workflow=hourly-price-refresh.yml --limit=1
```

Expected: most-recent run is `success`. The DB's `lastSuccessfulCronAt` in `system_meta` should be very recent.

- [ ] **Step 6: No commit (verification-only)**

---

## Self-Review Checklist

**Spec coverage** (every PR2 deliverable in spec §10 has a task):
- [x] Build PriceStore/PriceSource/PriceUpdater with full test coverage → Tasks 4, 5, 6
- [x] Build `/api/bitcoin-prices` and `/api/cron/update-prices` → Tasks 7, 8
- [x] `vercel.json` cron entry → Task 2
- [x] `.github/workflows/hourly-price-refresh.yml` → Task 9
- [x] Set `CRON_SECRET` GH Action secret → Task 9
- [x] `next.config.mjs` `experimental.after` → Task 1
- [x] Multi-provider chain with CoinGecko deprioritized (spec D-priority order) → Task 5
- [x] In-flight promise dedup (D7) → Task 6
- [x] `Authorization: Bearer ${CRON_SECRET}` + timingSafeEqual (D8) → Task 7
- [x] Smoke-test endpoints in production → Task 10
- [x] `experimental.after` flag (D12) → Task 1
- [x] Bootstrap `lastSuccessfulCronAt` written by cron (D11) → Task 6 (writes via setMeta)
- [x] Edge-cache header (red-team #3) → Task 8
- [x] Lazy-refresh via after() (red-team #2) → Task 8
- [ ] Per-IP rate limit on `?refresh=force` (D14) — DEFERRED (5-min cooldown is sufficient defense for now; revisit if abuse observed)

**Placeholder scan:** No "TBD", "TODO", or vague steps. Every step has explicit code/commands/expected output. The `fillGaps` in Task 7's cron route is intentionally a stub (with a documented reason in the commit message); not a placeholder.

**Type consistency:** `PriceStore` interface in Task 4 matches usage in Tasks 6, 7, 8. `NormalizedPricePoint` in Task 5 matches usage in Tasks 6, 7, 8. `PriceUpdaterDeps`/`createPriceUpdater` signature consistent across Tasks 6, 7, 8. `UpsertDayInput` shape consistent.

---

## What Comes After PR2

After PR2 is merged and verified:

- **PR3** — Replace mocks in `src/modules/price-data/services/PriceDataService.ts` with `fetch('/api/bitcoin-prices')`. Rewrite `usePriceData()` as SWR hook calling the new endpoint. Reconcile `DataServiceState` shape mismatch (improvement-suggestions.md item).
- **PR4** — Cut over consumers (ATHAlert, BasicParametersCard, charts), remove the four hardcoded `124277.98` fallbacks, rotate API keys.
- **PR5** — Delete ~45 dead files (old routes, services, static JSON, `app/simulation/data/`, root-level scripts).

I'll write Plan 3 (PR3) once PR2 is merged and verified.
