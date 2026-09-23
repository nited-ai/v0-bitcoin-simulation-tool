"use client";
import { useState, useMemo } from "react";
import {
  Plan,
  PriceDay,
  SimulationResult,
  StrategyId,
  STRATEGIES,
} from "./types";
import { simulate } from "./engine";
import { MarketChart } from "./MarketChart";
import { money } from "./ComparisonChart";
const pct = (v: number) =>
  `${(v * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
export function RiskPanel({
  plan,
  path,
  results,
  onCompare,
}: {
  plan: Plan;
  path: PriceDay[];
  results: SimulationResult[];
  onCompare: (strategy: StrategyId) => void;
}) {
  const [strategy, setStrategy] = useState<StrategyId>("loan");
  const [cursor, setCursor] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const result = useMemo(() => {
    if (!path.length) return null;
    try {
      return (
        results.find((r) => r.strategy === strategy) ??
        simulate(plan, path, strategy)
      );
    } catch {
      return null;
    }
  }, [plan, path, results, strategy]);
  if (!result) return null;
  const day = result.journal[Math.min(cursor, result.journal.length - 1)];
  const events = result.journal.filter(
    (d) =>
      d.boughtBtc > 0 ||
      d.event.includes("Liquidation") ||
      d.event.includes("Kredit") ||
      d.event.includes("Refinanzierung") ||
      d.event.includes("Regelkauf"),
  );
  const page = Math.min(
    eventPage,
    Math.max(0, Math.ceil(events.length / 15) - 1),
  );
  const cushion =
    day.liquidationPrice === null ? null : 1 - day.liquidationPrice / day.price;
  const liquidation = result.journal.find((d) =>
    d.event.includes("Liquidation"),
  );
  const isLoan = strategy === "loan" || strategy === "credit";
  const collateral =
    (plan.initialBtc +
      (strategy === "loan"
        ? (plan.initialCash * (1 - plan.tradingFee / 100)) / path[0].close
        : 0)) *
    path[0].close;
  const fee =
    (plan.originationFee / 100) * (plan.feeAnnual ? plan.loanTerm / 12 : 1);
  return (
    <section className="fh-risk-panel">
      <div className="fh-section-title">
        <h2>Kurs, Käufe & Kreditrisiko</h2>
        <label>
          Strategie im Detail{" "}
          <select
            aria-label="Strategie im Risikochart"
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value as StrategyId);
              setCursor(0);
              setEventPage(0);
            }}
          >
            {["loan", "credit", "ath-dca", "ma-dca", "hold"].map((id) => (
              <option key={id} value={id}>
                {STRATEGIES.find((s) => s.id === id)!.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fh-hint">
        Detailrechnung für die gewählte Strategie auf genau diesem Kursverlauf,
        unabhängig von der Vergleichsauswahl.{" "}
        {isLoan
          ? "Alle gehaltenen BTC dienen im Kreditmodell als Sicherheit, auch hinzugekaufte BTC."
          : "Kaufmarkierungen zeigen den tatsächlichen Ausführungskurs. Wähle einen Ereignistag für die zugehörige Kaufschwelle."}
      </p>
      {!results.some((r) => r.strategy === strategy) && (
        <button type="button" onClick={() => onCompare(strategy)}>
          Diese Strategie in den Vergleich aufnehmen
        </button>
      )}
      {isLoan && (
        <div className={`fh-risk-status ${liquidation ? "danger" : ""}`}>
          <strong>
            {liquidation
              ? `Liquidation am ${liquidation.date}`
              : "Keine Liquidation in diesem Verlauf"}
          </strong>
          <span>
            {liquidation
              ? `Tagestief ${money(liquidation.low)} · Grenze ${money(liquidation.liquidationPrice!)} · LTV ${pct(liquidation.triggerLtv)}`
              : `Höchstes beobachtetes LTV ${pct(result.maxLtv)} · Liquidationsgrenze ${pct(plan.liquidationLtv)}`}
          </span>
          {liquidation && (
            <button
              type="button"
              onClick={() => setCursor(result.journal.indexOf(liquidation))}
            >
              Zum Liquidationstag
            </button>
          )}
        </div>
      )}
      <MarketChart path={path} result={result} />
      <div className="fh-day-inspector">
        <label htmlFor="risk-day">
          Tag prüfen: <strong>{day.date}</strong>
        </label>
        <input
          id="risk-day"
          aria-label="Tag im Risikoverlauf"
          type="range"
          min={0}
          max={result.journal.length - 1}
          value={Math.min(cursor, result.journal.length - 1)}
          onChange={(e) => setCursor(Number(e.target.value))}
        />
      </div>
      <dl className="fh-metrics">
        {[
          ["BTC-Schlusskurs", money(day.price)],
          ["Tagestief", money(day.low)],
          ...(isLoan
            ? [
                ["Schulden am Tagesende", money(day.debt)],
                [
                  "LTV am Tagesende",
                  Number.isFinite(day.ltv)
                    ? pct(day.ltv)
                    : "Restschuld ohne BTC-Sicherheit",
                ],
                [
                  "Liquidationskurs",
                  day.liquidationPrice === null
                    ? "Kein aktiver Kredit"
                    : money(day.liquidationPrice),
                ],
                [
                  "Kursabstand zur Liquidation",
                  cushion === null ? "—" : pct(cushion),
                ],
                ["Zusätzlich aufnehmbar¹", money(day.borrowCapacity)],
              ]
            : [
                ["Bis dahin bekanntes ATH", money(day.signalAth)],
                [
                  "Kaufschwelle",
                  day.buyThreshold === null
                    ? "Kein aktives Signal"
                    : money(day.buyThreshold),
                ],
                [
                  "Ausführungskurs",
                  day.purchasePrice === null
                    ? "Kein Kauf an diesem Tag"
                    : money(day.purchasePrice),
                ],
                ["Nettovermögen", money(day.netWorth)],
              ]),
          [
            "BTC-Bestand",
            day.btc.toLocaleString("de-DE", { maximumFractionDigits: 6 }),
          ],
          ["Cash", money(day.cash)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {day.event && (
        <p className="fh-inline-note">
          {day.date}: {day.event}
        </p>
      )}
      {isLoan && (
        <p className="fh-hint">
          ¹ Spielraum bei maximalem Aufnahme-LTV, nach Gebühren; die Strategie
          kann eine niedrigere Zielquote verwenden. Auf die anfänglichen
          Sicherheiten dieser Strategie sind vor einer weiteren Kreditverwendung
          maximal {money((collateral * plan.maxLtv) / (1 + fee))} auszahlbar. Am
          Liquidationstag zeigt die rote Grenze den Auslösewert vor dem Verkauf;
          Bestände und Schulden zeigen den Tagesabschluss. Ein überstandenes
          Szenario bedeutet keine Sicherheit in anderen Verläufen.
        </p>
      )}
      <div className="fh-table-wrap">
        <table className="fh-comparison">
          <caption>Käufe und Kreditereignisse</caption>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Ereignis</th>
              <th>Schlusskurs</th>
              <th>Kaufkurs</th>
              <th>Gekauft (BTC)</th>
              <th>Schulden</th>
              <th>{isLoan ? "Liquidationsgrenze" : "Kaufschwelle"}</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(page * 15, (page + 1) * 15).map((d) => (
              <tr key={d.date}>
                <td>
                  <button
                    type="button"
                    onClick={() => setCursor(result.journal.indexOf(d))}
                  >
                    {d.date}
                  </button>
                </td>
                <td>{d.event}</td>
                <td>{money(d.price)}</td>
                <td>
                  {d.purchasePrice === null ? "—" : money(d.purchasePrice)}
                </td>
                <td>
                  {d.boughtBtc.toLocaleString("de-DE", {
                    maximumFractionDigits: 6,
                  })}
                </td>
                <td>{money(d.debt)}</td>
                <td>
                  {(isLoan ? d.liquidationPrice : d.buyThreshold) === null
                    ? "—"
                    : money((isLoan ? d.liquidationPrice : d.buyThreshold)!)}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={7}>
                  Keine Käufe oder Kreditereignisse unter diesen Bedingungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {events.length > 15 && (
        <div className="fh-editor-toolbar">
          <button disabled={page === 0} onClick={() => setEventPage(page - 1)}>
            Vorherige Ereignisse
          </button>
          <span>
            {page + 1} / {Math.ceil(events.length / 15)}
          </span>
          <button
            disabled={(page + 1) * 15 >= events.length}
            onClick={() => setEventPage(page + 1)}
          >
            Weitere Ereignisse
          </button>
        </div>
      )}
    </section>
  );
}
