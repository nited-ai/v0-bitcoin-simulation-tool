"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bitcoin,
  ChevronDown,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { usePriceData } from "../price-data/hooks/usePriceData";
import {
  DEFAULT_PLAN,
  DEFAULT_SCENARIO,
  Plan,
  Scenario,
  ScenarioKind,
  StrategyId,
  STRATEGIES,
  SCENARIOS,
  PriceDay,
} from "./types";
import { buildPath } from "./paths";
import { compareStress, simulate } from "./engine";
import { exportSnapshot, parseSnapshot } from "./persistence";
import ComparisonChart, { money } from "./ComparisonChart";
import { ProjectionEditor } from "./ProjectionEditor";
import { RuleEditor } from "./RuleEditor";
import { CreditProfiles } from "./CreditProfiles";
import { RiskPanel } from "./RiskPanel";
import "./simulator.css";
import "./workbench.css";

const pct = (n: number) =>
  `${(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
const btcText = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
const STORAGE = "firehodl-snapshot-v1";
type Goal = "build" | "spend" | "loan";
function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max = 1e10,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="fh-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? NaN : Number(e.target.value))
          }
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}
function download(text: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SimulatorWorkspace() {
  const [planOpen, setPlanOpen] = useState(true);
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);
  const [scenario, setScenario] = useState<Scenario>({
    ...DEFAULT_SCENARIO,
    volatility: 55,
  });
  const [tab, setTab] = useState<"projection" | "strategies" | "results">(
    "projection",
  );
  const [selected, setSelected] = useState<StrategyId[]>([
    "hold",
    "staged",
    "cash",
  ]);
  const [goal, setGoal] = useState<Goal>("build");
  const [fixedPath, setFixedPath] = useState<PriceDay[] | null>(null);
  const [notice, setNotice] = useState("");
  const [real, setReal] = useState(false);
  const [detail, setDetail] = useState<StrategyId>("hold");
  const [journalPage, setJournalPage] = useState(0);
  const [stress, setStress] = useState<ReturnType<typeof compareStress> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [stressKey, setStressKey] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const data = usePriceData();
  useEffect(() => {
    setPlanOpen(window.innerWidth > 760);
    setPlan((p) => ({
      ...p,
      startDate: new Date().toISOString().slice(0, 10),
    }));
    try {
      setHasSaved(!!localStorage.getItem(STORAGE));
    } catch {}
  }, []);
  const deferred = useDeferredValue(plan);
  const stale = deferred !== plan;
  const calculated = useMemo(() => {
    try {
      const path = fixedPath ?? buildPath(deferred, scenario, data.prices);
      return {
        path,
        results: selected.map((id) => simulate(deferred, path, id)),
        error: "",
      };
    } catch (e) {
      return {
        path: [],
        results: [],
        error: e instanceof Error ? e.message : "Berechnung fehlgeschlagen.",
      };
    }
  }, [deferred, scenario, data.prices, selected, fixedPath]);
  const currentStressKey = JSON.stringify({
    plan,
    selected,
    start: calculated.path[0]?.close,
  });
  const change = (key: keyof Plan, value: number | string | boolean) => {
    setPlan((p) => ({ ...p, [key]: value }));
    if (["startDate", "months", "startPrice"].includes(key)) setFixedPath(null);
    setStress(null);
    setNotice("");
    setJournalPage(0);
  };
  const changeScenario = (patch: Partial<Scenario>) => {
    setScenario((s) => ({
      ...s,
      ...(patch.kind
        ? {
            growth: Number.isFinite(s.growth) ? s.growth : 10,
            crashPercent: Number.isFinite(s.crashPercent) ? s.crashPercent : 70,
            cycleDamping: Number.isFinite(s.cycleDamping)
              ? s.cycleDamping
              : 0.5,
          }
        : {}),
      ...patch,
      ...(patch.kind === "custom" && !patch.points?.length && !s.points?.length
        ? {
            points: [
              {
                month: plan.months,
                price:
                  plan.startPrice *
                  Math.pow(1 + s.growth / 100, plan.months / 12),
              },
            ],
          }
        : {}),
    }));
    setFixedPath(null);
    setStress(null);
    setNotice("");
  };
  const changePlan = (patch: Partial<Plan>) => {
    setPlan((p) => ({ ...p, ...patch }));
    setStress(null);
    setNotice("");
    setJournalPage(0);
  };
  const field = (
    key: keyof Plan,
    label: string,
    suffix?: string,
    step = 1,
    min = 0,
    max = 1e10,
  ) => (
    <NumberField
      key={key}
      label={label}
      value={plan[key] as number}
      suffix={suffix}
      step={step}
      min={min}
      max={max}
      onChange={(v) => change(key, v)}
    />
  );
  const setMode = (mode: Goal) => {
    setTab("strategies");
    setGoal(mode);
    setStress(null);
    if (mode === "build") {
      setSelected(["hold", "staged", "cash"]);
      change("withdrawal", 0);
    }
    if (mode === "spend") {
      setSelected(["hold", "rebalance", "credit"]);
      setPlan((p) => ({
        ...p,
        withdrawal: p.withdrawal || 1000,
        withdrawalStart: 1,
      }));
    }
    if (mode === "loan") {
      setSelected(["hold", "loan", "credit"]);
      change("withdrawal", 0);
    }
  };
  const toggle = (id: StrategyId) => {
    setSelected((ids) =>
      ids.includes(id)
        ? ids.length > 1
          ? ids.filter((x) => x !== id)
          : ids
        : [...ids, id],
    );
    setStress(null);
  };
  const load = (text: string) => {
    try {
      const s = parseSnapshot(text);
      setPlan(s.plan);
      setScenario(s.scenario);
      setSelected(s.strategies);
      setFixedPath(s.path);
      setDetail(s.strategies[0]);
      setJournalPage(0);
      setStress(null);
      setNotice(
        "Gespeicherter Kursverlauf geladen. Änderungen am Zeitraum oder Kursmodell berechnen einen neuen Verlauf.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Import fehlgeschlagen.");
    }
  };
  const save = () => {
    try {
      localStorage.setItem(
        STORAGE,
        exportSnapshot(plan, scenario, selected, calculated.path),
      );
      setHasSaved(true);
      setNotice("Simulation mit exakten Kursen in diesem Browser gespeichert.");
    } catch {
      setNotice(
        "Speichern nicht möglich. Bitte die Simulation als Datei exportieren.",
      );
    }
  };
  const loanSelected = selected.includes("loan") || selected.includes("credit");
  const current =
    calculated.results.find((r) => r.strategy === detail) ??
    calculated.results[0];
  const detailRows =
    current?.journal.filter(
      (r, i) => r.event || i === current.journal.length - 1,
    ) ?? [];
  const valid = calculated.results.length > 0 && !stale;
  const activeScenario = SCENARIOS.find((s) => s.id === scenario.kind)!;
  const cashflows = () => {
    if (!current) return;
    const header =
      "date,price_usd,btc,cash_usd,debt_usd,net_worth_usd,contribution_usd,requested_usd,paid_usd,shortfall_usd,fees_usd,interest_usd,event";
    const rows = current.journal.map((r) =>
      [
        r.date,
        r.price,
        r.btc,
        r.cash,
        r.debt,
        r.netWorth,
        r.contribution,
        r.requested,
        r.paid,
        r.shortfall,
        r.fees,
        r.interest,
        JSON.stringify(r.event),
      ].join(","),
    );
    download(
      [header, ...rows].join("\n"),
      `firehodl-${current.strategy}-journal.csv`,
      "text/csv;charset=utf-8",
    );
  };
  return (
    <div className="fh-app">
      <a href="#comparison" className="fh-skip">
        Zum Vergleich springen
      </a>
      <header className="fh-header">
        <Link href="/" className="fh-brand" aria-label="FireHODL Simulator">
          <span className="fh-mark">
            <Bitcoin size={24} />
          </span>
          <strong>
            firehodl<span>Bitcoin Investment Simulator</span>
          </strong>
        </Link>
        <nav>
          <a href="#comparison">Simulator</a>
          <Link href="/methodik">Methodik</Link>
          <span className="fh-beta">Beta</span>
        </nav>
      </header>
      <main className="fh-main">
        <div className="fh-title">
          <div>
            <h1>Bitcoin-Simulator</h1>
            <p>
              Kursverlauf gestalten, Anlageregeln vergleichen und Kredite
              prüfen.
            </p>
          </div>
          <div className="fh-actions">
            <button onClick={save} disabled={!valid}>
              <Save size={15} /> Speichern
            </button>
            {hasSaved && (
              <button
                onClick={() => {
                  try {
                    load(localStorage.getItem(STORAGE) || "");
                  } catch {
                    setNotice("Browser-Speicher nicht verfügbar.");
                  }
                }}
              >
                Laden
              </button>
            )}
            <button
              disabled={!valid}
              onClick={() => {
                try {
                  download(
                    exportSnapshot(plan, scenario, selected, calculated.path),
                    "firehodl-simulation.json",
                  );
                } catch {
                  setNotice("Export nicht möglich. Eingaben prüfen.");
                }
              }}
            >
              <ArrowDownToLine size={15} /> Export
            </button>
            <button
              aria-label="Simulation importieren"
              onClick={() => fileRef.current?.click()}
            >
              <ArrowUpFromLine size={15} />
              <span className="fh-hide-small">Import</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label="Simulation importieren"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 3000000)
                    setNotice("Datei ist zu groß (max. 3 MB).");
                  else load(await file.text());
                }
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <div className="fh-goals" aria-label="Simulationsziel">
          {(
            [
              ["build", "Vermögen aufbauen"],
              ["spend", "Von Bitcoin leben"],
              ["loan", "Kredit prüfen"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={goal === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
          <span>Vergleichsvorlagen · Alle Werte bleiben bearbeitbar.</span>
        </div>
        {notice && (
          <div className="fh-notice" role="status">
            {notice}
            <button
              aria-label="Hinweis schließen"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        <div className="fh-layout">
          <aside className="fh-plan" aria-label="Dein Plan">
            <div className="fh-panel-heading">
              <h2>
                <SlidersHorizontal size={17} /> Mein Plan
              </h2>
              <button
                title="Beispielwerte wiederherstellen"
                aria-label="Beispielwerte wiederherstellen"
                onClick={() => {
                  setPlan({
                    ...DEFAULT_PLAN,
                    startDate: new Date().toISOString().slice(0, 10),
                  });
                  setScenario(DEFAULT_SCENARIO);
                  setSelected(["hold", "staged", "cash"]);
                  setFixedPath(null);
                  setStress(null);
                  setGoal("build");
                }}
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <button className="fh-plan-toggle" aria-expanded={planOpen} aria-controls="plan-fields" onClick={()=>setPlanOpen(!planOpen)}>{planOpen ? "Basisdaten einklappen" : "Basisdaten bearbeiten"}</button>
            {!planOpen && <p className="fh-plan-summary">{btcText(plan.initialBtc)} BTC und {money(plan.initialCash)} Startkapital. Sparrate {money(plan.contribution)} pro Monat, Zeitraum {plan.months} Monate.</p>}
            <div id="plan-fields" className="fh-plan-fields" hidden={!planOpen}>
            <p className="fh-hint">Beispielwerte · Alle Geldbeträge in USD.</p>
            {field("initialBtc", "Vorhandene BTC", "BTC", 0.01)}
            {field("initialCash", "Verfügbares Startkapital", "USD", 100)}
            {field("contribution", "Monatliche Sparrate", "USD", 50)}
            <div className="fh-divider" />
            <label className="fh-field">
              <span>Startdatum</span>
              <input
                aria-label="Startdatum"
                type="date"
                min="2009-01-03"
                max="2100-12-31"
                value={plan.startDate}
                onChange={(e) => change("startDate", e.target.value)}
              />
            </label>
            {field("months", "Zeitraum in Monaten", "Monate", 1, 1, 360)}
            {scenario.kind !== "historical" &&
              field("startPrice", "BTC-Startkurs", "USD", 100, 0.01)}
            {data.currentPrice && scenario.kind !== "historical" && (
              <button
                className="fh-text-button"
                onClick={() => change("startPrice", data.currentPrice!.value)}
              >
                Letzten Kurs übernehmen: {money(data.currentPrice.value)}
              </button>
            )}
            <p className="fh-data">
              {data.isLoading
                ? "Kursdaten werden geladen …"
                : data.error
                  ? "Kursdaten derzeit nicht erreichbar. Eigene Szenarien bleiben nutzbar."
                  : data.lastUpdated
                    ? `Datenstand: ${new Date(data.lastUpdated).toLocaleString("de-DE")}${data.isStale ? " · veraltet" : ""}`
                    : "Kein Kursdatenstand verfügbar."}
            </p>
            <details open={goal === "spend"}>
              <summary>
                Entnahmen & Kaufkraft <ChevronDown size={14} />
              </summary>
              {field("withdrawal", "Monatliche Entnahme", "USD", 100)}
              {field(
                "withdrawalStart",
                "Entnahme ab Monat",
                "Monat",
                1,
                1,
                361,
              )}
              {field("inflation", "Jährliche Inflation", "%", 0.5, 0, 30)}
              <p className="fh-hint">
                Entnahmen in heutiger Kaufkraft; sie steigen ab
                Simulationsbeginn mit der Inflation.
              </p>
            </details>
            <details>
              <summary>
                Anlageregeln & Kosten <ChevronDown size={14} />
              </summary>
              {field(
                "entryMonths",
                "Gestaffelter Einstieg über",
                "Monate",
                1,
                1,
                120,
              )}
              <NumberField
                label="BTC-Anteil beim Rebalancing"
                suffix="%"
                value={plan.btcWeight * 100}
                max={100}
                onChange={(v) => change("btcWeight", v / 100)}
              />
              {field(
                "tradingFee",
                "Handelskosten je Kauf / Verkauf",
                "%",
                0.1,
                0,
                10,
              )}
              {field(
                "contributionIncrease",
                "Jährliche Sparratenerhöhung",
                "%",
                1,
                0,
                100,
              )}
              <p className="fh-hint">
                Cash bleibt unverzinst. Vorhandene BTC bleiben beim gestaffelten
                Einstieg investiert.
              </p>
            </details>
            </div>
          </aside>
          <section className="fh-results" id="comparison" aria-busy={stale}>
            <div
              className="fh-work-tabs"
              role="tablist"
              aria-label="Simulatorbereiche"
            >
              {(
                [
                  ["projection", "Kursprojektion"],
                  ["strategies", "Strategien & Kredit"],
                  ["results", "Ergebnisse"],
                ] as const
              ).map(([id, label]) => (
                <button
                  type="button"
                  role="tab"
                  key={id}
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="fh-context" role="status">
              {activeScenario.name} · {plan.months} Monate · {selected.length}{" "}
              Strategien auf demselben Kursverlauf
              {stale ? " · Berechnung wird aktualisiert …" : ""}
            </p>
            {calculated.error && tab !== "results" && (
              <div role="alert" className="fh-error">
                {calculated.error}
              </div>
            )}
            <div
              role="tabpanel"
              id="panel-projection"
              aria-labelledby="tab-projection"
              hidden={tab !== "projection"}
            >
              <div className="fh-scenario">
                <div>
                  <span className="fh-label">Marktszenario</span>
                  <select
                    aria-label="Marktszenario"
                    value={scenario.kind}
                    onChange={(e) =>
                      changeScenario({ kind: e.target.value as ScenarioKind })
                    }
                  >
                    {SCENARIOS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {["growth", "early-crash", "late-crash"].includes(
                  scenario.kind,
                ) && (
                  <NumberField
                    label="Jährliche Kursänderung"
                    suffix="%"
                    min={-95}
                    max={200}
                    value={scenario.growth}
                    onChange={(v) => changeScenario({ growth: v })}
                  />
                )}
                {scenario.kind.includes("crash") && (
                  <NumberField
                    label="Kurseinbruch"
                    suffix="%"
                    max={99}
                    value={scenario.crashPercent}
                    onChange={(v) => changeScenario({ crashPercent: v })}
                  />
                )}
                {scenario.kind === "cycle" && (
                  <NumberField
                    label="Anteil historischer Log-Renditen"
                    suffix="%"
                    max={100}
                    value={scenario.cycleDamping * 100}
                    onChange={(v) => changeScenario({ cycleDamping: v / 100 })}
                  />
                )}
                <p>
                  {activeScenario.description}{" "}
                  {scenario.kind === "historical" && data.prices.length > 0
                    ? `Verfügbar: ${data.prices[0].date} bis ${data.prices.at(-1)!.date}.`
                    : ""}
                </p>
              </div>
              <ProjectionEditor
                plan={plan}
                scenario={scenario}
                path={calculated.path}
                onChange={changeScenario}
                fixed={!!fixedPath}
              />
              <div className="fh-next-step">
                <button onClick={() => setTab("strategies")}>
                  Anlageregeln und Kreditbedingungen prüfen
                </button>
              </div>
            </div>
            <div
              role="tabpanel"
              id="panel-strategies"
              aria-labelledby="tab-strategies"
              hidden={tab !== "strategies"}
            >
              <div className="fh-strategies">
                <h2>Strategien im Vergleich</h2>
                <p>
                  Wähle mindestens eine Strategie. Startvermögen, Sparraten und
                  Entnahmewünsche sind für alle gleich.
                </p>
                <div>
                  {STRATEGIES.map((s) => (
                    <label
                      className={`fh-strategy ${selected.includes(s.id) ? "selected" : ""}`}
                      key={s.id}
                      style={
                        { "--strategy-color": s.color } as React.CSSProperties
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <RuleEditor plan={plan} onChange={changePlan} />
              <section className="fh-credit-editor">
                {" "}
                {
                  <details open>
                    <summary>
                      Kreditannahmen <ChevronDown size={14} />
                    </summary>
                    <CreditProfiles plan={plan} onChange={changePlan} />
                    <div className="fh-form-grid">
                      <p className="fh-hint">
                        Hypothetischer besicherter Kredit. Kein verbindliches
                        Angebot einer Plattform.
                      </p>
                      <NumberField
                        label="Gewünschte Kreditquote"
                        suffix="%"
                        max={75}
                        value={plan.loanLtv * 100}
                        onChange={(v) => change("loanLtv", v / 100)}
                      />
                      <NumberField
                        label="Maximales LTV bei Aufnahme"
                        suffix="%"
                        max={85}
                        value={plan.maxLtv * 100}
                        onChange={(v) => change("maxLtv", v / 100)}
                      />
                      <NumberField
                        label="Liquidations-LTV"
                        suffix="%"
                        max={99}
                        value={plan.liquidationLtv * 100}
                        onChange={(v) => change("liquidationLtv", v / 100)}
                      />
                      {field(
                        "annualInterest",
                        "Kreditzins pro Jahr",
                        "%",
                        0.5,
                        0,
                        100,
                      )}
                      <label className="fh-checkbox">
                        <input
                          type="checkbox"
                          checked={!!plan.openEnded}
                          onChange={(e) =>
                            changePlan({
                              openEnded: e.target.checked,
                              ...(e.target.checked ? { feeAnnual: false } : {}),
                            })
                          }
                        />
                        Keine feste Fälligkeit
                      </label>
                      {!plan.openEnded &&
                        field(
                          "loanTerm",
                          "Kreditlaufzeit",
                          "Monate",
                          1,
                          1,
                          120,
                        )}
                      {field("originationFee", "Kreditgebühr", "%", 0.1, 0, 10)}
                      <label className="fh-checkbox">
                        <input
                          type="checkbox"
                          disabled={plan.openEnded}
                          checked={plan.feeAnnual}
                          onChange={(e) =>
                            change("feeAnnual", e.target.checked)
                          }
                        />{" "}
                        Gebühr je Laufzeitjahr
                      </label>
                      {field(
                        "liquidationFee",
                        "Liquidationskosten",
                        "%",
                        0.5,
                        0,
                        30,
                      )}
                      <label className="fh-checkbox">
                        <input
                          type="checkbox"
                          disabled={plan.openEnded}
                          checked={plan.refinance}
                          onChange={(e) =>
                            change("refinance", e.target.checked)
                          }
                        />{" "}
                        Anschlussfinanzierung annehmen
                      </label>
                      <p className="fh-hint">
                        Ohne Anschlusskredit erfolgt bei Fälligkeit eine
                        Rückzahlung, falls nötig durch BTC-Verkauf. Restschulden
                        werden nicht erlassen.
                      </p>
                    </div>
                  </details>
                }
              </section>
              {!calculated.error && tab === "strategies" && (
                <RiskPanel
                  onCompare={toggle}
                  plan={deferred}
                  path={calculated.path}
                  results={calculated.results}
                />
              )}
              <div className="fh-next-step">
                <button onClick={() => setTab("results")}>
                  Ergebnisse vergleichen
                </button>
              </div>
            </div>
            <div
              role="tabpanel"
              id="panel-results"
              aria-labelledby="tab-results"
              hidden={tab !== "results"}
            >
              {calculated.error ? (
                <div className="fh-error" role="alert">
                  <strong>Bitte Eingaben prüfen</strong>
                  <p>{calculated.error}</p>
                  {scenario.kind === "historical" && (
                    <p>
                      Startdatum und Zeitraum müssen vollständig in der
                      verfügbaren Historie liegen.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <section className="fh-chart-panel">
                    <div className="fh-chart-heading">
                      <div>
                        <h3>Nettogesamtvermögen</h3>
                        <p>
                          BTC + Cash − Schulden{" "}
                          {fixedPath ? "· gespeicherter Kursverlauf" : ""}
                        </p>
                      </div>
                      <label className="fh-checkbox">
                        <input
                          type="checkbox"
                          checked={real}
                          onChange={(e) => setReal(e.target.checked)}
                        />{" "}
                        In heutiger Kaufkraft
                      </label>
                    </div>
                    <ComparisonChart results={calculated.results} real={real} />
                    <p className="fh-hint">
                      Szenariorechnung vor Steuern. Die Linien zeigen Annahmen,
                      keine Vorhersage. {stale ? "Wird aktualisiert …" : ""}
                    </p>
                  </section>
                  <div className="fh-table-wrap">
                    <table className="fh-comparison">
                      <caption>
                        Ergebnisse am Ende des gewählten Zeitraums
                      </caption>
                      <thead>
                        <tr>
                          <th>Strategie</th>
                          <th>Nettovermögen</th>
                          <th>Gewinn¹</th>
                          <th>Rückgang²</th>
                          <th>Entnahmefehlbetrag</th>
                          <th>Kreditrisiko</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculated.results.map((r) => (
                          <tr key={r.strategy}>
                            <th>
                              <button
                                onClick={() => {
                                  setDetail(r.strategy);
                                  setJournalPage(0);
                                  const journal = document.getElementById(
                                    "journal",
                                  ) as HTMLDetailsElement | null;
                                  if (journal) {
                                    journal.open = true;
                                    journal.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                  }
                                }}
                              >
                                <span
                                  style={{
                                    background: STRATEGIES.find(
                                      (s) => s.id === r.strategy,
                                    )!.color,
                                  }}
                                />
                                {
                                  STRATEGIES.find((s) => s.id === r.strategy)!
                                    .name
                                }
                                <ArrowUpRight size={13} />
                              </button>
                            </th>
                            <td>
                              <strong>
                                {money(real ? r.realNetWorth : r.finalNetWorth)}
                              </strong>
                              <small>
                                {btcText(r.netBtcEquivalent)} BTC Gegenwert
                              </small>
                            </td>
                            <td
                              className={
                                r.profit >= 0 ? "fh-positive" : "fh-negative"
                              }
                            >
                              {money(r.profit)}
                            </td>
                            <td>{pct(r.maxDrawdown)}</td>
                            <td
                              className={
                                r.shortfall > 0.01 ? "fh-negative" : ""
                              }
                            >
                              {r.requested === 0
                                ? "Keine Entnahmen"
                                : r.shortfall > 0.01
                                  ? money(r.shortfall)
                                  : "Vollständig gedeckt"}
                              {r.firstShortfall && (
                                <small>ab {r.firstShortfall}</small>
                              )}
                            </td>
                            <td>
                              {r.liquidations > 0 ? (
                                <span className="fh-risk">Liquidiert</span>
                              ) : ["loan", "credit"].includes(r.strategy) ? (
                                `Max. LTV ${pct(r.maxLtv)}`
                              ) : (
                                "Ohne Kredit"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="fh-footnote">
                    ¹ Nettovermögen + tatsächliche Entnahmen − Startvermögen −
                    Einzahlungen, nominal. ² Zahlungsstrombereinigter maximaler
                    Rückgang auf Tagesschlussbasis; Kreditliquidationen werden
                    zusätzlich am Tagestief geprüft. BTC-Gegenwert umfasst auch
                    Cash und Schulden.
                  </p>
                  <section className="fh-stress">
                    <div>
                      <FlaskConical size={21} />
                      <div>
                        <h3>Hält dein Plan auch andere Märkte aus?</h3>
                        <p>
                          Fünf gemeinsame Szenarien: +10 % jährlich, seitwärts,
                          früher und später −70-%-Crash, Bärenmarkt. Keine
                          Wahrscheinlichkeitsprognose.
                        </p>
                      </div>
                      <button
                        className="fh-primary"
                        disabled={!valid || busy}
                        onClick={() => {
                          setBusy(true);
                          setTimeout(() => {
                            try {
                              setStress(
                                compareStress(
                                  {
                                    ...plan,
                                    startPrice: calculated.path[0].close,
                                  },
                                  selected,
                                ),
                              );
                              setStressKey(currentStressKey);
                            } catch (e) {
                              setNotice(String(e));
                            } finally {
                              setBusy(false);
                            }
                          }, 30);
                        }}
                      >
                        {busy ? "Berechnet …" : "Stressvergleich starten"}
                      </button>
                    </div>
                    {stress && stressKey === currentStressKey && (
                      <div className="fh-table-wrap">
                        <table>
                          <caption>
                            Stressvergleich: Nettovermögen und Ausfälle
                          </caption>
                          <thead>
                            <tr>
                              <th>Szenario</th>
                              {selected.map((id) => (
                                <th key={id}>
                                  {STRATEGIES.find((s) => s.id === id)!.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stress.map((row) => (
                              <tr key={row.kind}>
                                <th>
                                  {
                                    SCENARIOS.find((s) => s.id === row.kind)!
                                      .name
                                  }
                                </th>
                                {row.results.map((r) => (
                                  <td key={r.strategy}>
                                    {money(r.finalNetWorth)}
                                    <small
                                      className={
                                        r.shortfall > 0.01 || r.liquidations
                                          ? "fh-negative"
                                          : ""
                                      }
                                    >
                                      {r.liquidations ? "Liquidation · " : ""}
                                      {r.requested === 0
                                        ? "Keine Entnahmen"
                                        : r.shortfall > 0.01
                                          ? `${money(r.shortfall)} fehlen`
                                          : "Ausgaben gedeckt"}
                                    </small>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                  {current && (
                    <details className="fh-journal" id="journal">
                      <summary>
                        Rechenweg & Transaktionen <ChevronDown size={16} />
                      </summary>
                      <div className="fh-detail-head">
                        <select
                          aria-label="Strategie für Detailansicht"
                          value={current.strategy}
                          onChange={(e) => {
                            setDetail(e.target.value as StrategyId);
                            setJournalPage(0);
                          }}
                        >
                          {selected.map((id) => (
                            <option key={id} value={id}>
                              {STRATEGIES.find((s) => s.id === id)!.name}
                            </option>
                          ))}
                        </select>
                        <button onClick={cashflows}>
                          <ArrowDownToLine size={15} /> Tagesjournal CSV
                        </button>
                      </div>
                      <dl className="fh-totals">
                        <div>
                          <dt>BTC-Bestand</dt>
                          <dd>{btcText(current.finalBtc)}</dd>
                        </div>
                        <div>
                          <dt>Cash</dt>
                          <dd>{money(current.finalCash)}</dd>
                        </div>
                        <div>
                          <dt>Schulden</dt>
                          <dd>{money(current.finalDebt)}</dd>
                        </div>
                        <div>
                          <dt>Einzahlungen</dt>
                          <dd>{money(current.contributions)}</dd>
                        </div>
                        <div>
                          <dt>Entnommen</dt>
                          <dd>{money(current.withdrawn)}</dd>
                        </div>
                        <div>
                          <dt>Gebühren / Zinsen</dt>
                          <dd>
                            {money(current.fees)} / {money(current.interest)}
                          </dd>
                        </div>
                      </dl>
                      <div className="fh-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Datum</th>
                              <th>Ereignis</th>
                              <th>BTC</th>
                              <th>Cash</th>
                              <th>Schulden</th>
                              <th>Entnommen / fehlt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRows
                              .slice(journalPage * 24, (journalPage + 1) * 24)
                              .map((r) => (
                                <tr key={r.date}>
                                  <td>{r.date}</td>
                                  <td>{r.event || "Endstand"}</td>
                                  <td>{btcText(r.btc)}</td>
                                  <td>{money(r.cash)}</td>
                                  <td>{money(r.debt)}</td>
                                  <td>
                                    {money(r.paid)} / {money(r.shortfall)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="fh-pager">
                        <button
                          disabled={journalPage === 0}
                          onClick={() => setJournalPage((p) => p - 1)}
                        >
                          Zurück
                        </button>
                        <span>
                          Seite {journalPage + 1} von{" "}
                          {Math.max(1, Math.ceil(detailRows.length / 24))}
                        </span>
                        <button
                          disabled={(journalPage + 1) * 24 >= detailRows.length}
                          onClick={() => setJournalPage((p) => p + 1)}
                        >
                          Weiter
                        </button>
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
            <div className="fh-method-note">
              <ShieldCheck size={20} />
              <p>
                Nachvollziehbare Annahmen statt einer „besten Strategie“. Prüfe
                Kosten, Entnahmelücken und Kreditrisiken zusammen.{" "}
                <Link href="/methodik">So rechnet FireHODL</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
