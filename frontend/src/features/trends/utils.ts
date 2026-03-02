import type { TimeSeriesPoint } from '@/api/types'

export type SeriesMode = 'total' | 'delta'

export interface Insights {
  /** Total mode: (lastValue - firstValue) / calendarDaySpan. Delta mode: mean(deltas). */
  avgPerDay: number
  peakValue: number
  peakDate: string
  /** Same as avgPerDay; drives the Trend direction card. */
  slope: number
  trendLabel: 'Up' | 'Down' | 'Flat' | 'N/A'
  /** True when first and last point share the same date (total mode only). */
  slopeUnavailable: boolean
}

/**
 * Collapse raw backend points into one point per UTC calendar day.
 * Handles both "YYYY-MM-DD" and full ISO timestamps ("2024-01-15T12:30:00Z").
 * For days with multiple snapshots, the last chronologically wins.
 */
export function normalizeTimeseriesPoints(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const map = new Map<string, TimeSeriesPoint>()
  for (const pt of sorted) {
    const dayKey = pt.date.slice(0, 10) // "YYYY-MM-DD" from any ISO string
    map.set(dayKey, { date: dayKey, value: pt.value })
  }
  return Array.from(map.values())
}

/**
 * Compute daily deltas from a normalized (one-per-day) total series.
 * delta[i] = total[i] - total[i-1]. The first point is omitted (no predecessor).
 */
export function computeDailyDeltas(pts: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (pts.length < 2) return []
  return pts.slice(1).map((pt, i) => ({
    date: pt.date,
    value: pt.value - pts[i].value,
  }))
}

/**
 * Returns true when there are enough normalized daily points for the given mode.
 * - total: ≥2 points (each is a distinct day after normalization)
 * - delta: ≥3 points (produces ≥2 deltas for a meaningful chart)
 */
export function hasSufficientDataForMode(pts: TimeSeriesPoint[], mode: SeriesMode): boolean {
  return pts.length >= (mode === 'delta' ? 3 : 2)
}

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

/**
 * Compute insights from a point array.
 *
 * - total mode: pts are daily totals. Peak = max total. Slope = (last-first)/daySpan.
 * - delta mode: pts are already daily deltas. Peak = max delta. Avg/slope = mean(deltas).
 */
export function computeInsights(pts: TimeSeriesPoint[], mode: SeriesMode = 'total'): Insights {
  const values = pts.map((p) => p.value)
  const peakIdx = values.indexOf(Math.max(...values))
  const peakValue = values[peakIdx] ?? 0
  const peakDate = pts[peakIdx]?.date ?? ''

  if (mode === 'delta') {
    const avgPerDay = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
    const slope = avgPerDay
    const trendLabel: Insights['trendLabel'] = slope > 1 ? 'Up' : slope < -1 ? 'Down' : 'Flat'
    return { avgPerDay, peakValue, peakDate, slope, trendLabel, slopeUnavailable: false }
  }

  // total mode
  const n = values.length
  const days = n >= 2 ? daysBetween(pts[0].date, pts[n - 1].date) : 0
  const slopeUnavailable = days === 0
  const slope = slopeUnavailable ? 0 : (pts[n - 1].value - pts[0].value) / days
  const avgPerDay = slope
  const trendLabel: Insights['trendLabel'] = slopeUnavailable
    ? 'N/A'
    : slope > 1
      ? 'Up'
      : slope < -1
        ? 'Down'
        : 'Flat'

  return { avgPerDay, peakValue, peakDate, slope, trendLabel, slopeUnavailable }
}
