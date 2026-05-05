# Improvement Suggestions Backlog

Running list of project-improvement findings surfaced by implementer/reviewer agents during the PR1 (Foundation) work. **Not actionable in PR1** — these are flagged for separate cleanup PRs after the price-data refactor lands.

Format: each item lists who flagged it, when, where, and a short description. Severity is the flagger's call.

---

## 2026-05-05 — PR4 Findings (UI cut-over)

### 🟡 Important: `refresh()` doesn't bypass 5-min cooldown (spec divergence)

`BasicParametersCard.handleLoadCurrentPrice` calls SWR's `refresh()` (= `mutate()`), which re-fetches `/api/bitcoin-prices` but does NOT pass `?refresh=force`. Server-side will return cached value if within the 5-min cooldown. Plan called for `?refresh=force`. Not a regression (matches old behavior) but UX nit: button looks like it does nothing if clicked twice quickly.

**Fix options:**
- Add a `forceRefresh` action to `usePriceData` hook that fetches `/api/bitcoin-prices?refresh=force` then mutates the SWR cache key
- Or: make BasicParametersCard do a direct `fetch('/api/bitcoin-prices?refresh=force')` then `refresh()`

Either approach is ~5 lines. Defer to fast-follow PR or PR5.

### Three stale-fallback magic numbers still in production code (Minor)

PR4 removed 3 of 4 hardcoded `$124,277.98` fallbacks. There are still:
- `app/simulation/hooks/useATH.ts:28` — `useState<number>(124277.98)` — file is dead code (PR5 deletes it), but until then technically reachable if someone re-imports `useATH`
- `app/simulation/tabs/parameters/ATHAlert.tsx:36` — `currentPriceData?.value || 114209` — same anti-pattern, different magic number, applies to currentPrice
- `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx:100` — `125000` ATH placeholder during loading

PR4's premise was "no silent wrong numbers." Replace these with skeletons/loading states. Easy follow-up.

### Adapter duplication 3x (PR5 cleanup)

`PricePoint → HistoricalDataPoint` adapter is byte-identical in three files (SimulationPage, UnifiedPriceChart, PriceProjectionChart). PR5 either deletes the legacy `HistoricalDataPoint` type and removes the adapters, or extracts a shared utility.

### Unused `useEffect` import in ATHAlert.tsx (Trivial)

Line 3 imports `useEffect` but never uses it post-migration. Trivial cleanup.

### Stale JSDoc in ATHAlert.tsx (Trivial)

Lines 22-23 say "This component now relies on DataServiceProvider for data initialization" — no longer accurate (DataServiceProvider is now a pass-through, this component reads from `usePriceData()` directly). Update during PR5 docs sweep.

### `useCalculations` ATH placeholder (Defer)

`calculationsService.ts:800` still uses `params.initialBtcPrice` as ATH placeholder. Anywhere a component reads `liquidationData.athMetrics` from `useCalculations()` rather than calling the service directly with real ATH gets the wrong value (collapses to 0% drop). ATHAlert + PriceDropToleranceCard already bypass this hook for ATH; if any future component uses it for ATH-derived metrics, threading `usePriceData().ath` through `useCalculationsIntegration` is the right fix.

### Dead `chart-integration.test.tsx` in src/components/__tests__/ (Trivial)

Reviewer noted: imports `app/simulation/components/charts/*` paths that don't exist in this repo. The file is dead — it'll never run. Delete during PR5 cleanup.

### Bridge co-location (Defer)

`<PriceDataBridge />` is render-positional inside `SimulationPage.tsx`. Easy to drop accidentally. Consider lifting into a dedicated `<SimulationContextSync>` next to the SWR setup so accidental tree changes don't silently disable the bridge.

### `act()` warnings in UnifiedPriceChart-migration.test.tsx (Trivial)

State updates inside `useEffect` during initial render cause non-fatal warnings. Tests still pass; wrap rerenders in `act()` for cleanliness.

---

## 2026-05-05 — PR3 Findings

### 🟡 MUST address in PR4 or PR5: `ATHData` interface duplicated

PR3 added `ATHData` to `src/modules/price-data/types/index.ts` to satisfy the DataServiceState reconciliation. The legacy definition in `lib/services/ath-service.ts` is byte-identical. PR5 deletes the legacy file; until then, consider re-exporting one from the other or adding cross-link TODO comments to make divergence visible. Drift risk is low (the shape is stable) but real.

### 🟡 PR4 migration is NOT a pure import-path swap (clarify in PR4 plan)

The new `usePriceData()` returns:
- `ath: { value: number } | null` — no nested `meta`/`ath` structure
- `currentPrice: { value: number; fetchedAt: string } | null` — not a number, not legacy `CurrentPriceData`
- `prices: PricePoint[]` — not `historicalData`; no `time` (unix seconds), no `volume`, no `source` fields

ATHAlert / BasicParametersCard / UnifiedPriceChart / HistoricalDataChart will need real code changes (destructuring + property access), not just import-path edits. Reviewers should expect more than a 30-line PR4 diff. Worth flagging in the PR4 plan.

### Stale JSDoc + comment (Minor)

- `src/modules/price-data/index.ts:20` shows the pre-PR3 hook return shape (`{historicalData, currentPrice, isLoading}`). Update during PR4.
- `src/modules/__tests__/phase-2-integration.test.ts:74-76` has a stale `// Note: usePriceData hook test removed due to infinite loop in test environment` comment — that bug is exactly what PR3's SWR rewrite fixed. Re-add a smoke test or delete the comment.

### `README.md` and `API.md` inside `src/modules/price-data/` likely document old hook (Minor)

Not touched in PR3. Will mislead PR4 implementers if they describe the 200-line class-wrapper hook return shape. Sweep + update during PR4 consumer migration.

### `getCurrentPrice` ignores the `ath` field of the response (Defer)

The unified API response includes `ath`, but `PriceDataService.getCurrentPrice()` only returns `currentPrice.value`. No consumer needs it post-PR4 (consumers go through the SWR hook), but the asymmetry is worth noting if a non-React server-side caller ever needs ATH from the service.

### `prisma migrate deploy` runs against prod even on local builds (Minor)

Flagged by Task 8 implementer. The build script gates on `DATABASE_URL` being set, but `.env.local` (pulled from Vercel) sets it to the prod URL. Result: `pnpm build` locally hits prod. Consider gating to only run in CI or behind an explicit flag — local builds shouldn't touch prod migrations.

### Vercel SSO blocks programmatic preview smoke-tests (Defer)

Every preview deployment returns HTTP 401 from Vercel SSO. This makes `curl`-based verification of `/api/*` and `/simulation` impossible without SSO bypass tokens. Same trap hit PR1+PR2. Either disable Deployment Protection on previews or document the bypass header for future smoke tests.

### Production-grade emoji console logs (Defer)

`PriceDataService.ts` has emoji-prefixed `console.log` calls (📊, 📡, ✅, 💰, ❌) that fire in browser + server logs without an env gate. Pre-existing from earlier work, not introduced by PR3, but worth a project-wide logging-policy pass.

---

## 2026-05-05 — PR2 Findings

### 🔴 MUST FIX before next PR: promote DATABASE_URL/DIRECT_URL to all-preview-branches scope

Bit us TWICE now — PR1 build failed because env vars were branch-scoped to a non-existent branch; PR2 build failed because the env vars were scoped only to `feature/pr1-foundation` and didn't inherit. Each new feature branch will hit this until the env vars are added with the "all preview branches" scope (no branch parameter).

**Action:** in Vercel dashboard → Project Settings → Environment Variables → for each of `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `COINCAP_API_KEY`, `COINDESK_API_KEY`: ensure they're set for `Preview` without a specific git-branch filter. Existing branch-scoped entries can stay or be deleted.

This needs to happen BEFORE PR3's first push or that build will fail too.

### `experimental.after` flag is no longer needed in Next.js 15.5+

Both PR2's build log and dev log warn:
```
The experimental.after option is now stable and the experimental flag is no longer needed.
```
Set in `next.config.mjs` during Task 1 (`633d120`). Remove in PR3 cleanup. (Spec D12 was correct for older Next.js but the project is now on 15.5.15 where it's automatic.)

### Old `/api/bitcoin-prices/*` routes instantiate Prisma at module load

Already flagged in PR1 (build failed for the same reason). The 7 nested old routes (current/historical/stats/update/daily-update/comprehensive-gap-fill/regenerate-json) all do `new PrismaClient()` at module top, so any preview build without `DATABASE_URL` scoped to that branch crashes during "Collecting page data". PR5 deletes them; in the meantime, the env-var scoping fix above is the workaround.

### `vercel curl` + protection-bypass for POST is broken (Minor)

PR2's deployed cron endpoint couldn't be smoke-tested via `vercel curl --deployment ... -X POST` — the auto-bypass cookie isn't forwarded for POST. Local 200/401 behavior confirmed. Vercel's internal cron scheduler bypasses the protection layer separately, so production cron firing isn't affected. If we ever need to manually exercise protected previews via POST, set `x-vercel-protection-bypass` header explicitly.

### Test count drift +1 (Minor)

Test suite shows 1074 passing / 123 failing vs expected 1075/122. Slight delta below tolerance; likely a flaky timing-sensitive test. Not blocking. Worth a clean re-run if precise parity matters.

---

## 2026-05-04 — Final PR1 Code Review

### Plan deviation: docker-compose.yml skipped (Documentation)

Spec D17 designated docker-compose as the local dev path. During Task 1 the user picked Option D (skip Docker, use Vercel Postgres for both local and prod via `vercel env pull`). The deviation is intentional and documented in `.env.example` (lines 3-5), but it overrides D17. PR2+ contributors should know:

- No `docker-compose.yml` exists. Local dev uses `vercel env pull .env.local` to get the live DATABASE_URL.
- This means local dev hits the same DB as production. For PR1 this is safe (additive migrations, idempotent seed). For larger schema experiments later, consider Neon's branch-per-PR feature.

If we ever need to revert to local Docker, the original D17 plan in `2026-05-03-bitcoin-price-data-pr1-foundation.md` Task 1 has the docker-compose.yml content.

### Consider deleting one-shot scripts in PR5 (Defer)

Flagged by final code review. `scripts/copy-old-to-new.ts` and `scripts/inspect-db.ts` served their one-shot purpose during the OLD → NEW DB migration. They lack unit tests and `copy-old-to-new.ts` has known re-runnability issues (no idempotency precheck for `data_updates`, no per-table transactions). Options for PR5:
- Delete both
- Or move to `scripts/archive/` with a CONFIRM=yes env-var gate to prevent accidental re-runs

`scripts/gap-fill-prices.ts` stays — it's the canonical seed/gap-fill going forward, with full test coverage.

---

## 2026-05-04 — Task 11: Live Gap-Fill

### `system_meta.updated_at` vs `value` clock skew (Minor)

Flagged by Task 11 implementer. After running gap-fill, `system_meta.lastSeedRunAt`'s `value` (written from JS `new Date().toISOString()`) and its `updated_at` column (Postgres `@updatedAt` from server) differ by ~2 hours due to local-vs-UTC clock semantics. Both are "recent" so no bug, but normalize to one source if anything ever depends on them matching.

### Skip-path could log detected gap range (Minor)

Flagged by Task 11 implementer. When `gapFillFromCoinGecko` skips, the message says "skipped: bitcoin_prices is up to date" but doesn't show what `latest` and `today` it computed. If a future run mysteriously skips, an extra debug line (`detected: latest=YYYY-MM-DD, today=YYYY-MM-DD, gap=none`) would speed triage.

### Test for CoinGecko data lag (Minor)

Flagged by Task 11 implementer. If CoinGecko's "today" row hasn't published yet, our request from-N to N-1-yields-N-1-days. Worth an explicit unit test for that case.

---

## 2026-05-04 — Task 6: Type Extraction (no-op)

### 🟡 MUST address before PR4: `DataServiceState` shape mismatch

The two definitions of `DataServiceState` differ:
- `lib/services/centralized-data-service.ts` (lines 37-48) has `ath`, `athData`, `isATHLoaded` — the runtime singleton uses these.
- `src/modules/price-data/types/index.ts` (lines 191-199) is missing those three fields.

When PR4 deletes `centralized-data-service.ts`, any consumer relying on the ATH fields will silently break (or break loudly with type errors). Before PR4: either reconcile the module-side definition to include ATH fields, OR migrate consumers off `DataServiceState` entirely (it's a service-internal type that arguably shouldn't have leaked in the first place).

### Stale header comment on `HistoricalDataPoint` (Minor)

Line 19-21 of `src/modules/price-data/types/index.ts` says "Compatible with centralized-data-service.ts interface". Once PR4 deletes that source, this comment is meaningless. Update during PR4 to reflect canonical status.

### `ExtendedHistoricalDataPoint` redundantly declares `date` (Minor)

`src/modules/price-data/types/index.ts:36` extends `HistoricalDataPoint` and then re-declares `date: string` — the parent already has it. Cleanup opportunity.

---

## 2026-05-04 — Task 5: Build Script

### Redundant `build:*` scripts in `package.json` (Minor)

After Task 5's `build` rewrite, the siblings `build:vercel`, `build:prisma`, `build:with-prisma` are obsolete (the new `build` covers all the cases they handled). Out of scope for PR1; remove in a follow-up.

### Windows pnpm quirk: `$DATABASE_URL` not shell-expanded (Cosmetic)

Flagged by Task 5 implementer. On Windows, `pnpm build` runs script values without POSIX-style env expansion — `test -n "$DATABASE_URL"` sees the literal string and always passes. `prisma migrate deploy` then fails on missing DIRECT_URL, gets caught by `||`, and `next build` runs. Net effect: build still succeeds, but Windows users see a scary-looking validation error in logs. Vercel (POSIX) is unaffected — both gating branches work as intended.

If we want cross-platform fidelity later, options: (a) move logic into `scripts/build.mjs`, (b) use `cross-env` or similar wrapper. Not blocking — Vercel builds are what matter.

---

## 2026-05-04 — Task 4: fetchedAt + SystemMeta Migration

### 🔴 MUST-FIX before PR2 deploys: backfill `fetched_at` for existing 4341 rows

Flagged by implementer agent. The migration's `ADD COLUMN fetched_at NOT NULL DEFAULT CURRENT_TIMESTAMP` filled all 4341 existing rows with the migration timestamp (2026-05-04 ~07:26 UTC). This means:
- Latest row (2025-08-19) shows `fetched_at = 2026-05-04 07:26` (very recent)
- PR2's lazy-refresh cooldown checks `if (now - latest.fetchedAt) > 5 min` → **false** for ~5 min after migration
- Result: first user after PR2 deploys sees stale 2025-08-19 data, no refresh triggers

**Fix in PR2 (or now if we want to be safe):** one-shot SQL after deploy:
```sql
UPDATE bitcoin_prices SET fetched_at = updated_at;
```
Sets each row's fetched_at to its original update timestamp. Latest row gets ~9 months stale, immediately triggers refresh on first page load.

Alternative: write `scripts/backfill-fetched-at.ts` and run before PR2 ships. Not blocking PR1 but blocking PR2 user-visible correctness.

### `package.json#prisma` config + Prisma 6 → 7 upgrade (Defer)

Already in this file from Task 2. Reaffirmed by Task 4 implementer — the deprecation warning fires every prisma command.

### Wrapper script for `prisma migrate` to load `.env.local` (Minor)

Prisma CLI doesn't auto-load `.env.local`. The implementer had to use `set -a; source .env.local; set +a` to get both `DATABASE_URL` and `DIRECT_URL` in scope. Recommend adding to `package.json`:
```json
"db:migrate": "dotenv -e .env.local -- prisma migrate dev",
"db:migrate:create": "dotenv -e .env.local -- prisma migrate dev --create-only"
```
(Requires `dotenv-cli` devDep.) Or rename `.env.local` → `.env` (Prisma loads `.env` automatically). Smaller change but mixes Vercel's pull convention.

### `bitcoin_prices` index review (Minor, defer)

After fetchedAt added, the table has 4 indexes: `[date]`, `[timestamp]`, `[source]`, `[fetchedAt]`. `date` and `timestamp` are largely redundant (date derivable from timestamp). At 4341 rows it doesn't matter; at 100k+ it would. Review in a future cleanup PR after the refactor lands.

---

## 2026-05-04 — Task 2 Data Migration

### 🚨 Security: rotate exposed credentials (Important)

Two credentials surfaced in conversation logs during the migration:
- **OLD Prisma Postgres `sk_*` API key** (`sk_ed6vezglfcEsK3eGr0SWY`) — auto-revoked when the OLD Prisma project is deleted (Path B step). Confirm in https://console.prisma.io.
- **NEW Neon password** (visible in `.env.local` `DATABASE_URL`/`DIRECT_URL`). Worth rotating in Neon console (https://console.neon.tech) once PR1 settles. New password gets pulled into Vercel automatically; `pnpm dlx vercel env pull` re-syncs `.env.local`.

### `scripts/copy-old-to-new.ts` — re-runnability hardening (Important, deferred)

Flagged by code-quality reviewer (Opus). The script is one-shot for this dataset, but if anyone re-runs it accidentally:
- No idempotency precheck — would fail loudly on `bitcoin_prices.date` unique constraint, but `data_updates` has no unique key and would silently duplicate.
- No per-table transaction — partial failure leaves NEW DB in a half-state.

Fixes (only if we ever reuse this template):
- Prepend with `SELECT COUNT(*) FROM bitcoin_prices` precheck → abort if non-zero.
- Wrap each table copy in `BEGIN`/`COMMIT`.

File: `scripts/copy-old-to-new.ts`

### `scripts/inspect-db.ts` — URL parser bug (Minor, fix-when-touching)

Line ~9 uses `new URL(url.replace('postgres://', 'http://'))` — silently no-ops on `postgresql://` URLs (Prisma's canonical form), which then throws "Invalid URL" because `postgresql://` isn't a recognized WHATWG scheme. Two-line fix:

```ts
const host = new URL(url.replace(/^postgres(ql)?:\/\//, 'http://')).host
```

Worked in our run because Neon's pooled URL uses `postgres://`. Will bite the moment we point this at a `postgresql://` URL (Prisma's `directUrl` often uses that form).

### `tsx` should be in devDependencies (Minor)

Currently invoked via `pnpm dlx tsx scripts/...` which downloads the package on every run. Adding `tsx` to `devDependencies` (it's already there per package.json line 89 — verified) and dropping the `dlx` is faster and more reproducible.

Actually verified: `tsx` IS in devDependencies. The issue is just that we're using `pnpm dlx tsx` instead of `pnpm tsx`. Switch to the latter.

### Add `db:inspect` script to `package.json` (Minor)

Pair `scripts/inspect-db.ts` with a discoverable npm script:

```json
"db:inspect": "tsx scripts/inspect-db.ts"
```

So devs run `pnpm db:inspect` instead of remembering the file path.

### `prisma/dev.db` SQLite file is dead (Minor)

Flagged by implementer agent. With the project firmly on Postgres (and Path B locks this in), the committed 458 KB `prisma/dev.db` SQLite file is dead weight. Already on the deletion list in the spec (§5.6) but worth confirming the timing — should drop in PR5 cleanup.

### `package.json#prisma` config is deprecated (Defer)

Prisma 7 removes the `package.json#prisma` config block. We currently have:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

Should migrate to `prisma.config.ts` before bumping Prisma to v7. Not urgent — Prisma 6.16 still supports it. Will do alongside the Prisma 7 upgrade (separate PR after this refactor lands).

### Prisma is two majors behind (Defer)

Currently `prisma@6.16.2`; latest is `7.8.0`. Major version bump. Not urgent — out of scope for this refactor. File a separate cleanup ticket after the data layer ships.

### `VERCEL_OIDC_TOKEN` in `.env.local` (Defer)

`vercel env pull` pulled a `VERCEL_OIDC_TOKEN` JWT into `.env.local`. These tokens have expiry and are used by Vercel for OIDC integrations. Not a leak risk while gitignored. Just noting.

### Schema prefix inconsistency (Minor)

`prisma/migrations/20260504082838_init/migration.sql` uses `"public"."bitcoin_prices"` (schema-qualified). `scripts/copy-old-to-new.ts` uses unqualified `"bitcoin_prices"`. Both work because `public` is the default search_path, but mixing styles will bite if a non-default schema is ever introduced.

---

## 2026-05-04 — Task 1 Code Review

### `.gitignore` duplicate / contradictory entries (Minor)

Flagged by: code quality reviewer (Opus) during Task 1 review.

- Line 20 and line 50: `.DS_Store` appears twice.
- Line 69 and line 74: `.npm` appears twice (line 74 has a comment "Optional npm cache directory" that contradicts its earlier listing).
- Line 43 (`.vscode/`) and line 101 (`.vscode/*` plus `!.vscode/extensions.json`) are inconsistent — the trailing-slash form ignores the whole folder, while the second form selectively allows `extensions.json`. The two together are contradictory.

**Suggested fix:** consolidate `.DS_Store` and `.npm` to single entries. Drop line 43 (`.vscode/`) since line 101 is more selective.

File: `.gitignore`

### `.env.test.example` may be useful (Defer)

Flagged by: code quality reviewer (Opus) during Task 1 review.

If the project ends up running Vitest tests against a real DB, a corresponding `.env.test.example` template would help future contributors. Currently `.gitignore` line 86 ignores `.env.test`. Defer until any tests actually need it.

### `DATABASE_URL` may need a `DIRECT_URL` companion for Prisma pooling (PR2/3)

Flagged by: code quality reviewer (Opus) during Task 1 review.

Vercel Postgres (Neon) typically provides two connection strings:
- A pooled URL (with `?pgbouncer=true&connect_timeout=15`) for the app
- A direct URL for `prisma migrate` operations

If PR2 or PR3 enables Prisma's connection pooling support, `.env.example` will need a `DIRECT_URL=""` entry alongside `DATABASE_URL`. Flag here so we don't forget.

File: `.env.example`
