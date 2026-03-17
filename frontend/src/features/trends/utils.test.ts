import { describe, expect, it } from 'vitest'
import {
  normalizeTimeseriesPoints,
  computeDailyDeltas,
  hasSufficientDataForMode,
  computeInsights,
} from './utils'
import type { TimeSeriesPoint } from '@/api/types'

function pt(date: string, value: number): TimeSeriesPoint {
  return { date, value }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeTimeseriesPoints', () => {
  it('returns one point per day sorted chronologically', () => {
    const input = [pt('2024-01-03', 300), pt('2024-01-01', 100), pt('2024-01-02', 200)]
    const result = normalizeTimeseriesPoints(input)
    expect(result.map((p) => p.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
  })

  it('keeps the last snapshot when multiple exist for the same day', () => {
    // Sorted by date string; last chronological snapshot wins
    const input = [pt('2024-01-15T08:00:00Z', 100), pt('2024-01-15T20:00:00Z', 999)]
    const result = normalizeTimeseriesPoints(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ date: '2024-01-15', value: 999 })
  })

  it('strips the time component from full ISO timestamps', () => {
    const input = [pt('2024-03-10T14:30:00Z', 42)]
    const result = normalizeTimeseriesPoints(input)
    expect(result[0].date).toBe('2024-03-10')
  })

  it('returns an empty array for empty input', () => {
    expect(normalizeTimeseriesPoints([])).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('computeDailyDeltas', () => {
  it('computes day-over-day differences, omitting the first point', () => {
    const pts = [pt('2024-01-01', 1000), pt('2024-01-02', 1050), pt('2024-01-03', 1020)]
    const deltas = computeDailyDeltas(pts)
    expect(deltas).toHaveLength(2)
    expect(deltas[0]).toEqual({ date: '2024-01-02', value: 50 })
    expect(deltas[1]).toEqual({ date: '2024-01-03', value: -30 })
  })

  it('returns an empty array for a single point', () => {
    expect(computeDailyDeltas([pt('2024-01-01', 100)])).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    expect(computeDailyDeltas([])).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('hasSufficientDataForMode', () => {
  it('requires at least 2 points for total mode', () => {
    expect(hasSufficientDataForMode([pt('2024-01-01', 1)], 'total')).toBe(false)
    expect(hasSufficientDataForMode([pt('2024-01-01', 1), pt('2024-01-02', 2)], 'total')).toBe(true)
  })

  it('requires at least 3 points for delta mode', () => {
    const two = [pt('2024-01-01', 1), pt('2024-01-02', 2)]
    expect(hasSufficientDataForMode(two, 'delta')).toBe(false)
    const three = [...two, pt('2024-01-03', 3)]
    expect(hasSufficientDataForMode(three, 'delta')).toBe(true)
  })

  it('returns false for empty array regardless of mode', () => {
    expect(hasSufficientDataForMode([], 'total')).toBe(false)
    expect(hasSufficientDataForMode([], 'delta')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('computeInsights (total mode)', () => {
  it('calculates slope and trend correctly for a growing series', () => {
    // 10 days apart, +1000 total growth
    const pts = [pt('2024-01-01', 5000), pt('2024-01-11', 6000)]
    const { slope, trendLabel, avgPerDay, slopeUnavailable } = computeInsights(pts, 'total')
    expect(slopeUnavailable).toBe(false)
    expect(slope).toBeCloseTo(100, 0) // 1000 / 10 days
    expect(avgPerDay).toBeCloseTo(100, 0)
    expect(trendLabel).toBe('Up')
  })

  it('labels a declining series as "Down"', () => {
    const pts = [pt('2024-01-01', 6000), pt('2024-01-11', 4000)]
    const { trendLabel } = computeInsights(pts, 'total')
    expect(trendLabel).toBe('Down')
  })

  it('labels a flat series as "Flat" when slope is within ±1', () => {
    // Same value across 10 days → slope = 0
    const pts = [pt('2024-01-01', 5000), pt('2024-01-11', 5000)]
    const { trendLabel, slope } = computeInsights(pts, 'total')
    expect(slope).toBe(0)
    expect(trendLabel).toBe('Flat')
  })

  it('marks slopeUnavailable and returns "N/A" when first and last points share the same date', () => {
    const pts = [pt('2024-01-01', 5000), pt('2024-01-01', 6000)]
    const { slopeUnavailable, trendLabel } = computeInsights(pts, 'total')
    expect(slopeUnavailable).toBe(true)
    expect(trendLabel).toBe('N/A')
  })

  it('identifies the peak value and its date', () => {
    const pts = [pt('2024-01-01', 100), pt('2024-01-02', 999), pt('2024-01-03', 200)]
    const { peakValue, peakDate } = computeInsights(pts, 'total')
    expect(peakValue).toBe(999)
    expect(peakDate).toBe('2024-01-02')
  })
})

describe('computeInsights (delta mode)', () => {
  it('calculates the mean of delta values as avgPerDay', () => {
    const deltas = [pt('2024-01-02', 50), pt('2024-01-03', 100), pt('2024-01-04', 150)]
    const { avgPerDay, trendLabel } = computeInsights(deltas, 'delta')
    expect(avgPerDay).toBeCloseTo(100, 5)
    expect(trendLabel).toBe('Up')
  })

  it('labels negative mean deltas as "Down"', () => {
    const deltas = [pt('2024-01-02', -50), pt('2024-01-03', -100)]
    const { trendLabel } = computeInsights(deltas, 'delta')
    expect(trendLabel).toBe('Down')
  })

  it('never sets slopeUnavailable in delta mode', () => {
    const deltas = [pt('2024-01-01', 0)]
    const { slopeUnavailable } = computeInsights(deltas, 'delta')
    expect(slopeUnavailable).toBe(false)
  })
})
