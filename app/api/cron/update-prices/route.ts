// app/api/cron/update-prices/route.ts
//
// Cron endpoint. Hit by:
//   - Vercel Cron daily at 00:05 UTC (configured in vercel.json)
//   - GitHub Action hourly (configured in .github/workflows/hourly-price-refresh.yml)
//
// Auth: Authorization: Bearer ${CRON_SECRET} per Vercel canonical pattern (spec D8).
//
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createPriceStore } from "@/src/modules/price-data/services/PriceStore";
import { createPriceUpdater } from "@/src/modules/price-data/services/PriceUpdater";
import { fetchCurrentWithFallback } from "@/src/modules/price-data/services/PriceSource";
import { fetchHistoricalWithOHLC } from "@/src/modules/price-data/services/PriceHistory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache cron responses

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  if (!safeEqualStrings(auth, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Lazy-instantiate Prisma so module-load doesn't crash builds without DATABASE_URL
  const prisma = new PrismaClient();
  try {
    const store = createPriceStore(prisma);
    const updater = createPriceUpdater({
      store,
      fetchCurrent: fetchCurrentWithFallback,
      fetchHistory: fetchHistoricalWithOHLC,
    });

    const fillGaps = await updater.fillGaps();
    const updateResult = await updater.updateCurrent(true); // force=true: cron always refreshes

    if (updateResult.skipped) {
      return NextResponse.json(
        { ok: false, error: "price_refresh_failed" },
        { status: 503 },
      );
    }

    // Write the cron heartbeat so the read endpoint's isStale flag works.
    // Without this, lastSuccessfulCronAt sits at bootstrap 1970-01-01 forever
    // and isStale would be permanently true once UI consumes the read endpoint (PR3/PR4).
    await store.setMeta("lastSuccessfulCronAt", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      updateCurrent: updateResult,
      fillGaps,
    });
  } catch (err) {
    console.error("Price cron failed:", err);
    return NextResponse.json(
      { ok: false, error: "price_update_failed" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Vercel invokes GET; the existing GitHub workflow uses POST.
export const GET = POST;

/** Constant-time string comparison via timingSafeEqual. */
function safeEqualStrings(a: string, b: string): boolean {
  // Pad/truncate both to same length to avoid throwing on mismatched length
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still do a comparison to keep timing constant
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
