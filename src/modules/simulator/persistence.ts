import {
  ENGINE_VERSION,
  Plan,
  PriceDay,
  Scenario,
  StrategyId,
  STRATEGIES,
} from "./types";
import { validatePath, validatePlan, validateScenario } from "./paths";
export interface Snapshot {
  version: string;
  plan: Plan;
  scenario: Scenario;
  strategies: StrategyId[];
  path: PriceDay[];
}
export function exportSnapshot(
  plan: Plan,
  scenario: Scenario,
  strategies: StrategyId[],
  path: PriceDay[],
): string {
  const value = { version: ENGINE_VERSION, plan, scenario, strategies, path };
  const text = JSON.stringify(value);
  parseSnapshot(text);
  return text;
}
export function parseSnapshot(text: string): Snapshot {
  if (text.length > 3000000) throw new Error("Datei ist zu groß (max. 3 MB).");
  let value: Snapshot;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Keine gültige JSON-Datei.");
  }
  if (
    !value ||
    ![ENGINE_VERSION, "1.0.0"].includes(value.version) ||
    !value.plan ||
    !value.scenario
  )
    throw new Error("Unbekannte Simulationsversion.");
  validatePlan(value.plan);
  validateScenario(value.scenario);
  validatePath(value.path, value.plan);
  if (
    !Array.isArray(value.strategies) ||
    !value.strategies.length ||
    value.strategies.length > STRATEGIES.length ||
    new Set(value.strategies).size !== value.strategies.length ||
    value.strategies.some((id) => !STRATEGIES.some((s) => s.id === id))
  )
    throw new Error("Ungültige Strategieauswahl.");
  return value;
}
