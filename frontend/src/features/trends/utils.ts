import type { TimeSeriesPoint } from '@/api/types'

export interface WeeklyUploadPoint {
  /** ISO date of the Monday that starts this week */
  weekStart: string
  count: number
}

export type SeriesMode = 'total' | 'delta'

/** Minimum captured days before trend conclusions are considered reliable. */
export const MIN_RELIABLE_DAYS = 7

/** True when there are too few captured days to draw reliable trend conclusions. */
export function isLowConfidenceCoverage(capturedDays: number): boolean {
  return capturedDays < MIN_RELIABLE_DAYS
}

export interface SnapshotCoverage {
  /** Number of distinct calendar days returned by the backend */
  capturedDays: number
  firstDate: string | null
  lastDate: string | null
  /** True when captured days are fewer than the requested range */
  isSparse: boolean
}

/**
 * Summarize how many distinct snapshot days the backend returned vs. the
 * requested range, so the UI can display honest coverage language.
 *
 * `pts` must already be normalized (one entry per day, sorted ascending).
 */
export function computeSnapshotCoverage(
  pts: TimeSeriesPoint[],
  requestedRange: number
): SnapshotCoverage {
  const capturedDays = pts.length
  const firstDate = capturedDays > 0 ? pts[0].date : null
  const lastDate = capturedDays > 0 ? pts[capturedDays - 1].date : null
  const isSparse = capturedDays < requestedRange
  return { capturedDays, firstDate, lastDate, isSparse }
}

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
 * Group daily upload delta points into ISO-week (Mon–Sun) buckets.
 * Input must be daily deltas (from computeDailyDeltas on the UPLOADS series).
 * Negative deltas (data corrections) are clamped to 0.
 */
export function computeWeeklyUploads(dailyDeltas: TimeSeriesPoint[]): WeeklyUploadPoint[] {
  const map = new Map<string, number>()
  for (const pt of dailyDeltas) {
    const d = new Date(pt.date + 'T00:00:00Z')
    const dayOfWeek = d.getUTCDay() // 0=Sun, 1=Mon, …, 6=Sat
    const daysToMonday = (dayOfWeek + 6) % 7
    const mon = new Date(d.getTime() - daysToMonday * 86_400_000)
    const monStr = mon.toISOString().slice(0, 10)
    map.set(monStr, (map.get(monStr) ?? 0) + Math.max(0, pt.value))
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count }))
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
