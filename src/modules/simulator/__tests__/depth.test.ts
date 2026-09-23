import { describe, it, expect } from "vitest";
import { DEFAULT_PLAN, DEFAULT_SCENARIO, Scenario } from "../types";
import { buildPath, validateScenario } from "../paths";
import { simulate } from "../engine";
import { parseSnapshot, exportSnapshot } from "../persistence";
import { marketMetrics } from "../market-analysis";

const plan = {
  ...DEFAULT_PLAN,
  startDate: "2024-01-01",
  months: 12,
  initialBtc: 1,
  initialCash: 0,
  contribution: 0,
  tradingFee: 0,
  annualInterest: 0,
  originationFee: 0,
};
describe("scenario depth", () => {
  it("measures flat prices and drawdowns from the actual candles", () => {
    const path = buildPath(
      { ...plan, months: 1 },
      { ...DEFAULT_SCENARIO, kind: "flat" },
      [],
    );
    expect(marketMetrics(path)).toMatchObject({
      end: 100000,
      cagr: 0,
      volatility: 0,
      drawdown: 0,
      low: 100000,
      worstDay: 0,
    });
    path[1] = { ...path[1], close: 50000, low: 40000 };
    expect(marketMetrics(path)).toMatchObject({
      drawdown: 0.5,
      low: 40000,
      worstDay: -0.5,
    });
  });
  it("generates repeatable volatile candles and a different path for another seed", () => {
    const s = { ...DEFAULT_SCENARIO, volatility: 60, seed: 42 };
    const a = buildPath(plan, s, []);
    expect(a).toEqual(buildPath(plan, s, []));
    expect(a).not.toEqual(buildPath(plan, { ...s, seed: 43 }, []));
    expect(a.some((d, i) => i > 0 && d.close < a[i - 1].close)).toBe(true);
    expect(a.some((d) => d.low < Math.min(d.open, d.close))).toBe(true);
  });
  it("honours custom crash and recovery targets even with volatility", () => {
    const s = {
      ...DEFAULT_SCENARIO,
      kind: "custom",
      volatility: 60,
      seed: 42,
      points: [
        { month: 3, price: 40000 },
        { month: 12, price: 150000 },
      ],
    } as Scenario;
    const path = buildPath(plan, s, []);
    expect(path.find((d) => d.date === "2024-04-01")!.close).toBeCloseTo(
      40000,
      5,
    );
    expect(path.at(-1)!.close).toBeCloseTo(150000, 5);
    expect(parseSnapshot(exportSnapshot(plan, s, ["hold"], path)).path).toEqual(
      path,
    );
  });
  it("rejects invalid volatility and duplicate target dates", () => {
    expect(() =>
      validateScenario({ ...DEFAULT_SCENARIO, volatility: -1 }),
    ).toThrow();
    expect(() =>
      buildPath(
        plan,
        {
          ...DEFAULT_SCENARIO,
          kind: "custom",
          points: [
            { month: 3, price: 50 },
            { month: 3, price: 100 },
          ],
        } as Scenario,
        [],
      ),
    ).toThrow();
  });
  it("keeps earlier volatile candles unchanged when extending the growth horizon", () => {
    const s = { ...DEFAULT_SCENARIO, volatility: 55, seed: 17 };
    const short = buildPath({ ...plan, months: 3 }, s, []);
    expect(buildPath(plan, s, []).slice(0, short.length)).toEqual(short);
  });
});
describe("rules and credit visibility", () => {
  it("executes moving-average signals at next open after the full warmup", () => {
    const p = {
      ...plan,
      months: 1,
      initialBtc: 0,
      initialCash: 1000,
      maDays: 2,
    };
    const path = buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []);
    path[1] = { ...path[1], close: 80000, low: 80000 };
    path[2] = { ...path[2], open: 50000, low: 50000 };
    const r = simulate(p, path, "ma-dca");
    expect(r.journal[1].btc).toBe(0);
    expect(r.journal[2].btc).toBeCloseTo(0.02);
    expect(r.journal[2].purchasePrice).toBe(50000);
    expect(r.journal[2].buyThreshold).toBe(90000);
  });
  it("records close execution for regular savings and unsecured residual debt", () => {
    const p = {
      ...plan,
      months: 1,
      contribution: 1000,
      loanLtv: 0.5,
      liquidationFee: 0,
    };
    const path = buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []);
    path.at(-1)!.close = 120000;
    path.at(-1)!.high = 120000;
    expect(simulate(p, path, "hold").journal.at(-1)!.purchasePrice).toBe(
      120000,
    );
    path[1].low = 10000;
    expect(simulate(p, path, "loan").journal[1].ltv).toBe(Infinity);
  });
  it("buys a 50 percent dip with available cash at next open, never using future ATH", () => {
    const p = {
      ...plan,
      months: 1,
      initialBtc: 0,
      initialCash: 1000,
      dipPercent: 50,
      referenceAth: 100000,
      buyFraction: 100,
      buyMax: 100000,
      buyFrequency: "daily" as const,
    };
    const path = buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []);
    path[2] = { ...path[2], close: 49000, low: 49000 };
    path[3] = { ...path[3], open: 50000, close: 60000, low: 50000 };
    const result = simulate(p, path, "ath-dca");
    expect(result.journal[2].btc).toBe(0);
    expect(result.journal[3].btc).toBeCloseTo(0.02);
    const future = path.map((d, i) =>
      i > 20 ? { ...d, high: 1e6, close: 1e6 } : d,
    );
    expect(simulate(p, future, "ath-dca").journal.slice(0, 20)).toEqual(
      result.journal.slice(0, 20),
    );
  });
  it("retains savings as cash when the dip condition never occurs", () => {
    const p = { ...plan, initialCash: 1000, contribution: 100, dipPercent: 50 };
    const result = simulate(p, buildPath(p, DEFAULT_SCENARIO, []), "ath-dca");
    expect(result.finalCash).toBe(2200);
    expect(result.finalBtc).toBe(1);
  });
  it("records the actual threshold before liquidation and its date", () => {
    const p = {
      ...plan,
      months: 1,
      loanLtv: 0.5,
      liquidationLtv: 0.8,
      liquidationFee: 0,
    };
    const path = buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []);
    path[1].low = 30000;
    const result = simulate(p, path, "loan");
    expect(result.journal[1].liquidationPrice).toBeCloseTo(50000 / 1.5 / 0.8);
    expect(result.firstLiquidation).toBe("2024-01-02");
    expect(result.journal[1].triggerLtv).toBeCloseTo(50000 / 1.5 / 30000);
    expect(result.journal[1].borrowCapacity).toBe(0);
  });
  it("does not invent a maturity for an open-ended loan", () => {
    const p = {
      ...plan,
      months: 3,
      loanTerm: 1,
      openEnded: true,
      refinance: false,
    };
    const result = simulate(
      p,
      buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []),
      "loan",
    );
    expect(result.finalDebt).toBe(20000);
    expect(result.journal.some((d) => d.event.includes("Fälligkeit"))).toBe(
      false,
    );
  });
});
