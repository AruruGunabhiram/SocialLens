import { format, isValid, parseISO } from 'date-fns'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Remove a trailing ".0" from a toFixed(1) result. */
function dropZeroDecimal(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

// ─── formatCount ─────────────────────────────────────────────────────────────

/**
 * Compact count notation for display values.
 *
 * Rules (positive values; negatives follow the same bands):
 *   null/undefined → " - "
 *   0              → "0"
 *   1–999          → "1"–"999"
 *   1 000–9 999    → "1K"–"9.9K"   (1 decimal, drop if .0)
 *   10 000–999 999 → "10K"–"999K"  (no decimal, floor)
 *   1M–9.9M        → "1M"–"9.9M"   (1 decimal, drop if .0)
 *   10M–999M       → "10M"–"999M"  (no decimal, floor)
 *   1B+            → "1B", "2.1B"  (1 decimal for < 10B, else floor)
 */
export function formatCount(n: number | null | undefined): string {
  if (n == null) return ' - '
  if (n === 0) return '0'
  const abs = Math.abs(n)

  if (abs >= 1_000_000_000) {
    const v = n / 1_000_000_000
    return (
      (abs >= 10_000_000_000 ? `${Math.floor(Math.abs(v))}` : dropZeroDecimal(v.toFixed(1))) + 'B'
    )
  }
  if (abs >= 1_000_000) {
    const v = n / 1_000_000
    return (abs >= 10_000_000 ? `${Math.floor(Math.abs(v))}` : dropZeroDecimal(v.toFixed(1))) + 'M'
  }
  if (abs >= 10_000) {
    return `${Math.floor(abs / 1_000)}K`
  }
  if (abs >= 1_000) {
    return dropZeroDecimal((abs / 1_000).toFixed(1)) + 'K'
  }
  return String(Math.round(abs))
}

// ─── formatSubscriberCount ────────────────────────────────────────────────────

/**
 * Subscriber count with correct singular/plural word.
 *   null/undefined → " - "
 *   1              → "1 subscriber"
 *   others         → "{formatCount(n)} subscribers"
 */
export function formatSubscriberCount(n: number | null | undefined): string {
  if (n == null) return ' - '
  if (n === 1) return '1 subscriber'
  return `${formatCount(n)} subscribers`
}

// ─── formatDate ───────────────────────────────────────────────────────────────

/**
 * Format an ISO date or ISO datetime string.
 *   "2026-04-04"              → "Apr 4, 2026"
 *   "2026-04-04T13:35:00Z"    → "Apr 4, 2026 at 1:35 PM"
 *   null / "" / invalid       → " - "
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ' - '
  const d = parseISO(dateStr)
  if (!isValid(d)) return ' - '
  // ISO datetime strings contain 'T'; date-only strings do not.
  const hasTime = dateStr.includes('T') || (dateStr.length > 10 && dateStr.includes(' '))
  return hasTime ? format(d, "MMM d, yyyy 'at' h:mm a") : format(d, 'MMM d, yyyy')
}

// ─── formatRelativeTime ───────────────────────────────────────────────────────

/**
 * Human-relative time from an ISO date/datetime string.
 *   < 60 s     → "just now"
 *   < 60 min   → "2 minutes ago"
 *   < 24 h     → "1 hour ago" / "3 hours ago"
 *   < 48 h     → "Yesterday"
 *   < 7 days   → "3 days ago"
 *   same year  → "Mar 21"
 *   diff year  → "Mar 21, 2025"
 *   null/bad   → " - "
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ' - '
  const d = parseISO(dateStr)
  if (!isValid(d)) return ' - '

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1_000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return d.getFullYear() === now.getFullYear() ? format(d, 'MMM d') : format(d, 'MMM d, yyyy')
}

// ─── formatChartAxis ─────────────────────────────────────────────────────────

/**
 * Compact notation for Recharts tickFormatter.
 * No trailing ".0"  -  keeps axis labels brief.
 *   0          → "0"
 *   1 000      → "1K"
 *   1 500      → "1.5K"
 *   1 000 000  → "1M"
 *   1 000 000 000 → "1B"
 */
export function formatChartAxis(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return dropZeroDecimal((n / 1_000_000_000).toFixed(1)) + 'B'
  if (abs >= 1_000_000) return dropZeroDecimal((n / 1_000_000).toFixed(1)) + 'M'
  if (abs >= 1_000) return dropZeroDecimal((n / 1_000).toFixed(1)) + 'K'
  return String(n)
}
