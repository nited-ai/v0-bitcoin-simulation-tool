# Bitcoin Price Data Refactor — PR5: The Big Delete (Cleanup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete ~45 files of dead code that PR1-4 left behind: legacy services, legacy hooks, old API routes, static JSON files, root-level test/debug scripts, and dead modules. After this PR, the price-data refactor is complete — single coherent data path from Postgres → API → SWR hook → UI.

**PREREQUISITE: PR5a must be merged on `main` first.** PR5a (`docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5a-adapter-extraction.md`) extracts the `PricePoint → HistoricalDataPoint` adapter into a shared utility. This was Task 10 of the original Plan 5; we split it into its own PR for TDD discipline and to keep PR5 a pure deletion. Task 0.5 (Pre-flight verification gate) of THIS plan checks the prerequisite.

**Architecture:** Pure cleanup. No new functionality. Every delete is verified safe by exhaustive grep BEFORE deletion. `ATHData` duplication resolved by deleting the legacy file's definition (PR4 reconciled the module-side; PR5 deletes the legacy).

**Why every commit is chained with `pnpm type-check`:** The repo's `next.config.mjs:8` has `typescript.ignoreBuildErrors: true`. That means `pnpm build` will SUCCEED even with TypeScript errors, silently shipping broken code to production. To catch type regressions during this delete-heavy refactor, every commit step in this plan uses `pnpm type-check && git commit ...` so a failed type-check blocks the commit.

**Tech Stack:** No new deps. Uses git rm extensively.

**Spec sections covered:** §5.6 (file deletion list), plus carry-forward from improvement-suggestions: PR3 (ATHData duplication, stale README/API.md), PR4 (magic-number fallbacks in `useATH.ts:28` and dead test files).

**Out of scope for this PR:**
- Adapter extraction (moved to PR5a — separate PR, must be merged before PR5)
- The `useCalculations` ATH placeholder fix (`calculationsService.ts:800`) — defer; not a deletion concern
- The `<PriceDataBridge>` co-location refactor — defer; refactor not deletion
- act() warnings in tests — defer; trivial test infra
- The pre-existing `PowerLayer.toFixed()` runtime crash in `app/simulation/price-models/models/PowerLawModel.ts:268` — defer; unrelated to data refactor

---

## Hook-Name Disambiguation (READ THIS FIRST)

> ⚠️ **CRITICAL: Two files share the name `useHistoricalData.ts`:**
> - `app/simulation/hooks/useHistoricalData.ts` → **DELETE** (deprecated wrapper that wraps `useCentralizedData`)
> - `src/modules/price-data/hooks/useHistoricalData.ts` → **KEEP** (new SWR-based hook from PR3)
>
> When deleting, **use the FULL path**. Never shortcut to `git rm useHistoricalData.ts` — there is no such ambiguity-free target. Every `git rm` in this plan uses the full path explicitly.

---

## Deletion Inventory (verified target list)

### Legacy data-layer services (10 files)
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

### Legacy localization services (7 files, all unused per PR1 inventory)
- `lib/services/integration-service.ts`
- `lib/services/pattern-matcher.ts`
- `lib/services/reporting-service.ts`
- `lib/services/string-detection-service.ts`
- `lib/services/translation-key-generator.ts`
- `lib/services/validation-service.ts`
- `lib/services/types/localization.ts`

### Legacy hooks (3 files — see disambiguation callout above)
- `app/simulation/hooks/useATH.ts` (contains the 4th hardcoded `$124,277.98` fallback at line 28)
- `app/simulation/hooks/useCentralizedData.ts`
- `app/simulation/hooks/useHistoricalData.ts` (the `app/simulation/hooks/` one — NOT the `src/modules/price-data/hooks/` one)

### Legacy provider (1 file)
- `app/simulation/providers/DataServiceProvider.tsx` (now a pass-through after PR4)

### Legacy test files that mock deleted modules (must go with the modules)
- `app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts`
  — line 85 has `vi.mock('../useCentralizedData', ...)`. Tests legacy hook migration; obsolete after deletes.
- `src/modules/price-data/__tests__/helpers/mockServices.ts`
  — line 260 has `vi.mock('../../../lib/services/centralized-data-service')`. Audit consumers in Task 1: if its only importers are themselves in the delete list, delete this helper too; otherwise update it to mock the new services.

### Already deleted by PR4 — DO NOT include in this plan's delete list
- `app/simulation/__tests__/providers/DataServiceProvider.test.tsx` (gone)
- `app/simulation/__tests__/providers/DataServiceProvider.integration.test.tsx` (gone)

### Old API routes (7 files)
- `app/api/bitcoin-prices/current/route.ts`
- `app/api/bitcoin-prices/historical/route.ts`
- `app/api/bitcoin-prices/stats/route.ts`
- `app/api/bitcoin-prices/update/route.ts`
- `app/api/bitcoin-prices/daily-update/route.ts`
- `app/api/bitcoin-prices/comprehensive-gap-fill/route.ts`
- `app/api/bitcoin-prices/regenerate-json/route.ts`

### Static data files (6 files)
- `public/data/bitcoin/daily.json`
- `public/data/bitcoin/weekly.json`
- `public/data/bitcoin/monthly.json`
- `public/data/bitcoin/ath.json`
- `public/btc-price-history.csv`
- `prisma/dev.db` (committed SQLite, no longer used)

### Old price-engine layer (entire folder)
- `lib/price-engine/` (verify nothing in `src/modules/price-data/` or `app/simulation/price-models/` imports from it)

### Old simulation data folder (entire folder)
- `app/simulation/data/` (`AutoUpdateService.ts`, `bitcoinApiService.ts`, `csvUpdateManager.ts`, `database/`)

### Misc dead files
- `lib/load-btc-price.ts` (verified unused except in 2 obsolete test files)
- `__tests__/library-consolidation-simple.test.ts` (the 2 tests that imported `lib/load-btc-price.ts`)
- `__tests__/library-consolidation.test.ts` (same)
- `src/components/__tests__/chart-integration.test.tsx` (imports `app/simulation/components/charts/*` paths that don't exist; flagged in PR4 review)

### Root-level scripts (~17 files)
- `analyze-api-status.ts`
- `api-based-data-insert.ts`
- `backup-data-inserter.ts`
- `bitcoin-price-backup.json`
- `bitcoin-price-insert.sql`
- `check-database-schema.ts`
- `check-db.ts`
- `comprehensive-database-fix.ts`
- `debug-api-issues.ts`
- `direct-database-insert.ts`
- `direct-postgres-seeder.ts`
- `final-gap-filling-process.ts`
- `final-verification.ts`
- `resume-gap-filling.ts`
- `simple-gap-filler.ts`
- All root-level `test-*.ts` and `test-*.js` files

### Vestigial folders (verify status, possibly already gone)
- `app/simulation-fixed/` (PR1 reported gone)
- `app/simulation-new/` (PR1 reported gone)

### `app/simulation/components/` folder cleanup
PR1 inventory found this folder had only `PowerLawEducationalPanel.tsx` left. Move that one file into `app/simulation/tabs/` (or delete if dead), then delete the empty `components/` folder.

### `ATHData` interface consolidation (delete legacy)
- `lib/services/ath-service.ts:12` (legacy definition) — gets deleted with the file
- `src/modules/price-data/types/index.ts` (PR3 added) — stays canonical

### Stale comments + JSDoc cleanup (sweep — see Task 11)
- `app/simulation/tabs/parameters/BasicParametersCard.tsx` line ~50 — stale `useCentralizedData` reference comment (comments-only, file stays)
- `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx` line ~52 — stale `useCentralizedData` comment (comments-only, file stays)
- `app/simulation/SimulationPage.tsx` line ~152 — Phase 1 changelog comment referencing `useCentralizedData`
- `src/modules/__tests__/phase-2-integration.test.ts` lines 74-76 — stale "infinite loop" comment
- `src/modules/price-data/index.ts` line ~20 — JSDoc shows old hook return shape
- `src/modules/price-data/README.md` and `API.md` — likely document old hook shape (sweep)

---

## Deletion Manifest

A reviewer-friendly table sized at the start of work. **Task 0 Step 5 instructs the agent to fill in the actual byte counts.** Until that step, the size column is `[fill-in-Task-0]`.

| File | Lines | Size |
|------|-------|------|
| `lib/services/centralized-data-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/ath-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/bitcoin-json-data-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/bitcoin-json-generator-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/bitcoin-api-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/multi-api-bitcoin-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/daily-update-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/comprehensive-gap-filler.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/comprehensive-gap-analyzer.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/service-initializer.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/integration-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/pattern-matcher.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/reporting-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/string-detection-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/translation-key-generator.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/validation-service.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/services/types/localization.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/hooks/useATH.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/hooks/useCentralizedData.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/hooks/useHistoricalData.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/providers/DataServiceProvider.tsx` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/current/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/historical/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/stats/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/update/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/daily-update/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/comprehensive-gap-fill/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/api/bitcoin-prices/regenerate-json/route.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `public/data/bitcoin/daily.json` | n/a | [fill-in-Task-0] |
| `public/data/bitcoin/weekly.json` | n/a | [fill-in-Task-0] |
| `public/data/bitcoin/monthly.json` | n/a | [fill-in-Task-0] |
| `public/data/bitcoin/ath.json` | n/a | [fill-in-Task-0] |
| `public/btc-price-history.csv` | n/a | [fill-in-Task-0] |
| `prisma/dev.db` | n/a | [fill-in-Task-0] |
| `lib/price-engine/` (folder) | [fill-in-Task-0] | [fill-in-Task-0] |
| `app/simulation/data/` (folder) | [fill-in-Task-0] | [fill-in-Task-0] |
| `lib/load-btc-price.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `__tests__/library-consolidation-simple.test.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `__tests__/library-consolidation.test.ts` | [fill-in-Task-0] | [fill-in-Task-0] |
| `src/components/__tests__/chart-integration.test.tsx` | [fill-in-Task-0] | [fill-in-Task-0] |
| ~17 root-level scripts (see Task 7) | [fill-in-Task-0] | [fill-in-Task-0] |
| **TOTAL** | [fill-in-Task-0] | [fill-in-Task-0] |

Anomaly check: any single file > 1000 lines or > 50 KB deserves a sanity look — confirm it really is dead before deleting.

---

## File Structure for This PR

```
[DELETE] lib/services/centralized-data-service.ts
[DELETE] lib/services/ath-service.ts
[DELETE] lib/services/bitcoin-json-data-service.ts
[DELETE] lib/services/bitcoin-json-generator-service.ts
[DELETE] lib/services/bitcoin-api-service.ts
[DELETE] lib/services/multi-api-bitcoin-service.ts
[DELETE] lib/services/daily-update-service.ts
[DELETE] lib/services/comprehensive-gap-filler.ts
[DELETE] lib/services/comprehensive-gap-analyzer.ts
[DELETE] lib/services/service-initializer.ts
[DELETE] lib/services/integration-service.ts
[DELETE] lib/services/pattern-matcher.ts
[DELETE] lib/services/reporting-service.ts
[DELETE] lib/services/string-detection-service.ts
[DELETE] lib/services/translation-key-generator.ts
[DELETE] lib/services/validation-service.ts
[DELETE] lib/services/types/localization.ts
[DELETE] lib/services/__tests__/  (only the test files that map to deleted services)
[DELETE] app/simulation/hooks/useATH.ts (+ tests)
[DELETE] app/simulation/hooks/useCentralizedData.ts (+ tests)
[DELETE] app/simulation/hooks/useHistoricalData.ts  (the app/simulation one — NOT the src/modules one)
[DELETE] app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts
[DELETE] app/simulation/providers/DataServiceProvider.tsx
[DELETE] app/simulation/providers/ (folder if empty after the above)
[DELETE] src/modules/price-data/__tests__/helpers/mockServices.ts  (if no live consumer — Task 1 verifies)
[DELETE] app/api/bitcoin-prices/{current,historical,stats,update,daily-update,comprehensive-gap-fill,regenerate-json}/route.ts
[DELETE] public/data/bitcoin/{daily,weekly,monthly,ath}.json
[DELETE] public/btc-price-history.csv
[DELETE] prisma/dev.db
[DELETE] lib/price-engine/  (entire folder)
[DELETE] app/simulation/data/  (entire folder)
[DELETE] lib/load-btc-price.ts
[DELETE] __tests__/library-consolidation-simple.test.ts
[DELETE] __tests__/library-consolidation.test.ts
[DELETE] src/components/__tests__/chart-integration.test.tsx
[DELETE] (~17 root-level scripts and JSON/SQL backups — see inventory)

[MODIFY] app/simulation/SimulationPage.tsx  (remove DataServiceProvider import + JSX)
[MODIFY] (stale comments / JSDoc files — small text edits in Task 10)
```

---

## Task 0: Set Up Worktree + Pre-Verification + Manifest Sizing

**Files:** None — environment setup + safety checks.

- [ ] **Step 1: Create worktree**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git checkout main
git pull --ff-only origin main
git worktree add ../v0-bitcoin-simulation-tool-pr5 -b feature/pr5-cleanup
cd ../v0-bitcoin-simulation-tool-pr5
```

Expected: new worktree on branch `feature/pr5-cleanup` from latest `main` (which includes PR4 + PR5a merges).

- [ ] **Step 2: Install + env**

```bash
pnpm install 2>&1 | tail -5
ls .vercel 2>/dev/null || pnpm dlx vercel link --project=v0-bitcoin-simulation-tool --yes 2>&1 | tail -3
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
```

- [ ] **Step 3: Verify baseline test count + type-check**

```bash
pnpm test --run 2>&1 | tail -3
pnpm type-check 2>&1 | tail -3
```

Capture: passing/failing counts. Tests will drop after deletes (deleted test files = fewer tests). Type-check should be 0 errors throughout.

- [ ] **Step 4: Verify the snapshot tag is on origin**

```bash
git ls-remote --tags origin pre-pr5-cleanup-snapshot
```

Expected: one line with the tag SHA. If empty: STOP — the rollback safety net is missing. Have the user push the tag before continuing.

- [ ] **Step 5: Fill in the Deletion Manifest**

Replace every `[fill-in-Task-0]` placeholder in the Deletion Manifest table above with actual line counts and byte counts. Use:

```bash
wc -l <file>     # for line count of text files
wc -c <file>     # for byte count
du -sh <folder>  # for folder totals
```

Example helper for the file list:

```bash
for f in lib/services/centralized-data-service.ts lib/services/ath-service.ts \
         lib/services/bitcoin-json-data-service.ts lib/services/bitcoin-json-generator-service.ts \
         lib/services/bitcoin-api-service.ts lib/services/multi-api-bitcoin-service.ts \
         lib/services/daily-update-service.ts lib/services/comprehensive-gap-filler.ts \
         lib/services/comprehensive-gap-analyzer.ts lib/services/service-initializer.ts \
         lib/services/integration-service.ts lib/services/pattern-matcher.ts \
         lib/services/reporting-service.ts lib/services/string-detection-service.ts \
         lib/services/translation-key-generator.ts lib/services/validation-service.ts \
         lib/services/types/localization.ts \
         app/simulation/hooks/useATH.ts app/simulation/hooks/useCentralizedData.ts \
         app/simulation/hooks/useHistoricalData.ts \
         app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts \
         app/simulation/providers/DataServiceProvider.tsx \
         lib/load-btc-price.ts \
         __tests__/library-consolidation-simple.test.ts \
         __tests__/library-consolidation.test.ts \
         src/components/__tests__/chart-integration.test.tsx; do
  [ -f "$f" ] && printf "%6d  %8d  %s\n" "$(wc -l <"$f")" "$(wc -c <"$f")" "$f"
done

du -sh lib/price-engine app/simulation/data 2>/dev/null
ls -l public/data/bitcoin/*.json public/btc-price-history.csv prisma/dev.db 2>/dev/null
```

Anomaly check before proceeding: anything over 1000 lines or 50 KB — read the file's first 30 lines and confirm it's dead. If you find a live consumer that the audit missed, STOP.

- [ ] **Step 6: No commit**

---

## Task 0.5: Pre-Flight Verification Gate

**Files:** None — verification only. **THIS GATE MUST PASS BEFORE ANY DELETE.**

The original Plan 5 went straight from "set up worktree" to "delete everything". Red-team review flagged that this skips verifying the prerequisites: PR5a merged, no surprise consumers, Vercel green.

- [ ] **Step 1: Verify PR4 + PR5a merge commits are present on `main`**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
git log --oneline main | head -10
```

Expected: a commit from PR5a (squash-merge subject contains `extract PricePoint→HistoricalDataPoint adapter`) appears within the first ~5 commits, AFTER PR4's merge (`b485955`). If PR5a is NOT in the log: STOP — merge PR5a first.

- [ ] **Step 2: Verify the shared adapter utility exists (PR5a's deliverable)**

```bash
ls -l src/modules/price-data/utils/adaptToHistoricalDataPoint.ts
ls -l src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts
```

Expected: both files exist. If not: PR5a was reverted or never merged. STOP.

- [ ] **Step 3: Verify NO inline duplicates remain in `app/`**

```bash
grep -rEn "volume:\s*0,\s*$|source:\s*['\"]api['\"]" \
  --include='*.ts' --include='*.tsx' \
  app/ 2>/dev/null \
  | grep -v "node_modules\|\.next"
```

Expected: empty output. Any match means PR5a missed a consumer — STOP, fix that first (could be done as a one-line follow-up to PR5a or as a small commit in PR5).

- [ ] **Step 4: Verify no production code still imports legacy hook symbols**

This is the crucial precision grep. We exclude the definition files themselves (since those are about to be deleted) so the only matches are real consumers that need fixing.

```bash
grep -rEn "from ['\"].*\b(useCentralizedData|useATH|DataServiceProvider)\b" \
  --include='*.ts' --include='*.tsx' \
  app/ src/ 2>/dev/null \
  | grep -v "node_modules\|\.next" \
  | grep -v "useCentralizedData\.ts:\|useATH\.ts:\|DataServiceProvider\.tsx:"
```

**Expected output: exactly 1 match** — `app/simulation/SimulationPage.tsx` importing `DataServiceProvider`. **THIS IS HANDLED BY TASK 3 (consumer/JSX cleanup).**

Any OTHER match = STOP and investigate before proceeding. A surprise consumer was missed; figure out what it does and either fix it in this PR or pause to add a fix-up PR first.

- [ ] **Step 5: Verify Vercel build is currently green on `main`**

```bash
gh run list --branch main --limit 5
```

Expected: most recent main build is `success`. If it's failing for an unrelated reason, that's fine to start; if it's failing because of the PR4 merge, STOP and fix `main` first — don't pile delete-PR risk on top of an already-broken main.

Optional cross-check via the Vercel API (if `vercel` CLI is logged in):

```bash
pnpm dlx vercel inspect $(pnpm dlx vercel ls | grep -i "main\|production" | head -1 | awk '{print $1}') 2>&1 | tail -10
```

- [ ] **Step 6: No commit. Gate passed — proceed.**

---

## Task 1: Pre-Delete Import Audit (Comprehensive Safety Check)

**Files:** None — verification only.

The original Plan 5's audit only matched `from '...'` import statements. Red-team review confirmed this misses **`vi.mock('...')`**, **`jest.mock('...')`**, **dynamic `import('...')`**, and **`require('...')`** — all of which break at runtime if their target is deleted. This rewritten audit catches all five.

- [ ] **Step 1: Build the deletion-target identifier list**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5

TARGETS='centralized-data-service|ath-service|bitcoin-json-data-service|bitcoin-json-generator-service|bitcoin-api-service|multi-api-bitcoin-service|daily-update-service|comprehensive-gap-filler|comprehensive-gap-analyzer|service-initializer|integration-service|pattern-matcher|reporting-service|string-detection-service|translation-key-generator|validation-service|types/localization|useATH|useCentralizedData|DataServiceProvider|api/bitcoin-prices/current|api/bitcoin-prices/historical|api/bitcoin-prices/stats|api/bitcoin-prices/update|api/bitcoin-prices/daily-update|api/bitcoin-prices/comprehensive-gap-fill|api/bitcoin-prices/regenerate-json|public/data/bitcoin|btc-price-history\.csv|lib/price-engine|app/simulation/data|load-btc-price'
```

Note: `useHistoricalData` is intentionally OMITTED from `TARGETS` because BOTH paths share that name — the keep-file at `src/modules/price-data/hooks/useHistoricalData.ts` is a legitimate import target and would create false-positive noise. We rely on Task 0.5 Step 4 + the `app/simulation/SimulationPage.tsx` grep below to confirm the deprecated wrapper has zero consumers.

- [ ] **Step 2: Run the comprehensive grep (covers `from`, dynamic `import()`, `require`, `vi.mock`, `jest.mock`)**

```bash
grep -rEn "(from |import\(|require\(|vi\.mock\(|jest\.mock\()['\"][^'\"]*($TARGETS)" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
  app/ src/ lib/ scripts/ __tests__/ tests/ e2e/ 2>/dev/null \
  | grep -v "node_modules\|\.next\|generated"
```

For each match found, classify it:
- (A) Importer is itself in the deletion list → fine, gets deleted with the importer
- (B) Importer is in `__tests__/` of a deletion-target file → fine, the test gets deleted with it
- (C) Importer is production code OUTSIDE the deletion list → **STOP** — that consumer needs fixing before delete

**Known expected matches (will appear in the output — pre-classified):**
1. `app/simulation/SimulationPage.tsx` — imports `DataServiceProvider`. **Class C → fixed by Task 3 (consumer/JSX cleanup).**
2. `app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts:85` — `vi.mock('../useCentralizedData', ...)`. **Class B → file goes in Task 2 (data layer purge).**
3. `src/modules/price-data/__tests__/helpers/mockServices.ts:260` — `vi.mock('../../../lib/services/centralized-data-service')`. **Class B (helper file) → see Step 4 below for live-consumer check.**
4. Any matches under `lib/services/__tests__/*` testing one of the 10 services → Class B, deleted with their service in Task 2.
5. Any matches inside the deletion-target files themselves (the files importing each other in the dead subgraph) → Class A.

If you see a match that is NOT one of the above and NOT inside a deletion-list path: STOP. That's a live consumer.

- [ ] **Step 3: Audit JSON/YAML configs (next.config.mjs, package.json, vitest config, GitHub Actions, vercel.json)**

```bash
TARGETS_NO_REGEX_ALT='centralized-data-service|ath-service|bitcoin-json-data-service|bitcoin-json-generator-service|bitcoin-api-service|multi-api-bitcoin-service|daily-update-service|comprehensive-gap-filler|comprehensive-gap-analyzer|service-initializer|integration-service|pattern-matcher|reporting-service|string-detection-service|translation-key-generator|validation-service|types/localization|useATH|useCentralizedData|DataServiceProvider|api/bitcoin-prices/current|api/bitcoin-prices/historical|api/bitcoin-prices/stats|api/bitcoin-prices/update|api/bitcoin-prices/daily-update|api/bitcoin-prices/comprehensive-gap-fill|api/bitcoin-prices/regenerate-json|public/data/bitcoin|btc-price-history|lib/price-engine|app/simulation/data|load-btc-price'

grep -rEn "($TARGETS_NO_REGEX_ALT)" \
  --include='*.json' --include='*.yml' --include='*.yaml' --include='*.mjs' \
  package.json vercel.json next.config.mjs tsconfig*.json vitest.config.* .github/ 2>/dev/null
```

For each match:
- `package.json` script entries pointing at deleted scripts → update the script (e.g., remove the entry) BEFORE deleting in Task 7
- `vercel.json` cron schedules calling deleted routes → must be removed; verify no surviving cron route relies on a deleted path
- `next.config.mjs` route rewrites → unlikely; if present, remove
- `vitest.config.*` setup files referencing deleted helpers → update
- `.github/workflows/*.yml` referencing deleted scripts → update

- [ ] **Step 4: Audit `prisma/schema.prisma` for SQLite / dev.db references (related to Task 4's prisma/dev.db deletion)**

```bash
grep -nE "sqlite|dev\.db|file:" prisma/schema.prisma 2>/dev/null
```

Expected: empty (PR1 cut over to Postgres). If `provider = "sqlite"` or any `file:./dev.db` URL appears: STOP — Postgres migration is incomplete and `prisma/dev.db` may still be a live database.

- [ ] **Step 5: Audit `mockServices.ts` for live consumers**

```bash
grep -rEn "from ['\"].*mockServices['\"]|from ['\"].*helpers/mockServices" \
  --include='*.ts' --include='*.tsx' \
  src/ app/ lib/ 2>/dev/null \
  | grep -v "node_modules"
```

For each importer of `mockServices`:
- If the importer is also in the delete list → safe to delete `mockServices.ts` along with everything else in Task 2
- If the importer is a surviving test → choose: (a) delete `mockServices.ts` AND the surviving test (if it tests something that's also being deleted) or (b) keep `mockServices.ts` and update its `vi.mock` target to a live module

Decision is recorded in Task 2 Step 1.

- [ ] **Step 6: Verify `app/simulation/components/` only has `PowerLawEducationalPanel.tsx`**

```bash
ls app/simulation/components/ 2>/dev/null
```

Expected: just `PowerLawEducationalPanel.tsx`. If others exist, capture for separate handling in Task 8.

- [ ] **Step 7: Verify `app/simulation-fixed/` and `app/simulation-new/` are gone**

```bash
ls app/simulation-fixed/ 2>&1 | head -3
ls app/simulation-new/ 2>&1 | head -3
```

Expected: both report "No such file or directory". If they exist, add to deletion list in Task 8.

- [ ] **Step 8: No commit**

If audit found any unexpected (C) cases or any `package.json`/`vercel.json` references that won't be cleaned: STOP and report. Otherwise proceed.

---

## Task 2: Data Layer Purge — One Atomic Commit

**Files (deleted in a single commit to avoid intermediate broken states):**

Original Plan 5 split this into Tasks 2 (services), 3 (hooks+provider), 4 (routes), each with its own commit. Red-team review found that intermediate commits leave the working tree in states where consumers reference deleted definitions or vice versa — an avoidable failure mode. PR5 merges them into ONE atomic data-layer purge.

The consumer-side fix (`SimulationPage.tsx` removing `DataServiceProvider`) is the one exception that lives in Task 3 — it's a code edit, not a delete, and keeping it separate makes the diff readable.

**Services (10):**
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

**Service tests:** all `lib/services/__tests__/*` files that test the above 10. List in Step 1.

**Hooks (3) + provider (1):**
- `app/simulation/hooks/useATH.ts`
- `app/simulation/hooks/useCentralizedData.ts`
- `app/simulation/hooks/useHistoricalData.ts` ⚠️ the `app/simulation/hooks/` one — full path required
- `app/simulation/providers/DataServiceProvider.tsx`

**Hook + migration tests:**
- `app/simulation/hooks/__tests__/useCentralizedData.test.tsx` (if exists)
- `app/simulation/hooks/__tests__/useCurrentPriceOnly.test.tsx` (if exists — tests a method on `useCentralizedData`)
- `app/simulation/hooks/__tests__/useHistoricalData.test.tsx` (if exists — tests the deprecated wrapper)
- `app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts` (`vi.mock('../useCentralizedData')` on line 85)

**Test helper (conditional — Task 1 Step 5 decided this):**
- `src/modules/price-data/__tests__/helpers/mockServices.ts` — delete IF Task 1 Step 5 found no surviving consumer; otherwise leave + update its mock target

**API routes (7):**
- `app/api/bitcoin-prices/current/route.ts`
- `app/api/bitcoin-prices/historical/route.ts`
- `app/api/bitcoin-prices/stats/route.ts`
- `app/api/bitcoin-prices/update/route.ts`
- `app/api/bitcoin-prices/daily-update/route.ts`
- `app/api/bitcoin-prices/comprehensive-gap-fill/route.ts`
- `app/api/bitcoin-prices/regenerate-json/route.ts`

- [ ] **Step 1: List service tests + decide on `mockServices.ts`**

```bash
ls lib/services/__tests__/ 2>/dev/null
```

Capture the names. Each test file maps to one of the 10 deleted services — they all go.

Confirm the `mockServices.ts` decision from Task 1 Step 5 and write it down here:
- DELETE `mockServices.ts`: if no surviving consumer
- KEEP `mockServices.ts` (with update): if there is a surviving consumer — defer the update to Task 4 of this plan (consumer cleanup), edit it to mock a still-live module

Default assumption: DELETE (the helper was created for the old service tests).

- [ ] **Step 2: Verify the 7 API routes have no callers (last sanity check before delete)**

```bash
grep -rEn "/api/bitcoin-prices/(current|historical|stats|update|daily-update|comprehensive-gap-fill|regenerate-json)" \
  --include='*.ts' --include='*.tsx' --include='*.json' --include='*.mjs' \
  src/ app/ lib/ vercel.json package.json 2>/dev/null \
  | grep -v "node_modules\|/\(current\|historical\|stats\|update\|daily-update\|comprehensive-gap-fill\|regenerate-json\)/route\.ts"
```

Expected: empty. Any match outside the route files themselves means a surviving consumer (likely `vercel.json` cron schedule or a fetch in surviving production code) — STOP and fix it.

- [ ] **Step 3: Delete the services**

```bash
git rm lib/services/centralized-data-service.ts \
       lib/services/ath-service.ts \
       lib/services/bitcoin-json-data-service.ts \
       lib/services/bitcoin-json-generator-service.ts \
       lib/services/bitcoin-api-service.ts \
       lib/services/multi-api-bitcoin-service.ts \
       lib/services/daily-update-service.ts \
       lib/services/comprehensive-gap-filler.ts \
       lib/services/comprehensive-gap-analyzer.ts \
       lib/services/service-initializer.ts
```

- [ ] **Step 4: Delete the service tests (explicit by name — list adjusted from Step 1's output)**

```bash
git rm lib/services/__tests__/centralized-data-service-integration.test.ts 2>/dev/null
git rm lib/services/__tests__/bitcoin-json-data-service.test.ts 2>/dev/null
git rm lib/services/__tests__/daily-update-service.test.ts 2>/dev/null
git rm lib/services/__tests__/daily-update-ath-integration.test.ts 2>/dev/null
git rm lib/services/__tests__/ath-service.test.ts 2>/dev/null
git rm lib/services/__tests__/comprehensive-gap-filler.test.ts 2>/dev/null
git rm lib/services/__tests__/comprehensive-gap-analyzer.test.ts 2>/dev/null
git rm lib/services/__tests__/performance-benchmark.test.ts 2>/dev/null
# Add any others observed in Step 1 that map to one of the 10 deleted services.
```

- [ ] **Step 5: Delete the 3 hooks + provider + their tests**

```bash
git rm app/simulation/hooks/useATH.ts \
       app/simulation/hooks/useCentralizedData.ts \
       app/simulation/hooks/useHistoricalData.ts \
       app/simulation/providers/DataServiceProvider.tsx
git rm app/simulation/hooks/__tests__/useCentralizedData.test.tsx 2>/dev/null
git rm app/simulation/hooks/__tests__/useCurrentPriceOnly.test.tsx 2>/dev/null
git rm app/simulation/hooks/__tests__/useHistoricalData.test.tsx 2>/dev/null
git rm app/simulation/hooks/__tests__/useSimulationRunner-migration.test.ts
```

⚠️ Confirm the FULL path on the third `git rm` — `app/simulation/hooks/useHistoricalData.ts`, NOT `src/modules/price-data/hooks/useHistoricalData.ts` (which we KEEP).

- [ ] **Step 6: Conditional: delete `mockServices.ts` (if Step 1 chose DELETE)**

```bash
git rm src/modules/price-data/__tests__/helpers/mockServices.ts 2>/dev/null
```

If Step 1 chose KEEP-and-update: skip this command and revisit in Task 4.

- [ ] **Step 7: Delete the 7 API route folders**

```bash
git rm -r app/api/bitcoin-prices/current/ \
          app/api/bitcoin-prices/historical/ \
          app/api/bitcoin-prices/stats/ \
          app/api/bitcoin-prices/update/ \
          app/api/bitcoin-prices/daily-update/ \
          app/api/bitcoin-prices/comprehensive-gap-fill/ \
          app/api/bitcoin-prices/regenerate-json/
```

- [ ] **Step 8: Verify `app/api/bitcoin-prices/` still has the unified read route**

```bash
ls app/api/bitcoin-prices/
```

Expected: just `route.ts` and possibly `__tests__/`.

- [ ] **Step 9: Verify the providers folder**

```bash
ls app/simulation/providers/ 2>/dev/null
```

If empty, the next commit's `git status` will show no entry for it (git tracks files, not folders).

- [ ] **Step 10: Type-check + tests**

⚠️ **Type-check WILL fail at this step** because `app/simulation/SimulationPage.tsx` still imports `DataServiceProvider`. That's expected — Task 3 fixes the consumer in the very next commit. We tolerate one transient type-check failure here because (a) all the deletes are physically coupled (a service + its hook + its provider + their tests must move together), (b) the consumer fix is intentionally a separate readable diff, and (c) the gate at the END of Task 3 catches any other regression.

Actually run:

```bash
pnpm type-check 2>&1 | tail -10
```

Capture the failures. Expected: a small number of errors all centered on `SimulationPage.tsx`'s reference to the deleted `DataServiceProvider`. If any OTHER file shows errors: STOP — Task 1's audit missed a consumer.

```bash
pnpm test --run 2>&1 | tail -10
```

Tests at lower count is expected (deleted test files are gone). Failing-count growth from un-deleted tests would mean a runtime consumer survived — STOP.

- [ ] **Step 11: Stage everything for the atomic commit BUT do not commit yet**

The atomic data-layer purge commit happens at the END of Task 3, after the consumer fix. This way the merge commit shows: "remove dead data layer + fix the one consumer in the same atomic change."

```bash
git status --short
```

Confirm the staged set: ~40+ deletions across `lib/services/`, `app/simulation/hooks/`, `app/simulation/providers/`, `app/api/bitcoin-prices/{nested}/`. No additions, no modifications yet.

---

## Task 3: Consumer Cleanup — Remove `<DataServiceProvider>` from `SimulationPage.tsx`

**Files:**
- Modify: `app/simulation/SimulationPage.tsx`

This is the one production file that still references the legacy `DataServiceProvider`. Removing it here, in the same commit as Task 2's deletes, keeps the tree compilable at every committed snapshot.

- [ ] **Step 1: Confirm the current shape**

```bash
grep -nE "DataServiceProvider" app/simulation/SimulationPage.tsx
```

Expected: 3 matches:
- Line 5: `import { DataServiceProvider } from "./providers/DataServiceProvider"`
- Line 127: `<DataServiceProvider>`
- Line 131: `</DataServiceProvider>`

- [ ] **Step 2: Apply the edits**

**Find (line 5):**
```typescript
import { DataServiceProvider } from "./providers/DataServiceProvider"
```

**Replace with:** (delete the line entirely)

**Find (lines 125-133):**
```typescript
export default function SimulationPage() {
  return (
    <DataServiceProvider>
      <SimulationProvider>
        <SimulationContent />
      </SimulationProvider>
    </DataServiceProvider>
  )
}
```

**Replace with:**
```typescript
export default function SimulationPage() {
  return (
    <SimulationProvider>
      <SimulationContent />
    </SimulationProvider>
  )
}
```

Rationale: `DataServiceProvider` was a pass-through after PR4 Task 5; SWR's global cache (PR3) handles data sharing without a provider.

- [ ] **Step 3: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -5
pnpm test --run 2>&1 | tail -10
```

Expected: 0 type errors NOW (the consumer fix unblocks the deletion). Test count lower than baseline (deleted test files are gone), failing count not growing.

If type-check fails: a missed consumer remains. Find it (`grep -rn "DataServiceProvider\|useATH\|useCentralizedData" app/ src/ lib/ --include='*.ts' --include='*.tsx' | grep -v "node_modules"`) and fix it in this same commit.

- [ ] **Step 4: Stage the SimulationPage edit + commit the atomic data-layer purge**

```bash
git add app/simulation/SimulationPage.tsx

pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): purge legacy data layer (services + hooks + provider + routes)

PR5 atomic data-layer purge. After PR4 cut over all UI consumers to
PR3's usePriceData() SWR hook, the entire legacy data path is dead.
Deleted in one commit to avoid intermediate states where consumers
reference deleted definitions or vice versa.

Services (10):
  - centralized-data-service.ts (singleton facade for old data flow)
  - ath-service.ts (separate ATH JSON loader; held the legacy ATHData type)
  - bitcoin-json-data-service.ts (static JSON loader)
  - bitcoin-json-generator-service.ts (DB → JSON file regen)
  - bitcoin-api-service.ts (multi-provider API client)
  - multi-api-bitcoin-service.ts (older multi-provider client)
  - daily-update-service.ts (in-process scheduler — broken on serverless)
  - comprehensive-gap-filler.ts (orchestration)
  - comprehensive-gap-analyzer.ts (gap detection)
  - service-initializer.ts (in-process service lifecycle)

Hooks (3) + provider (1):
  - useATH.ts (held the 4th and final hardcoded $124,277.98 fallback)
  - useCentralizedData.ts
  - app/simulation/hooks/useHistoricalData.ts (deprecated wrapper —
    NOT to be confused with src/modules/price-data/hooks/useHistoricalData.ts
    which is the new SWR hook from PR3 and stays)
  - DataServiceProvider.tsx (pass-through after PR4)

Tests of the above (incl. useSimulationRunner-migration.test.ts which
mocked the deleted useCentralizedData), and src/modules/price-data/
__tests__/helpers/mockServices.ts (its mock targets are now gone).

API routes (7):
  - /api/bitcoin-prices/{current,historical,stats,update,daily-update,
    comprehensive-gap-fill,regenerate-json}/route.ts

Consumer fix:
  - SimulationPage.tsx no longer wraps children in <DataServiceProvider>.
    SWR's global cache (PR3) handles data sharing without a provider.

The new architecture's data layer lives entirely in
src/modules/price-data/services/{PriceStore,PriceSource,PriceUpdater}.ts
(PR2) and is consumed via the unified /api/bitcoin-prices route (PR2)
+ usePriceData() (PR3) + UI consumers (PR4 + PR5a).

After this commit: zero references to the stale $124,277.98 hardcoded
fallback remain anywhere in the repo.
EOF
)"
```

If `pnpm type-check` fails inside this chain: the commit is BLOCKED. Investigate, fix, re-stage, re-run the chained command. Do NOT use `--no-verify` and do NOT amend a previous commit — create a new commit on top.

---

## Task 4: Delete Static Data Files

**Files:**
- Delete: `public/data/bitcoin/daily.json`
- Delete: `public/data/bitcoin/weekly.json`
- Delete: `public/data/bitcoin/monthly.json`
- Delete: `public/data/bitcoin/ath.json`
- Delete: `public/btc-price-history.csv`
- Delete: `prisma/dev.db`
- Optionally delete: `scripts/regenerate-static-json.ts` (the PR1 one-shot bridge)

- [ ] **Step 1: Verify nothing fetches the static JSON paths**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
grep -rEn "/data/bitcoin/(daily|weekly|monthly|ath)\.json|btc-price-history\.csv" \
  --include='*.ts' --include='*.tsx' --include='*.json' --include='*.mjs' \
  src/ app/ lib/ scripts/ public/ vercel.json next.config.mjs 2>/dev/null \
  | grep -v "node_modules"
```

Expected: empty. The only legitimate hit would be inside `scripts/regenerate-static-json.ts` (the script that WROTE these files) — that's fine because we're deleting the script too.

- [ ] **Step 2: Delete the data files**

```bash
git rm public/data/bitcoin/daily.json \
       public/data/bitcoin/weekly.json \
       public/data/bitcoin/monthly.json \
       public/data/bitcoin/ath.json
git rm public/btc-price-history.csv 2>/dev/null
git rm prisma/dev.db 2>/dev/null
```

- [ ] **Step 3: Optionally delete the bridge script**

If Task 1 Step 1 confirmed `scripts/regenerate-static-json.ts` only references the now-deleted JSONs:

```bash
git rm scripts/regenerate-static-json.ts 2>/dev/null
```

- [ ] **Step 4: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 5: Commit (chained)**

```bash
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): delete static data files (4 JSONs + CSV + dev.db)

Per spec §5.6. After PR4 cut UI over to /api/bitcoin-prices, the
static JSON files at public/data/bitcoin/*.json are no longer read
by any consumer. Deleted:
- public/data/bitcoin/daily.json
- public/data/bitcoin/weekly.json
- public/data/bitcoin/monthly.json
- public/data/bitcoin/ath.json
- public/btc-price-history.csv (the original CSV seed source)
- prisma/dev.db (committed SQLite from pre-Postgres era; DATABASE_URL
  has pointed at Vercel Postgres since PR1)

scripts/regenerate-static-json.ts (the PR1 one-shot that bridged DB
to JSON) also deleted — its purpose is gone.

NOTE: prisma/dev.db is recoverable from the pre-pr5-cleanup-snapshot
tag if anyone needs the SQLite snapshot back for archaeology.
EOF
)"
```

---

## Task 5: Delete Old Code Folders (`lib/price-engine/`, `app/simulation/data/`)

**Files:**
- Delete: `lib/price-engine/` (entire folder)
- Delete: `app/simulation/data/` (entire folder)

- [ ] **Step 1: Verify no production import**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
grep -rEn "from ['\"].*lib/price-engine|import\(['\"].*lib/price-engine|require\(['\"].*lib/price-engine" \
  --include='*.ts' --include='*.tsx' src/ app/ lib/ 2>/dev/null \
  | grep -v "node_modules"
grep -rEn "from ['\"].*app/simulation/data|import\(['\"].*app/simulation/data|require\(['\"].*app/simulation/data" \
  --include='*.ts' --include='*.tsx' src/ app/ lib/ 2>/dev/null \
  | grep -v "node_modules"
```

Expected: empty.

- [ ] **Step 2: Delete folders**

```bash
git rm -r lib/price-engine/
git rm -r app/simulation/data/
```

- [ ] **Step 3: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 4: Commit (chained)**

```bash
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): delete lib/price-engine + app/simulation/data folders

Per spec §5.6. Both folders were parallel attempts at the data layer:
- lib/price-engine/ (older — index/historical-data-loader/database-
  historical-loader/chart-merger/projection-generator/performance-
  monitor/models/types) was consolidated into src/modules/price-data/
  during PR3.
- app/simulation/data/ (AutoUpdateService, bitcoinApiService,
  csvUpdateManager, database/) related to old data-loading pipeline.

Verified zero production imports.
EOF
)"
```

---

## Task 6: Delete Localization Services (7 files)

**Files (all unused per PR1 inventory):**
- Delete: `lib/services/integration-service.ts`
- Delete: `lib/services/pattern-matcher.ts`
- Delete: `lib/services/reporting-service.ts`
- Delete: `lib/services/string-detection-service.ts`
- Delete: `lib/services/translation-key-generator.ts`
- Delete: `lib/services/validation-service.ts`
- Delete: `lib/services/types/localization.ts` (and the `types/` folder if empty after)

- [ ] **Step 1: Verify zero imports outside their own __tests__/**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
grep -rEn "(from |import\(|require\()['\"][^'\"]*(integration-service|pattern-matcher|reporting-service|string-detection-service|translation-key-generator|validation-service|types/localization)" \
  --include='*.ts' --include='*.tsx' \
  src/ app/ lib/ 2>/dev/null \
  | grep -v "node_modules"
```

Expected: only matches in `lib/services/__tests__/` for the test files of these services — those go too.

- [ ] **Step 2: Delete files + their tests**

```bash
git rm lib/services/integration-service.ts \
       lib/services/pattern-matcher.ts \
       lib/services/reporting-service.ts \
       lib/services/string-detection-service.ts \
       lib/services/translation-key-generator.ts \
       lib/services/validation-service.ts \
       lib/services/types/localization.ts
git rm lib/services/__tests__/pattern-matching.test.ts 2>/dev/null
git rm lib/services/__tests__/translation-key-generator.test.ts 2>/dev/null
# Add any other localization test files found in Step 1.
```

If `lib/services/types/` is now empty, it'll auto-vanish from git's POV.

- [ ] **Step 3: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 4: Commit (chained)**

```bash
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): delete 7 dead localization services

Per spec §5.6. PR1's inventory found these services have zero
production imports — they were build-time tooling for an i18n
extraction pipeline that never shipped:

- integration-service.ts
- pattern-matcher.ts
- reporting-service.ts
- string-detection-service.ts
- translation-key-generator.ts
- validation-service.ts
- types/localization.ts

Plus their __tests__/. Out of scope of the data refactor but they
were sitting next to the legacy data services and deserved to go.
EOF
)"
```

---

## Task 7: Delete Root-Level Scripts (~17 files)

**Files (per spec §5.6):**
- `analyze-api-status.ts`
- `api-based-data-insert.ts`
- `backup-data-inserter.ts`
- `bitcoin-price-backup.json`
- `bitcoin-price-insert.sql`
- `check-database-schema.ts`
- `check-db.ts`
- `comprehensive-database-fix.ts`
- `debug-api-issues.ts`
- `direct-database-insert.ts`
- `direct-postgres-seeder.ts`
- `final-gap-filling-process.ts`
- `final-verification.ts`
- `resume-gap-filling.ts`
- `simple-gap-filler.ts`
- `test-*.ts` and `test-*.js` files at root (multiple)

- [ ] **Step 1: List candidates + cross-check `package.json`**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
ls *.ts *.js *.json *.sql 2>/dev/null | grep -E "^(analyze|api-based|backup|bitcoin-price|check|comprehensive|debug|direct|final|resume|simple|test)" | head -30

grep -E "\"(test-|analyze-|api-based|backup-data|check-|comprehensive|debug|direct|final|resume|simple)" package.json
```

Expected: package.json grep returns nothing. If something matches, leave that file and update `package.json` instead.

- [ ] **Step 2: Delete them**

```bash
git rm analyze-api-status.ts \
       api-based-data-insert.ts \
       backup-data-inserter.ts \
       bitcoin-price-backup.json \
       bitcoin-price-insert.sql \
       check-database-schema.ts \
       check-db.ts \
       comprehensive-database-fix.ts \
       debug-api-issues.ts \
       direct-database-insert.ts \
       direct-postgres-seeder.ts \
       final-gap-filling-process.ts \
       final-verification.ts \
       resume-gap-filling.ts \
       simple-gap-filler.ts 2>/dev/null

# All test-*.ts and test-*.js at root
for f in test-*.ts test-*.js; do
  [ -f "$f" ] && git rm "$f"
done
```

- [ ] **Step 3: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

Expected: type-check 0 (these scripts were never typecheck-included). Test count stable (root-level scripts weren't run as tests).

- [ ] **Step 4: Commit (chained)**

```bash
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): delete ~17 root-level one-shot scripts

Per spec §5.6. These were ad-hoc debugging/data-seeding scripts from
the v0.dev era (each one-off; no test coverage; no consumer):

- analyze-api-status, api-based-data-insert, backup-data-inserter
- check-database-schema, check-db, comprehensive-database-fix
- debug-api-issues, direct-database-insert, direct-postgres-seeder
- final-gap-filling-process, final-verification, resume-gap-filling
- simple-gap-filler
- All test-*.ts and test-*.js at repo root
- bitcoin-price-backup.json, bitcoin-price-insert.sql

The canonical seed/gap-fill is now scripts/gap-fill-prices.ts (PR1).
Repo root is much cleaner.
EOF
)"
```

---

## Task 8: Delete Misc Dead Files + Move PowerLawEducationalPanel

**Files:**
- Delete: `lib/load-btc-price.ts`
- Delete: `__tests__/library-consolidation-simple.test.ts`
- Delete: `__tests__/library-consolidation.test.ts`
- Delete: `src/components/__tests__/chart-integration.test.tsx`
- Move: `app/simulation/components/PowerLawEducationalPanel.tsx` → `app/simulation/tabs/`, then delete the empty `app/simulation/components/` folder

- [ ] **Step 1: Move PowerLawEducationalPanel to tabs/ folder**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
git mv app/simulation/components/PowerLawEducationalPanel.tsx \
       app/simulation/tabs/PowerLawEducationalPanel.tsx
```

Find any consumer of this file:
```bash
grep -rn "PowerLawEducationalPanel" --include="*.ts" --include="*.tsx" app/ src/ 2>/dev/null | grep -v "node_modules"
```

Update each consumer's import path from `'./components/PowerLawEducationalPanel'` (or `'../../components/PowerLawEducationalPanel'`) to the new path under `tabs/`. Edit accordingly.

- [ ] **Step 2: Delete the now-empty `app/simulation/components/` folder**

```bash
ls app/simulation/components/ 2>/dev/null
# Should be empty
rmdir app/simulation/components/ 2>/dev/null
```

(git tracks files, not folders — empty dir vanishes naturally.)

- [ ] **Step 3: Delete `lib/load-btc-price.ts` + its 2 obsolete tests**

```bash
git rm lib/load-btc-price.ts
git rm __tests__/library-consolidation-simple.test.ts 2>/dev/null
git rm __tests__/library-consolidation.test.ts 2>/dev/null
```

- [ ] **Step 4: Delete dead `chart-integration.test.tsx`**

```bash
git rm src/components/__tests__/chart-integration.test.tsx 2>/dev/null
```

- [ ] **Step 5: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 6: Commit (chained)**

```bash
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(cleanup): delete misc dead files; move PowerLawEducationalPanel

Per spec §5.6 + PR4 review.

- lib/load-btc-price.ts: PR1 audit found only 2 obsolete test files
  imported it. The /api/bitcoin-prices/current endpoint it called is
  itself deleted in this PR's Task 2.
- __tests__/library-consolidation*.test.ts: tested the deleted lib.
- src/components/__tests__/chart-integration.test.tsx: PR4 review
  found this file imports app/simulation/components/charts/* paths
  that don't exist. Dead.
- app/simulation/components/PowerLawEducationalPanel.tsx: only file
  in the otherwise-empty components/ folder. Moved to tabs/, folder
  deleted. Consumers updated to new path.
EOF
)"
```

---

## Task 9: (Reserved — Adapter Extraction Lives in PR5a)

> **NOTE:** Adapter extraction (`PricePoint → HistoricalDataPoint` shared utility) was the original Plan 5's Task 10. It has been moved to its own prerequisite PR — see `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5a-adapter-extraction.md`.
>
> **Verify PR5a is merged on `main` BEFORE starting PR5** — Task 0.5 of this plan is the gate that confirms it.
>
> Skip directly to Task 10.

---

## Task 10: Stale Comments + JSDoc Sweep

**Files (concrete from a reproducible grep — see Step 1):**
- Modify: `app/simulation/tabs/parameters/BasicParametersCard.tsx` (line ~50 stale comment)
- Modify: `app/simulation/tabs/parameters/PriceDropToleranceCard.tsx` (line ~52 stale comment)
- Modify: `app/simulation/SimulationPage.tsx` (line ~152 Phase 1 changelog)
- Modify: `src/modules/__tests__/phase-2-integration.test.ts` (lines 74-76 stale comment + unused import line ~11)
- Modify: `src/modules/price-data/index.ts` (line ~20 stale JSDoc with old hook return shape)
- Modify: `src/modules/price-data/README.md` (if it documents the old hook)
- Modify: `src/modules/price-data/API.md` (if it documents the old hook)

- [ ] **Step 1: Reproducible "find all stale references" grep**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5

TARGETS_FOR_COMMENTS='useCentralizedData|useATH|useHistoricalData|centralized-data-service|ath-service|bitcoin-json-data-service|DataServiceProvider|ATHData|/api/bitcoin-prices/(current|historical|stats)|btc-price-history\.csv|public/data/bitcoin|lib/price-engine'

grep -rnE "$TARGETS_FOR_COMMENTS" \
  --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mjs' \
  src/ app/ lib/ scripts/ 2>/dev/null \
  | grep -v "node_modules\|\.next"
```

**Triage rule:**
- Match in `src/`, `app/`, `lib/` source files (`.ts`/`.tsx`/`.mjs`) → **STALE — fix it.** The referenced symbol/file no longer exists post-Task 2.
- Match in `src/modules/price-data/README.md` or `API.md` → fix if it documents the OLD hook return shape; leave alone if it documents the NEW one.
- Match in `docs/superpowers/specs/`, `docs/superpowers/plans/`, `docs/superpowers/improvement-suggestions.md` → **LEAVE ALONE.** These document history (the spec/plan deliberately mention the legacy code that this very PR removes).

- [ ] **Step 2: Fix each stale reference**

For each Class A match (source-code stale comment), edit to reflect post-PR4 / post-Task 2 reality.

Concrete edits expected:
- `BasicParametersCard.tsx:~50` — comment mentioning `useCentralizedData hook`: rewrite as "Reads current price via PR3's usePriceData() SWR hook"
- `PriceDropToleranceCard.tsx:~52` — same kind of stale `useCentralizedData` reference: same kind of fix
- `SimulationPage.tsx:~152` — Phase 1 changelog comment block (the giant `🎉 PHASE 1 MIGRATION COMPLETE!` doc-comment): either delete entirely (recommended — it's a v0.dev artifact) or trim to a one-line "PR1 modularization → PR3-PR5 data refactor — see specs"
- `phase-2-integration.test.ts:74-76` — comment "usePriceData hook test removed due to infinite loop" — that bug is fixed in PR3; delete the comment AND any unused `usePriceData` import on line ~11
- `src/modules/price-data/index.ts:~20` — JSDoc shows old hook return shape; update to `{ prices, currentPrice, ath, lastUpdated, isStale, isLoading, error, refresh }`

For `README.md` and `API.md`:
```bash
head -80 src/modules/price-data/README.md
head -80 src/modules/price-data/API.md
```
If they document the old hook return shape, do a quick rewrite. If they're vast and out of scope, fix only the explicitly-wrong examples and leave a TODO at the top of the doc; flag in the PR description.

- [ ] **Step 3: Re-run the grep — confirm only doc/spec matches remain**

```bash
grep -rnE "$TARGETS_FOR_COMMENTS" \
  --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mjs' \
  src/ app/ lib/ scripts/ 2>/dev/null \
  | grep -v "node_modules\|\.next"
```

Expected: zero hits in `src/`, `app/`, `lib/` source files (any remaining hits are intentional historical references inside docstrings — read each and confirm).

- [ ] **Step 4: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 5: Commit (chained)**

```bash
git add app/simulation/tabs/parameters/BasicParametersCard.tsx \
        app/simulation/tabs/parameters/PriceDropToleranceCard.tsx \
        app/simulation/SimulationPage.tsx \
        src/modules/__tests__/phase-2-integration.test.ts \
        src/modules/price-data/index.ts \
        src/modules/price-data/README.md \
        src/modules/price-data/API.md
pnpm type-check && git commit -m "$(cat <<'EOF'
docs: update stale comments + JSDoc post-PR4 cut-over

Per PR3+PR4 improvement-suggestions tracker.

- BasicParametersCard.tsx: drop stale useCentralizedData reference
- PriceDropToleranceCard.tsx: drop stale useCentralizedData reference
- SimulationPage.tsx: drop Phase 1 changelog referencing old hooks
- phase-2-integration.test.ts: drop 'infinite loop' comment (fixed in
  PR3) and the unused usePriceData import
- src/modules/price-data/index.ts: JSDoc updated to new hook return
  shape ({ prices, currentPrice, ath, lastUpdated, isStale, isLoading,
  error, refresh })
- README.md / API.md: quick sweep for old-hook-shape examples
EOF
)"
```

---

## Task 11: Local Smoke

**Files:** None — verification only.

After all the deletes + the comment sweep, verify the system still runs.

- [ ] **Step 1: Start dev server**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
set -a; source .env.local; set +a
pnpm dev > /tmp/dev.log 2>&1 &
SERVER_PID=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  grep -q "Ready" /tmp/dev.log && break || sleep 2
done
grep "Ready" /tmp/dev.log || { echo "dev server failed"; tail -30 /tmp/dev.log; kill $SERVER_PID 2>/dev/null; exit 1; }
PORT=$(grep -oE "http://localhost:[0-9]+" /tmp/dev.log | head -1 | grep -oE "[0-9]+$")
```

- [ ] **Step 2: Verify endpoints**

```bash
curl -s "http://localhost:$PORT/api/bitcoin-prices?from=2026-05-01&to=2026-05-04" | head -c 500
echo
curl -s -o /dev/null -w "/simulation: HTTP %{http_code}\n" "http://localhost:$PORT/simulation"
```

Expected: API returns valid JSON; /simulation 200.

- [ ] **Step 3: Confirm none of the deleted nested API routes respond**

```bash
for path in current historical stats update daily-update comprehensive-gap-fill regenerate-json; do
  curl -s -o /dev/null -w "/api/bitcoin-prices/$path: HTTP %{http_code}\n" "http://localhost:$PORT/api/bitcoin-prices/$path"
done
```

Expected: every line shows HTTP 404 (route deleted; Next.js no longer serves it).

- [ ] **Step 4: Stop server**

```bash
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null || true
```

- [ ] **Step 5: No commit (verification-only)**

---

## Task 12: Push + PR + Vercel Verify

**Files:** None — git/Vercel work only.

- [ ] **Step 1: Final pre-push verification**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5
pnpm type-check 2>&1 | tail -3
pnpm test --run 2>&1 | tail -8
```

Expected: 0 type errors. Tests passing count will be lower than PR4 (deleted ~30+ test files); failing count should not grow above PR4's baseline of ~110.

- [ ] **Step 2: Local build to COMPLETION**

```bash
set -a; source .env.local; set +a
pnpm build 2>&1 | tail -50
```

- **Success**: `Build Completed`. Route table no longer lists the 7 nested `/api/bitcoin-prices/*` routes.
- **Windows-only EPERM** after the build is done: acceptable.
- **Real failure**: STOP. Note that `next.config.mjs` has `typescript.ignoreBuildErrors: true`, so build won't catch type errors — but `pnpm type-check` (Step 1) does, and was already chained into every commit.

- [ ] **Step 3: Push**

```bash
git push --set-upstream origin feature/pr5-cleanup 2>&1 | tail -5
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "PR5: Bitcoin price data refactor — the big delete (cleanup)" \
  --body "$(cat <<'EOF'
## Summary

PR5 of 5 in the Bitcoin price data refactor. This is **the big delete** — ~45 files of dead code removed, plus stale comment cleanup. After this PR, the price-data refactor is complete: single coherent path from Postgres → API → SWR hook → UI.

**Prerequisite:** PR5a (adapter extraction) must be merged on `main` first — verified by Task 0.5 of this plan.

Spec: `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`
Plan: `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5-cleanup.md`
Prerequisite plan: `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5a-adapter-extraction.md`

## Deletes

**Atomic data-layer purge** (single commit — Task 2/3): 10 services + 3 hooks + 1 provider + 7 nested API routes + their tests + the one consumer fix in `SimulationPage.tsx` (removed `<DataServiceProvider>`).

**6 static data files** (4 JSONs, btc-price-history.csv, prisma/dev.db).

**Old code folders:** `lib/price-engine/`, `app/simulation/data/`.

**7 dead localization services** (`integration-service`, `pattern-matcher`, `reporting-service`, `string-detection-service`, `translation-key-generator`, `validation-service`, `types/localization.ts`).

**~17 root-level scripts** (one-off debug/seed scripts from v0.dev era).

**Misc:** `lib/load-btc-price.ts`, dead `chart-integration.test.tsx`, 2 obsolete library-consolidation tests, `app/simulation/components/` folder (after moving its lone file).

## Stale comment / JSDoc sweep

Updated 5+ files referencing the old hook return shape or pre-PR3 architecture. Source-code comments only — `docs/superpowers/specs/` and `improvement-suggestions.md` left alone (they document history).

## Side benefits

- **The 4th `$124,277.98` hardcoded fallback dies** with `useATH.ts`. Zero references to the stale value remain anywhere in the repo.
- Repo is ~600 KB lighter (mostly the JSON snapshots + dev.db).
- ~30 fewer files in `lib/services/`, `app/simulation/`, and project root.

## Test plan

- [x] Type-check: 0 errors (chained into every commit, since `next.config.mjs` has `typescript.ignoreBuildErrors: true`)
- [x] Test suite: passing count drops (deleted test files are gone), failing count stable
- [x] Local: read endpoint serves data; /simulation loads; deleted nested routes return 404
- [ ] Vercel preview build green (see post-merge concerns below)
- [ ] After merge: prod app behavior unchanged from PR4+PR5a (confirms deletes didn't hit anything actually used)

## Post-merge concerns to watch (24h)

- Vercel error reports for any 404s on deleted `/data/bitcoin/*.json` paths (would indicate a stale browser/CDN cache or an undocumented external consumer).
- Vercel error reports for any 404s on deleted `/api/bitcoin-prices/{nested}` routes.
- If any unexpected 404 spikes appear: roll back via the snapshot tag (see Rollback section in plan).

## What's left after PR5 (improvement-suggestions backlog)

A handful of non-deletion follow-ups stay open in `docs/superpowers/improvement-suggestions.md`:
- Pre-existing `PowerLawModel.toFixed` runtime crash (line 268)
- `useCalculations` ATH placeholder
- `<PriceDataBridge>` co-location refactor
- act() warnings in tests
- Various minor code-quality items
- Long-term: chart consumers migrate to `PricePoint` directly (then the PR5a adapter utility itself becomes deletable)

These aren't part of the price-data refactor; PR5 is the formal close-out of the refactor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for Vercel preview build**

```bash
PR_NUM=$(gh pr view --json number --jq .number)
until gh pr checks $PR_NUM --json bucket 2>/dev/null | jq -e 'length > 0 and all(.[]; .bucket != "pending")' >/dev/null; do
  sleep 15
done
gh pr checks $PR_NUM
```

**If the FIRST preview build fails with `Module not found`:** this is most likely Vercel's build cache holding a stale graph. Mitigation: in the Vercel UI, click **Redeploy** on the failed preview and **uncheck "Use Build Cache"**. Re-check status. If it fails again with the same error, the issue is real — `vercel inspect $DEPLOY_ID --logs`, fix in a new commit, push.

- [ ] **Step 6: Smoke-test the preview deployment**

If preview is publicly accessible (no Vercel SSO):

```bash
PREVIEW_URL=$(gh pr view --json comments --jq '.comments[].body' 2>&1 | grep -oE 'https://[a-z0-9-]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "Preview: $PREVIEW_URL"

# Read endpoint must return >100 rows (full historical range)
curl -s "$PREVIEW_URL/api/bitcoin-prices?from=2025-01-01&to=2026-05-05" \
  | python3 -c "import sys, json; data = json.load(sys.stdin); rows = data.get('prices') or data.get('data') or data; print('rows:', len(rows) if isinstance(rows, list) else 'unknown shape:', list(data.keys()) if isinstance(data, dict) else type(data))"

# Deleted nested routes must 404
for path in current historical stats; do
  curl -s -o /dev/null -w "/api/bitcoin-prices/$path: HTTP %{http_code}\n" "$PREVIEW_URL/api/bitcoin-prices/$path"
done
```

Expected: read endpoint returns >100 rows; each deleted route returns HTTP 404.

If preview is SSO-gated: `curl` will get a 401 — that's fine, the build-green check is the gate; smoke-test on prod after merge.

- [ ] **Step 7: Watch Vercel error reports for 24h post-merge**

After the user merges, monitor:
```bash
gh run list --branch main --limit 3  # confirm post-merge production deploy succeeded
```

Then for the next 24h, periodically check Vercel's error/log dashboard for:
- 404s on `/data/bitcoin/*.json` (means a stale browser cache or surprise external consumer)
- 404s on the 7 deleted nested API routes
- New runtime errors in production traces

If any unexpected error spike: roll back per the Rollback section.

- [ ] **Step 8: Report. User reviews + merges (squash).**

---

## Rollback

If PR5 lands and breaks production, here are the recovery options in order of preference:

1. **Single revert** (simplest — squash-merged PR is one commit on main):
   ```bash
   git revert -m 1 <merge-sha>
   git push origin main
   ```
   Recovers everything (all the deletes come back together).

2. **Snapshot tag**: `pre-pr5-cleanup-snapshot` was pushed to origin BEFORE this PR was opened. To roll back to that exact tree state:
   ```bash
   git fetch --tags origin
   git checkout pre-pr5-cleanup-snapshot -- .
   git commit -m "revert: restore pre-PR5 tree from snapshot"
   git push origin main
   ```

3. **Per-task bisect** (if breakage is subtle and not caused by all the deletes):
   Each task in this plan is its own commit. `git bisect` between the merge SHA and the snapshot tag isolates the breaking task — useful when a specific delete (e.g., a config file we missed) caused the issue.
   ```bash
   git bisect start <merge-sha> pre-pr5-cleanup-snapshot
   # vercel deploy + smoke test at each step
   ```

4. **Backup of `prisma/dev.db`**: NOT taken as a separate artifact — file was committed to git and is fully recoverable from `pre-pr5-cleanup-snapshot` if anyone ever needs the dev SQLite snapshot back for archaeology. Production has been on Vercel Postgres since PR1; nothing in production depends on `dev.db`.

5. **Vercel dashboard rollback** (fastest for production-only issues): Vercel UI → Deployments → previous successful deployment → "Promote to Production". Buys time to investigate without touching git.

---

## Self-Review Checklist

**Spec coverage** (every spec §5.6 deletion has a task):
- [x] 10 legacy data-layer services → Task 2 (atomic data-layer purge)
- [x] 7 dead localization services → Task 6
- [x] 3 legacy hooks (incl. disambiguated `app/simulation/hooks/useHistoricalData.ts`) → Task 2
- [x] 7 old API routes → Task 2 (atomic data-layer purge)
- [x] 4 static JSON files + CSV + dev.db → Task 4
- [x] `lib/price-engine/` folder → Task 5
- [x] `app/simulation/data/` folder → Task 5
- [x] ~17 root-level scripts → Task 7
- [x] `app/simulation/components/` folder + PowerLawEducationalPanel move → Task 8
- [x] `lib/load-btc-price.ts` + 2 obsolete tests → Task 8

**Carry-forward improvement-suggestions:**
- [x] PR3: ATHData duplication → resolved by Task 2 (deletes legacy `ath-service.ts` which holds the legacy definition)
- [x] PR4: 4th hardcoded `$124,277.98` fallback → resolved by Task 2 (deletes `useATH.ts`)
- [x] PR4: adapter duplication → MOVED to PR5a (prerequisite PR — see Task 9 note)
- [x] PR4: dead `chart-integration.test.tsx` → Task 8
- [x] PR4: stale comments + JSDoc → Task 10
- [x] PR3: README.md / API.md document old shape → Task 10

**Red-team validation findings (all addressed):**
- [x] Task 0.5 pre-flight verification gate exists (Red-Team Blocker #1)
- [x] Task 1 import audit covers `from`, dynamic `import()`, `require`, `vi.mock`, `jest.mock` (Red-Team Blocker #2)
- [x] Tasks 2+3 atomic data-layer purge avoids intermediate broken states (Red-Team Blocker #3)
- [x] `useSimulationRunner-migration.test.ts` and `mockServices.ts` explicitly listed (verified by red-team grep)
- [x] PR4-already-deleted DataServiceProvider tests NOT in delete list
- [x] Hook-name disambiguation callout at top of plan (`app/simulation/hooks/useHistoricalData.ts` vs. `src/modules/price-data/hooks/useHistoricalData.ts`)
- [x] Every commit chained with `pnpm type-check &&` (counters `next.config.mjs ignoreBuildErrors: true`)
- [x] Rollback section added with snapshot tag, revert, bisect, and Vercel dashboard options
- [x] Vercel cache caveat documented in Task 12 (Step 5 mitigation)
- [x] Deletion Manifest table sized in Task 0
- [x] Task 10 stale-comment sweep is reproducible via concrete grep + triage rule

**Placeholder scan:** No "TBD". The Deletion Manifest's `[fill-in-Task-0]` markers are explicitly assigned to Task 0 Step 5 — they are work, not vagueness.

**Type consistency:** No new types introduced; PR3's `HistoricalDataPoint` from `src/modules/price-data/types` remains canonical and is consumed via PR5a's shared adapter utility.

**Defer list (out of PR5 scope, stays in `improvement-suggestions.md`):**
- `useCalculations` ATH placeholder (`calculationsService.ts:800`)
- `<PriceDataBridge>` co-location refactor
- act() warnings in tests
- Pre-existing `PowerLawModel.toFixed` crash
- Magic-number fallback in `BasicParametersCard.tsx:36` (114209 — PR4 review #4 was partially addressed; defer rest)
- Long-term: charts migrate to consume `PricePoint` directly (then the PR5a adapter utility itself becomes deletable)

---

## What Comes After PR5

After PR5 merges, the Bitcoin price data refactor is **complete**. The code path is:

```
Postgres (Vercel/Neon) ←─── Vercel Cron (daily 00:05 UTC)
       │                ←─── GitHub Action (hourly minute 7)
       │                ←─── Lazy refresh on user traffic
       ▼
GET /api/bitcoin-prices (Edge cached, lazy refresh on read)
       │
       ▼
usePriceData() (SWR hook, deduped)
       │
       ▼
ATHAlert + BasicParametersCard + PriceDropToleranceCard +
UnifiedPriceChart + PriceProjectionChart + price-models +
strategy-engine

  (Charts use the shared adapter from PR5a:
   src/modules/price-data/utils/adaptToHistoricalDataPoint.ts)
```

The `improvement-suggestions.md` backlog has ~10 deferred items for follow-up cleanup PRs (PowerLawModel crash, useCalculations placeholder, PriceDataBridge refactor, etc.). Those aren't part of the data refactor — they're independent improvements that surfaced during the work.
