# Bitcoin Price Data Refactor — PR1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision the database, commit real Prisma migrations, extract the canonical `HistoricalDataPoint` type, and ship a working CoinGecko seed script — all additive, zero user-visible change. App continues to read from static JSON.

**Architecture:** PR1 is the foundation phase of a 5-PR refactor (see `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`). It lays the database and type plumbing that PR2's new endpoints will build on. No application behavior changes in this PR.

**Tech Stack:** Vercel Postgres (Neon under the hood) for prod, Postgres 15 via Docker Compose for local, Prisma 6.x, TypeScript strict, Vitest with jsdom.

**Spec sections covered:** §4.1, §4.2, §5.4 (config), §5.5 (type extraction only — full consumer cut-over is PR4), §10 PR1, plus D11, D13, D15, D17 from the decisions log.

**Out of scope for this PR (will land in later PRs):**
- The new read endpoint (`/api/bitcoin-prices/route.ts`) — PR2
- The cron endpoint (`/api/cron/update-prices/route.ts`) — PR2
- The `PriceStore`/`PriceSource`/`PriceUpdater` modules — PR2
- The new `usePriceData()` SWR hook — PR3
- Consumer cut-over (ATHAlert, BasicParametersCard, etc.) — PR4
- Removing the `124277.98` fallbacks — PR4
- Deleting the old static JSON files / dead services — PR5

---

## File Structure for This PR

**Files to CREATE:**
- `docker-compose.yml` — Local Postgres 15 service
- `.env.example` — Env var template (committed; lists all required keys without values)
- `prisma/migrations/<ts>_init/migration.sql` — First real committed migration (auto-generated)
- `prisma/migrations/<ts>_add_fetched_at_and_system_meta/migration.sql` — Second migration (auto-generated, then hand-edited to add bootstrap INSERT)
- `src/modules/price-data/types/index.ts` — Canonical `HistoricalDataPoint` and related types (already exists per the existing module skeleton — we'll consolidate into it)
- `scripts/seed-from-coingecko.ts` — One-shot historical seed
- `scripts/__tests__/seed-from-coingecko.test.ts` — Vitest tests for the seed script

**Files to MODIFY:**
- `prisma/schema.prisma` — Add `fetchedAt` column to `BitcoinPrice`, add `SystemMeta` model
- `package.json` — Update `build`, `db:seed`, `prisma.seed` scripts; add new dev dependencies
- `.gitignore` — Ensure `.env`, `.env.local` are ignored (verify they already are)
- All ~17 production files importing `HistoricalDataPoint` from `@/lib/services/centralized-data-service` — update import paths only (no behavior change)

**Files to DELETE:**
- `prisma/seed.ts` — Replaced by `scripts/seed-from-coingecko.ts`

**Files NOT touched in this PR:**
- `app/simulation/**` — Behavior unchanged; only some import paths update
- `lib/services/centralized-data-service.ts` — Stays. PR4 deletes it.
- `public/data/bitcoin/*.json` — Stays. PR5 deletes them.

---

## Task 1: Local Postgres via Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore` (verify only)
- Modify: `package.json` (add `db:up`, `db:down` scripts)

- [ ] **Step 1: Verify `.gitignore` already excludes env files**

Run:
```bash
grep -E "^\.env" .gitignore
```

Expected output:
```
.env*.local
.env
.env.development
.env.production
.env.test
```

If any of those are missing, add them. Otherwise no change.

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: btc-sim-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: btc_sim
    ports:
      - "5432:5432"
    volumes:
      - btc-sim-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d btc_sim"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  btc-sim-pgdata:
```

- [ ] **Step 3: Create `.env.example`**

```bash
# .env.example — committed; copy to .env.local and fill in for local dev

# === Database ===
# Local: postgres in docker (start with `pnpm db:up`)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public"

# === Cron auth (PR2 introduces, can be empty for PR1) ===
CRON_SECRET=""

# === External price provider keys (PR2 introduces real use) ===
# In PR1 these are unused; populate before PR2 deploys
COINCAP_API_KEY=""
COINDESK_API_KEY=""
COINMARKETCAP_API_KEY=""
MESSARI_API_KEY=""
```

- [ ] **Step 4: Add `db:up` / `db:down` / `db:logs` scripts to `package.json`**

Locate the `"scripts"` block in `package.json` and add three lines:

```json
"db:up": "docker compose up -d postgres",
"db:down": "docker compose down",
"db:logs": "docker compose logs -f postgres",
```

Place them alphabetically near the existing `db:seed` line. Save.

- [ ] **Step 5: Start local Postgres and verify**

Run:
```bash
cp .env.example .env.local
pnpm db:up
sleep 3
docker exec btc-sim-postgres pg_isready -U postgres -d btc_sim
```

Expected:
```
/var/run/postgresql:5432 - accepting connections
```

If it fails, check `pnpm db:logs` for the error.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example package.json
git commit -m "feat(db): add docker-compose Postgres for local dev

- Postgres 15-alpine on localhost:5432
- Persistent named volume for data
- Healthcheck for readiness gating
- pnpm db:up/down/logs convenience scripts
- .env.example template for local dev"
```

---

## Task 2: First Real Prisma Migration (init from existing schema)

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql` (auto-generated)
- No schema changes in this task — we just freeze the existing schema as a migration

**Why:** Currently `prisma/migrations/` has only `migration_lock.toml`. Production may have been bootstrapped via `prisma db push` (no migration history), or not at all. We need a real migration so `prisma migrate deploy` works in CI/Vercel.

- [ ] **Step 1: Confirm DB is empty before generating init migration**

Run:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "\dt"
```

Expected: `Did not find any relations.`

If tables exist, drop and recreate:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

- [ ] **Step 2: Generate the init migration**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" pnpm prisma migrate dev --name init
```

Expected output ends with:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client (v6.x.x) to ./lib/generated/prisma
```

A new file should appear: `prisma/migrations/<timestamp>_init/migration.sql`.

- [ ] **Step 3: Verify the migration SQL contains the three tables**

Run:
```bash
ls prisma/migrations/
cat prisma/migrations/*_init/migration.sql | grep -E "CREATE TABLE"
```

Expected:
```
CREATE TABLE "bitcoin_prices" ...
CREATE TABLE "data_updates" ...
CREATE TABLE "api_usage" ...
```

If any are missing, the schema didn't match — investigate with `pnpm prisma validate`.

- [ ] **Step 4: Commit the migration**

```bash
git add prisma/migrations/
git commit -m "feat(db): add init Prisma migration for existing schema

Captures the existing BitcoinPrice, DataUpdate, and ApiUsage tables
as a real migration. Required for prisma migrate deploy in CI/Vercel.
Previously the migrations folder contained only migration_lock.toml."
```

---

## Task 3: Add `fetchedAt` Column and `SystemMeta` Table

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_fetched_at_and_system_meta/migration.sql` (auto-generated, then hand-edited)

- [ ] **Step 1: Add `fetchedAt` and index to `BitcoinPrice` model**

In `prisma/schema.prisma`, locate the `BitcoinPrice` model. Just before the closing `}`, after `updatedAt`, add:

```prisma
  fetchedAt DateTime @default(now()) @map("fetched_at") // When this row was last refreshed from external API
```

In the existing index block, add `@@index([fetchedAt])`. The full index list should now be:
```prisma
  @@index([date])
  @@index([timestamp])
  @@index([source])
  @@index([fetchedAt])
```

- [ ] **Step 2: Add the new `SystemMeta` model**

At the end of `prisma/schema.prisma`, add:

```prisma
// Singleton key-value store for system-level state (cron heartbeat, seed timestamps, etc.)
model SystemMeta {
  key       String   @id @db.VarChar(50)
  value     String   @db.Text
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_meta")
}
```

- [ ] **Step 3: Generate the migration**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" pnpm prisma migrate dev --name add_fetched_at_and_system_meta
```

Expected: a new migration file is created at `prisma/migrations/<ts>_add_fetched_at_and_system_meta/migration.sql`.

- [ ] **Step 4: Hand-edit the migration to add the bootstrap INSERT**

Open the new migration SQL file. At the very end (after the auto-generated `CREATE TABLE "system_meta"` and any `CREATE INDEX`), append:

```sql

-- Bootstrap: ensure lastSuccessfulCronAt is never null on a fresh DB
-- (per spec §4.2 / decision D11). Without this, `new Date(undefined)`
-- returns NaN and the staleness recovery in the read endpoint never fires.
INSERT INTO "system_meta" ("key", "value", "updated_at")
VALUES ('lastSuccessfulCronAt', '1970-01-01T00:00:00.000Z', NOW())
ON CONFLICT ("key") DO NOTHING;
```

- [ ] **Step 5: Re-apply the migration to verify the bootstrap row lands**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" pnpm prisma migrate reset --force --skip-seed
```

Then verify:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "SELECT * FROM system_meta;"
```

Expected:
```
        key            |             value            |     updated_at
-----------------------+------------------------------+-----------------------
 lastSuccessfulCronAt  | 1970-01-01T00:00:00.000Z     | 2026-...
```

- [ ] **Step 6: Verify `fetchedAt` column was added**

Run:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "\d bitcoin_prices"
```

Expected: the column listing includes:
```
 fetched_at          | timestamp(3) without time zone | not null | default now()
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add fetchedAt column and SystemMeta table

- BitcoinPrice.fetchedAt: when this row was last refreshed from
  external API (used by lazy-refresh cooldown in PR2)
- SystemMeta: key-value singleton store for cron heartbeat
- Bootstrap INSERT seeds lastSuccessfulCronAt with epoch 0 so
  the staleness recovery code (PR2) never sees null on fresh DB
  (spec §4.2 / D11)"
```

---

## Task 4: Update Build Script with Safe Migrate Gating

**Files:**
- Modify: `package.json`

**Why:** Per D13 / red-team #3, the build script must run `prisma migrate deploy` when `DATABASE_URL` is set, but skip cleanly when it isn't (preview deploys without per-PR DBs would otherwise crash).

- [ ] **Step 1: Update the `build` script in `package.json`**

Locate the existing `"build"` line. Replace its value with:

```json
"build": "prisma generate && (test -n \"$DATABASE_URL\" && prisma migrate deploy || echo 'No DATABASE_URL — skipping migrate deploy') && next build",
```

Note: this uses POSIX shell. Vercel's build environment is Linux, so this works on the build server. Local Windows users running `pnpm build` should use Git Bash or WSL (already required for the existing build:vercel pattern).

- [ ] **Step 2: Verify build works locally with DATABASE_URL set**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" pnpm build
```

Expected: build completes; output includes:
- `✔ Generated Prisma Client`
- `Applying migration ...` (or `No pending migrations to apply`)
- Next.js build summary

- [ ] **Step 3: Verify build also works WITHOUT DATABASE_URL set (simulating preview)**

Run:
```bash
unset DATABASE_URL
pnpm build
```

Expected: build completes; output includes:
- `✔ Generated Prisma Client`
- `No DATABASE_URL — skipping migrate deploy`
- Next.js build summary

If `prisma generate` itself fails when `DATABASE_URL` is unset (it shouldn't — generation only needs the schema file), wrap it the same way: `(prisma generate || echo 'prisma generate skipped')`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build: gate prisma migrate deploy on DATABASE_URL

Per spec D13 / red-team #3. Prevents preview deploys without per-PR
DBs from crashing the build. When DATABASE_URL is set, migrations
apply normally; when unset, build proceeds with a clear log line."
```

---

## Task 5: Extract Canonical `HistoricalDataPoint` Type

**Files:**
- Modify: `src/modules/price-data/types/index.ts` — Ensure canonical definition exists

**Why:** `HistoricalDataPoint` is currently exported from `lib/services/centralized-data-service.ts:19-28` and re-imported by ~17 production files. PR4 will delete `centralized-data-service.ts`. We need the type living somewhere stable so PR4 doesn't break compilation.

- [ ] **Step 1: Read the current type definition to ensure parity**

Run:
```bash
grep -A 12 "interface HistoricalDataPoint" lib/services/centralized-data-service.ts
```

Expected output (record it for the next step):
```typescript
export interface HistoricalDataPoint {
  time: number        // Unix timestamp in seconds (for chart compatibility)
  date: string        // YYYY-MM-DD format
  open: number        // Opening price in USD
  high: number        // Highest price in USD
  low: number         // Lowest price in USD
  close: number       // Closing price in USD
  volume?: number     // Optional volume data
  source?: string     // Data source identifier
}
```

- [ ] **Step 2: Check what's already in the canonical types file**

Run:
```bash
grep -n "HistoricalDataPoint\|CurrentPriceData" src/modules/price-data/types/index.ts
```

If `HistoricalDataPoint` already appears with the same shape, skip to Step 4. If the shape differs or it's absent, continue to Step 3.

- [ ] **Step 3: Ensure `HistoricalDataPoint` and `CurrentPriceData` exist with the canonical shape**

Open `src/modules/price-data/types/index.ts`. If `HistoricalDataPoint` is missing or differs from the shape captured in Step 1, add (or replace) with this exact definition near the top:

```typescript
/**
 * Canonical historical price point. Produced by the data layer (DB-backed in PR2+).
 * Imported by chart components, price models, and strategy services.
 */
export interface HistoricalDataPoint {
  time: number        // Unix timestamp in seconds (for chart compatibility)
  date: string        // YYYY-MM-DD format
  open: number        // Opening price in USD
  high: number        // Highest price in USD
  low: number         // Lowest price in USD
  close: number       // Closing price in USD
  volume?: number     // Optional volume data
  source?: string     // Data source identifier
}

/**
 * Current price snapshot (returned by /api/bitcoin-prices endpoint in PR2).
 */
export interface CurrentPriceData {
  price: number
  timestamp: number
  source: string
  lastUpdated: string
}
```

- [ ] **Step 4: Run type-check to confirm no regressions**

Run:
```bash
pnpm type-check
```

Expected: same number of TypeScript errors as before this task (we haven't moved any imports yet — that's Task 6). If new errors appear, the canonical shape diverges from the existing one — re-check Step 1.

- [ ] **Step 5: Commit**

```bash
git add src/modules/price-data/types/index.ts
git commit -m "types: ensure canonical HistoricalDataPoint in price-data module

PR4 will delete lib/services/centralized-data-service.ts which
currently exports HistoricalDataPoint to ~17 files. Locking the
canonical definition in src/modules/price-data/types/ now lets
the consumer migration in Task 6 land safely."
```

---

## Task 6: Migrate All Consumer Imports to Canonical Type Location

**Files:**
- Modify (~17 production + ~12 test files): every file importing `HistoricalDataPoint` from `@/lib/services/centralized-data-service`

**Why:** Get all consumers off the path that PR4 will delete, but without changing any runtime behavior. After this task, `centralized-data-service.ts` is no longer referenced for the type — only for its singleton.

- [ ] **Step 1: Generate the authoritative consumer list**

Run:
```bash
grep -rln "HistoricalDataPoint" --include="*.ts" --include="*.tsx" \
  src/ app/ lib/ __tests__/ | grep -v "node_modules\|\.next\|generated"
```

Save the output. Each file in this list either defines or imports `HistoricalDataPoint`. The ones we update are those that *import* it from `centralized-data-service`. To narrow:

```bash
grep -rln "import.*HistoricalDataPoint.*centralized-data-service\|from ['\"]@/lib/services/centralized-data-service['\"]" \
  --include="*.ts" --include="*.tsx" src/ app/ lib/ __tests__/ | grep -v "node_modules\|\.next\|generated"
```

This is your work list. Expect ~17 production + ~12 test files (matching spec §5.5).

- [ ] **Step 2: For each file in the work list, update the import**

For each file, change one of these patterns:

**Pattern A** (type-only import):
```typescript
import type { HistoricalDataPoint } from '@/lib/services/centralized-data-service'
```
→
```typescript
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'
```

**Pattern B** (mixed import — type plus the singleton):
```typescript
import { centralizedDataService, type HistoricalDataPoint } from '@/lib/services/centralized-data-service'
```
→
```typescript
import { centralizedDataService } from '@/lib/services/centralized-data-service'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'
```

**Pattern C** (also imports `CurrentPriceData` or `DataServiceState`):
For `CurrentPriceData`, point to `@/src/modules/price-data/types`. For `DataServiceState`, leave the import on `centralized-data-service` for now (it's a service-internal type that goes away with the service in PR4).

Do NOT change:
- The file `lib/services/centralized-data-service.ts` itself (it still defines and re-exports the types — that's fine for backwards compat)
- `src/modules/price-data/types/index.ts` (it's the new canonical home)

- [ ] **Step 3: Run type-check after each batch**

After updating, say, 5 files, run:
```bash
pnpm type-check
```

Expected: no new TypeScript errors. If the error count grows, you swapped a runtime import for a type-only one (or vice versa) — check the file.

- [ ] **Step 4: Run the full test suite to confirm no behavioral regression**

Run:
```bash
pnpm test
```

Expected: same pass/fail count as before this PR. If any test newly fails because of an import change, investigate that specific file — we're not allowed behavioral changes in PR1.

- [ ] **Step 5: Final verification — confirm only the type re-export remains in centralized-data-service**

Run:
```bash
grep -rln "HistoricalDataPoint.*from.*centralized-data-service" \
  --include="*.ts" --include="*.tsx" src/ app/ lib/ __tests__/ \
  | grep -v "lib/services/centralized-data-service.ts" \
  | grep -v "node_modules\|\.next\|generated"
```

Expected: empty output. Every consumer now imports from `@/src/modules/price-data/types`.

- [ ] **Step 6: Commit (split if helpful)**

If the diff is large (it might touch ~30 files), split into 2-3 commits by area (e.g., one for `app/simulation/price-models/`, one for `src/modules/strategies/`, one for everything else). Otherwise:

```bash
git add -A
git commit -m "refactor(types): move HistoricalDataPoint imports to canonical location

All ~17 production + ~12 test consumers now import HistoricalDataPoint
from @/src/modules/price-data/types instead of from
@/lib/services/centralized-data-service. The latter still exports the
type (backwards compat) — its full deletion is in PR4. No runtime
behavior change.

Generated and verified via:
  grep -rln 'HistoricalDataPoint.*centralized-data-service' src/ app/ lib/"
```

---

## Task 7: Write Tests for `seed-from-coingecko.ts`

**Files:**
- Create: `scripts/__tests__/seed-from-coingecko.test.ts`

**Why:** TDD. The seed runs against production once and is hard to debug after the fact, so its parsing/idempotency/error-handling logic is exactly the kind of thing tests should pin down.

- [ ] **Step 1: Create the test file with the first failing test (response parsing)**

```typescript
// scripts/__tests__/seed-from-coingecko.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We import from the script we're about to write. This import will
// fail until Task 8 creates the file — that's the failing-test step.
import {
  parseCoinGeckoResponse,
  isSeedNeeded,
  seedFromCoinGecko,
  type CoinGeckoMarketChartResponse,
} from '../seed-from-coingecko'

describe('parseCoinGeckoResponse', () => {
  it('converts CoinGecko [ms_timestamp, price] tuples into BitcoinPrice rows', () => {
    const response: CoinGeckoMarketChartResponse = {
      prices: [
        [1383264000000, 196.93],   // 2013-11-01
        [1383350400000, 209.37],   // 2013-11-02
      ],
      market_caps: [],
      total_volumes: [
        [1383264000000, 1234567],
        [1383350400000, 2345678],
      ],
    }

    const rows = parseCoinGeckoResponse(response, 'coingecko')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      date: '2013-11-01',
      timestamp: 1383264000000,
      close: 196.93,
      // Open/high/low default to close when CoinGecko gives only close
      open: 196.93,
      high: 196.93,
      low: 196.93,
      volume: 1234567,
      source: 'coingecko',
    })
    expect(rows[1].date).toBe('2013-11-02')
    expect(rows[1].close).toBe(209.37)
  })

  it('handles missing volumes gracefully (volume = null)', () => {
    const response: CoinGeckoMarketChartResponse = {
      prices: [[1383264000000, 196.93]],
      market_caps: [],
      total_volumes: [],
    }

    const rows = parseCoinGeckoResponse(response, 'coingecko')
    expect(rows[0].volume).toBeNull()
  })

  it('throws on a malformed response (missing prices array)', () => {
    expect(() =>
      parseCoinGeckoResponse({} as CoinGeckoMarketChartResponse, 'coingecko'),
    ).toThrow(/prices/i)
  })
})

describe('isSeedNeeded', () => {
  it('returns true when bitcoin_prices is empty', async () => {
    const mockPrisma = {
      bitcoinPrice: { count: vi.fn().mockResolvedValue(0) },
    } as any

    expect(await isSeedNeeded(mockPrisma)).toBe(true)
  })

  it('returns false when bitcoin_prices has any rows (idempotency guard)', async () => {
    const mockPrisma = {
      bitcoinPrice: { count: vi.fn().mockResolvedValue(1) },
    } as any

    expect(await isSeedNeeded(mockPrisma)).toBe(false)
  })
})

describe('seedFromCoinGecko (orchestration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('skips when DB already has rows', async () => {
    const mockPrisma = {
      bitcoinPrice: {
        count: vi.fn().mockResolvedValue(4400),
        createMany: vi.fn(),
      },
      systemMeta: { upsert: vi.fn() },
    } as any
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await seedFromCoinGecko(mockPrisma)

    expect(result.skipped).toBe(true)
    expect(result.reason).toMatch(/already has data/i)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockPrisma.bitcoinPrice.createMany).not.toHaveBeenCalled()
  })

  it('fetches, parses, and bulk-inserts when DB is empty', async () => {
    const mockResponse: CoinGeckoMarketChartResponse = {
      prices: [[1383264000000, 196.93]],
      market_caps: [],
      total_volumes: [[1383264000000, 1234567]],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }),
    )
    const mockPrisma = {
      bitcoinPrice: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      systemMeta: { upsert: vi.fn().mockResolvedValue({}) },
    } as any

    const result = await seedFromCoinGecko(mockPrisma)

    expect(result.skipped).toBe(false)
    expect(result.rowsInserted).toBe(1)
    expect(mockPrisma.bitcoinPrice.createMany).toHaveBeenCalledOnce()
    expect(mockPrisma.systemMeta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'lastSeedRunAt' } }),
    )
  })

  it('throws when fetch fails (so caller exits non-zero)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    )
    const mockPrisma = {
      bitcoinPrice: { count: vi.fn().mockResolvedValue(0), createMany: vi.fn() },
      systemMeta: { upsert: vi.fn() },
    } as any

    await expect(seedFromCoinGecko(mockPrisma)).rejects.toThrow(/503|Service Unavailable/)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail with the right error**

Run:
```bash
pnpm test scripts/__tests__/seed-from-coingecko.test.ts
```

Expected: ALL fail with module-not-found errors like:
```
Failed to resolve import "../seed-from-coingecko"
```

If any tests pass, the script already exists somewhere — reconcile before continuing.

- [ ] **Step 3: Commit the failing tests**

```bash
git add scripts/__tests__/seed-from-coingecko.test.ts
git commit -m "test(seed): failing tests for seed-from-coingecko

TDD step 1: write failing tests for the script before implementing.
Covers response parsing, idempotency guard, fetch-success path,
and fetch-failure error propagation."
```

---

## Task 8: Implement `scripts/seed-from-coingecko.ts`

**Files:**
- Create: `scripts/seed-from-coingecko.ts`

- [ ] **Step 1: Create the script file**

```typescript
// scripts/seed-from-coingecko.ts
//
// One-shot seed: pulls full Bitcoin OHLC daily history from CoinGecko's
// /coins/bitcoin/market_chart/range endpoint and bulk-inserts into Postgres.
// Idempotent: skips if bitcoin_prices already has any rows.
//
// Usage:
//   pnpm db:seed
//
// Spec: docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md §5.3
//
import { PrismaClient } from '@/lib/generated/prisma'

// === Types ===

export interface CoinGeckoMarketChartResponse {
  prices: Array<[number, number]>         // [timestamp_ms, price_usd]
  market_caps: Array<[number, number]>
  total_volumes: Array<[number, number]>  // [timestamp_ms, volume_usd]
}

export interface ParsedRow {
  date: string         // YYYY-MM-DD
  timestamp: bigint
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  source: string
}

export interface SeedResult {
  skipped: boolean
  reason?: string
  rowsInserted: number
  durationMs: number
}

// === Pure functions (testable without a DB) ===

/**
 * Parse a CoinGecko market_chart response into BitcoinPrice rows.
 * Free-tier CoinGecko gives only close prices; open/high/low default to close.
 */
export function parseCoinGeckoResponse(
  response: CoinGeckoMarketChartResponse,
  source: string,
): ParsedRow[] {
  if (!response || !Array.isArray(response.prices)) {
    throw new Error('Malformed CoinGecko response: prices array missing')
  }

  // Build a volume lookup keyed by timestamp_ms for O(1) access
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
 * Check whether the seed should run. Returns false if bitcoin_prices
 * has any rows (idempotency guard — never overwrites existing data).
 */
export async function isSeedNeeded(
  prisma: Pick<PrismaClient, 'bitcoinPrice'>,
): Promise<boolean> {
  const count = await prisma.bitcoinPrice.count()
  return count === 0
}

// === Orchestration (uses fetch + DB) ===

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range' +
  '?vs_currency=usd&from=1383264000&to=' + Math.floor(Date.now() / 1000)
//   ^ from = 2013-11-01 (CoinGecko's earliest reliable BTC data)
//   ^ to   = now (in seconds)

export async function seedFromCoinGecko(
  prisma: Pick<PrismaClient, 'bitcoinPrice' | 'systemMeta'>,
): Promise<SeedResult> {
  const start = Date.now()

  if (!(await isSeedNeeded(prisma))) {
    return {
      skipped: true,
      reason: 'bitcoin_prices already has data',
      rowsInserted: 0,
      durationMs: Date.now() - start,
    }
  }

  console.log('📡 Fetching full BTC history from CoinGecko...')
  const res = await fetch(COINGECKO_URL)
  if (!res.ok) {
    throw new Error(
      `CoinGecko fetch failed: HTTP ${res.status} ${res.statusText}`,
    )
  }

  const json = (await res.json()) as CoinGeckoMarketChartResponse
  const rows = parseCoinGeckoResponse(json, 'coingecko')
  console.log(`📊 Parsed ${rows.length} rows; bulk-inserting...`)

  // Prisma's createMany is fastest; chunk if dataset is large
  const CHUNK = 1000
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const result = await prisma.bitcoinPrice.createMany({
      data: slice,
      skipDuplicates: true,
    })
    inserted += result.count
  }

  await prisma.systemMeta.upsert({
    where: { key: 'lastSeedRunAt' },
    update: { value: new Date().toISOString() },
    create: { key: 'lastSeedRunAt', value: new Date().toISOString() },
  })

  return {
    skipped: false,
    rowsInserted: inserted,
    durationMs: Date.now() - start,
  }
}

// === CLI entry point ===

async function main() {
  const prisma = new PrismaClient()
  try {
    const result = await seedFromCoinGecko(prisma)
    if (result.skipped) {
      console.log(`✅ Seed skipped: ${result.reason}`)
    } else {
      console.log(
        `✅ Seed complete: ${result.rowsInserted} rows in ${result.durationMs}ms`,
      )
    }
  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Only auto-run when invoked directly (not when imported by tests)
if (require.main === module) {
  main()
}
```

- [ ] **Step 2: Run the tests to confirm they all pass**

Run:
```bash
pnpm test scripts/__tests__/seed-from-coingecko.test.ts
```

Expected: all tests pass. If `parseCoinGeckoResponse` shape mismatches, adjust the test or the function until both align — but DO NOT change the public interface that the tests pin down.

- [ ] **Step 3: Run the full test suite to confirm no other tests broke**

```bash
pnpm test
```

Expected: same pass/fail count as before this PR (any pre-existing failures are out of scope).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-from-coingecko.ts
git commit -m "feat(seed): implement CoinGecko OHLC seed script

- Pure functions parseCoinGeckoResponse + isSeedNeeded for testability
- Orchestration seedFromCoinGecko handles fetch + bulk insert + meta
- Idempotency guard: skips if bitcoin_prices already has data
- Bulk insert chunked at 1000 rows
- Records lastSeedRunAt in system_meta on success
- CLI entry: pnpm db:seed (wired in next task)"
```

---

## Task 9: Wire the New Seed Script and Delete the Old One

**Files:**
- Modify: `package.json` (`db:seed` and `prisma.seed` script paths)
- Delete: `prisma/seed.ts`

- [ ] **Step 1: Confirm the old `prisma/seed.ts` exists and reads from CSV**

Run:
```bash
head -10 prisma/seed.ts
```

Expected: the file exists and references `btc-price-history.csv`. Confirm it's the obsolete CSV-based seed.

- [ ] **Step 2: Update `package.json` script paths**

In `package.json`, find:
```json
"db:seed": "tsx prisma/seed.ts",
```
Change to:
```json
"db:seed": "tsx scripts/seed-from-coingecko.ts",
```

Find the `"prisma"` block:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
},
```
Change to:
```json
"prisma": {
  "seed": "tsx scripts/seed-from-coingecko.ts"
},
```

- [ ] **Step 3: Delete the old seed file**

```bash
git rm prisma/seed.ts
```

- [ ] **Step 4: Verify pnpm scripts still resolve**

Run:
```bash
pnpm run
```

Expected: the output lists `db:seed` and `db:reset` among the available scripts. No error about a missing file.

- [ ] **Step 5: Commit**

```bash
git add package.json prisma/seed.ts
git commit -m "feat(seed): switch db:seed to scripts/seed-from-coingecko.ts

Per spec D15. The old prisma/seed.ts read public/btc-price-history.csv,
which is being deleted in PR5. Repointing now (PR1) prevents pnpm
db:seed and prisma's auto-seed mechanism from referring to a
to-be-deleted file."
```

---

## Task 10: Run Seed Locally and Verify

**Files:** None modified — verification only.

- [ ] **Step 1: Reset local DB to a known-clean state**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" \
  pnpm prisma migrate reset --force --skip-seed
```

Expected: migrations re-apply; `bitcoin_prices` table is empty.

- [ ] **Step 2: Run the seed**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" \
  pnpm db:seed
```

Expected output:
```
📡 Fetching full BTC history from CoinGecko...
📊 Parsed N rows; bulk-inserting...
✅ Seed complete: N rows in Mms
```

Where N is in the ballpark of 4,400 (CoinGecko returns one row per day from 2013-11-01).

If you hit a CoinGecko rate limit (HTTP 429), wait 60 seconds and retry. The free tier allows 30 req/min and we make exactly 1 request.

- [ ] **Step 3: Verify row count, date range, and ATH**

Run:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "
SELECT
  COUNT(*) AS rows,
  MIN(date) AS earliest,
  MAX(date) AS latest,
  MAX(high) AS ath_high,
  MAX(close) AS ath_close
FROM bitcoin_prices;"
```

Expected:
- `rows` ≈ 4,400 ± 50 (depends on exact day CoinGecko returns through)
- `earliest` ≈ `2013-11-01`
- `latest` ≈ today's date or yesterday
- `ath_high` should be a reasonable current ATH value (well above the stale `124277.98`)
- `ath_close` should be ≤ `ath_high` (since high ≥ close on any day)

Note: free-tier CoinGecko returns only `close` for daily granularity, so we set `open == high == low == close` (per the script). Real OHLC will differ once PR2's `PriceUpdater` starts writing fresh rows. That's fine — we'll backfill if needed later.

- [ ] **Step 4: Verify `system_meta` was updated**

Run:
```bash
docker exec btc-sim-postgres psql -U postgres -d btc_sim -c "
SELECT key, value FROM system_meta;"
```

Expected:
```
        key            |             value
-----------------------+-------------------------
 lastSuccessfulCronAt  | 1970-01-01T00:00:00.000Z
 lastSeedRunAt         | 2026-...
```

- [ ] **Step 5: Verify the seed is idempotent — re-run it**

Run:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/btc_sim?schema=public" \
  pnpm db:seed
```

Expected:
```
✅ Seed skipped: bitcoin_prices already has data
```

- [ ] **Step 6: No commit needed (verification-only task)**

---

## Task 11: Provision Vercel Postgres (Manual)

**Files:** None — this is a Vercel dashboard checklist.

This is the only task in PR1 that you can't fully automate. Walk through the dashboard, then verify with curl.

- [ ] **Step 1: Create the Vercel Postgres database**

In the Vercel dashboard:
1. Go to your project → `Storage` tab → `Create Database`
2. Choose `Postgres` (Neon-backed)
3. Region: pick the closest to your primary user base (likely `iad1` or `fra1`)
4. Database name: `btc-sim-prod` (or similar)
5. Click `Create`

Vercel will automatically inject a `DATABASE_URL` env var into the project. Verify by going to `Settings` → `Environment Variables` and confirming `DATABASE_URL` is present in the `Production` environment.

- [ ] **Step 2: Add `CRON_SECRET` env var (PR2 will use it)**

Generate a random secret:
```bash
openssl rand -hex 32
```

In `Settings` → `Environment Variables`, add:
- Name: `CRON_SECRET`
- Value: (the generated hex string)
- Environments: `Production`, `Preview`, `Development`

This is unused in PR1 but required to be present so PR2's deploy doesn't fail.

- [ ] **Step 3: (Optional) Enable Neon branch-per-PR for previews**

In the Storage tab → your Postgres → `Settings`, look for the `Connect` toggle for Vercel preview deployments. Enabling it gives each PR its own ephemeral DB. If unavailable on your plan, leave disabled — the build script (Task 4) will skip migrations in previews.

- [ ] **Step 4: Verify `DATABASE_URL` connectivity from the Vercel CLI (optional)**

Locally:
```bash
pnpm dlx vercel env pull .env.production.local
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2- | tr -d '"') \
  pnpm prisma migrate status
```

Expected: prisma reports the database is up to date or no migrations have been applied (depending on whether PR1 has deployed yet).

If you don't want to use the Vercel CLI, skip this step — the next task will exercise the prod DB.

- [ ] **Step 5: No commit needed**

---

## Task 12: Deploy PR1 and Verify Nothing Broke

**Files:** None modified — deploy + smoke test.

- [ ] **Step 1: Push the branch and open the PR**

```bash
git push -u origin <your-branch-name>
gh pr create --title "PR1: Bitcoin price data refactor — foundation" \
  --body "$(cat <<'EOF'
## Summary

PR1 of 5 implementing the price data refactor designed in
`docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`.
This PR is **additive only** — no user-visible behavior changes.

## Changes

- Local Postgres dev environment via docker-compose
- First real Prisma migration (init from existing schema)
- New `fetchedAt` column on `BitcoinPrice` and `SystemMeta` table
  with bootstrap row
- Build script gates `prisma migrate deploy` on `DATABASE_URL`
  being set (fixes preview deploys)
- Canonical `HistoricalDataPoint` type in `src/modules/price-data/types/`
  (consumers updated; old re-export remains for compat — full deletion in PR4)
- New `scripts/seed-from-coingecko.ts` with tests; old `prisma/seed.ts` removed
- Vercel Postgres provisioned with `DATABASE_URL` and `CRON_SECRET` env vars

## Test plan

- [x] Local docker postgres + migrations + seed verified
- [x] Type-check passes
- [x] Test suite at parity with main (no new failures)
- [ ] Vercel preview build succeeds (cold deploy)
- [ ] After merge: prod deploy applies migrations, app continues to
      use static JSON path, ATH still shows the (stale) `124277.98`
EOF
)"
```

- [ ] **Step 2: Watch the preview build and verify it completes**

In the GitHub PR or Vercel dashboard, wait for the preview deploy.

Expected build log includes one of:
- `Applying migration "..._init"` and `Applying migration "..._add_fetched_at_and_system_meta"` (if Neon branch-per-PR is enabled), OR
- `No DATABASE_URL — skipping migrate deploy` (if previews don't have a DB)

If the build fails on `prisma migrate deploy`, return to Task 4 and verify the gating syntax is correct for the Vercel build environment.

- [ ] **Step 3: Smoke-test the deployed preview**

Open the preview URL. Navigate to `/simulation`. Verify:
- Page loads
- Parameter cards render
- The (still-stale) ATH banner shows `$124,278` — unchanged
- No new console errors related to imports (check browser DevTools)

If the ATH banner shows anything different from `$124,278`, you've accidentally introduced behavior change in PR1 — investigate.

- [ ] **Step 4: Merge to main**

Once preview is green and you've smoke-tested, merge.

- [ ] **Step 5: Verify the production deploy applies migrations**

Watch the production deploy log. Expected:
```
Applying migration "..._init"
Applying migration "..._add_fetched_at_and_system_meta"
The following migration(s) have been applied:
  - 2026..._init
  - 2026..._add_fetched_at_and_system_meta
```

- [ ] **Step 6: Run the production seed**

The seed has to run once against the prod DB. Two options:

**Option A — local script with prod URL (simpler):**
```bash
pnpm dlx vercel env pull .env.production.local
DATABASE_URL=$(grep ^DATABASE_URL .env.production.local | cut -d= -f2- | tr -d '"') \
  pnpm db:seed
```

**Option B — temporary one-shot script in the repo:**
Skip — Option A is cleaner.

Expected: same output as Task 10 Step 2.

- [ ] **Step 7: Verify prod row count**

Connect to prod via the Vercel dashboard's `Query` tab (or via Option A above) and run:
```sql
SELECT COUNT(*) AS rows, MIN(date) AS earliest, MAX(date) AS latest,
       MAX(high) AS ath_high
FROM bitcoin_prices;
```

Expected: ~4,400 rows, earliest 2013-11-01, latest near today, `ath_high` is the real current ATH value.

- [ ] **Step 8: Final smoke test on production**

Open `firehodl.com/simulation` (or the production domain). Confirm the app still works exactly as before — the ATH banner still shows the stale `$124,278` (because nothing reads from the new DB yet — that's PR4).

- [ ] **Step 9: Done — PR1 merged. Ready for PR2.**

---

## Self-Review Checklist

Run through this before marking the plan ready for execution:

**Spec coverage** (every PR1 deliverable in §10 has a task):
- [x] Provision Vercel Postgres → Task 11
- [x] Set `DATABASE_URL`, `CRON_SECRET` → Task 11
- [x] Local docker-compose Postgres → Task 1
- [x] Build script with DATABASE_URL gating (D13) → Task 4
- [x] `vercel.json` legacy hack removal — *deferred to PR2* (the cron block change happens then; touching vercel.json now means re-touching it, so combined)
- [x] Init migration → Task 2
- [x] `fetchedAt` + `SystemMeta` migration with bootstrap row (D11, §4.2) → Task 3
- [x] `HistoricalDataPoint` extracted (D15) → Tasks 5+6
- [x] Update `db:seed` and `prisma.seed` paths → Task 9
- [x] Delete old `prisma/seed.ts` → Task 9
- [x] Run seed against prod, verify row count and ATH → Tasks 10 + 12

**Placeholder scan:** No "TBD", "TODO", "implement later", or vague steps. Each step has explicit code/commands/expected output.

**Type consistency:** `HistoricalDataPoint` shape in Task 5 matches existing definition in `lib/services/centralized-data-service.ts`. `ParsedRow` shape in Task 8 matches the `BitcoinPrice` Prisma model fields. `SeedResult` shape in Task 7 tests matches the implementation in Task 8.

**Note on `vercel.json`:** the spec lists removing the `installCommand` legacy-peer-deps hack as a PR1 item, but PR1 doesn't add the cron block (that's PR2). Touching `vercel.json` once in PR2 is cleaner than twice. If you want it in PR1, add a 1-step task between Task 4 and Task 5 to edit `vercel.json` to:
```json
{ "framework": "nextjs" }
```

---

## What Comes After PR1

After PR1 is merged and the production seed has populated the DB:

- **PR2** — Build `PriceStore`/`PriceSource`/`PriceUpdater`, the read endpoint, the cron endpoint, `vercel.json` cron block, GH Action workflow. Smoke-test in production. (App still uses static JSON.)
- **PR3** — Replace mocks in `PriceDataService.ts` with real `fetch('/api/bitcoin-prices')`. Rewrite `usePriceData()` as SWR hook. Old code paths still functional.
- **PR4** — Cut over consumers, remove the four `124277.98` fallbacks, rotate API keys.
- **PR5** — Delete the ~45 dead files.

I'll write Plan 2 (PR2) once PR1 is merged and verified.
