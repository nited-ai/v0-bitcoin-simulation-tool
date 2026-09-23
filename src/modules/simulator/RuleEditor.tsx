"use client";
import { Plan } from "./types";
import { Numeric } from "./ProjectionEditor";
export function RuleEditor({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (patch: Partial<Plan>) => void;
}) {
  return (
    <section className="fh-rule-editor">
      <h3>Kaufregeln konfigurieren</h3>
      <div className="fh-form-grid">
        <Numeric
          label="Kaufen ab Rückgang unter ATH"
          value={plan.dipPercent ?? 50}
          suffix="%"
          max={99}
          onChange={(dipPercent) => onChange({ dipPercent })}
        />
        <Numeric
          label="Bekanntes ATH vor Start (0 = Startkurs)"
          value={plan.referenceAth ?? 0}
          suffix="USD"
          step={1000}
          onChange={(referenceAth) => onChange({ referenceAth })}
        />
        <Numeric
          label="Durchschnitt über"
          value={plan.maDays ?? 200}
          suffix="Tage"
          min={2}
          max={1460}
          onChange={(maDays) => onChange({ maDays })}
        />
        <Numeric
          label="Abstand unter Durchschnitt"
          value={plan.maDiscount ?? 0}
          suffix="%"
          max={99}
          onChange={(maDiscount) => onChange({ maDiscount })}
        />
        <Numeric
          label="Verfügbares Cash je Regelkauf"
          value={plan.buyFraction ?? 100}
          suffix="%"
          max={100}
          onChange={(buyFraction) => onChange({ buyFraction })}
        />
        <Numeric
          label="Maximaler Betrag je Regelkauf"
          value={plan.buyMax ?? 1000000}
          suffix="USD"
          onChange={(buyMax) => onChange({ buyMax })}
        />
        <label className="fh-field">
          <span>Kaufbedingung prüfen</span>
          <select
            aria-label="Kaufbedingung prüfen"
            value={plan.buyFrequency ?? "daily"}
            onChange={(e) =>
              onChange({ buyFrequency: e.target.value as "daily" | "monthly" })
            }
          >
            <option value="daily">Täglich</option>
            <option value="monthly">Nur am monatlichen Spartag</option>
          </select>
        </label>
      </div>
      <p className="fh-inline-note">
        Beispiel: 50 % unter ATH, täglich prüfen, 100 % Cash einsetzen.
        Sparraten bleiben bis zum Signal als Cash liegen. Der abgeschlossene
        Vortag liefert das Signal; gekauft wird zum nächsten Tagesanfang. Nach
        einem Kauf kann mit später verfügbaren Sparraten erneut gekauft werden.
      </p>
      <p className="fh-hint">
        Das ATH wächst nur mit bereits vergangenen Tageshochs. Der Durchschnitt
        benötigt zunächst die eingestellte Anzahl abgeschlossener
        Simulationstage. Vorhandene BTC werden durch die Kaufregeln nicht
        verkauft.
      </p>
    </section>
  );
}
