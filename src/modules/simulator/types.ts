export const ENGINE_VERSION = "1.1.0";
export type StrategyId =
  | "hold"
  | "staged"
  | "cash"
  | "rebalance"
  | "loan"
  | "ath-dca"
  | "ma-dca"
  | "credit";
export const STRATEGIES: {
  id: StrategyId;
  name: string;
  description: string;
  color: string;
}[] = [
  {
    id: "ath-dca",
    name: "Kaufen unter ATH",
    description:
      "Sparraten sammeln; bei einem Rückgang vom bisherigen Hoch investieren.",
    color: "#4b699e",
  },
  {
    id: "ma-dca",
    name: "Kaufen unter Durchschnitt",
    description:
      "Cash erst investieren, wenn der Kurs unter seinem gleitenden Durchschnitt liegt.",
    color: "#6b8540",
  },
  {
    id: "hold",
    name: "HODL + Sparplan",
    description: "Startkapital sofort investieren, monatlich BTC kaufen.",
    color: "#e47920",
  },
  {
    id: "staged",
    name: "Gestaffelter Einstieg",
    description:
      "Startkapital aufteilen; laufende Sparraten sofort investieren.",
    color: "#2563b4",
  },
  {
    id: "cash",
    name: "Cashreserve",
    description: "Vorhandene BTC halten; neues Kapital bleibt als Cash.",
    color: "#788596",
  },
  {
    id: "rebalance",
    name: "BTC / Cash",
    description: "Monatlich auf die gewählte BTC-Quote zurücksetzen.",
    color: "#128079",
  },
  {
    id: "loan",
    name: "BTC mit Kredit",
    description: "Zusätzliche BTC durch einen besicherten Kredit kaufen.",
    color: "#8a59b5",
  },
  {
    id: "credit",
    name: "Entnahme auf Kredit",
    description:
      "Erst Cash nutzen, dann Ausgaben durch begrenzte Kredite decken.",
    color: "#bc4756",
  },
];
export interface Plan {
  startDate: string;
  months: number;
  startPrice: number;
  initialBtc: number;
  initialCash: number;
  contribution: number;
  contributionIncrease: number;
  withdrawal: number;
  withdrawalStart: number;
  inflation: number;
  tradingFee: number;
  entryMonths: number;
  btcWeight: number;
  /** Requested share of the BTC stack in explicit-collateral mode; draws remain capped. */
  loanLtv: number;
  maxLtv: number;
  liquidationLtv: number;
  annualInterest: number;
  originationFee: number;
  feeAnnual: boolean;
  loanTerm: number;
  refinance: boolean;
  liquidationFee: number;
  openEnded?: boolean;
  dipPercent?: number;
  referenceAth?: number;
  buyFraction?: number;
  buyMax?: number;
  buyFrequency?: "daily" | "monthly";
  maDays?: number;
  maDiscount?: number;
  creditProfile?: string;
  /** Explicit pledge target; absent retains legacy all-BTC collateral. */
  collateralLtv?: number;
  autoTopUp?: boolean;
  /** Chronological, contiguous closes strictly before startDate. */
  warmupCloses?: number[];
  /** Maximum outstanding debt including financed fees at a draw/refinance. */
  maxLoanAmount?: number;
}
export const DEFAULT_PLAN: Plan = {
  startDate: "2026-09-23",
  months: 120,
  startPrice: 100000,
  initialBtc: 0.25,
  initialCash: 10000,
  contribution: 300,
  contributionIncrease: 0,
  withdrawal: 0,
  withdrawalStart: 61,
  inflation: 2,
  tradingFee: 0.25,
  entryMonths: 12,
  btcWeight: 0.7,
  loanLtv: 0.2,
  maxLtv: 0.5,
  liquidationLtv: 0.85,
  annualInterest: 9,
  originationFee: 1.5,
  feeAnnual: true,
  loanTerm: 12,
  refinance: true,
  liquidationFee: 5,
  dipPercent: 50,
  referenceAth: 0,
  buyFraction: 100,
  buyMax: 1000000,
  buyFrequency: "daily",
  maDays: 200,
  maDiscount: 0,
  openEnded: false,
  creditProfile: "firehodl",
};
export type ScenarioKind =
  | "growth"
  | "custom"
  | "flat"
  | "early-crash"
  | "late-crash"
  | "bear"
  | "power"
  | "historical"
  | "cycle";
export interface Scenario {
  kind: ScenarioKind;
  growth: number;
  crashPercent: number;
  cycleDamping: number;
  volatility?: number;
  seed?: number;
  points?: { month: number; price: number }[];
}
export const DEFAULT_SCENARIO: Scenario = {
  kind: "growth",
  growth: 10,
  crashPercent: 70,
  cycleDamping: 0.5,
  volatility: 0,
  seed: 42,
};
export const SCENARIOS: {
  id: ScenarioKind;
  name: string;
  description: string;
}[] = [
  {
    id: "custom",
    name: "Eigene Kursziele",
    description:
      "Kurse für frei gewählte Monate vorgeben; dazwischen logarithmisch interpolieren, optional mit täglichen Schwankungen.",
  },
  {
    id: "growth",
    name: "Wachstum & Volatilität",
    description:
      "Jährlicher Trend mit einstellbaren täglichen Schwankungen. Der Endkurs hängt vom gewählten Verlauf ab.",
  },
  {
    id: "flat",
    name: "Seitwärts",
    description: "Konstanter Kurs über den gesamten Zeitraum.",
  },
  {
    id: "early-crash",
    name: "Früher Crash",
    description:
      "Einmaliger Einbruch nach einem Viertel des Zeitraums; danach die gewählte Jahresrate.",
  },
  {
    id: "late-crash",
    name: "Später Crash",
    description: "Derselbe Einbruch nach drei Vierteln des Zeitraums.",
  },
  {
    id: "bear",
    name: "Langer Bärenmarkt",
    description: "Drei Jahre mit jeweils −25 %, danach keine Erholung.",
  },
  {
    id: "historical",
    name: "Historischer Backtest",
    description:
      "Tatsächliche Tageskurse im gewählten Zeitraum; Gebühren und Kredite nach heutigen Modellannahmen.",
  },
  {
    id: "cycle",
    name: "Zyklus wiederholen",
    description:
      "Letzte vier vollständige Jahre vor dem Start wiederholen; tägliche logarithmische Renditen dämpfen.",
  },
  {
    id: "power",
    name: "Power-Law-Hypothese",
    description:
      "Relatives Wachstum mit Exponent 5,844 ab dem Startkurs; keine Preisvorhersage.",
  },
];
export interface PriceDay {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}
export interface JournalRow {
  date: string;
  price: number;
  btc: number;
  cash: number;
  debt: number;
  netWorth: number;
  realNetWorth: number;
  contribution: number;
  requested: number;
  paid: number;
  shortfall: number;
  fees: number;
  interest: number;
  event: string;
  low: number;
  ltv: number;
  triggerLtv: number;
  liquidationPrice: number | null;
  borrowCapacity: number;
  boughtBtc: number;
  purchasePrice: number | null;
  signalAth: number;
  buyThreshold: number | null;
  collateralBtc?: number;
  freeBtc?: number;
  topUpBtc?: number;
}
export interface SimulationResult {
  strategy: StrategyId;
  finalBtc: number;
  finalCash: number;
  finalDebt: number;
  finalNetWorth: number;
  realNetWorth: number;
  netBtcEquivalent: number;
  contributions: number;
  withdrawn: number;
  requested: number;
  shortfall: number;
  firstShortfall: string | null;
  fees: number;
  interest: number;
  profit: number;
  maxDrawdown: number;
  timeWeightedReturn: number;
  /** False when nonpositive funded equity makes percentage return metrics undefined. */
  returnMetricsValid?: boolean;
  maxLtv: number;
  liquidations: number;
  firstLiquidation: string | null;
  journal: JournalRow[];
}
