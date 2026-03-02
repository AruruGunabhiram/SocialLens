import { useState } from 'react'
import { differenceInHours, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { ChannelItem } from '@/api/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefreshStatus = 'SUCCESS' | 'FAILED' | 'NEVER_RUN' | 'PARTIAL'

/**
 * Strict prop contract for FreshnessBadge.
 * All freshness fields are required (typed as `T | null` rather than optional)
 * so callers cannot silently omit them — pass `null` explicitly when unknown.
 */
export type FreshnessBadgeProps = {
  /** ISO-8601 of the latest captured snapshot. Pass null if not yet captured. */
  lastSnapshotAt: string | null
  /**
   * ISO-8601 of the most recent successful refresh job.
   * Maps to `lastSuccessfulRefreshAt` from the ChannelItem endpoint.
   * Pass null if the channel has never been refreshed.
   */
  lastRefreshAt: string | null
  /** Outcome of the most recent refresh job. Pass null if never run. */
  status: RefreshStatus | null
  /**
   * Error detail from the most recent failed job.
   * Shown inside a collapsible "View error" panel when status is FAILED.
   * Optional because the backend may not always populate this field.
   */
  lastRefreshError?: string | null
}

// ---------------------------------------------------------------------------
// Mapper: ChannelItem → FreshnessBadgeProps
//
// Single source-of-truth conversion from the /channels/:id response shape.
// Import and call this in every page that owns a ChannelItem, then spread the
// result into <FreshnessBadge>. If a different endpoint uses different field
// names, write a separate mapper for that endpoint.
// ---------------------------------------------------------------------------

export function mapChannelItemToFreshnessProps(
  item: ChannelItem | null | undefined
): FreshnessBadgeProps {
  return {
    lastSnapshotAt: item?.lastSnapshotAt ?? null,
    lastRefreshAt: item?.lastSuccessfulRefreshAt ?? null,
    status: item?.lastRefreshStatus ?? null,
    lastRefreshError: item?.lastRefreshError ?? null,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTs(value: string | null): Date | null {
  if (!value) return null
  const d = parseISO(value)
  if (isValid(d)) return d
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}

function relAgo(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true })
}

function statusVariant(
  status: RefreshStatus | null,
  isStale: boolean
): 'secondary' | 'destructive' | 'outline' {
  if (status === 'FAILED') return 'destructive'
  if (status === 'SUCCESS') return isStale ? 'outline' : 'secondary'
  return 'outline'
}

function statusLabel(status: RefreshStatus | null): string {
  if (!status || status === 'NEVER_RUN') return 'Never run'
  if (status === 'SUCCESS') return 'SUCCESS'
  if (status === 'FAILED') return 'FAIL'
  if (status === 'PARTIAL') return 'Partial'
  return status
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FreshnessBadge({
  lastSnapshotAt,
  lastRefreshAt,
  status,
  lastRefreshError,
}: FreshnessBadgeProps) {
  const [errorExpanded, setErrorExpanded] = useState(false)

  const snapshotDate = parseTs(lastSnapshotAt)
  const refreshDate = parseTs(lastRefreshAt)
  const isStale = refreshDate ? differenceInHours(new Date(), refreshDate) >= 24 : true
  const isFailed = status === 'FAILED'

  // When FAILED, lastRefreshAt is the last *successful* time — label accordingly.
  const refreshLabel =
    refreshDate == null
      ? 'Never refreshed'
      : isFailed
        ? `Last success ${relAgo(refreshDate)}`
        : `Refreshed ${relAgo(refreshDate)}`

  return (
    <div className="flex flex-col gap-y-1.5 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* Status pill */}
        <Badge variant={statusVariant(status, isStale)} className="shrink-0 font-mono text-xs">
          {statusLabel(status)}
        </Badge>

        {/* Snapshot time */}
        <span>{snapshotDate ? `Snapshot ${relAgo(snapshotDate)}` : 'No snapshots yet'}</span>

        {/* Last refresh time */}
        <span className="text-xs text-muted-foreground/70">{refreshLabel}</span>

        {/* "View error" toggle — only visible when status is FAILED */}
        {isFailed && (
          <button
            type="button"
            onClick={() => setErrorExpanded((v) => !v)}
            className="flex items-center gap-0.5 rounded text-xs text-destructive hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
            aria-expanded={errorExpanded}
            aria-controls="freshness-error-detail"
          >
            {errorExpanded ? 'Hide error' : 'View error'}
            {errorExpanded ? (
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Collapsible error detail panel */}
      {isFailed && errorExpanded && (
        <div
          id="freshness-error-detail"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs"
        >
          {lastRefreshError ? (
            <pre className="whitespace-pre-wrap break-all font-mono text-destructive">
              {lastRefreshError}
            </pre>
          ) : (
            <p className="text-muted-foreground">No error details available from the server.</p>
          )}
        </div>
      )}
    </div>
  )
}
