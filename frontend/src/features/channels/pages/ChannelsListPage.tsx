import { useState, useCallback } from 'react'
import { differenceInHours, differenceInMinutes, isValid, parseISO } from 'date-fns'
import {
  ArrowRight,
  BarChart2,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Tv2,
  Video,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useDemoMode } from '@/lib/DemoModeContext'

import type { ChannelItem } from '@/api/types'
import { ChannelAvatar } from '@/components/common/ChannelAvatar'
import { DataCoverageBar } from '@/components/common/DataCoverageBar'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCount } from '@/utils/formatters'
import { RelativeTime } from '@/components/common/RelativeTime'
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toast'
import { useRefreshAction } from '@/hooks/useRefreshAction'
import { refreshChannelById } from '../api'
import { channelListQueryKeys, useChannelRefreshByIdMutation, useChannelsQuery } from '../queries'
import { TrackChannelDialog } from '../components/TrackChannelDialog'
import { RemoveChannelDialog } from '../components/RemoveChannelDialog'

// ─── Bulk sync types ──────────────────────────────────────────────────────────

type BulkSyncStatus = 'pending' | 'done' | 'failed' | 'skipped'

// ─── Error helpers ────────────────────────────────────────────────────────────

function humanizeError(raw: string | null | undefined): string {
  if (!raw) return 'Sync failed  -  no error details available.'
  const lower = raw.toLowerCase()
  if (
    lower.includes('i/o error') ||
    lower.includes('connection refused') ||
    lower.includes('timed out') ||
    lower.includes('unknown host') ||
    lower.includes('connection reset')
  ) {
    return 'Network error: Could not reach the YouTube API.'
  }
  if (lower.includes('403')) return 'API quota exceeded or access denied (HTTP 403).'
  if (lower.includes('404')) return 'Channel not found on YouTube (HTTP 404).'
  if (lower.includes('401')) return 'Authentication failed  -  credentials may be invalid.'
  return raw
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type RefreshStatus = ChannelItem['lastRefreshStatus']

function statusConfig(
  status: RefreshStatus,
  isStale: boolean
): { label: string; dotColor: string; bgColor: string; textColor: string } {
  if (status === 'FAILED')
    return {
      label: 'Failed',
      dotColor: 'var(--color-down)',
      bgColor: 'color-mix(in srgb, var(--color-down) 10%, transparent)',
      textColor: 'var(--color-down)',
    }
  if (status === 'PARTIAL')
    return {
      label: 'Partial',
      dotColor: 'var(--color-warn)',
      bgColor: 'color-mix(in srgb, var(--color-warn) 10%, transparent)',
      textColor: 'var(--color-warn)',
    }
  if (status === 'SUCCESS')
    return isStale
      ? {
          label: 'Synced',
          dotColor: 'var(--color-text-muted)',
          bgColor: 'var(--color-surface-2)',
          textColor: 'var(--color-text-secondary)',
        }
      : {
          label: 'Synced',
          dotColor: 'var(--color-up)',
          bgColor: 'color-mix(in srgb, var(--color-up) 10%, transparent)',
          textColor: 'var(--color-up)',
        }
  return {
    label: 'Never synced',
    dotColor: 'var(--color-text-muted)',
    bgColor: 'var(--color-surface-2)',
    textColor: 'var(--color-text-muted)',
  }
}

function StatusBadge({
  status,
  lastRefreshAt,
}: {
  status: RefreshStatus
  lastRefreshAt?: string | null
}) {
  const refreshDate = lastRefreshAt ? parseISO(lastRefreshAt) : null
  const isStale =
    refreshDate && isValid(refreshDate) ? differenceInHours(new Date(), refreshDate) >= 24 : true
  const cfg = statusConfig(status, isStale)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        background: cfg.bgColor,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: cfg.textColor,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.dotColor,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}

// ─── Single channel card ──────────────────────────────────────────────────────

function ChannelCard({
  channel,
  bulkSyncStatus,
}: {
  channel: ChannelItem
  bulkSyncStatus?: BulkSyncStatus
}) {
  const navigate = useNavigate()
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const refreshMutation = useChannelRefreshByIdMutation()
  const { state: refreshState, trigger: triggerRefresh } = useRefreshAction(() =>
    refreshMutation.mutateAsync({ channelDbId: channel.id })
  )
  const isFailed = channel.lastRefreshStatus === 'FAILED'

  const ytUrl = channel.handle
    ? `https://www.youtube.com/@${channel.handle}`
    : `https://www.youtube.com/channel/${channel.channelId}`

  const handleCopyId = () => {
    navigator.clipboard.writeText(channel.channelId).then(() => {
      toastSuccess('Channel ID copied', channel.channelId)
    })
  }

  const subCount = channel.subscriberCount
  const subValue = formatCount(subCount)
  const subLabel = subCount === 1 ? 'subscriber' : 'subscribers'

  const snapshotCount = channel.snapshotDayCount
  const snapshotText =
    snapshotCount != null && snapshotCount > 0
      ? `${snapshotCount} day${snapshotCount !== 1 ? 's' : ''} data`
      : 'No data yet'

  const verb = isFailed ? 'Failed' : 'Updated'

  // Human-friendly error, truncated to 60 chars for the card
  const humanMsg = isFailed ? humanizeError(channel.lastRefreshError) : null
  const errorPreview = humanMsg
    ? humanMsg.length > 60
      ? humanMsg.slice(0, 60).trimEnd() + '…'
      : humanMsg
    : null

  return (
    <Card
      className="flex flex-col transition-card"
      style={{
        padding: 'var(--space-5)',
        gap: 0,
        borderLeft: isFailed ? '3px solid var(--color-down)' : undefined,
      }}
    >
      {/* ── Header: avatar + identity + status + actions ── */}
      <div className="flex items-start gap-3">
        <ChannelAvatar
          size="md"
          thumbnailUrl={channel.thumbnailUrl}
          channelName={channel.title ?? channel.channelId}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3
            className="truncate"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--leading-tight)',
            }}
          >
            {channel.title ?? channel.channelId}
          </h3>
          <p
            className="truncate"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {channel.handle ? `@${channel.handle}` : channel.channelId}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {bulkSyncStatus === 'pending' ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Loader2 size={10} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
              Syncing
            </span>
          ) : bulkSyncStatus === 'done' ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'color-mix(in srgb, var(--color-up) 12%, transparent)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-up)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Check size={10} aria-hidden style={{ flexShrink: 0 }} />
              Updated
            </span>
          ) : bulkSyncStatus === 'failed' ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'color-mix(in srgb, var(--color-down) 12%, transparent)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-down)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <X size={10} aria-hidden style={{ flexShrink: 0 }} />
              Failed
            </span>
          ) : bulkSyncStatus === 'skipped' ? (
            <span
              title="Recently synced — skipped"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-2)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'default',
              }}
            >
              Skipped
            </span>
          ) : (
            <StatusBadge
              status={channel.lastRefreshStatus ?? null}
              lastRefreshAt={channel.lastSuccessfulRefreshAt}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Channel actions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all var(--duration-fast) var(--ease-standard)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface-2)'
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
              >
                <MoreHorizontal size={14} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isFailed ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={triggerRefresh}
                      disabled={refreshState.disabled}
                    >
                      <RefreshCw size={13} aria-hidden />
                      Retry Sync
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={triggerRefresh} disabled={refreshState.disabled}>
                      <RefreshCw size={13} aria-hidden />
                      Refresh Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/channels/${channel.id}`)}>
                      <BarChart2 size={13} aria-hidden />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/channels/${channel.id}/videos`)}>
                      <Video size={13} aria-hidden />
                      View Videos
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`/channels/${channel.id}/trends`)}>
                      <TrendingUp size={13} aria-hidden />
                      View Trends
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => window.open(ytUrl, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink size={13} aria-hidden />
                  Open on YouTube
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleCopyId}>
                  <Clipboard size={13} aria-hidden />
                  Copy Channel ID
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setRemoveDialogOpen(true)}>
                <Trash2 size={13} aria-hidden />
                Remove Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RemoveChannelDialog
        channel={channel}
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
      />

      {/* ── Stats row ── */}
      <div
        className="flex items-center gap-5"
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        {channel.subscriberCount != null && (
          <div className="flex flex-col gap-0.5">
            <span
              className="num"
              style={{
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'var(--text-lg)',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {subValue}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              {subLabel}
            </span>
          </div>
        )}

        {channel.videoCount != null && (
          <div className="flex flex-col gap-0.5">
            <span
              className="num"
              style={{
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'var(--text-lg)',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
            >
              {formatCount(channel.videoCount)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              videos on YouTube
            </span>
          </div>
        )}
      </div>

      {/* ── Freshness ── */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {channel.lastSuccessfulRefreshAt
            ? <>{verb} <RelativeTime date={channel.lastSuccessfulRefreshAt} /></>
            : 'Never updated'
          }
        </span>
        <span aria-hidden style={{ color: 'var(--color-border-base)', fontSize: 'var(--text-xs)' }}>
          ·
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          {snapshotText}
        </span>
      </div>

      {/* ── Error callout (FAILED only) ── */}
      {isFailed && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'color-mix(in srgb, var(--color-down) 6%, var(--color-surface-1))',
            border: '1px solid color-mix(in srgb, var(--color-down) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-down)',
              lineHeight: 'var(--leading-relaxed)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {errorPreview}
          </p>
          <button
            type="button"
            disabled={refreshState.disabled}
            onClick={triggerRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: '3px var(--space-3)',
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--color-down) 40%, transparent)',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color:
                refreshState.phase === 'success'
                  ? 'var(--color-up)'
                  : refreshState.phase === 'error'
                    ? 'var(--color-down)'
                    : 'var(--color-down)',
              cursor: refreshState.disabled ? 'default' : 'pointer',
              opacity: refreshState.disabled ? 0.6 : 1,
              transition: 'opacity var(--duration-base) var(--ease-standard)',
            }}
          >
            <RefreshCw
              size={10}
              aria-hidden
              className={refreshState.isPending ? 'animate-spin' : ''}
              style={{ flexShrink: 0 }}
            />
            {refreshState.phase === 'success'
              ? 'Refreshed'
              : refreshState.phase === 'error'
                ? 'Failed'
                : refreshState.isPending
                  ? 'Retrying...'
                  : 'Retry Sync'}
          </button>
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
        <Link
          to={`/channels/${channel.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--accent)',
            textDecoration: 'none',
            transition: 'opacity var(--duration-base) var(--ease-standard)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          View Analytics
          <ArrowRight size={13} aria-hidden style={{ flexShrink: 0 }} />
        </Link>
      </div>

      {/* ── Data coverage mini-bar ── */}
      <div style={{ marginTop: 'var(--space-3)' }}>
        <DataCoverageBar
          capturedDays={channel.snapshotDayCount ?? 0}
          targetDays={30}
          isFailed={isFailed}
          variant="mini"
        />
      </div>
    </Card>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function ChannelCardSkeleton() {
  return (
    <Card style={{ padding: 'var(--space-5)' }}>
      <SkeletonBlock lines={4} />
    </Card>
  )
}

// ─── Page header ─────────────────────────────────────────────────────────────

function PageHeader({
  count,
  onTrackClick,
  onRefreshAll,
  isBulkRefreshing,
  bulkProgress,
}: {
  count?: number
  onTrackClick: () => void
  onRefreshAll?: () => void
  isBulkRefreshing?: boolean
  bulkProgress?: { done: number; total: number } | null
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Channels
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-1)',
          }}
        >
          {count != null
            ? `${count} channel${count !== 1 ? 's' : ''} tracked`
            : 'Your tracked YouTube channels'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRefreshAll && count != null && count > 0 && (
          <button
            type="button"
            disabled={isBulkRefreshing}
            onClick={isBulkRefreshing ? undefined : onRefreshAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'transparent',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: isBulkRefreshing ? 'var(--accent)' : 'var(--color-text-secondary)',
              cursor: isBulkRefreshing ? 'default' : 'pointer',
              opacity: 1,
              transition: 'all var(--duration-base) var(--ease-standard)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isBulkRefreshing) {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isBulkRefreshing) {
                e.currentTarget.style.borderColor = 'var(--color-border-base)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }
            }}
          >
            {isBulkRefreshing ? (
              <Loader2 size={13} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
            ) : (
              <RefreshCw size={13} aria-hidden style={{ flexShrink: 0 }} />
            )}
            {isBulkRefreshing && bulkProgress
              ? `Refreshing ${bulkProgress.done}/${bulkProgress.total} channels…`
              : 'Refresh All'}
          </button>
        )}

        <button
          type="button"
          onClick={onTrackClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-inverse)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity var(--duration-base) var(--ease-standard)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={15} aria-hidden style={{ flexShrink: 0 }} />
          Track Channel
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { isDemoMode, enableDemoMode } = useDemoMode()
  const { data: channels, isLoading, isError, error, refetch } = useChannelsQuery(false)
  const queryClient = useQueryClient()

  // ── Bulk refresh state ──────────────────────────────────────────────────────
  const [bulkSyncMap, setBulkSyncMap] = useState<Record<number, BulkSyncStatus>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingRefreshChannels, setPendingRefreshChannels] = useState<ChannelItem[]>([])
  const [pendingSkipChannels, setPendingSkipChannels] = useState<ChannelItem[]>([])
  const [recentChannelNames, setRecentChannelNames] = useState<string[]>([])

  const isBulkRefreshing = Object.values(bulkSyncMap).some((s) => s === 'pending')
  const bulkTotal = Object.values(bulkSyncMap).filter((s) => s !== 'skipped').length
  const bulkDone = Object.values(bulkSyncMap).filter(
    (s) => s === 'done' || s === 'failed'
  ).length
  const bulkProgress =
    isBulkRefreshing && bulkTotal > 0 ? { done: bulkDone, total: bulkTotal } : null

  const executeRefreshAll = useCallback(
    async (toRefresh: ChannelItem[], toSkip: ChannelItem[]) => {
      const initialMap: Record<number, BulkSyncStatus> = {}
      for (const ch of toRefresh) initialMap[ch.id] = 'pending'
      for (const ch of toSkip) initialMap[ch.id] = 'skipped'
      setBulkSyncMap(initialMap)

      const results = await Promise.allSettled(
        toRefresh.map(async (ch) => {
          try {
            await refreshChannelById(ch.id)
            setBulkSyncMap((prev) => ({ ...prev, [ch.id]: 'done' }))
            queryClient.invalidateQueries({ queryKey: channelListQueryKeys.detail(ch.id) })
          } catch (err) {
            setBulkSyncMap((prev) => ({ ...prev, [ch.id]: 'failed' }))
            throw err
          }
        })
      )

      queryClient.invalidateQueries({ queryKey: channelListQueryKeys.root })

      const failed = results.filter((r) => r.status === 'rejected').length
      const succeeded = toRefresh.length - failed

      if (failed === 0) {
        toastSuccess('All channels refreshed')
      } else if (succeeded === 0) {
        toastError(null, 'All channels failed to refresh')
      } else {
        toastWarning(
          `${succeeded}/${toRefresh.length} channels refreshed`,
          `${failed} channel${failed !== 1 ? 's' : ''} failed`
        )
      }

      setTimeout(() => setBulkSyncMap({}), 3000)
    },
    [queryClient]
  )

  const handleRefreshAll = useCallback(() => {
    const all = channels ?? []
    if (all.length === 0) return
    const now = new Date()
    const toRefresh: ChannelItem[] = []
    const toSkip: ChannelItem[] = []
    const recentNames: string[] = []

    for (const ch of all) {
      if (!ch.lastSuccessfulRefreshAt) {
        toRefresh.push(ch)
        continue
      }
      const d = parseISO(ch.lastSuccessfulRefreshAt)
      if (!isValid(d)) {
        toRefresh.push(ch)
        continue
      }
      const mins = differenceInMinutes(now, d)
      if (mins < 30) {
        toSkip.push(ch)
      } else {
        toRefresh.push(ch)
        if (mins < 60) recentNames.push(ch.title ?? ch.channelId)
      }
    }

    if (toRefresh.length === 0) {
      toastInfo('All channels recently synced', 'No channels need refreshing right now.')
      return
    }

    if (recentNames.length > 0) {
      setRecentChannelNames(recentNames)
      setPendingRefreshChannels(toRefresh)
      setPendingSkipChannels(toSkip)
      setConfirmOpen(true)
      return
    }

    void executeRefreshAll(toRefresh, toSkip)
  }, [channels, executeRefreshAll])

  const openDialog = () => setDialogOpen(true)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader onTrackClick={openDialog} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader onTrackClick={openDialog} onRefreshAll={handleRefreshAll} />
        <ErrorState
          title="Failed to load channels"
          description={error.message}
          status={error.status}
          code={error.code}
          onAction={async () => {
            const result = await refetch()
            if (result.isError) toastError(result.error, 'Failed to reload channels')
          }}
        />
        <TrackChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    )
  }

  if (!channels?.length && !isDemoMode) {
    return (
      <div className="space-y-8">
        <PageHeader onTrackClick={openDialog} onRefreshAll={handleRefreshAll} />
        <EmptyState
          icon={Tv2}
          title="No channels tracked yet"
          description="Add a YouTube channel handle, URL, or ID to start analyzing performance."
          action={{ label: '+ Track Your First Channel', onClick: openDialog }}
        />
        <div className="flex items-center justify-center gap-3" style={{ marginTop: 'var(--space-4)' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            — or —
          </span>
          <button
            type="button"
            onClick={enableDemoMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--duration-base) var(--ease-standard)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-base)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            Try Demo Mode
            <ArrowRight size={13} aria-hidden style={{ flexShrink: 0 }} />
          </button>
        </div>
        <TrackChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    )
  }

  const visibleChannels = channels ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        count={visibleChannels.length}
        onTrackClick={openDialog}
        onRefreshAll={handleRefreshAll}
        isBulkRefreshing={isBulkRefreshing}
        bulkProgress={bulkProgress}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleChannels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} bulkSyncStatus={bulkSyncMap[ch.id]} />
        ))}
      </div>
      <TrackChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* ── Refresh All confirmation dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh all channels?</DialogTitle>
            <DialogDescription>
              {recentChannelNames.length === 1
                ? `${recentChannelNames[0]} was synced less than 1 hour ago.`
                : `${recentChannelNames.join(', ')} were synced less than 1 hour ago.`}{' '}
              Refreshing again may use YouTube API quota.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                border: '1px solid var(--color-border-base)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false)
                void executeRefreshAll(pendingRefreshChannels, pendingSkipChannels)
              }}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text-inverse)',
                cursor: 'pointer',
              }}
            >
              Refresh All
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
