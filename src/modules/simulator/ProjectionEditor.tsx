"use client";
import { Plan, Scenario, PriceDay } from "./types";
import { MarketChart } from "./MarketChart";
import { marketMetrics } from "./market-analysis";
import { money } from "./ComparisonChart";

export function Numeric({
  label,
  value,
  onChange,
  min = 0,
  max = 1e12,
  step = 1,
  suffix = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="fh-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) =>
            onChange(e.target.value === "" ? NaN : Number(e.target.value))
          }
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}
const percent = (v: number) =>
  `${(v * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
export function ProjectionEditor({
  plan,
  scenario,
  path,
  onChange,
  fixed,
}: {
  plan: Plan;
  scenario: Scenario;
  path: PriceDay[];
  onChange: (s: Partial<Scenario>) => void;
  fixed: boolean;
}) {
  const stats = marketMetrics(path);
  const points = scenario.points ?? [];
  const custom = (pattern: "annual" | "crash") => {
    const months =
      pattern === "annual"
        ? Array.from({ length: Math.ceil(plan.months / 12) }, (_, i) =>
            Math.min(plan.months, (i + 1) * 12),
          )
        : [
            ...new Set([
              Math.max(1, Math.round(plan.months / 4)),
              Math.max(1, Math.round(plan.months / 2)),
              plan.months,
            ]),
          ];
    onChange({
      kind: "custom",
      points: months.map((month, i) => ({
        month,
        price: Math.round(
          plan.startPrice *
            (pattern === "crash"
              ? [1.4, 0.5, 1.8][i]
              : Math.pow(1 + scenario.growth / 100, month / 12)),
        ),
      })),
    });
  };
  return (
    <section className="fh-projection-editor">
      <div className="fh-section-title">
        <h2>Kursprojektion</h2>
        <span>
          {path[0]?.date} bis {path.at(-1)?.date}
        </span>
      </div>
      {stats && (
        <dl className="fh-metrics" aria-label="Kennzahlen des Kursverlaufs">
          {[
            ["Endkurs", money(stats.end)],
            ["Rendite p.a.", percent(stats.cagr)],
            ["Realisierte Volatilität p.a.", percent(stats.volatility)],
            ["Max. Rückgang (Schlusskurse)", percent(stats.drawdown)],
            ["Tiefster Tageskurs", money(stats.low)],
            ["Schlechtester Tag", percent(stats.worstDay)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <MarketChart path={path} />
      {fixed && (
        <p className="fh-inline-note">
          Gespeicherter Kursverlauf ist fixiert. Eine Änderung der Projektion
          erzeugt einen neuen Verlauf.
        </p>
      )}
      {scenario.kind !== "historical" && (
        <>
          <div className="fh-control-line">
            <Numeric
              label="Tägliche Volatilität, annualisiert"
              value={scenario.volatility ?? 0}
              onChange={(volatility) => onChange({ volatility })}
              suffix="% p.a."
              max={200}
            />
            <Numeric
              label="Verlaufsnummer"
              value={scenario.seed ?? 42}
              onChange={(seed) => onChange({ seed })}
              min={1}
              max={2147483647}
            />
            <button
              type="button"
              onClick={() =>
                onChange({ seed: ((scenario.seed ?? 42) % 2147483647) + 1 })
              }
            >
              Anderen Verlauf testen
            </button>
          </div>
          <p className="fh-hint">
            Gleiche Verlaufsnummer = gleiche Schwankungen. 0 % erzeugt einen
            glatten Verlauf. Synthetische Tagestiefs werden mitmodelliert;
            Kennzahlen oben stammen aus dem tatsächlich berechneten Pfad.
          </p>
          <div className="fh-editor-toolbar">
            <button type="button" onClick={() => custom("annual")}>
              Jährliche Kursziele bearbeiten
            </button>
            <button type="button" onClick={() => custom("crash")}>
              Zyklus mit Crash als Vorlage
            </button>
          </div>
        </>
      )}
      {scenario.kind === "custom" && (
        <>
          <h3>Eigene Kursziele</h3>
          <p className="fh-hint">
            Lege Hochs, Crashs und Erholungen fest. Die Zielkurse werden am
            jeweiligen Monatsjubiläum exakt erreicht; dazwischen schwankt der
            Kurs. Monat {plan.months} muss enthalten sein.
          </p>
          <div className="fh-targets">
            {points.map((p, i) => (
              <div className="fh-target" key={i}>
                <Numeric
                  label={`Ziel ${i + 1}: Monat`}
                  value={p.month}
                  min={1}
                  max={plan.months}
                  onChange={(month) =>
                    onChange({
                      points: points.map((x, j) =>
                        i === j ? { ...x, month } : x,
                      ),
                    })
                  }
                />
                <Numeric
                  label={`Ziel ${i + 1}: BTC-Kurs`}
                  value={p.price}
                  min={0.01}
                  step={1000}
                  suffix="USD"
                  onChange={(price) =>
                    onChange({
                      points: points.map((x, j) =>
                        i === j ? { ...x, price } : x,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  aria-label={`Ziel ${i + 1} entfernen`}
                  onClick={() =>
                    onChange({ points: points.filter((_, j) => j !== i) })
                  }
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={points.length >= Math.min(plan.months, 100)}
            onClick={() => {
              const month = Array.from(
                { length: plan.months },
                (_, i) => i + 1,
              ).find((m) => !points.some((p) => p.month === m));
              if (month)
                onChange({
                  points: [...points, { month, price: plan.startPrice }].sort(
                    (a, b) => a.month - b.month,
                  ),
                });
            }}
          >
            Kursziel hinzufügen
          </button>
        </>
      )}
      <p className="fh-hint">
        Volatilität ist keine Liquidationswahrscheinlichkeit. Ein einzelner
        Verlauf bildet keine Häufigkeitsverteilung möglicher Ergebnisse ab.
      </p>
    </section>
  );
}
