import type { TimeSeriesPoint } from '@/api/types'

export interface Insights {
  /** Average daily growth = (lastValue - firstValue) / calendarDaySpan. */
  avgPerDay: number
  peakValue: number
  peakDate: string
  /** Daily growth rate = (lastValue - firstValue) / calendarDaySpan. */
  slope: number
  trendLabel: 'Up' | 'Down' | 'Flat' | 'N/A'
  /** True when first and last point share the same date (can't compute slope). */
  slopeUnavailable: boolean
}

/**
 * Collapse raw backend points into one point per UTC calendar day.
 * Handles both "YYYY-MM-DD" and full ISO timestamps (e.g. "2024-01-15T12:30:00Z").
 * For days with multiple snapshots, the last chronologically (latest timestamp) wins.
 */
export function normalizeTimeseriesPoints(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  // Sort ascending so Map.set overwrites with progressively later snapshots
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))

  const map = new Map<string, TimeSeriesPoint>()
  for (const pt of sorted) {
    const dayKey = pt.date.slice(0, 10) // "YYYY-MM-DD" from any ISO string
    map.set(dayKey, { date: dayKey, value: pt.value })
  }

  // map preserves insertion order, already ascending
  return Array.from(map.values())
}

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

/**
 * Returns true if the array contains at least 2 entries with distinct YYYY-MM-DD dates.
 */
export function hasSufficientData(pts: TimeSeriesPoint[]): boolean {
  if (pts.length < 2) return false
  const firstDay = pts[0].date.slice(0, 10)
  const lastDay = pts[pts.length - 1].date.slice(0, 10)
  return firstDay !== lastDay
}

/**
 * Compute insights from a normalized (one-per-day) point array.
 *
 * avgPerDay = (lastValue - firstValue) / calendarDaySpan
 *   This reflects actual growth rate per calendar day regardless of how
 *   many snapshots exist — avoids inflating the rate for sparse data.
 *
 * slope = same formula; used for the Trend direction card.
 *
 * If daySpan === 0 (all points on the same calendar day), slope and avgPerDay
 * are set to 0 and slopeUnavailable is true.
 */
export function computeInsights(pts: TimeSeriesPoint[]): Insights {
  const values = pts.map(p => p.value)

  const peakIdx = values.indexOf(Math.max(...values))
  const peakValue = values[peakIdx] ?? 0
  const peakDate = pts[peakIdx]?.date ?? ''

  const n = values.length
  const days = n >= 2 ? daysBetween(pts[0].date, pts[n - 1].date) : 0
  const slopeUnavailable = days === 0

  const slope = slopeUnavailable ? 0 : (pts[n - 1].value - pts[0].value) / days
  const avgPerDay = slope   // avgPerDay and slope share the same formula

  const trendLabel: Insights['trendLabel'] = slopeUnavailable
    ? 'N/A'
    : slope > 1
      ? 'Up'
      : slope < -1
        ? 'Down'
        : 'Flat'

  return { avgPerDay, peakValue, peakDate, slope, trendLabel, slopeUnavailable }
}
