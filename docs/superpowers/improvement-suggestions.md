# Improvement Suggestions Backlog

Running list of project-improvement findings surfaced by implementer/reviewer agents during the PR1 (Foundation) work. **Not actionable in PR1** — these are flagged for separate cleanup PRs after the price-data refactor lands.

Format: each item lists who flagged it, when, where, and a short description. Severity is the flagger's call.

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
