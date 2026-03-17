import { describe, expect, it } from 'vitest'
import { fmtNum, fmtCompact, fmtDelta, fmtDate, fmtDateShort } from './format'

describe('fmtNum', () => {
  it('formats millions to one decimal place', () => {
    expect(fmtNum(1_200_000)).toBe('1.2M')
    expect(fmtNum(1_000_000)).toBe('1.0M')
    expect(fmtNum(10_000_000)).toBe('10.0M')
  })

  it('formats thousands to zero decimal places', () => {
    expect(fmtNum(340_000)).toBe('340K')
    expect(fmtNum(1_000)).toBe('1K')
    expect(fmtNum(1_500)).toBe('2K') // rounds up
  })

  it('returns plain number for values below 1000', () => {
    expect(fmtNum(999)).toBe('999')
    expect(fmtNum(0)).toBe('0')
    expect(fmtNum(1)).toBe('1')
  })

  it('applies the million threshold strictly (>= 1_000_000 → M branch)', () => {
    // 999_999 hits the K branch: (999_999 / 1000).toFixed(0) = '1000'
    expect(fmtNum(999_999)).toBe('1000K')
    expect(fmtNum(1_000_000)).toBe('1.0M')
  })
})

describe('fmtCompact', () => {
  it('returns em-dash for null', () => {
    expect(fmtCompact(null)).toBe('—')
  })

  it('returns em-dash for undefined', () => {
    expect(fmtCompact(undefined)).toBe('—')
  })

  it('formats a valid number compactly', () => {
    expect(fmtCompact(0)).toBe('0')
    // Intl compact rounding — just verify it does not throw and is non-empty
    const result = fmtCompact(1_234_567)
    expect(result).toBeTruthy()
    expect(result).toMatch(/M/)
  })
})

describe('fmtDelta', () => {
  it('prefixes positive values with +', () => {
    expect(fmtDelta(500)).toBe('+500')
    expect(fmtDelta(1_200)).toBe('+1K')
    expect(fmtDelta(2_500_000)).toBe('+2.5M')
  })

  it('prefixes negative values with typographic minus −', () => {
    expect(fmtDelta(-500)).toBe('−500')
    expect(fmtDelta(-1_200)).toBe('−1K')
    expect(fmtDelta(-2_500_000)).toBe('−2.5M')
  })

  it('treats zero as positive', () => {
    expect(fmtDelta(0)).toBe('+0')
  })

  it('uses compact notation matching fmtNum thresholds', () => {
    expect(fmtDelta(999_999)).toBe('+1000K')
    expect(fmtDelta(1_000_000)).toBe('+1.0M')
  })
})

describe('fmtDate', () => {
  it('formats a valid ISO date string as "MMM d, yyyy"', () => {
    expect(fmtDate('2024-01-15')).toBe('Jan 15, 2024')
    expect(fmtDate('2023-12-31')).toBe('Dec 31, 2023')
  })

  it('returns em-dash for null', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('returns em-dash for empty string', () => {
    expect(fmtDate('')).toBe('—')
  })

  it('returns em-dash for an invalid date string', () => {
    expect(fmtDate('not-a-date')).toBe('—')
  })
})

describe('fmtDateShort', () => {
  it('formats a valid ISO date to "MMM d"', () => {
    expect(fmtDateShort('2024-01-15')).toBe('Jan 15')
    expect(fmtDateShort('2023-12-31')).toBe('Dec 31')
  })

  it('returns the original string if parsing fails', () => {
    expect(fmtDateShort('not-a-date')).toBe('not-a-date')
  })
})
