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
  /**
   * Total number of distinct snapshot days captured for this channel.
   * Used to distinguish "failed with usable historical data" from "failed with no data".
   */
  snapshotDayCount: number | null
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
    snapshotDayCount: item?.snapshotDayCount ?? null,
  }
}

// ---------------------------------------------------------------------------
// Exported helper — reusable wherever a human-readable status label is needed
// (e.g. the ChannelOverviewPage details table).
// ---------------------------------------------------------------------------

export function humanRefreshStatus(status: RefreshStatus | null | undefined): string {
  if (!status || status === 'NEVER_RUN') return 'Never synced'
  if (status === 'SUCCESS') return 'Synced'
  if (status === 'FAILED') return 'Failed'
  if (status === 'PARTIAL') return 'Partial sync'
  return status
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

/**
 * Badge variant rules:
 * - FAILED + has historical data  → 'warning'  (data is usable; sync is broken)
 * - FAILED + no data at all       → 'danger'   (nothing to show)
 * - PARTIAL                       → 'warning'  (sync ran but enrichment partially failed)
 * - SUCCESS, fresh (≤24 h)        → 'secondary'
 * - SUCCESS, stale (>24 h)        → 'outline'
 * - NEVER_RUN / null              → 'outline'
 */
function statusVariant(
  status: RefreshStatus | null,
  isStale: boolean,
  hasData: boolean
): 'secondary' | 'danger' | 'warning' | 'outline' {
  if (status === 'FAILED') return hasData ? 'warning' : 'danger'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'SUCCESS') return isStale ? 'outline' : 'secondary'
  return 'outline'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FreshnessBadge({
  lastSnapshotAt,
  lastRefreshAt,
  status,
  lastRefreshError,
  snapshotDayCount,
}: FreshnessBadgeProps) {
  const [errorExpanded, setErrorExpanded] = useState(false)

  const snapshotDate = parseTs(lastSnapshotAt)
  const refreshDate = parseTs(lastRefreshAt)
  const isStale = refreshDate ? differenceInHours(new Date(), refreshDate) >= 24 : true
  const isFailed = status === 'FAILED'
  const isPartial = status === 'PARTIAL'
  const showDetailToggle = isFailed || isPartial

  // "has data" = at least one snapshot exists (either we have a count, or a timestamp).
  const hasData = (snapshotDayCount != null ? snapshotDayCount > 0 : snapshotDate != null)

  // Snapshot coverage line: prefer "N days captured · last X ago" when count is known.
  const snapshotLine = snapshotDate
    ? snapshotDayCount != null && snapshotDayCount > 0
      ? `${snapshotDayCount} day${snapshotDayCount !== 1 ? 's' : ''} captured · last ${relAgo(snapshotDate)}`
      : `Snapshot ${relAgo(snapshotDate)}`
    : 'No snapshots yet'

  // When FAILED, lastRefreshAt is the last *successful* time — label accordingly.
  // When PARTIAL, lastRefreshAt IS the partial run time (snapshot succeeded).
  const refreshLabel =
    refreshDate == null
      ? 'Never synced'
      : isFailed
        ? `Last success ${relAgo(refreshDate)}`
        : isPartial
          ? `Partial sync ${relAgo(refreshDate)}`
          : `Synced ${relAgo(refreshDate)}`

  return (
    <div
      className="flex flex-col gap-y-1.5 text-sm text-muted-foreground"
      data-testid="freshness-badge"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {/* Status pill */}
        <Badge
          variant={statusVariant(status, isStale, hasData)}
          className="shrink-0 font-mono text-xs"
          data-testid="freshness-status"
          data-variant={statusVariant(status, isStale, hasData)}
        >
          {humanRefreshStatus(status)}
        </Badge>

        {/* Snapshot coverage */}
        <span data-testid="freshness-snapshot">{snapshotLine}</span>

        {/* Last refresh time */}
        <span className="text-xs text-muted-foreground/70" data-testid="freshness-refresh">
          {refreshLabel}
        </span>

        {/* "View error / View details" toggle — visible for FAILED and PARTIAL */}
        {showDetailToggle && (
          <button
            type="button"
            onClick={() => setErrorExpanded((v) => !v)}
            className={`flex items-center gap-0.5 rounded text-xs hover:underline focus-visible:outline-none focus-visible:ring-1 ${
              isFailed
                ? 'text-destructive focus-visible:ring-destructive'
                : 'text-muted-foreground focus-visible:ring-ring'
            }`}
            aria-expanded={errorExpanded}
            aria-controls="freshness-error-detail"
          >
            {errorExpanded
              ? isFailed ? 'Hide error' : 'Hide details'
              : isFailed ? 'View error' : 'View details'}
            {errorExpanded ? (
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Collapsible detail panel — error for FAILED, partial summary for PARTIAL */}
      {showDetailToggle && errorExpanded && (
        <div
          id="freshness-error-detail"
          className={`rounded-md border px-3 py-2 text-xs ${
            isFailed
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-warning/30 bg-warning/5'
          }`}
        >
          {lastRefreshError ? (
            <pre
              className={`whitespace-pre-wrap break-all font-mono ${
                isFailed ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {lastRefreshError}
            </pre>
          ) : (
            <p className="text-muted-foreground">No details available from the server.</p>
          )}
        </div>
      )}
    </div>
  )
}
