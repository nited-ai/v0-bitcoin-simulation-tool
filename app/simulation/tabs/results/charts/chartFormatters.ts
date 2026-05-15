/**
 * Shared formatters for the Results-tab charts.
 *
 * Lifted out so every chart shows month-axis labels the same way and we
 * don't have four divergent copies of the same `M${month}` formatter.
 */

/**
 * Stable simulation "month 0" anchor. Captured once at module load so all
 * charts in a single render pass use the same reference date — without
 * this every tick of every chart would call `new Date()` and risk
 * inconsistencies if a render crosses midnight or month-end.
 */
const SIM_ORIGIN = new Date()

/**
 * Convert a month index (0 = simulation start) to a short
 * "MMM 'YY" label, e.g. month 0 → "Jun '26", month 13 → "Jul '27".
 *
 * Uses en-US to keep the label locale-stable regardless of the user's
 * browser locale (which was producing mixed-format displays elsewhere).
 */
export function formatMonthAsDate(month: number): string {
  const d = new Date(SIM_ORIGIN)
  d.setMonth(d.getMonth() + month)
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  })
}

/**
 * Recharts XAxis props that render the date label tilted -45° so the
 * "Jun '26" / "Jul '27" strings don't fight each other for horizontal
 * space. Use as `<XAxis dataKey="month" {...monthAxisProps} />`.
 */
export const monthAxisProps = {
  tickFormatter: formatMonthAsDate,
  angle: -45,
  textAnchor: "end" as const,
  height: 56, // extra room so the tilted labels don't get clipped
  minTickGap: 14,
  tick: { fontSize: 11 },
}

/**
 * Tooltip-side: when a chart tooltip wants to show the row's month as
 * "Jul 2027" (the full year, since space isn't a problem in the tooltip).
 */
export function formatMonthAsDateFull(month: number): string {
  const d = new Date(SIM_ORIGIN)
  d.setMonth(d.getMonth() + month)
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}
