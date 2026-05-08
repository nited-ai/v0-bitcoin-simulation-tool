# Bitcoin Price Data Refactor — PR5a: Adapter Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the byte-identical `PricePoint → HistoricalDataPoint` adapter from 3 chart consumers into a single shared utility, with proper TDD discipline.

**Why this is a separate PR (not part of PR5):** The original Plan 5 bundled this adapter extraction (as Task 10) with ~45 file deletions. Red-team review flagged that mixing a refactor (which deserves TDD) with a pure deletion PR violates separation of concerns and makes review harder. PR5a is the surgical refactor; PR5 (separate, follows this) is the pure deletion.

**Architecture:** Pure refactor. Three files (`SimulationPage.tsx`, `UnifiedPriceChart.tsx`, `PriceProjectionChart.tsx`) currently each contain an inline `useMemo`-wrapped adapter that maps `PricePoint[] → HistoricalDataPoint[]`. PR4 created this duplication intentionally as a transient state. PR5a consolidates them to a single utility at `src/modules/price-data/utils/adaptToHistoricalDataPoint.ts`, exercised by a unit test suite written first (TDD).

**Tech Stack:** No new deps. Vitest for the new test file.

**Spec sections covered:** Carry-forward from `improvement-suggestions.md` PR4 entry on "adapter duplication". This was Task 10 of the original PR5 plan; split out for TDD discipline.

**Out of scope for this PR:**
- Any file deletions (those live in PR5 — strictly follows this PR)
- Migrating chart consumers to consume `PricePoint` directly (the long-term plan; PR5a keeps the adapter so blast radius stays minimal)
- Any other PR4 follow-ups (stale comments, JSDoc — those live in PR5)

**Relationship to PR5:** PR5 is the next PR and assumes PR5a is merged on `main`. PR5's pre-flight verification (Task 0.5) checks that the adapter utility exists and that no inline duplicates remain.

**Why TDD discipline here:** The adapter has a subtle correctness contract — `time` must be the unix-second timestamp of `date + 'T00:00:00Z'`, `volume` is hardcoded to `0` because PR2's API doesn't return it, `source` is hardcoded to `'api'`. A regression in any of those silently corrupts every chart in the app. Tests pin the contract.

---

## File Structure for This PR

```
[CREATE]  src/modules/price-data/utils/adaptToHistoricalDataPoint.ts
[CREATE]  src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts

[MODIFY]  app/simulation/SimulationPage.tsx
[MODIFY]  app/simulation/tabs/price-projection/UnifiedPriceChart.tsx
[MODIFY]  app/simulation/tabs/price-projection/PriceProjectionChart.tsx
```

---

## Task 0: Worktree Setup + Baseline Capture

**Files:** None — environment setup + safety checks.

- [ ] **Step 1: Create worktree from latest main**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool
git fetch origin
git checkout main
git pull --ff-only origin main
git worktree add ../v0-bitcoin-simulation-tool-pr5a -b feature/pr5a-adapter-extraction
cd ../v0-bitcoin-simulation-tool-pr5a
```

Expected: new worktree on branch `feature/pr5a-adapter-extraction` from latest `main` (which includes PR4 merge `b485955`).

- [ ] **Step 2: Install + verify env**

```bash
pnpm install 2>&1 | tail -5
ls .vercel 2>/dev/null || pnpm dlx vercel link --project=v0-bitcoin-simulation-tool --yes 2>&1 | tail -3
pnpm dlx vercel env pull .env.local --environment=development 2>&1 | tail -3
```

- [ ] **Step 3: Capture baseline test count + type-check**

```bash
pnpm test --run 2>&1 | tail -3
pnpm type-check 2>&1 | tail -3
```

Capture: passing/failing test counts. After this PR, total test count must INCREASE (we're adding tests, not removing them). Type-check should be 0 errors throughout.

- [ ] **Step 4: No commit**

---

## Task 1: Verify Duplication Still Exists on `main`

**Files:** None — verification only.

Use a structural-marker grep that does NOT depend on variable names (`p`, `prices`, `historicalData`) — those could be refactored to anything. Match on the load-bearing literals: `volume: 0,` (terminal comma) and `source: 'api'`.

- [ ] **Step 1: Structural-marker grep**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5a
grep -rEn "volume:\s*0,\s*$|source:\s*['\"]api['\"]" \
  --include='*.ts' --include='*.tsx' \
  app/ src/ 2>/dev/null \
  | grep -v "node_modules\|\.next"
```

Expected output (3 inline adapters; 6 lines of matches because each adapter has both `volume: 0,` and `source: 'api'`):

```
app/simulation/SimulationPage.tsx:45:        volume: 0,
app/simulation/SimulationPage.tsx:46:        source: "api",
app/simulation/tabs/price-projection/PriceProjectionChart.tsx:36:        volume: 0,         // PR2's API endpoint doesn't return volume yet
app/simulation/tabs/price-projection/PriceProjectionChart.tsx:37:        source: 'api',     // Single source identifier
app/simulation/tabs/price-projection/UnifiedPriceChart.tsx:121:        volume: 0,         // PR2's API endpoint doesn't return volume yet
app/simulation/tabs/price-projection/UnifiedPriceChart.tsx:122:        source: 'api',     // Single source identifier
```

If the count differs (more or fewer matches in `app/`), STOP — investigate before proceeding. The plan was written against `main` at PR4 merge.

- [ ] **Step 2: Confirm consumer locations of the adapter blocks**

Read the relevant range of each file to confirm the adapter sits inside a `useMemo`:

```bash
sed -n '34,49p' app/simulation/SimulationPage.tsx
sed -n '110,126p' app/simulation/tabs/price-projection/UnifiedPriceChart.tsx
sed -n '25,41p' app/simulation/tabs/price-projection/PriceProjectionChart.tsx
```

Note: line numbers in this plan are accurate as of PR4 merge `b485955` on `main`. If the file shifted, adjust accordingly.

- [ ] **Step 3: No commit**

---

## Task 2: Write Failing Tests First (TDD)

**Files:**
- Create: `src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts`

The implementation file MUST NOT exist yet at this step. Tests will fail with "module not found" — that is the expected RED in the red/green/refactor cycle.

- [ ] **Step 1: Create the test file**

Path: `src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  adaptToHistoricalDataPoint,
  adaptManyToHistoricalDataPoints,
} from '../adaptToHistoricalDataPoint'
import type { PricePoint } from '../../hooks/usePriceData'

describe('adaptToHistoricalDataPoint', () => {
  const samplePricePoint: PricePoint = {
    date: '2025-01-15',
    open: 100_000,
    high: 110_000,
    low: 95_000,
    close: 105_000,
  }

  it('produces correct shape from a known PricePoint input', () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result).toEqual({
      time: Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000),
      date: '2025-01-15',
      open: 100_000,
      high: 110_000,
      low: 95_000,
      close: 105_000,
      volume: 0,
      source: 'api',
    })
  })

  it('time field is the unix-second timestamp of date + T00:00:00Z (UTC midnight)', () => {
    // 2025-01-15T00:00:00Z = 1736899200 unix seconds
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.time).toBe(1736899200)
    // Sanity: time * 1000 round-trips back to the same UTC midnight
    expect(new Date(result.time * 1000).toISOString()).toBe('2025-01-15T00:00:00.000Z')
  })

  it('volume is hardcoded 0 (PR2 API does not return volume)', () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.volume).toBe(0)
  })

  it("source is hardcoded 'api' (single source identifier for API-derived rows)", () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.source).toBe('api')
  })

  it('handles leap-day date (2024-02-29) correctly', () => {
    const leapDay: PricePoint = {
      date: '2024-02-29',
      open: 60_000,
      high: 62_000,
      low: 59_000,
      close: 61_500,
    }
    const result = adaptToHistoricalDataPoint(leapDay)
    // 2024-02-29T00:00:00Z = 1709164800 unix seconds
    expect(result.time).toBe(1709164800)
    expect(result.date).toBe('2024-02-29')
  })
})

describe('adaptManyToHistoricalDataPoints', () => {
  it('maps an array preserving order', () => {
    const points: PricePoint[] = [
      { date: '2025-01-01', open: 90_000, high: 92_000, low: 89_000, close: 91_500 },
      { date: '2025-01-02', open: 91_500, high: 93_000, low: 91_000, close: 92_750 },
      { date: '2025-01-03', open: 92_750, high: 94_500, low: 92_000, close: 93_900 },
    ]
    const result = adaptManyToHistoricalDataPoints(points)
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe('2025-01-01')
    expect(result[1].date).toBe('2025-01-02')
    expect(result[2].date).toBe('2025-01-03')
    // Spot-check that each entry was adapted (not just copied through)
    expect(result[0].volume).toBe(0)
    expect(result[2].source).toBe('api')
  })

  it('returns an empty array for empty input', () => {
    expect(adaptManyToHistoricalDataPoints([])).toEqual([])
  })

  it('produces the same result as mapping adaptToHistoricalDataPoint individually', () => {
    const points: PricePoint[] = [
      { date: '2025-01-01', open: 90_000, high: 92_000, low: 89_000, close: 91_500 },
      { date: '2025-01-02', open: 91_500, high: 93_000, low: 91_000, close: 92_750 },
    ]
    expect(adaptManyToHistoricalDataPoints(points)).toEqual(
      points.map(adaptToHistoricalDataPoint),
    )
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL with "module not found"**

```bash
pnpm test --run src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts 2>&1 | tail -20
```

Expected: error message containing "Cannot find module" or "Failed to resolve import" pointing at `../adaptToHistoricalDataPoint`. This is the RED step — proceed to GREEN in Task 3.

If the test passes (impossible if the file doesn't exist), STOP — something is wrong.

- [ ] **Step 3: No commit yet** — TDD says we commit only after GREEN.

---

## Task 3: Implement the Utility to Make Tests Pass (GREEN)

**Files:**
- Create: `src/modules/price-data/utils/adaptToHistoricalDataPoint.ts`

- [ ] **Step 1: Create the utility file**

Path: `src/modules/price-data/utils/adaptToHistoricalDataPoint.ts`

```typescript
// src/modules/price-data/utils/adaptToHistoricalDataPoint.ts
//
// PR4 introduced 3 inline copies of this adapter in chart consumers
// (SimulationPage, UnifiedPriceChart, PriceProjectionChart). PR5a extracts
// to a single utility. Charts call this when they need the legacy
// HistoricalDataPoint shape (with time/volume/source fields) from the new
// PricePoint shape that GET /api/bitcoin-prices returns.
//
// Long-term plan: the chart code itself will migrate to PricePoint, at
// which point this utility becomes unused and can be deleted.
//
import type { PricePoint } from '../hooks/usePriceData'
import type { HistoricalDataPoint } from '../types'

export function adaptToHistoricalDataPoint(p: PricePoint): HistoricalDataPoint {
  return {
    time: Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000),
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: 0,         // PR2's API doesn't return volume yet
    source: 'api',     // Single source identifier for API-derived rows
  }
}

export function adaptManyToHistoricalDataPoints(prices: PricePoint[]): HistoricalDataPoint[] {
  return prices.map(adaptToHistoricalDataPoint)
}
```

- [ ] **Step 2: Run the test — expect PASS (GREEN)**

```bash
pnpm test --run src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts 2>&1 | tail -15
```

Expected: 8 passing tests in this file (4 in `adaptToHistoricalDataPoint` + 3 in `adaptManyToHistoricalDataPoints` + the leap-day case). Total may differ if you split assertions differently — the bar is "all tests in this file pass".

If any test fails: read the diff, fix the implementation (NOT the test). Repeat until green.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit (chained typecheck — `next.config.mjs` ignores build errors, so we MUST gate commits on `pnpm type-check`)**

```bash
git add src/modules/price-data/utils/adaptToHistoricalDataPoint.ts \
        src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts
pnpm type-check && git commit -m "$(cat <<'EOF'
feat(price-data): add shared adapter utility with tests

PR5a Task 3. Extracted the byte-identical PricePoint → HistoricalDataPoint
adapter that PR4 inlined in 3 chart consumers. New utility lives at
src/modules/price-data/utils/adaptToHistoricalDataPoint.ts and exports:

  - adaptToHistoricalDataPoint(p: PricePoint): HistoricalDataPoint
  - adaptManyToHistoricalDataPoints(prices: PricePoint[]): HistoricalDataPoint[]

TDD discipline: tests written first (RED), implementation second (GREEN).
Tests pin the load-bearing contract:

  - time field is unix-seconds of (date + 'T00:00:00Z')
  - volume hardcoded to 0 (PR2 API doesn't return it)
  - source hardcoded to 'api'
  - leap-day date is handled correctly

Tasks 4-6 will replace each inline adapter with a call to this utility.
EOF
)"
```

---

## Task 4: Replace Inline Adapter in `SimulationPage.tsx`

**Files:**
- Modify: `app/simulation/SimulationPage.tsx`

- [ ] **Step 1: Read the current adapter block**

Confirm lines 34–49 still match the find pattern below before editing.

- [ ] **Step 2: Apply find/replace**

**Find (in `app/simulation/SimulationPage.tsx` near line 34):**

```typescript
  // Adapt PR3's PricePoint[] to the legacy HistoricalDataPoint[] shape that
  // SimulationContext consumers (chart, price engine, etc.) expect.
  const historicalData = useMemo<HistoricalDataPoint[]>(
    () =>
      prices.map((p) => ({
        time: Math.floor(new Date(p.date + "T00:00:00Z").getTime() / 1000),
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: 0,
        source: "api",
      })),
    [prices],
  )
```

**Replace with:**

```typescript
  // Adapt PR3's PricePoint[] to the legacy HistoricalDataPoint[] shape that
  // SimulationContext consumers (chart, price engine, etc.) expect.
  const historicalData = useMemo<HistoricalDataPoint[]>(
    () => adaptManyToHistoricalDataPoints(prices),
    [prices],
  )
```

**Add import** at the top of the file (after the existing `usePriceData` import on line 8):

```typescript
import { adaptManyToHistoricalDataPoints } from "@/src/modules/price-data/utils/adaptToHistoricalDataPoint"
```

- [ ] **Step 3: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -5
pnpm test --run 2>&1 | tail -5
```

Expected: 0 type errors. Test count UP by 8+ (the new adapter tests). No new failures.

- [ ] **Step 4: Commit (chained)**

```bash
git add app/simulation/SimulationPage.tsx
pnpm type-check && git commit -m "$(cat <<'EOF'
refactor(simulation): use shared adapter in SimulationPage

PR5a Task 4. Replaced the inline PricePoint → HistoricalDataPoint adapter
inside PriceDataBridge with a call to adaptManyToHistoricalDataPoints
(introduced in PR5a Task 3). Behavior unchanged — same output, single
source of truth.
EOF
)"
```

---

## Task 5: Replace Inline Adapter in `UnifiedPriceChart.tsx`

**Files:**
- Modify: `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx`

- [ ] **Step 1: Apply find/replace**

**Find (in `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx` near line 110):**

```typescript
  // Adapter: map new shape to legacy HistoricalDataPoint shape that downstream code expects.
  // PR5 will simplify by deleting the legacy HistoricalDataPoint type.
  const historicalData: HistoricalDataPoint[] = useMemo(
    () =>
      prices.map(p => ({
        time: Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000),
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: 0,         // PR2's API endpoint doesn't return volume yet
        source: 'api',     // Single source identifier
      })),
    [prices]
  )
```

**Replace with:**

```typescript
  // Adapter: map new shape to legacy HistoricalDataPoint shape that downstream code expects.
  const historicalData: HistoricalDataPoint[] = useMemo(
    () => adaptManyToHistoricalDataPoints(prices),
    [prices]
  )
```

**Add import** alongside the existing `usePriceData` import (after line 12):

```typescript
import { adaptManyToHistoricalDataPoints } from '@/src/modules/price-data/utils/adaptToHistoricalDataPoint'
```

- [ ] **Step 2: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -5
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 3: Commit (chained)**

```bash
git add app/simulation/tabs/price-projection/UnifiedPriceChart.tsx
pnpm type-check && git commit -m "$(cat <<'EOF'
refactor(charts): use shared adapter in UnifiedPriceChart

PR5a Task 5. Replaced the inline PricePoint → HistoricalDataPoint adapter
with a call to adaptManyToHistoricalDataPoints. Behavior unchanged.
EOF
)"
```

---

## Task 6: Replace Inline Adapter in `PriceProjectionChart.tsx`

**Files:**
- Modify: `app/simulation/tabs/price-projection/PriceProjectionChart.tsx`

- [ ] **Step 1: Apply find/replace**

**Find (in `app/simulation/tabs/price-projection/PriceProjectionChart.tsx` near line 25):**

```typescript
  // Adapter: map new shape to legacy HistoricalDataPoint shape that downstream code expects.
  // PR5 will simplify by deleting the legacy HistoricalDataPoint type.
  const historicalData: HistoricalDataPoint[] = useMemo(
    () =>
      prices.map(p => ({
        time: Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000),
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: 0,         // PR2's API endpoint doesn't return volume yet
        source: 'api',     // Single source identifier
      })),
    [prices]
  )
```

**Replace with:**

```typescript
  // Adapter: map new shape to legacy HistoricalDataPoint shape that downstream code expects.
  const historicalData: HistoricalDataPoint[] = useMemo(
    () => adaptManyToHistoricalDataPoints(prices),
    [prices]
  )
```

**Add import** alongside the existing `usePriceData` import (after line 10):

```typescript
import { adaptManyToHistoricalDataPoints } from '@/src/modules/price-data/utils/adaptToHistoricalDataPoint'
```

- [ ] **Step 2: Type-check + tests**

```bash
pnpm type-check 2>&1 | tail -5
pnpm test --run 2>&1 | tail -5
```

- [ ] **Step 3: Commit (chained)**

```bash
git add app/simulation/tabs/price-projection/PriceProjectionChart.tsx
pnpm type-check && git commit -m "$(cat <<'EOF'
refactor(charts): use shared adapter in PriceProjectionChart

PR5a Task 6. Replaced the inline PricePoint → HistoricalDataPoint adapter
with a call to adaptManyToHistoricalDataPoints. Behavior unchanged.

This was the last of 3 inline duplicates introduced by PR4. After this
commit there is a single source of truth for the adapter at
src/modules/price-data/utils/adaptToHistoricalDataPoint.ts.
EOF
)"
```

---

## Task 7: Final Verification

**Files:** None — verification only.

- [ ] **Step 1: Re-run the structural-marker grep**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5a
grep -rEn "volume:\s*0,\s*$|source:\s*['\"]api['\"]" \
  --include='*.ts' --include='*.tsx' \
  app/ src/ 2>/dev/null \
  | grep -v "node_modules\|\.next"
```

Expected: 2 matches, BOTH inside the new utility file:

```
src/modules/price-data/utils/adaptToHistoricalDataPoint.ts:NN:    volume: 0,         // PR2's API doesn't return volume yet
src/modules/price-data/utils/adaptToHistoricalDataPoint.ts:NN:    source: 'api',     // Single source identifier for API-derived rows
```

ZERO matches in `app/`. If any `app/` match remains: STOP, find it, replace it.

- [ ] **Step 2: Full test suite**

```bash
pnpm test --run 2>&1 | tail -10
```

Expected: passing count UP by 8+ (new adapter tests). No new failures vs. baseline captured in Task 0.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check 2>&1 | tail -3
```

Expected: 0 errors.

- [ ] **Step 4: Production build**

```bash
set -a; source .env.local; set +a
pnpm build 2>&1 | tail -50
```

Expected: `Build Completed`. Windows-only EPERM after the build is done is acceptable. A real build failure (Module not found, syntax error) means STOP and fix.

- [ ] **Step 5: Local smoke**

```bash
set -a; source .env.local; set +a
pnpm dev > /tmp/dev.log 2>&1 &
SERVER_PID=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  grep -q "Ready" /tmp/dev.log && break || sleep 2
done
PORT=$(grep -oE "http://localhost:[0-9]+" /tmp/dev.log | head -1 | grep -oE "[0-9]+$")
curl -s -o /dev/null -w "/simulation: HTTP %{http_code}\n" "http://localhost:$PORT/simulation"
curl -s "http://localhost:$PORT/api/bitcoin-prices?from=2026-04-01&to=2026-05-04" | head -c 300
kill $SERVER_PID 2>/dev/null
```

Expected: `/simulation` → 200; API returns valid JSON.

- [ ] **Step 6: No commit (verification-only)**

---

## Task 8: Push + PR + Vercel Verify + Merge

**Files:** None — git/Vercel work only.

- [ ] **Step 1: Push**

```bash
cd D:/Git/Repos/v0-bitcoin-simulation-tool-pr5a
git push --set-upstream origin feature/pr5a-adapter-extraction 2>&1 | tail -5
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "refactor(price-data): extract PricePoint→HistoricalDataPoint adapter to shared utility" \
  --body "$(cat <<'EOF'
## Summary

Extracts the 3 byte-identical inline `PricePoint → HistoricalDataPoint` adapter blocks introduced by PR4 into a single shared utility at `src/modules/price-data/utils/adaptToHistoricalDataPoint.ts`. Pure refactor — behavior unchanged.

PR4 deliberately created the duplication as a transient state. PR4 review feedback called for consolidation. This PR is the consolidation, with TDD discipline (tests written first, RED → GREEN → refactor).

Spec: `docs/superpowers/specs/2026-05-03-bitcoin-price-data-refactor-design.md`
Plan: `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5a-adapter-extraction.md`
Backlog item: `docs/superpowers/improvement-suggestions.md` (PR4 entry: "adapter duplication")

## Why a separate PR

The original Plan 5 bundled this refactor with ~45 file deletions. Mixing a refactor (which deserves TDD) with a pure deletion PR makes review harder and conflates concerns. PR5a is the surgical refactor; **PR5 (separate, follows this) is the pure deletion**.

## Changes

**New files:**
- `src/modules/price-data/utils/adaptToHistoricalDataPoint.ts` — exports `adaptToHistoricalDataPoint` and `adaptManyToHistoricalDataPoints`
- `src/modules/price-data/utils/__tests__/adaptToHistoricalDataPoint.test.ts` — 8+ tests pinning the contract (time = unix-seconds of UTC midnight, hardcoded volume/source, leap-day handling, array-order preservation)

**Modified consumers (now import the utility):**
- `app/simulation/SimulationPage.tsx`
- `app/simulation/tabs/price-projection/UnifiedPriceChart.tsx`
- `app/simulation/tabs/price-projection/PriceProjectionChart.tsx`

## Verification

- [x] Structural-marker grep (`volume:\s*0,$|source:\s*['\"]api['\"]`) returns 0 hits in `app/`, only the utility file in `src/`
- [x] Type-check: 0 errors
- [x] Test suite: passing count up by 8+ from new tests; no new failures
- [x] Local build: green
- [x] Local smoke: `/simulation` → 200, `/api/bitcoin-prices` returns JSON
- [ ] Vercel preview build green

## Long-term plan

The chart consumers will eventually migrate to consume `PricePoint` directly, at which point this utility becomes unused and gets deleted. That's a future PR — out of scope here. PR5a keeps the legacy `HistoricalDataPoint` shape working unchanged for blast-radius isolation.

## Followed by

PR5 (cleanup / the big delete) — assumes PR5a is merged on `main` first. PR5's pre-flight verification confirms the adapter utility exists.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for Vercel preview build + checks**

```bash
PR_NUM=$(gh pr view --json number --jq .number)
until gh pr checks $PR_NUM --json bucket 2>/dev/null | jq -e 'length > 0 and all(.[]; .bucket != "pending")' >/dev/null; do
  sleep 15
done
gh pr checks $PR_NUM
```

If checks fail: `vercel inspect $DEPLOY_ID --logs`. Common cause for a refactor PR: a stale Vercel build cache referencing the old code shape — redeploy without build cache via the Vercel UI (Redeploy → uncheck "Use Build Cache").

- [ ] **Step 4: Smoke-test the preview deployment**

```bash
PREVIEW_URL=$(gh pr view --json comments --jq '.comments[].body' 2>&1 | grep -oE 'https://[a-z0-9-]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "Preview: $PREVIEW_URL"
# Vercel SSO will 401 curl on protected previews — green build is the gate.
# If preview is public, smoke-test the API:
# curl -s "$PREVIEW_URL/api/bitcoin-prices?from=2026-04-01&to=2026-05-04" | head -c 300
```

- [ ] **Step 5: Report. User reviews + merges (squash).**

After merge, the squash-merge SHA is the rollback target for PR5's pre-flight check.

---

## Self-Review Checklist

**TDD discipline:**
- [x] Tests written first (Task 2)
- [x] Initial RED state confirmed (Task 2 Step 2)
- [x] Implementation written second to make tests pass (Task 3)
- [x] GREEN confirmed before commit (Task 3 Step 2)

**Refactor correctness:**
- [x] Structural-marker grep (volume/source literals) finds the adapter, not variable-name patterns
- [x] After Task 7, ZERO inline duplicates in `app/`
- [x] Adapter contract pinned by tests: time formula, hardcoded volume/source, leap-day, array order

**Type safety:**
- [x] Every commit chained with `pnpm type-check &&` because `next.config.mjs` has `typescript.ignoreBuildErrors: true` — `pnpm build` does NOT catch type errors

**Blast radius:**
- [x] Pure refactor, no deletions, no API changes, no new deps
- [x] Consumers see byte-identical output (tests verify equality with the original inline expressions)
- [x] PR5 is a strict prerequisite consumer — assumes PR5a is on `main`

**No placeholders:** every command, file path, and code block is concrete.

---

## What Comes After PR5a

PR5 (the big delete cleanup) — see `docs/superpowers/plans/2026-05-05-bitcoin-price-data-pr5-cleanup.md`. PR5's pre-flight verification (Task 0.5) checks that PR5a is merged.

After PR5 merges, the price-data refactor is complete. Long-term, the chart consumers should migrate to consume `PricePoint` directly, at which point this adapter utility itself becomes deletable.
