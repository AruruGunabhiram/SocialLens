import { format, isValid, parseISO } from 'date-fns'

/**
 * Compact notation for chart axis labels: 1.2M, 340K, 999.
 * Only shows a decimal when it's non-zero (e.g. "2.1M" not "2.0M").
 * Handles B (billions) for very large subscriber/view counts.
 */
export function fmtNum(n: number): string {
  function compact(val: number, suffix: string): string {
    const fixed = val.toFixed(1)
    return (fixed.endsWith('.0') ? String(Math.round(val)) : fixed) + suffix
  }
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return compact(n / 1_000_000_000, 'B')
  if (abs >= 1_000_000) return compact(n / 1_000_000, 'M')
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString()
}

/**
 * Intl compact notation for display values: 1.2M, 340K.
 * Returns ' - ' for null/undefined.
 */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return ' - '
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
 * Returns ' - ' for absent or invalid values.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ' - '
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d, yyyy') : ' - '
}

/**
 * Format an ISO datetime string to "MMM d, yyyy HH:mm" (local time).
 * Returns ' - ' for absent or invalid values.
 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ' - '
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d, yyyy HH:mm') : ' - '
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

/**
 * Format a subscriber count with correct singular/plural label.
 * Returns `{ value, label }` so the number can be styled in DM Mono
 * while the label uses the body font.
 *
 * Examples: 1 → { value: "1", label: "subscriber" }
 *           1500 → { value: "1.5K", label: "subscribers" }
 *           2_500_000 → { value: "2.5M", label: "subscribers" }
 */
export function fmtSubscribers(n: number | null | undefined): { value: string; label: string } {
  if (n == null) return { value: ' - ', label: 'subscribers' }
  const label = n === 1 ? 'subscriber' : 'subscribers'
  const value = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
  return { value, label }
}
