import { describe, expect, it } from "vitest";
import { simulate } from "../engine";
import { buildPath, validatePlan } from "../paths";
import { DEFAULT_PLAN, DEFAULT_SCENARIO, Plan } from "../types";
import { CalculationsService } from "../../../../app/simulation/tabs/parameters/calculationsService";

const base = {
  ...DEFAULT_PLAN, startDate: "2024-01-01", months: 2,
  initialBtc: 1, initialCash: 0, startPrice: 100000, contribution: 0,
  annualInterest: 0, originationFee: 0, tradingFee: 0, inflation: 0,
  liquidationFee: 0, collateralLtv: 0.4, autoTopUp: false,
};
const pathFor = (p: Plan) => buildPath(p, { ...DEFAULT_SCENARIO, kind: "flat" }, []);

describe("explicit pledged collateral", () => {
  it("accepts custom collateral limits below the liquidation boundary", () => {
    const p = { ...base, loanLtv: 1, collateralLtv: 0.9, maxLtv: 0.9, liquidationLtv: 0.97 };
    expect(simulate(p, pathFor(p), "loan").journal[0].debt).toBeCloseTo(90000);
    const upper = { ...p, collateralLtv: 0.99, maxLtv: 0.99, liquidationLtv: 1 };
    expect(simulate(upper, pathFor(upper), "loan").journal[0].debt).toBeCloseTo(99000);
    expect(() => validatePlan({ ...upper, maxLtv: 1 })).toThrow();
    expect(() => validatePlan({ ...p, liquidationLtv: 0.9 })).toThrow();
  });

  it("marks return percentages undefined after the portfolio falls below zero equity", () => {
    const p = { ...base, collateralLtv: undefined, loanLtv: 0.5 };
    const path = pathFor(p);
    for (const d of path.slice(1)) Object.assign(d, { open: 1000, high: 1000, low: 1000, close: 1000 });
    const result = simulate(p, path, "loan");
    expect(result.finalNetWorth).toBeCloseTo(-48500);
    expect(result.returnMetricsValid).toBe(false);
  });

  it("marks return percentages undefined without initial capital while retaining cash-flow profit", () => {
    const p = { ...base, initialBtc: 0, contribution: 1000, tradingFee: 1 };
    const result = simulate(p, pathFor(p), "hold");
    expect(result.finalNetWorth).toBeCloseTo(1980);
    expect(result.profit).toBeCloseTo(-20);
    expect(result.returnMetricsValid).toBe(false);
  });

  it("marks percentage metrics undefined once withdrawals exhaust equity", () => {
    const p = { ...base, withdrawal: 100000, withdrawalStart: 1 };
    const result = simulate(p, pathFor(p), "hold");
    expect(result.finalNetWorth).toBe(0);
    expect(result.returnMetricsValid).toBe(false);
  });

  it.each([0.6, 1])("caps a requested stack fraction of %s without rejecting the plan", (loanLtv) => {
    const p = { ...base, loanLtv, maxLtv: 0.5, collateralLtv: 0.4, originationFee: 10, feeAnnual: false };
    const path = pathFor(p);
    const row = simulate(p, path, "loan").journal[0];
    expect(row.debt).toBeCloseTo(40000);
    expect(row.collateralBtc).toBeCloseTo(1);
    expect(row.ltv).toBeCloseTo(0.4);
    expect(simulate(p, path, "hold").finalDebt).toBe(0);
    const previewParams = {
      initialBtcAmount: 1, initialBtcPrice: 100000, loanAmountPercent: loanLtv * 100,
      platform: "custom", originationFeePercent: 10, originationFeeType: "one-time" as const,
      maxInitialLtv: 50, availableLoanTerms: [12],
      riskManagement: { targetLtv: 40, maxLoanAmount: 1000000, annualInterestRate: 0,
        loanTermMonths: 12, liquidationFeePercent: 0, liquidationLtv: 85 },
    };
    const service = new CalculationsService();
    expect(row.debt).toBeCloseTo(service.calculateLoanMetrics(previewParams).initialTotalLoanCost);
    expect(row.collateralBtc).toBeCloseTo(service.calculateCollateralMetrics(previewParams).initialLockedCollateralBtc);
  });

  it("preserves legacy loan-LTV validation and rejects requests above the full stack", () => {
    expect(() => validatePlan({ ...base, collateralLtv: undefined, loanLtv: 0.6 })).toThrow();
    expect(() => validatePlan({ ...base, loanLtv: 1.01 })).toThrow();
  });

  it("sizes initial credit from the existing BTC stack before investing starting cash", () => {
    const p = { ...base, initialCash: 100000 };
    const row = simulate(p, pathFor(p), "loan").journal[0];
    expect(row.debt).toBe(20000);
    expect(row.collateralBtc).toBeCloseTo(0.5);
    expect(row.btc).toBeCloseTo(2.2);
    const empty = { ...p, initialBtc: 0 };
    expect(simulate(empty, pathFor(empty), "loan").journal[0].debt).toBe(0);
  });

  it("pledges only enough BTC for financed debt and fees, leaving purchases free", () => {
    const p = { ...base, originationFee: 10, feeAnnual: false };
    const r = simulate(p, pathFor(p), "loan");
    expect(r.journal[0].debt).toBe(22000);
    expect(r.journal[0].collateralBtc).toBeCloseTo(0.55);
    expect(r.journal[0].freeBtc).toBeCloseTo(0.65);
    expect(r.journal[0].ltv).toBeCloseTo(0.4);
    expect(r.journal[0].liquidationPrice).toBeCloseTo(47058.823529);
  });

  it("liquidates only pledged coins on an intraday low and retains residual debt", () => {
    const path = pathFor(base);
    path[2].low = 10000;
    const r = simulate(base, path, "loan");
    expect(r.liquidations).toBe(1);
    expect(r.journal[2].btc).toBeCloseTo(0.7);
    expect(r.journal[2].debt).toBeCloseTo(15000);
    expect(r.journal[2].collateralBtc).toBe(0);
    expect(r.journal[2].ltv).toBe(Infinity);
    expect(r.journal[2].borrowCapacity).toBe(0);
    expect(r.journal[3].btc).toBeCloseTo(0.7);
  });

  it("can top up from free coins before the daily-low liquidation check", () => {
    const p = { ...base, autoTopUp: true };
    const path = pathFor(p);
    path[2].low = 40000;
    const topped = simulate(p, path, "loan");
    expect(topped.liquidations).toBe(0);
    expect(topped.journal[2].topUpBtc).toBeCloseTo(0.7);
    expect(topped.journal[2].collateralBtc).toBeCloseTo(1.2);
    expect(topped.journal[3].collateralBtc).toBeCloseTo(1.2);
    expect(simulate(base, path, "loan").liquidations).toBe(1);
  });

  it("does not let withdrawals sell pledged coins after a price increase", () => {
    const p = { ...base, withdrawal: 200000, withdrawalStart: 1 };
    const path = pathFor(p);
    for (const d of path.slice(1)) Object.assign(d, { open: 200000, low: 200000, high: 200000, close: 200000 });
    const r = simulate(p, path, "loan");
    expect(r.withdrawn).toBeCloseTo(140000);
    expect(r.finalBtc).toBeCloseTo(0.5);
    expect(r.journal.at(-1)!.collateralBtc).toBeCloseTo(0.5);
  });

  it("caps debt including fees and reports only executable credit capacity", () => {
    const p = { ...base, maxLoanAmount: 11000, originationFee: 10, feeAnnual: false };
    const r = simulate(p, pathFor(p), "loan");
    expect(r.journal[0].debt).toBeCloseTo(11000);
    expect(r.journal[0].btc).toBeCloseTo(1.1);
    expect(r.journal[0].borrowCapacity).toBe(0);
    const credit = simulate({ ...base, loanLtv: 0.1 }, pathFor(base), "credit");
    expect(credit.journal[0].borrowCapacity).toBe(10000);
  });

  it("limits the pledge target by maximum LTV and includes fees in collateral capacity", () => {
    const p = { ...base, collateralLtv: 0.7, maxLtv: 0.5, loanLtv: 0.5, originationFee: 10, feeAnnual: false };
    const row = simulate(p, pathFor(p), "loan").journal[0];
    expect(row.debt).toBeCloseTo(50000);
    expect(row.collateralBtc).toBeCloseTo(1);
    expect(row.ltv).toBeCloseTo(0.5);
    expect(row.btc).toBeCloseTo(1.45454545, 8);
  });

  it("repledges at refinancing, never automatically releasing coins after a rebound", () => {
    const p = { ...base, loanTerm: 1, originationFee: 10, feeAnnual: false };
    const r = simulate(p, pathFor(p), "loan");
    const row = r.journal.find((d) => d.date === "2024-02-01")!;
    expect(row.debt).toBeCloseTo(24200);
    expect(row.collateralBtc).toBeCloseTo(0.605);
    expect(row.event).toContain("Refinanzierung");
  });

  it("cannot reopen credit after a partial-recovery liquidation", () => {
    const p = { ...base, withdrawal: 10000, withdrawalStart: 1 };
    const path = pathFor(p);
    path.find((d) => d.date === "2024-02-02")!.low = 1000;
    const r = simulate(p, path, "credit");
    expect(r.liquidations).toBe(1);
    expect(r.journal.at(-1)!.borrowCapacity).toBe(0);
    expect(r.journal.at(-1)!.paid).toBe(0);
    expect(r.finalDebt).toBeCloseTo(9750);
    expect(r.finalBtc).toBeCloseTo(0.75);
  });

  it.each([
    { collateralLtv: 0 }, { collateralLtv: NaN }, { maxLoanAmount: -1 },
    { autoTopUp: "yes" }, { warmupCloses: [0] }, { warmupCloses: [Infinity] },
  ])("rejects invalid optional input %j", (invalid) => {
    expect(() => validatePlan({ ...base, ...invalid } as Plan)).toThrow();
  });
});

describe("causal rule purchases", () => {
  it("cannot spend a close contribution at the same day's open", () => {
    const p = { ...base, initialBtc: 0, contribution: 1000, referenceAth: 200000 };
    const r = simulate(p, pathFor(p), "ath-dca");
    const anniversary = r.journal.find((d) => d.date === "2024-02-01")!;
    expect(anniversary.boughtBtc).toBe(0);
    expect(anniversary.cash).toBe(1000);
    expect(r.journal.find((d) => d.date === "2024-02-02")!.boughtBtc).toBeCloseTo(0.01);
  });

  it("spends opening cash before the close withdrawal and ignores same-day low", () => {
    const p = { ...base, initialBtc: 0, initialCash: 1000, referenceAth: 200000, buyFrequency: "monthly" as const, withdrawal: 1000, withdrawalStart: 1, tradingFee: 1 };
    const path = pathFor(p);
    path.find((d) => d.date === "2024-02-01")!.low = 1;
    const row = simulate(p, path, "ath-dca").journal.find((d) => d.date === "2024-02-01")!;
    expect(row.boughtBtc).toBeCloseTo(0.0099);
    expect(row.purchasePrice).toBeCloseTo(100000, 8);
    expect(row.paid).toBeCloseTo(980.1);
  });

  it("uses chronological prior closes for an immediately available MA signal", () => {
    const p = { ...base, initialBtc: 0, initialCash: 1000, maDays: 3, warmupCloses: [200000, 200000, 80000] };
    const path = pathFor(p);
    path[0].open = 50000;
    path[0].low = 50000;
    const row = simulate(p, path, "ma-dca").journal[0];
    expect(row.buyThreshold).toBe(160000);
    expect(row.boughtBtc).toBeCloseTo(0.02);
    expect(row.purchasePrice).toBe(50000);
  });

  it("rolls prior closes out and never includes the current candle in the MA", () => {
    const p = { ...base, initialBtc: 0, initialCash: 1000, maDays: 3, warmupCloses: [999999, 200000, 200000, 80000], buyFraction: 0 };
    const path = pathFor(p);
    path[1].close = 500000;
    path[1].high = 500000;
    const r = simulate(p, path, "ma-dca");
    expect(r.journal[0].buyThreshold).toBe(160000);
    expect(r.journal[1].buyThreshold).toBeCloseTo(126666.666666667);
    expect(r.journal[2].buyThreshold).toBeCloseTo(226666.666666667);
  });
});
