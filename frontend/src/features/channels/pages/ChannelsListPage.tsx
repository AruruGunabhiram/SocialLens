import { useState } from 'react'
import { differenceInHours, isValid, parseISO } from 'date-fns'
import { ArrowRight, Plus, RefreshCw, Tv2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemoMode } from '@/lib/DemoModeContext'

import type { ChannelItem } from '@/api/types'
import { ChannelAvatar } from '@/components/common/ChannelAvatar'
import { DataCoverageBar } from '@/components/common/DataCoverageBar'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { Card } from '@/components/ui/card'
import { formatCount, formatRelativeTime } from '@/utils/formatters'
import { toastError } from '@/lib/toast'
import { useRefreshAction } from '@/hooks/useRefreshAction'
import { useChannelRefreshByIdMutation, useChannelsQuery } from '../queries'
import { TrackChannelDialog } from '../components/TrackChannelDialog'

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

function ChannelCard({ channel }: { channel: ChannelItem }) {
  const refreshMutation = useChannelRefreshByIdMutation()
  const { state: refreshState, trigger: triggerRefresh } = useRefreshAction(() =>
    refreshMutation.mutateAsync({ channelDbId: channel.id })
  )
  const isFailed = channel.lastRefreshStatus === 'FAILED'

  const subCount = channel.subscriberCount
  const subValue = formatCount(subCount)
  const subLabel = subCount === 1 ? 'subscriber' : 'subscribers'

  const snapshotCount = channel.snapshotDayCount
  const snapshotText =
    snapshotCount != null && snapshotCount > 0
      ? `${snapshotCount} day${snapshotCount !== 1 ? 's' : ''} data`
      : 'No data yet'

  const verb = isFailed ? 'Failed' : 'Updated'
  const timeStr = channel.lastSuccessfulRefreshAt
    ? formatRelativeTime(channel.lastSuccessfulRefreshAt)
    : null
  const freshnessText = timeStr ? `${verb} ${timeStr}` : 'Never updated'

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
      {/* ── Header: avatar + identity + status ── */}
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

        <StatusBadge
          status={channel.lastRefreshStatus ?? null}
          lastRefreshAt={channel.lastSuccessfulRefreshAt}
        />
      </div>

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
          {freshnessText}
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

function PageHeader({ count, onTrackClick }: { count?: number; onTrackClick: () => void }) {
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
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { isDemoMode, enableDemoMode } = useDemoMode()
  const { data: channels, isLoading, isError, error, refetch } = useChannelsQuery(false)

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
        <PageHeader onTrackClick={openDialog} />
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
        <PageHeader onTrackClick={openDialog} />
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

  return (
    <div className="space-y-8">
      <PageHeader count={channels.length} onTrackClick={openDialog} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>
      <TrackChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
