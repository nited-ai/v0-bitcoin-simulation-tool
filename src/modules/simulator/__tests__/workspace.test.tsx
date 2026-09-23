import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SimulatorWorkspace from "../SimulatorWorkspace";
import * as engine from "../engine";
import { DEFAULT_PLAN } from "../types";
import { buildPath } from "../paths";
import { exportSnapshot } from "../persistence";
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
vi.mock("../../price-data/hooks/usePriceData", () => ({
  usePriceData: () => ({
    prices: [],
    currentPrice: null,
    isLoading: false,
    isStale: true,
    error: new Error("offline"),
    lastUpdated: null,
    refresh: vi.fn(),
  }),
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));
describe("comparison workspace", () => {
  it("anchors stress tests to imported historical prices and keeps the path when cashflows change", async () => {
    const plan = {
      ...DEFAULT_PLAN,
      startDate: "2024-01-01",
      months: 2,
      startPrice: 100000,
    };
    const flat = {
      kind: "flat" as const,
      growth: 10,
      crashPercent: 70,
      cycleDamping: 0.5,
    };
    const path = buildPath({ ...plan, startPrice: 20000 }, flat, []);
    localStorage.setItem(
      "firehodl-snapshot-v1",
      exportSnapshot(
        plan,
        { ...flat, kind: "historical" },
        ["hold", "cash"],
        path,
      ),
    );
    const stress = vi.spyOn(engine, "compareStress");
    render(<SimulatorWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Laden" }));
    fireEvent.change(screen.getByLabelText("Monatliche Sparrate"), {
      target: { value: "500" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Ergebnisse" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Stressvergleich starten" }),
    );
    await waitFor(() =>
      expect(stress).toHaveBeenCalledWith(
        expect.objectContaining({ startPrice: 20000, contribution: 500 }),
        ["hold", "cash"],
      ),
    );
  });
  it("opens the journal when a result strategy is selected", async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    render(<SimulatorWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: "Ergebnisse" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "HODL + Sparplan",
        exact: true,
      }),
    );
    expect(document.querySelector("#journal")).toHaveAttribute("open");
  });
  it("opens directly with a usable comparison even without live data", async () => {
    render(<SimulatorWorkspace />);
    expect(
      await screen.findByRole("heading", { name: "Kursprojektion" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Monatliche Sparrate")).toHaveValue(300);
    expect(
      screen.getByText(/Kursdaten derzeit nicht erreichbar/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("HODL + Sparplan").length).toBeGreaterThan(0);
  });
  it("allows custom volatile price targets and preserves them across workspace tabs", async () => {
    render(<SimulatorWorkspace />);
    fireEvent.click(
      screen.getByRole("button", { name: "Zyklus mit Crash als Vorlage" }),
    );
    expect(screen.getByLabelText("Marktszenario")).toHaveValue("custom");
    fireEvent.change(screen.getByLabelText("Ziel 2: BTC-Kurs"), {
      target: { value: "30000" },
    });
    fireEvent.change(
      screen.getByLabelText("Tägliche Volatilität, annualisiert"),
      { target: { value: "65" } },
    );
    fireEvent.click(screen.getByRole("tab", { name: "Strategien & Kredit" }));
    fireEvent.change(screen.getByLabelText("Kaufen ab Rückgang unter ATH"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Kursprojektion" }));
    expect(screen.getByLabelText("Ziel 2: BTC-Kurs")).toHaveValue(30000);
    expect(
      screen.getByLabelText("Tägliche Volatilität, annualisiert"),
    ).toHaveValue(65);
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
  it("applies and saves an editable lender profile", async () => {
    const { unmount } = render(<SimulatorWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: "Strategien & Kredit" }));
    fireEvent.change(screen.getByLabelText("Kreditprofil"), {
      target: { value: "coinbase" },
    });
    expect(screen.getByLabelText("Keine feste Fälligkeit")).toBeChecked();
    expect(screen.getByLabelText("Liquidations-LTV")).toHaveValue(86);
    fireEvent.change(screen.getByLabelText("Kreditzins pro Jahr"), {
      target: { value: "7.5" },
    });
    fireEvent.change(screen.getByLabelText("Name für eigenes Profil"), {
      target: { value: "Mein Testkredit" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Als eigenes Profil speichern" }),
    );
    const saved = JSON.parse(
      localStorage.getItem("firehodl-credit-profiles-v1")!,
    );
    expect(saved[0].terms.annualInterest).toBe(7.5);
    unmount();
    render(<SimulatorWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: "Strategien & Kredit" }));
    fireEvent.change(screen.getByLabelText("Kreditprofil"), {
      target: { value: saved[0].id },
    });
    expect(screen.getByLabelText("Kreditzins pro Jahr")).toHaveValue(7.5);
  });
  it("allows zero BTC and validates invalid input instead of showing a winning result", async () => {
    render(<SimulatorWorkspace />);
    const btc = await screen.findByLabelText("Vorhandene BTC");
    fireEvent.change(btc, { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Zeitraum in Monaten"), {
      target: { value: "0" },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Ungültiger Wert: months",
      ),
    );
  });
});
