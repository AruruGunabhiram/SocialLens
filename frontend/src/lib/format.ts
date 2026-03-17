import { format, isValid, parseISO } from 'date-fns'

/**
 * Compact notation for chart axis labels: 1.2M, 340K, 999.
 * Rounds to one decimal for millions, zero decimals for thousands.
 */
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

/**
 * Intl compact notation for display values: 1.2M, 340K.
 * Returns '—' for null/undefined.
 */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/**
 * Signed delta with compact suffix: +1.2K or −500.
 * Uses the typographic minus sign (−) for negative values.
 */
export function fmtDelta(n: number): string {
  const abs = Math.abs(n)
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(abs / 1_000).toFixed(0)}K`
        : abs.toLocaleString()
  return `${n >= 0 ? '+' : '−'}${formatted}`
}

/**
 * Format an ISO date string to "MMM d, yyyy".
 * Returns '—' for absent or invalid values.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
}

/**
 * Format an ISO date string to "MMM d" (short form for chart x-axis).
 */
export function fmtDateShort(date: string): string {
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}
