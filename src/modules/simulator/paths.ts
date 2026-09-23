import { Plan, PriceDay, Scenario, SCENARIOS } from "./types";
export const DAY = 86400000;
export function timestamp(date: string): number {
  const t = Date.parse(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(t) ||
    new Date(t).toISOString().slice(0, 10) !== date
  )
    throw new Error("Ungültiges Datum.");
  return t;
}
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export function addMonths(date: string, months: number): string {
  const d = new Date(timestamp(date));
  const first = new Date(d);
  first.setUTCDate(1);
  first.setUTCMonth(first.getUTCMonth() + months);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const lastDay = last.getUTCDate();
  first.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return iso(first.getTime());
}
export function validatePlan(plan: Plan): void {
  validateRules(plan);
  timestamp(plan.startDate);
  if (plan.startDate < "2009-01-03" || plan.startDate > "2100-12-31")
    throw new Error(
      "Startdatum muss zwischen 03.01.2009 und 31.12.2100 liegen.",
    );
  const bounds: Record<string, [number, number]> = {
    months: [1, 360],
    startPrice: [0.01, 1e9],
    initialBtc: [0, 1e6],
    initialCash: [0, 1e10],
    contribution: [0, 1e8],
    contributionIncrease: [0, 100],
    withdrawal: [0, 1e8],
    withdrawalStart: [1, 361],
    inflation: [0, 30],
    tradingFee: [0, 10],
    entryMonths: [1, 120],
    btcWeight: [0, 1],
    loanLtv: [0, plan.collateralLtv === undefined ? 0.75 : 1],
    maxLtv: [0.01, plan.collateralLtv === undefined ? 0.85 : 0.99],
    liquidationLtv: [0.02, plan.collateralLtv === undefined ? 0.99 : 1],
    annualInterest: [0, 100],
    originationFee: [0, 10],
    loanTerm: [1, 120],
    liquidationFee: [0, 30],
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const v = plan[key as keyof Plan];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      throw new Error(`Ungültiger Wert: ${key}.`);
  }
  for (const key of [
    "months",
    "entryMonths",
    "loanTerm",
    "withdrawalStart",
  ] as const)
    if (!Number.isInteger(plan[key]))
      throw new Error("Monatsangaben müssen ganze Zahlen sein.");
  if (
    typeof plan.refinance !== "boolean" ||
    typeof plan.feeAnnual !== "boolean"
  )
    throw new Error("Ungültige Kreditoption.");
  if (plan.collateralLtv === undefined && plan.loanLtv > plan.maxLtv)
    throw new Error(
      "Kreditquote ≤ maximales LTV < Liquidations-LTV erforderlich.",
    );
  if (plan.maxLtv >= plan.liquidationLtv)
    throw new Error("Maximales LTV muss unter dem Liquidations-LTV liegen.");
}
export function validateRules(plan: Plan): void {
  const bounds = {
    dipPercent: [0, 99],
    referenceAth: [0, 1e12],
    buyFraction: [0, 100],
    buyMax: [0, 1e10],
    maDays: [2, 1460],
    maDiscount: [0, 99],
    collateralLtv: [0.01, 0.99],
    maxLoanAmount: [0, 1e12],
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const v = plan[key as keyof Plan];
    if (
      v !== undefined &&
      (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    )
      throw new Error(`Ungültiger Wert: ${key}.`);
  }
  if (plan.maDays !== undefined && !Number.isInteger(plan.maDays))
    throw new Error("Durchschnitt benötigt ganze Tage.");
  if (plan.autoTopUp !== undefined && typeof plan.autoTopUp !== "boolean")
    throw new Error("Ungültige Nachbesicherungsoption.");
  if (
    plan.warmupCloses !== undefined &&
    (!Array.isArray(plan.warmupCloses) ||
      plan.warmupCloses.length > 11000 ||
      plan.warmupCloses.some(
        (p) => typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p > 1e15,
      ))
  )
    throw new Error("Ungültige historische Schlusskurse für den Durchschnitt.");
  if (plan.openEnded !== undefined && typeof plan.openEnded !== "boolean")
    throw new Error("Ungültige Laufzeitoption.");
  if (plan.openEnded && plan.feeAnnual && plan.originationFee > 0)
    throw new Error(
      "Für offene Laufzeiten bitte eine einmalige Kreditgebühr verwenden.",
    );
  if (
    plan.buyFrequency !== undefined &&
    !["daily", "monthly"].includes(plan.buyFrequency)
  )
    throw new Error("Ungültiges Kaufintervall.");
  if (
    plan.creditProfile !== undefined &&
    (typeof plan.creditProfile !== "string" || plan.creditProfile.length > 120)
  )
    throw new Error("Ungültiges Kreditprofil.");
}
export function validateScenario(s: Scenario): void {
  if (
    !SCENARIOS.some((x) => x.id === s.kind) ||
    !Number.isFinite(s.growth) ||
    s.growth < -95 ||
    s.growth > 200 ||
    !Number.isFinite(s.crashPercent) ||
    s.crashPercent < 0 ||
    s.crashPercent > 99 ||
    !Number.isFinite(s.cycleDamping) ||
    s.cycleDamping < 0 ||
    s.cycleDamping > 1
  )
    throw new Error("Ungültiges Marktszenario.");
  if (
    s.volatility !== undefined &&
    (!Number.isFinite(s.volatility) || s.volatility < 0 || s.volatility > 200)
  )
    throw new Error("Volatilität muss zwischen 0 und 200 % liegen.");
  if (
    s.seed !== undefined &&
    (!Number.isInteger(s.seed) || s.seed < 1 || s.seed > 2147483647)
  )
    throw new Error(
      "Verlaufsnummer muss eine ganze Zahl zwischen 1 und 2147483647 sein.",
    );
  if (
    s.points !== undefined &&
    (!Array.isArray(s.points) ||
      s.points.length > 100 ||
      s.points.some(
        (p) =>
          !p ||
          !Number.isInteger(p.month) ||
          p.month < 1 ||
          p.month > 360 ||
          !Number.isFinite(p.price) ||
          p.price <= 0 ||
          p.price > 1e12,
      ) ||
      new Set(s.points.map((p) => p.month)).size !== s.points.length)
  )
    throw new Error(
      "Kursziele benötigen eindeutige Monate und positive Preise.",
    );
}
export function validatePath(path: PriceDay[], plan: Plan): void {
  if (!Array.isArray(path) || path.length < 2 || path.length > 11000)
    throw new Error("Ungültige Kursreihe.");
  const start = timestamp(plan.startDate);
  if (
    path[0].date !== plan.startDate ||
    path.at(-1)!.date !== addMonths(plan.startDate, plan.months)
  )
    throw new Error("Kursreihe deckt den Zeitraum nicht ab.");
  for (let i = 0; i < path.length; i++) {
    const d = path[i];
    if (timestamp(d.date) !== start + i * DAY)
      throw new Error(
        "Historische Kursreihe enthält eine Lücke oder doppelte Tage.",
      );
    if (
      ![d.open, d.close, d.low, d.high].every(
        (x) =>
          typeof x === "number" && Number.isFinite(x) && x > 0 && x <= 1e15,
      ) ||
      d.low > Math.min(d.open, d.close) ||
      d.high < Math.max(d.open, d.close)
    )
      throw new Error("Ungültige OHLC-Kurse.");
  }
}
export function buildPath(
  plan: Plan,
  scenario: Scenario,
  history: PriceDay[],
): PriceDay[] {
  validatePlan(plan);
  validateScenario(scenario);
  const start = timestamp(plan.startDate),
    end = timestamp(addMonths(plan.startDate, plan.months));
  const days = (end - start) / DAY;
  if (scenario.kind === "historical") {
    const path = history
      .filter((d) => d.date >= plan.startDate && d.date <= iso(end))
      .map((d) => ({ ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));
    validatePath(path, plan);
    return path;
  }
  if (
    scenario.kind === "custom" &&
    (!scenario.points?.length ||
      scenario.points.some((p) => p.month > plan.months) ||
      !scenario.points.some((p) => p.month === plan.months))
  )
    throw new Error(
      "Ein Kursziel für den letzten Monat ist erforderlich; alle Ziele müssen im Zeitraum liegen.",
    );
  const points = [
    { day: 0, price: plan.startPrice },
    ...(scenario.points ?? [])
      .map((p) => ({
        day: (timestamp(addMonths(plan.startDate, p.month)) - start) / DAY,
        price: p.price,
      }))
      .sort((a, b) => a.day - b.day),
  ];
  const random = seededNormal(scenario.seed ?? 42);
  const wickRandom = seededNormal((scenario.seed ?? 42) ^ 0x5bd1e995);
  const sigma = (scenario.volatility ?? 0) / 100 / Math.sqrt(365.25);
  const noise = Array.from({ length: days + 1 }, () => 0);
  for (let i = 1; i <= days; i++)
    noise[i] = noise[i - 1] + sigma * random() - (sigma * sigma) / 2;
  // Work from the last segment backwards to preserve the original endpoint noise.
  if (scenario.kind === "custom")
    for (let k = points.length - 1; k >= 1; k--) {
      const a = points[k - 1].day,
        b = points[k].day,
        from = noise[a],
        to = noise[b];
      for (let i = b; i > a; i--)
        noise[i] -= from + ((to - from) * (i - a)) / (b - a);
    }
  const lows: number[] = [],
    highs: number[] = [];
  let ratios: number[] = [];
  if (scenario.kind === "cycle") {
    const from = addMonths(plan.startDate, -48);
    const past = history
      .filter((d) => d.date >= from && d.date < plan.startDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (
      past.length !== (start - timestamp(from)) / DAY ||
      past.some(
        (d, i) =>
          timestamp(d.date) !== timestamp(from) + i * DAY || !(d.close > 0),
      )
    )
      throw new Error(
        "Für die Zykluswiederholung fehlen vier lückenlose Jahre vor dem Start.",
      );
    ratios = past
      .slice(1)
      .map((d, i) => Math.pow(d.close / past[i].close, scenario.cycleDamping));
    for (const d of past.slice(1)) {
      if (
        !(d.low > 0) ||
        d.high < Math.max(d.open, d.close) ||
        d.low > Math.min(d.open, d.close)
      )
        throw new Error("Zyklusquelle enthält ungültige OHLC-Kurse.");
      lows.push(Math.pow(d.low / d.close, scenario.cycleDamping));
      highs.push(Math.pow(d.high / d.close, scenario.cycleDamping));
    }
  }
  const genesis = Date.UTC(2009, 0, 3),
    age = (start - genesis) / DAY;
  if (scenario.kind === "power" && age <= 0)
    throw new Error("Power Law benötigt einen Start nach dem 3. Januar 2009.");
  const path: PriceDay[] = [];
  let previous = plan.startPrice;
  let cyclePrice = plan.startPrice;
  for (let i = 0; i <= days; i++) {
    let price = plan.startPrice;
    if (scenario.kind === "custom") {
      const k = Math.max(
        1,
        points.findIndex((p) => p.day >= i),
      );
      const a = points[k - 1],
        b = points[k];
      price =
        a.price * Math.pow(b.price / a.price, (i - a.day) / (b.day - a.day));
    } else if (scenario.kind === "power")
      price *= Math.pow((age + i) / age, 5.844);
    else if (scenario.kind === "cycle")
      price =
        i === 0
          ? plan.startPrice
          : (cyclePrice *= ratios[(i - 1) % ratios.length]);
    else if (scenario.kind === "bear")
      price *= Math.pow(0.75, Math.min(i / 365.25, 3));
    else if (scenario.kind !== "flat") {
      price *= Math.pow(1 + scenario.growth / 100, i / 365.25);
      const fraction =
        scenario.kind === "early-crash"
          ? 0.25
          : scenario.kind === "late-crash"
            ? 0.75
            : 2;
      if (i >= Math.max(1, Math.round(days * fraction)))
        price *= 1 - scenario.crashPercent / 100;
    }
    price *= Math.exp(noise[i]);
    const wick = i === 0 ? 0 : Math.abs(wickRandom()) * sigma * 0.5;
    path.push({
      date: iso(start + i * DAY),
      open: previous,
      close: price,
      low:
        Math.min(previous, price, price * (lows[(i - 1) % lows.length] ?? 1)) *
        Math.exp(-wick),
      high:
        Math.max(
          previous,
          price,
          price * (highs[(i - 1) % highs.length] ?? 1),
        ) * Math.exp(wick),
    });
    previous = price;
  }
  validatePath(path, plan);
  return path;
}

function seededNormal(seed: number) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
  return () =>
    Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
}
