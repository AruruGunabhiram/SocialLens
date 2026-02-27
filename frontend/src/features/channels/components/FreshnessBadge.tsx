import { differenceInHours, formatDistanceToNow, isValid, parseISO } from 'date-fns'

import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefreshStatus = 'SUCCESS' | 'FAILED' | 'NEVER_RUN' | 'PARTIAL'

type FreshnessBadgeProps = {
  lastSuccessfulRefreshAt?: string | null
  lastSnapshotAt?: string | null
  lastRefreshStatus?: RefreshStatus | string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTs(value?: string | null): Date | null {
  if (!value) return null
  const d = parseISO(value)
  if (isValid(d)) return d
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}

function relAgo(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true })
}

function statusVariant(status?: string | null): 'secondary' | 'destructive' | 'outline' {
  if (status === 'SUCCESS') return 'secondary'
  if (status === 'FAILED') return 'destructive'
  return 'outline'
}

function statusLabel(status?: string | null): string {
  if (!status || status === 'NEVER_RUN') return 'Never run'
  if (status === 'SUCCESS') return 'Fresh'
  if (status === 'FAILED') return 'Failed'
  if (status === 'PARTIAL') return 'Partial'
  return status
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FreshnessBadge({
  lastSuccessfulRefreshAt,
  lastSnapshotAt,
  lastRefreshStatus,
}: FreshnessBadgeProps) {
  const refreshDate = parseTs(lastSuccessfulRefreshAt)
  const snapshotDate = parseTs(lastSnapshotAt)
  const isStale = refreshDate ? differenceInHours(new Date(), refreshDate) >= 24 : true

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {/* Status pill */}
      <Badge
        variant={isStale ? statusVariant(lastRefreshStatus) : 'secondary'}
        className="shrink-0"
      >
        {statusLabel(lastRefreshStatus)}
      </Badge>

      {/* Snapshot freshness */}
      <span>
        {snapshotDate
          ? `Snapshot ${relAgo(snapshotDate)}`
          : 'No snapshots yet'}
      </span>

      {/* Last successful refresh */}
      <span className="text-xs text-muted-foreground/70">
        {refreshDate
          ? `Refreshed ${relAgo(refreshDate)}`
          : 'Never refreshed'}
      </span>
    </div>
  )
}
