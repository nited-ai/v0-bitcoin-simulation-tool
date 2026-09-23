"use client";
import { useEffect, useState } from "react";
import { DEFAULT_PLAN, Plan } from "./types";
import { validatePlan } from "./paths";

const STORAGE = "firehodl-credit-profiles-v1";
const keys = [
  "loanLtv",
  "maxLtv",
  "liquidationLtv",
  "annualInterest",
  "originationFee",
  "feeAnnual",
  "loanTerm",
  "openEnded",
  "refinance",
  "liquidationFee",
] as const;
type Terms = Pick<Plan, (typeof keys)[number]>;
type Profile = {
  id: string;
  name: string;
  terms: Terms;
  note: string;
  source?: string;
};
function terms(plan: Plan): Terms {
  return Object.fromEntries(keys.map((k) => [k, plan[k]])) as Terms;
}
const base = terms(DEFAULT_PLAN);
export const CREDIT_PROFILES: Profile[] = [
  {
    id: "firehodl",
    name: "FireHODL · eigenes Modell",
    terms: base,
    note: "Bearbeitbare Ausgangswerte des Simulators. Kein Kreditangebot.",
  },
  {
    id: "firefish",
    name: "Firefish · Modellvorlage",
    terms: { ...base, maxLtv: 0.5, liquidationLtv: 0.95, loanTerm: 24 },
    note: "95 % Liquidations-LTV laut Anbieter. Zins und Gebühren sind editierbare Modellannahmen, kein aktuelles Angebot. Vertragsabhängige Vorabzinsen und Abwicklungsfristen werden hier nicht nachgebildet.",
    source: "https://docs.firefish.io/how-it-works/liquidations",
  },
  {
    id: "strike",
    name: "Strike · klassischer Kredit (Modell)",
    terms: {
      ...base,
      maxLtv: 0.5,
      liquidationLtv: 0.85,
      originationFee: 0,
      feeAnnual: false,
      loanTerm: 12,
      liquidationFee: 1,
    },
    note: "Vorlage des bisherigen Simulators. Der klassische Kredit hat zusätzliche Margin-Call-Regeln; deren Fristen und Teilverkäufe sind nicht simuliert. Strike bietet auch andere Produkte an. Zinssatz und Vertragswerte anhand deines Angebots prüfen.",
    source: "https://strike.me/en/faq/what-is-my-loan-to-value-ratio/",
  },
  {
    id: "coinbase",
    name: "Coinbase / Morpho · offener Kredit (Modell)",
    terms: {
      ...base,
      maxLtv: 0.75,
      liquidationLtv: 0.86,
      originationFee: 0,
      feeAnnual: false,
      openEnded: true,
      liquidationFee: 4.38,
    },
    note: "86 % ist ein Beispielmarkt, keine universelle Coinbase-Grenze. LLTV und variable Zinsen hängen vom Markt ab. Hier konstante Zinsen und vollständige Liquidation statt protokollspezifischer Teilverkäufe.",
    source:
      "https://help.coinbase.com/en/coinbase/trading-and-funding/loan/loan-health",
  },
];
export function CreditProfiles({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (p: Partial<Plan>) => void;
}) {
  const [custom, setCustom] = useState<Profile[]>([]),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
      if (!Array.isArray(raw) || raw.length > 30) return;
      const valid = raw
        .filter((p) => {
          try {
            if (
              typeof p.id !== "string" ||
              !p.id.startsWith("own-") ||
              typeof p.name !== "string" ||
              !p.name.trim() ||
              p.name.length > 80 ||
              !p.terms
            )
              return false;
            validatePlan({ ...DEFAULT_PLAN, ...terms(p.terms) });
            return true;
          } catch {
            return false;
          }
        })
        .map((p) => ({
          id: p.id,
          name: p.name,
          terms: terms(p.terms),
          note: "Eigenes gespeichertes Kreditprofil.",
        }));
      setCustom(valid);
    } catch {
      setMessage("Gespeicherte Kreditprofile konnten nicht geladen werden.");
    }
  }, []);
  const profiles = [...CREDIT_PROFILES, ...custom];
  const selected = profiles.find((p) => p.id === plan.creditProfile);
  const edited = selected && keys.some((k) => selected.terms[k] !== plan[k]);
  return (
    <div className="fh-credit-profiles">
      <label className="fh-field">
        <span>Kreditprofil</span>
        <select
          aria-label="Kreditprofil"
          value={selected?.id ?? "custom"}
          onChange={(e) => {
            const p = profiles.find((p) => p.id === e.target.value);
            if (p) onChange({ ...p.terms, creditProfile: p.id });
            else onChange({ creditProfile: "custom" });
          }}
        >
          <option value="custom">Individuelle Bedingungen</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="fh-inline-note">
        {selected?.note ?? "Eigene Annahmen für diesen Vergleich."}{" "}
        {edited && <strong>Werte gegenüber Vorlage geändert. </strong>}
        {selected?.source && (
          <a href={selected.source} target="_blank" rel="noreferrer">
            Anbieterbedingungen
          </a>
        )}
      </p>
      <div className="fh-control-line">
        <label className="fh-field">
          <span>Name für eigenes Profil</span>
          <input
            aria-label="Name für eigenes Profil"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!name.trim() || custom.length >= 30}
          onClick={() => {
            try {
              validatePlan(plan);
              const p: Profile = {
                id: `own-${Date.now()}`,
                name: name.trim(),
                terms: terms(plan),
                note: "Eigenes gespeichertes Kreditprofil.",
              };
              const next = [...custom, p];
              localStorage.setItem(STORAGE, JSON.stringify(next));
              setCustom(next);
              onChange({ creditProfile: p.id });
              setName("");
              setMessage("Kreditprofil in diesem Browser gespeichert.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Speichern nicht möglich.",
              );
            }
          }}
        >
          Als eigenes Profil speichern
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
