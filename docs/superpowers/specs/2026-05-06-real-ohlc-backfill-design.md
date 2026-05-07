# Real OHLC Backfill — Design

**Date:** 2026-05-06
**Author:** Dmitri + Claude Opus
**Status:** v2 (post-red-team)
**Follow-up to:** Bitcoin Price Data Refactor PR1-5 (`2026-05-03-bitcoin-price-data-refactor-design.md`)

---

## 1. Problem

The `bitcoin_prices` DB table contains 4509 rows from 2014-01-01 → 2026-05-06, but **every row has identical OHLC values** (`open == high == low == close`). The displayed ATH on the Parameters page therefore equals the highest CLOSE in the DB ($124,773 on 2025-10-07), not the highest HIGH.

### Root cause

`scripts/gap-fill-prices.ts:70-79` (the seed/gap-fill script used during PR1's data migration) uses CoinGecko's free-tier `/api/v3/coins/bitcoin/market_chart/range` endpoint, which returns ONLY close prices. The script assigns `open = high = low = close` as a workaround.

Worse: **the live-price provider `binance.ts` `fetchCurrent()` does the same** — it pulls a single live ticker, then writes that as `open=high=low=close` for "today". So even after a backfill, every NEW day's row written by the cron is fake-OHLC again.

A real bull-run candle on 2025-10-07 (per Bitstamp chart) had `H=126,272`, but the DB stores `124,773` — losing $1,498 of intraday wick.

### Spec deviation

The original refactor spec (`2026-05-03`) D5 says: **ATH = MAX(high)**. With fake OHLC, `MAX(high) == MAX(close)`, so the spec is technically satisfied but the displayed value is wrong by the size of the largest intraday wick on the peak day.

---

## 2. Goal

After this fix:

1. **Backfill:** every existing row in `bitcoin_prices` from 2017-08-17 onwards has real daily OHLC sourced from Binance Klines.
2. **Forward-correct:** the live-price provider (`binance.ts` `fetchCurrent`) is changed to use `/api/v3/klines?interval=1d&limit=1` so every NEW day's row written by the cron has real OHLC from the start.
3. Pre-2017 rows are left untouched (existing fake-OHLC values stay; pre-2017 BTC was much lower, doesn't affect ATH).

**Success criteria:**
- New ATH (MAX(high)) on the Parameters page rises by at least the size of the largest 2024-2025 intraday wick.
- For a sample of high-volatility days (2024-03-13 BTC ATH break, 2025-10-07 peak), DB row's `high` matches Bitstamp/TradingView daily candle within $5.
- After backfill, daily cron writes a row with `high > close OR low < close` on volatile days (verifies the live-provider fix).
- Idempotent: re-running the script is a safe no-op-ish operation (same OHLC re-written; only `updatedAt` ticks).

**Non-goals:**
- Backfilling pre-2017 with real OHLC (Binance has no BTCUSDT data before 2017-08-17).
- Re-architecting cron / GitHub Action / lazy refresh.
- Volume-data correctness (volume column unit mismatch is a known issue, deferred).
- Re-architecting the live provider chain. Only `binance.ts:fetchCurrent` changes; fallback providers stay as-is (still close-only, but Binance is first in the chain → almost always wins).

---

## 3. Architecture

### 3.1 Single backfill script (no CoinGecko fallback)

`scripts/backfill-and-seed-prices.ts` replaces `scripts/gap-fill-prices.ts`. Date-range routing:

```
2017-08-17 .. today        → Binance Klines /api/v3/klines (real OHLC)
pre-2017                   → NOT touched by the script
```

**Decision (post-red-team):** dropped CoinGecko branch entirely. Reasons:

1. CoinGecko free tier now restricts `/market_chart/range` to a rolling 365-day window. The original assumption "1 call covers 2013-11 → 2017-08" is no longer valid.
2. Pre-2017 rows already exist in the production DB with close-as-OHLC. They stay as-is — that's acceptable per Dmitri (pre-2017 BTC peaked at ~$20k, irrelevant for current ATH).
3. **Fresh-install case is now a known limitation:** new developers cloning the repo and running `pnpm db:seed` get data from 2017-08-17 onwards only. Documented in script header. Pre-2017 history is not auto-restorable from public APIs anymore.
4. The old `gap-fill-prices.ts` is preserved in git history (commit `<pre-PR6 main>`) — anyone who urgently needs pre-2017 backfill can resurrect it.

### 3.2 Idempotent upsert with JSON snapshot rollback

The script upserts each row by unique `date` key. Prisma `upsert` always issues a SQL statement (no auto-skip on equal data) — this means every `--full` run touches every row's `updatedAt`. For one-shot use that's fine. The cron and seed scripts continue to write only ONE row per call, so the `updatedAt` churn is bounded.

**Rollback strategy (revised post-red-team):** Vercel Postgres / Neon Free tier has zero point-in-time restore. Old script can't undo the change (it's INSERT-only with skipDuplicates). Therefore:

- **Before** `--full`, the script writes a JSON dump: `bitcoin_prices_pre_pr6_<timestamp>.json` containing every existing row.
- **Rollback** = a separate `--restore <jsonfile>` flag that DELETE + bulk-INSERTs from the snapshot.
- The JSON dump is added to `.gitignore` (data only, not source).

### 3.3 Pagination

Binance Klines: max 1500 rows/request with `limit=1500`. Daily candles → 1500 days ≈ 4.1 years. For 2017-08-17 → 2026-05-06 (~3200 days), that's **~3 sequential requests**. Each `klines` call with `limit=1500` is weight 2 (per Binance docs); 3 calls = weight 6, well below the 1200/min budget.

### 3.4 Source attribution

Each row's `source` column reflects where the OHLC came from:
- `'binance-klines-1d'` — real OHLC, written by the backfill script.
- `'binance'` — written by the live-price provider's NEW `fetchCurrent` (which now also uses klines for real OHLC).
- `'coingecko'` — pre-2017 legacy fake-OHLC (already in DB).

After the backfill + live-provider fix, **`'coingecko'` only appears for pre-2017 rows**.

### 3.5 Run modes

CLI flags:
- (no flag) — incremental: detects gap (`MAX(date) + 1 → today`), fetches via Binance, upserts. Used by `pnpm db:seed`.
- `--full` — fetches entire 2017-08-17 → today range, upserts all (production fix mode). **Endpoint constraint: `endTime` = end of yesterday UTC, not today**, to avoid overwriting today's row with a partial mid-day candle that the cron may already have updated.
- `--dry-run` — fetches + parses, computes diff against current DB rows, logs `{date, old_high, new_high, delta}` for the top-50 deltas. Writes nothing. Used pre-production-run to spot-check.
- `--from YYYY-MM-DD --to YYYY-MM-DD` — explicit date range, useful for spot-fixing.
- `--restore <file>` — restore from snapshot (rollback path).

### 3.6 Live provider fix (in-scope, was previously out-of-scope)

`src/modules/price-data/services/PriceSource/providers/binance.ts` currently does:

```typescript
// Before
const r = await fetch(`/api/v3/ticker/price?symbol=BTCUSDT`)
const { price } = await r.json()
return { close: parseFloat(price), high: parseFloat(price), low: parseFloat(price), open: parseFloat(price), source: 'binance' }
```

Change to use `klines` for real OHLC:

```typescript
// After
const r = await fetch(`/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1`)
const [[openTime, open, high, low, close, ...]] = await r.json()
return { close: parseFloat(close), high: parseFloat(high), low: parseFloat(low), open: parseFloat(open), source: 'binance' }
```

This is a 4-line change in 1 file. Tests added alongside.

**Caveat — partial-candle overwrites:** When the cron / lazy-refresh writes "today's" row mid-day, Binance returns the still-developing candle (high so far ≤ eventual final high). On a day where BTC peaks mid-afternoon and falls, the lazy refresh BEFORE the peak would write a row with `high < final_high`. Subsequent refreshes naturally overwrite with the higher value (Prisma upsert, last-write-wins on date). By UTC midnight the candle is final. Acceptable trade-off — no consumer reads "today's" row for ATH purposes during a single day.

---

## 4. Components

### 4.1 `scripts/backfill-and-seed-prices.ts` (new file)

Single file. Responsibilities:
- CLI arg parsing (`--full`, `--dry-run`, `--from`, `--to`, `--restore`)
- JSON snapshot dump before any write in `--full` mode
- Pagination loop for Binance Klines
- Sanity validation: every row has `0 < low ≤ open,close ≤ high < 10_000_000`. Reject and exit non-zero on violation.
- Upsert into `bitcoin_prices` via Prisma
- Summary log: rows fetched, rows updated, rows inserted, new MAX(high) vs old MAX(high)

### 4.2 `src/modules/price-data/services/PriceSource/providers/binance.ts` (modified)

Two changes:
1. Add new export: `fetchHistoricalKlines(from: Date, to: Date): Promise<DailyOHLC[]>`. Reused by the backfill script.
2. Modify existing `fetchCurrent()` to use `/klines?limit=1` instead of `/ticker/price`. Returns real OHLC for the current (in-progress) day.

### 4.3 `package.json` (edits enumerated)

```diff
- "db:seed": "tsx scripts/gap-fill-prices.ts",
+ "db:seed": "tsx scripts/backfill-and-seed-prices.ts",
  ...
  "prisma": {
-   "seed": "tsx scripts/gap-fill-prices.ts"
+   "seed": "tsx scripts/backfill-and-seed-prices.ts"
  }
```

### 4.4 Tests

```
scripts/__tests__/backfill-and-seed-prices.test.ts
  - parseKlinesResponse: 12-field tuple → DailyOHLC (string-to-number coercion explicit)
  - parseKlinesResponse: empty response → empty array
  - parseKlinesResponse: rejects malformed (< 12 fields)
  - paginateKlines: 2-page mock, lastEndTime advances by `1500 * 86_400_000` ms
  - paginateKlines: single page < 1500 rows terminates correctly
  - paginateKlines: respects `endTime = yesterday UTC midnight` for `--full` mode
  - sanityValidate: rejects high < low
  - sanityValidate: rejects values <= 0 or >= 10_000_000
  - dryRunDiff: emits old/new/delta records, writes zero rows
  - snapshotDump: writes valid JSON, file matches DB content

src/modules/price-data/services/PriceSource/providers/__tests__/binance.test.ts
  (extends existing tests if present; otherwise creates new)
  - fetchCurrent: uses /klines endpoint, returns real OHLC from row[0]
  - fetchCurrent: handles Binance string-typed numerics correctly
  - fetchHistoricalKlines: parses Binance 12-tuple response
  - fetchHistoricalKlines: handles empty range, throws on 4xx
```

13+ unit tests. TDD: write failing test, implement, green, refactor.

### 4.5 Deletes

```
scripts/gap-fill-prices.ts                       (replaced)
scripts/__tests__/gap-fill-prices.test.ts        (replaced)
```

The git history preserves these files (commit before PR6) — anyone needing CoinGecko-based pre-2017 backfill can resurrect.

---

## 5. Data Flow

```
                    (production fix one-shot)
                              │
                              ▼
          backfill-and-seed-prices.ts  --full
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       JSON snapshot   Binance /klines  Sanity validate
       dump (rollback)  paginated 1500/call  (reject on weirdness)
                              │
                              └─── upsert(rows)  via Prisma
                                          │
                                          └─── log: inserted=X, updated=Y, ATH old/new
```

```
                    (ongoing daily cron / lazy refresh)
                              │
                              ▼
                  /api/cron/update-prices
                              │
                              ▼
                fetchCurrentWithFallback
                              │
                  binance.fetchCurrent()  ←── now uses /klines?limit=1 (real OHLC)
                              │
                              └─── upsert(today's row)
```

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Binance 4xx/5xx | Retry once with 1s delay; on 2nd failure, throw → script exits non-zero. No partial commit (snapshot already exists). |
| Network timeout (>30s per request) | Throw → script exits non-zero. |
| Sanity validation failure | Reject batch, log offending row(s), exit non-zero. |
| Date validation: from > to | Throw at CLI parse time. |
| `DATABASE_URL` missing | Throw at startup with actionable message ("run `vercel env pull .env.production.local` first"). |
| Partial response (Binance returns 1499 rows when 1500 expected) | Accept; pagination loop continues from `last_returned_openTime + 86_400_000ms`. |
| `--restore` snapshot file malformed | Throw, log invalid line, exit non-zero. No partial restore. |

---

## 7. Testing Strategy

**Unit tests (mocked HTTP + mocked Prisma):** All parser, pagination, sanity, and snapshot logic. ~13 tests.

**No DB integration test in CI** (red-team flagged the SQLite-vs-Postgres impedance). Instead:
- The dry-run mode is tested as a unit test (verifies it writes nothing and emits diff records).
- The `--full` happy path is verified manually in the production preflight (see §8).

**Manual smoke (preflight before production run):**
1. Run `--dry-run` against production DB
2. Inspect top-50 deltas; verify they look plausible (e.g., 2025-10-07 high gains ~$1500)
3. Confirm the new MAX(high) value is sane (not 1e8 or zero)

---

## 8. Production-Fix Preflight Checklist

The one-shot run requires manual coordination because three other writers can target "today's" row:

```
1. Pull production env vars:
   $ vercel env pull .env.production.local --environment=production

2. Pause GitHub Action:
   - Disable .github/workflows/hourly-price-refresh.yml temporarily
     (or run between :08-:59 minute marks to avoid the :07 cron)

3. Verify Vercel cron schedule:
   - Vercel cron runs at 00:05 UTC daily; choose a UTC time outside that

4. Pre-snapshot:
   $ pnpm tsx scripts/backfill-and-seed-prices.ts --dry-run
   ⇒ verify the diff log looks plausible

5. The actual run:
   $ DOTENV_CONFIG_PATH=.env.production.local pnpm tsx scripts/backfill-and-seed-prices.ts --full
   ⇒ JSON snapshot written, Binance fetches, Prisma upsert, summary log

6. Re-enable GitHub Action

7. Verify:
   $ curl https://v0-bitcoin-simulation-tool.vercel.app/api/bitcoin-prices?refresh=force
   ⇒ confirm ath.value > 124773
```

**Endpoint constraint reminder:** `--full` mode sets `endTime` to **yesterday UTC 23:59:59.999** to avoid pulling a partial mid-day candle that would overwrite today's correct row.

---

## 9. Rollback

If the production run produces clearly-wrong output (sanity bounds caught it; or a downstream consumer breaks):

```
$ DOTENV_CONFIG_PATH=.env.production.local pnpm tsx scripts/backfill-and-seed-prices.ts \
    --restore bitcoin_prices_pre_pr6_<timestamp>.json
```

The `--restore` flag DELETEs all rows and INSERTs from the snapshot. Pre-2017 rows return to their pre-PR6 state; post-2017 rows return to fake-OHLC.

**Why this works:** the snapshot is taken BEFORE any write, so `--restore` always returns the DB to exactly its pre-PR6 state. JSON file size for ~4509 rows ≈ 1 MB — easy to keep around as a one-time artifact.

**Vercel dashboard rollback (faster, app-level):** Vercel UI → Deployments → previous green → "Promote to Production". Does not touch DB. Useful if the live-provider change in `binance.ts` causes a runtime error in production code.

---

## 10. Open Questions

None. All red-team blockers resolved:

| Red-team blocker | Resolution |
|------------------|-----------|
| CoinGecko free tier 365-day window | Dropped CoinGecko branch entirely. Pre-2017 rows stay as-is. |
| Rollback claim wrong | Replaced with explicit JSON snapshot + `--restore` flag. |
| Production-fix preflight undocumented | New §8 with explicit commands. |
| Live `fetchCurrent` still fakes OHLC | Now in-scope (§3.6) — `binance.ts` change included. |
| ms-vs-seconds Binance trap | Pinned in §4.4 unit tests. |
| `endTime = today` causes partial-candle overwrite | `--full` mode uses `endTime = yesterday UTC 23:59:59.999`. |
| `package.json` edits not enumerated | Now in §4.3. |
| `--dry-run` semantics undefined | §3.5 + §4.4 specify "top-50 deltas with old/new/delta". |
| No `--from`/`--to` flags | Added in §3.5. |
| Sanity bounds missing | Added in §4.1 with test coverage in §4.4. |
| Existing 60-row interior gap | `--full` mode is idempotent upsert, fills any interior gap that Binance has data for. |

---

## 11. Out of Scope

- Pre-2017 real OHLC (no public API gives it for free anymore)
- Volume column unit normalization (Binance returns BTC, CoinGecko returns USD; mixed unit is pre-existing tech debt)
- Hardening the cron heartbeat
- Retiring secondary providers (CryptoCompare, Yahoo, CoinCap) — they remain as fallbacks but only Binance is the primary source for both backfill and live now

---

## 12. Risks (post red-team)

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Binance Klines API endpoint change | Low | Endpoint is stable since 2018; version-pinned `/api/v3/`; tests pin response shape |
| Concurrent writes during `--full` run | Low | Preflight pauses GitHub Action; choose UTC time avoiding Vercel's 00:05 cron; `endTime=yesterday` prevents today-row contention |
| Production DB has unexpected rows | Low | `--dry-run` first; sanity bounds catch implausible OHLC |
| Snapshot rollback file lost | Low | Snapshot is local file; backup it to a safe location before running |
| Partial-candle overwrite by live `fetchCurrent` | Acceptable | Mid-day refreshes converge to final candle by UTC midnight; ATH unaffected (we only read `MAX(high)` across all days, not "today specifically") |

---

## 13. Implementation Workflow

1. ✅ Spec written (this doc, v2 post-red-team)
2. ✅ Red-team review (3 blockers + 8 important issues all addressed in v2)
3. ⏳ User reviews v2 spec
4. ⏳ Plan written
5. ⏳ Plan red-teamed
6. ⏳ Subagent-driven execution (Opus, full permissions)
7. ⏳ Run script against production DB
8. ⏳ Verify ATH on Parameters page
