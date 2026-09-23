import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN, STRATEGIES } from "../types";
import { addMonths, buildPath } from "../paths";
import { simulate, compareStress } from "../engine";
import { exportSnapshot, parseSnapshot } from "../persistence";

const plan = {
  ...DEFAULT_PLAN,
  startDate: "2024-01-31",
  months: 12,
  initialBtc: 1,
  initialCash: 0,
  startPrice: 100000,
  contribution: 1000,
  tradingFee: 0,
  inflation: 0,
};
const flat = {
  kind: "flat" as const,
  growth: 0,
  crashPercent: 70,
  cycleDamping: 0.5,
};

describe("fair dated accounting", () => {
  it("uses actual calendar anniversaries including leap-year month ends", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2024-01-31", 2)).toBe("2024-03-31");
    const path = buildPath(plan, flat, []);
    expect(path[0].date).toBe("2024-01-31");
    expect(path.at(-1)!.date).toBe("2025-01-31");
    expect(new Set(path.map((p) => p.date)).size).toBe(path.length);
  });
  it("applies exactly twelve contributions, never a bonus contribution at t=0", () => {
    const result = simulate(plan, buildPath(plan, flat, []), "hold");
    expect(result.contributions).toBe(12000);
    expect(result.finalBtc).toBeCloseTo(1.12);
    expect(result.profit).toBeCloseTo(0);
    expect(result.journal[0].contribution).toBe(0);
  });
  it("has equal external funding for every strategy", () => {
    const p = { ...plan, annualInterest: 0, originationFee: 0, loanLtv: 0.15 };
    const results = STRATEGIES.map((s) =>
      simulate(p, buildPath(p, flat, []), s.id),
    );
    for (const r of results) {
      expect(r.contributions).toBe(12000);
      expect(r.finalNetWorth).toBeCloseTo(112000, 5);
    }
  });
  it("supports a saver with no starting BTC and preserves uninvested cash", () => {
    const p = { ...plan, initialBtc: 0, initialCash: 12000, contribution: 0 };
    const path = buildPath(p, flat, []);
    expect(simulate(p, path, "staged").finalNetWorth).toBeCloseTo(12000);
    expect(simulate(p, path, "cash").finalCash).toBe(12000);
  });
  it("counts only paid withdrawals and records the exact shortage", () => {
    const p = {
      ...plan,
      months: 2,
      contribution: 0,
      withdrawal: 200000,
      withdrawalStart: 1,
    };
    const r = simulate(p, buildPath(p, flat, []), "hold");
    expect(r.withdrawn).toBeCloseTo(100000);
    expect(r.shortfall).toBeCloseTo(300000);
    expect(r.firstShortfall).toBe("2024-02-29");
    expect(r.profit).toBeCloseTo(0);
  });
  it("does not call contributions investment returns or drawdowns", () => {
    const r = simulate(plan, buildPath(plan, flat, []), "hold");
    expect(r.maxDrawdown).toBeCloseTo(0);
    expect(r.timeWeightedReturn).toBeCloseTo(0);
  });
});

describe("credit mechanics", () => {
  it("charges interest on all financed amounts including funded fees", () => {
    const p = {
      ...plan,
      contribution: 0,
      loanLtv: 0.2,
      originationFee: 10,
      annualInterest: 10,
      feeAnnual: false,
    };
    const r = simulate(p, buildPath(p, flat, []), "loan");
    expect(r.journal[0].debt).toBeCloseTo(22000);
    expect(r.journal[1].interest).toBeCloseTo((22000 * 0.1) / 365);
  });
  it("prorates annual fees on further draws to the existing maturity", () => {
    const p = {
      ...plan,
      startDate: "2024-01-01",
      months: 3,
      contribution: 0,
      withdrawal: 100,
      withdrawalStart: 1,
      loanTerm: 12,
      originationFee: 1,
      feeAnnual: true,
      annualInterest: 0,
    };
    const r = simulate(p, buildPath(p, flat, []), "credit");
    expect(r.journal.find((r) => r.date === "2024-02-01")!.fees).toBeCloseTo(1);
    expect(r.journal.find((r) => r.date === "2024-03-01")!.fees).toBeCloseTo(
      (100 * 0.01 * 337) / 365.25,
    );
  });
  it("charges a yearly origination fee for the actual two-year term", () => {
    const p = {
      ...plan,
      contribution: 0,
      loanLtv: 0.15,
      loanTerm: 24,
      originationFee: 1.5,
      feeAnnual: true,
    };
    const r = simulate(p, buildPath(p, flat, []), "loan");
    expect(r.journal[0].fees).toBeCloseTo(450);
    expect(r.journal[0].debt).toBeCloseTo(15450);
  });
  it("checks an intramonth low even when the closing price recovers", () => {
    const p = {
      ...plan,
      contribution: 0,
      annualInterest: 0,
      originationFee: 0,
      loanLtv: 0.4,
    };
    const path = buildPath(p, flat, []);
    path[5] = { ...path[5], low: 10000 };
    const r = simulate(p, path, "loan");
    expect(r.liquidations).toBe(1);
    expect(r.finalDebt).toBeGreaterThan(0);
    expect(r.finalNetWorth).toBeLessThan(0);
    expect(r.journal.find((j) => j.event.includes("Liquidation"))!.date).toBe(
      path[5].date,
    );
  });
  it("a later contribution cannot rescue a previous liquidation", () => {
    const path = buildPath(plan, flat, []);
    path[5] = { ...path[5], low: 1000 };
    expect(
      simulate({ ...plan, contribution: 100000 }, path, "loan").liquidations,
    ).toBe(1);
  });
  it("zero leverage creates no debt and disallows invalid loan limits", () => {
    expect(
      simulate({ ...plan, loanLtv: 0 }, buildPath(plan, flat, []), "loan")
        .finalDebt,
    ).toBe(0);
    expect(() => buildPath({ ...plan, loanLtv: 0.9 }, flat, [])).toThrow();
  });
  it("pays a maturing loan when refinancing is disabled", () => {
    const p = {
      ...plan,
      loanTerm: 6,
      refinance: false,
      contribution: 0,
      annualInterest: 0,
      originationFee: 0,
    };
    expect(simulate(p, buildPath(p, flat, []), "loan").finalDebt).toBeCloseTo(
      0,
    );
  });
});

describe("path provenance and reproducibility", () => {
  it("refuses missing historical days instead of inventing prices", () => {
    expect(() =>
      buildPath(plan, { ...flat, kind: "historical" }, []),
    ).toThrow();
    expect(() => buildPath(plan, { ...flat, kind: "cycle" }, [])).toThrow();
  });
  it("future prices cannot change earlier transactions", () => {
    const path = buildPath(plan, flat, []);
    const changed = path.map((d, i) =>
      i > 100
        ? {
            ...d,
            close: d.close * 4,
            low: d.low * 4,
            high: d.high * 4,
            open: d.open * 4,
          }
        : d,
    );
    const a = simulate(plan, path, "rebalance").journal.filter(
      (j) => j.date <= path[100].date,
    );
    const b = simulate(plan, changed, "rebalance").journal.filter(
      (j) => j.date <= path[100].date,
    );
    expect(a).toEqual(b);
  });
  it("uses the same fixed path for comparison and export/import", () => {
    const path = buildPath(plan, flat, []);
    const snapshot = parseSnapshot(
      exportSnapshot(plan, flat, ["hold", "loan"], path),
    );
    expect(simulate(snapshot.plan, snapshot.path, "hold")).toEqual(
      simulate(plan, path, "hold"),
    );
    expect(compareStress(plan, ["hold", "cash"]).length).toBe(5);
  });
  it("rejects corrupt snapshots, nonfinite values, unordered dates and huge input", () => {
    expect(() => parseSnapshot("{bad")).toThrow();
    expect(() => buildPath({ ...plan, startPrice: NaN }, flat, [])).toThrow();
    const data = JSON.parse(
      exportSnapshot(plan, flat, ["hold"], buildPath(plan, flat, [])),
    );
    data.path[1].date = data.path[0].date;
    expect(() => parseSnapshot(JSON.stringify(data))).toThrow();
    expect(() => buildPath({ ...plan, months: 100000 }, flat, [])).toThrow();
    expect(() =>
      buildPath({ ...plan, startDate: "0000-01-01" }, flat, []),
    ).toThrow(/Startdatum/);
    expect(() =>
      buildPath({ ...plan, startDate: "9999-01-01" }, flat, []),
    ).toThrow(/Startdatum/);
  });
});
