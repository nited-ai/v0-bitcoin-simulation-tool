import { describe, it, expect, vi, afterEach } from "vitest";
import { createPriceUpdater } from "../PriceUpdater";
import type { PriceStore } from "../PriceStore";
import { fetchHistoricalWithOHLC } from "../PriceHistory";

const point = (date: string) => ({
  date,
  timestamp: Date.parse(date),
  open: 100,
  high: 120,
  low: 90,
  close: 110,
  volume: null,
  source: "binance",
  fetchedAt: new Date(),
});
const setup = (dates: string[]) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-05T00:05:00Z"));
  const store = {
    getLatest: vi.fn().mockResolvedValue(point("2026-05-05")),
    getRange: vi.fn().mockResolvedValue(dates.map(point)),
    upsertDay: vi.fn(),
    setMeta: vi.fn(),
  } as unknown as PriceStore;
  const fetchHistory = vi.fn();
  return {
    store,
    fetchHistory,
    updater: createPriceUpdater({ store, fetchCurrent: vi.fn(), fetchHistory }),
  };
};
afterEach(() => vi.useRealTimers());
describe("closed historical candles", () => {
  it("repairs interior gaps even when a current-day quote already exists", async () => {
    const { store, fetchHistory, updater } = setup([
      "2026-05-01",
      "2026-05-03",
      "2026-05-04",
    ]);
    fetchHistory.mockResolvedValue(
      ["2026-05-02", "2026-05-03", "2026-05-04"].map(point),
    );
    expect((await updater.fillGaps()).gapDays).toBe(3);
    expect(fetchHistory).toHaveBeenCalledWith("2026-05-02", "2026-05-04");
    expect(store.setMeta).not.toHaveBeenCalled();
  });
  it("finalizes yesterday instead of treating the last intraday quote as its close", async () => {
    const { fetchHistory, updater } = setup([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
    ]);
    fetchHistory.mockResolvedValue([point("2026-05-04")]);
    await updater.fillGaps();
    expect(fetchHistory).toHaveBeenCalledWith("2026-05-04", "2026-05-04");
  });
  it("rejects incomplete responses before writing any rows", async () => {
    const { fetchHistory, updater, store } = setup(["2026-05-01"]);
    fetchHistory.mockResolvedValue([point("2026-05-04")]);
    await expect(updater.fillGaps()).rejects.toThrow(/incomplete/);
    expect(store.upsertDay).not.toHaveBeenCalled();
    expect(store.setMeta).not.toHaveBeenCalled();
  });
  it("normalizes Binance candles and sets a network timeout", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => [
          [Date.parse("2026-05-04"), "100", "120", "90", "110", "10"],
        ],
      });
    const rows = await fetchHistoricalWithOHLC(
      "2026-05-04",
      "2026-05-04",
      fetcher,
    );
    expect(rows[0]).toMatchObject({
      date: "2026-05-04",
      low: 90,
      high: 120,
      source: "binance",
    });
    expect(fetcher.mock.calls[0][1].signal).toBeDefined();
  });
});
