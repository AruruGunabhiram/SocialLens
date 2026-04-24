import { differenceInDays, isValid, parseISO } from 'date-fns'
import {
  AlertTriangle,
  BarChart2,
  Database,
  ExternalLink,
  Lightbulb,
  Loader2,
  PlaySquare,
  RefreshCw,
  TrendingUp,
  Video,
  Youtube,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

// ─── Error helpers ────────────────────────────────────────────────────────────

type HumanizedError = { message: string; isRaw: boolean }

function humanizeError(raw: string | null | undefined): HumanizedError {
  if (!raw) return { message: 'An unknown error occurred.', isRaw: false }
  const lower = raw.toLowerCase()
  if (
    lower.includes('i/o error') ||
    lower.includes('connection refused') ||
    lower.includes('timed out') ||
    lower.includes('unknown host') ||
    lower.includes('connection reset')
  ) {
    return {
      message:
        'Network error: Could not reach the YouTube API. This may be a temporary connectivity issue.',
      isRaw: false,
    }
  }
  if (lower.includes('403'))
    return { message: 'API quota exceeded or access denied (HTTP 403).', isRaw: false }
  if (lower.includes('404'))
    return { message: 'Channel not found on YouTube (HTTP 404).', isRaw: false }
  if (lower.includes('401'))
    return {
      message: 'Authentication failed  -  API credentials may be invalid (HTTP 401).',
      isRaw: false,
    }
  return { message: raw, isRaw: true }
}

import { ChannelAvatar } from '@/components/common/ChannelAvatar'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { InfoTooltip } from '@/components/common/InfoTooltip'
import { PageSkeleton } from '@/components/common/PageSkeleton'
import { StatCard } from '@/components/common/StatCard'
import { normalizeHttpError } from '@/api/httpError'
import { fmtDelta, fmtDateShort } from '@/lib/format'
import { formatCount, formatDate } from '@/utils/formatters'
import { toastError } from '@/lib/toast'
import { useRefreshAction } from '@/hooks/useRefreshAction'

import { DataCoverageBar } from '@/components/common/DataCoverageBar'
import { ChannelChart } from '../components/ChannelChart'
import { FreshnessBadge, mapChannelItemToFreshnessProps } from '../components/FreshnessBadge'
import {
  useChannelAnalyticsByIdQuery,
  useChannelQuery,
  useChannelRefreshByIdMutation,
  useVideosQuery,
} from '../queries'

// ─── Upload frequency ─────────────────────────────────────────────────────────

function computeUploadFreq(
  publishedAt: string | null | undefined,
  videoCount: number | null | undefined
): string {
  if (!publishedAt || videoCount == null) return ' - '
  const created = parseISO(publishedAt)
  if (!isValid(created)) return ' - '
  const days = Math.max(1, differenceInDays(new Date(), created))
  const perWeek = videoCount / (days / 7)
  if (perWeek >= 1) return `${perWeek.toFixed(1).replace(/\.0$/, '')} / week`
  const perMonth = videoCount / (days / 30.44)
  if (perMonth >= 1) return `${perMonth.toFixed(1).replace(/\.0$/, '')} / month`
  return `${videoCount} total`
}

// ─── Recent video row ─────────────────────────────────────────────────────────

const YT_WATCH = 'https://youtube.com/watch?v='

function RecentVideoRow({
  videoId,
  title,
  thumbnailUrl,
  publishedAt,
  viewCount,
}: {
  videoId: string
  title?: string | null
  thumbnailUrl?: string | null
  publishedAt?: string | null
  viewCount?: number | null
}) {
  const ytUrl = `${YT_WATCH}${videoId}`
  const displayTitle = title ?? `youtube.com/watch?v=${videoId}`

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Thumbnail */}
      <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title ?? ''}
            className="rounded object-cover"
            style={{ width: 64, height: 36 }}
          />
        ) : (
          <div
            className="rounded flex items-center justify-center"
            style={{
              width: 64,
              height: 36,
              background: 'var(--color-surface-2, #1a1a1a)',
            }}
          >
            <Video size={14} style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
          </div>
        )}
      </a>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium leading-snug hover:underline"
          style={!title ? { color: 'var(--color-text-muted)', fontStyle: 'italic' } : undefined}
        >
          {displayTitle}
        </a>
        <div className="flex items-center gap-3 mt-0.5" style={{ fontSize: 11 }}>
          {publishedAt && (
            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {formatDate(publishedAt)}
            </span>
          )}
          {viewCount != null && (
            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {formatCount(viewCount)} views
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelOverviewPage() {
  const { channelDbId: channelDbIdParam } = useParams<{ channelDbId?: string }>()
  const [searchParams] = useSearchParams()
  const channelDbIdStr = channelDbIdParam ?? searchParams.get('channelDbId')
  const channelDbId = channelDbIdStr ? Number(channelDbIdStr) : undefined

  const { data, isLoading, isFetching, isError, error, refetch } =
    useChannelAnalyticsByIdQuery(channelDbId)
  const { data: channelDetail } = useChannelQuery(channelDbId)
  const { data: videosPage } = useVideosQuery(channelDbId ?? 0, {
    page: 0,
    size: 5,
    sort: 'publishedAt',
    dir: 'desc',
  })

  const refresh = useChannelRefreshByIdMutation()
  const { state: refreshState, trigger: triggerRefresh } = useRefreshAction(() =>
    refresh.mutateAsync({ channelDbId: channelDbId! })
  )
  const isRefreshing = refreshState.isPending

  const legacyChannelId = searchParams.get('channelId') ?? ''
  const title = data?.title ?? channelDetail?.title
  const channelId = data?.channelId ?? channelDetail?.channelId ?? legacyChannelId
  const isFailed = channelDetail?.lastRefreshStatus === 'FAILED'

  // Days since last successful sync  -  used for stale data warning
  const staleDays = (() => {
    if (!channelDetail?.lastSuccessfulRefreshAt) return 0
    const d = parseISO(channelDetail.lastSuccessfulRefreshAt)
    return isValid(d) ? Math.max(0, differenceInDays(new Date(), d)) : 0
  })()

  const humanErr = humanizeError(channelDetail?.lastRefreshError)

  const indexedVideoCount = videosPage?.page.totalItems
  const recentVideos = videosPage?.items ?? []

  // Subscribers
  const subCount = data?.subscriberCount ?? channelDetail?.subscriberCount

  // Trend deltas from analytics timeseries (cumulative snapshots, sorted ascending)
  const timeseriesSorted = [...(data?.timeseries ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  function computeSeriesDelta(field: 'subscribers' | 'views'): number | null {
    const pts = timeseriesSorted.filter((p) => p[field] != null)
    if (pts.length < 2) return null
    return (pts[pts.length - 1][field] as number) - (pts[0][field] as number)
  }

  const subDelta = computeSeriesDelta('subscribers')
  const viewsDelta = computeSeriesDelta('views')

  // Freshness label from the most recent snapshot date
  const snapshotDateLabel = channelDetail?.lastSnapshotAt
    ? `As of ${fmtDateShort(channelDetail.lastSnapshotAt.slice(0, 10))}`
    : null

  // Upload frequency
  const uploadFreq = computeUploadFreq(channelDetail?.publishedAt, channelDetail?.videoCount)
  void uploadFreq // retained for technical details only

  // Technical details rows
  const detailsRows =
    data && channelDbId
      ? [
          { label: 'Database ID', value: String(channelDbId) },
          { label: 'Channel ID', value: channelId || ' - ' },
          { label: 'Title', value: title ?? ' - ' },
          {
            label: 'Published at',
            value: formatDate(channelDetail?.publishedAt),
          },
          {
            label: 'Videos (YouTube)',
            value: data.videoCount ?? channelDetail?.videoCount ?? ' - ',
          },
          { label: 'Videos (indexed)', value: indexedVideoCount ?? ' - ' },
          {
            label: 'Sync status',
            value: channelDetail?.lastRefreshStatus ?? ' - ',
          },
          {
            label: 'Last synced',
            value: formatDate(channelDetail?.lastSuccessfulRefreshAt),
          },
          {
            label: 'Last snapshot',
            value: formatDate(channelDetail?.lastSnapshotAt),
          },
          ...(channelDetail?.snapshotDayCount != null
            ? [{ label: 'Snapshot days', value: String(channelDetail.snapshotDayCount) }]
            : []),
        ]
      : []

  if (!channelDbId) {
    return (
      <EmptyState
        title="No channel loaded"
        description="Use the top bar to enter a channel identifier (@handle, UC..., or URL) and click Load."
      />
    )
  }

  if (isLoading) {
    return <PageSkeleton statCards={4} showChart tableRows={5} />
  }

  if (isError) {
    const err = normalizeHttpError(error)
    const isNotFound = err.status === 404
    const requiresAuth = err.status === 401 || err.status === 403
    if (isNotFound) {
      return (
        <EmptyState
          title={`Channel #${channelDbId} not found`}
          description="This channel may have been removed from SocialLens, or the ID is incorrect."
          actionLabel="View all tracked channels"
          onAction={() => window.location.assign('/channels')}
        />
      )
    }
    return (
      <ErrorState
        title={requiresAuth ? 'Connect account' : 'Unable to load channel analytics'}
        description={
          requiresAuth
            ? 'Authentication required. Connect your YouTube account, then retry.'
            : err.message
        }
        actionLabel={requiresAuth ? 'Connect YouTube account' : 'Retry'}
        onAction={async () => {
          const result = await refetch()
          if (result.isError) toastError(result.error, 'Failed to reload analytics')
        }}
        status={err.status}
        code={err.code}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      {channelDbIdParam && (
        <nav aria-label="Breadcrumb">
          <ol
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)', listStyle: 'none', margin: 0, padding: 0 }}
          >
            <li>
              <Link to="/channels" className="hover:text-foreground transition-colors">
                Channels
              </Link>
            </li>
            <li aria-hidden="true">
              <span>/</span>
            </li>
            <li className="flex items-center gap-2 min-w-0">
              <ChannelAvatar
                size="sm"
                thumbnailUrl={channelDetail?.thumbnailUrl}
                channelName={title ?? channelId ?? String(channelDbId)}
              />
              <span className="text-foreground font-medium truncate" aria-current="page">
                {title ?? 'Unknown Channel'}
              </span>
            </li>
          </ol>
        </nav>
      )}

      {/* ── SECTION 1: Channel Hero ─────────────────────────────────────── */}
      <div className="rounded-lg border bg-card/60 p-5 shadow-sm space-y-4">
        {/* Top row: avatar + name + status */}
        <div className="flex flex-wrap items-start gap-4">
          <ChannelAvatar
            size="lg"
            thumbnailUrl={channelDetail?.thumbnailUrl}
            channelName={title ?? channelId ?? String(channelDbId)}
          />
          <div className="min-w-0 flex-1 space-y-1">
            {isLoading ? (
              <div
                className="rounded"
                style={{ height: 28, width: 240, background: 'var(--color-surface-2)' }}
              />
            ) : (
              <h1
                className="text-2xl font-bold leading-tight tracking-tight truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {title ?? 'Channel overview'}
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 13 }}>
              {channelDetail?.handle && (
                <span
                  className="font-mono"
                  style={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                >
                  @{channelDetail.handle}
                </span>
              )}
              {channelId && !channelDetail?.handle && (
                <span
                  className="font-mono"
                  style={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                >
                  {channelId}
                </span>
              )}
              {(channelDetail?.handle || channelId) && (
                <a
                  href={
                    channelDetail?.handle
                      ? `https://www.youtube.com/@${channelDetail.handle}`
                      : `https://www.youtube.com/channel/${channelId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--color-text-muted)', fontSize: 12 }}
                >
                  <Youtube size={12} aria-hidden style={{ color: '#ff0000', flexShrink: 0 }} />
                  View on YouTube
                  <ExternalLink size={10} aria-hidden style={{ flexShrink: 0, opacity: 0.6 }} />
                </a>
              )}
            </div>
            <div className="pt-1">
              <FreshnessBadge {...mapChannelItemToFreshnessProps(channelDetail)} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {channelDbIdParam && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshState.disabled}
              aria-disabled={refreshState.disabled}
              onClick={triggerRefresh}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                color:
                  refreshState.phase === 'success'
                    ? 'var(--color-up)'
                    : refreshState.phase === 'error'
                      ? 'var(--color-down)'
                      : 'var(--color-text-muted)',
              }}
            >
              {isRefreshing ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={13} aria-hidden="true" />
              )}
              {refreshState.phase === 'success'
                ? 'Refreshed'
                : refreshState.phase === 'error'
                  ? 'Failed'
                  : isRefreshing
                    ? 'Refreshing…'
                    : 'Refresh'}
            </button>
            <Link
              to={`/channels/${channelDbId}/trends`}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <TrendingUp size={13} aria-hidden="true" />
              View Trends
            </Link>
            <Link
              to={`/channels/${channelDbId}/videos`}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Video size={13} aria-hidden="true" />
              View Videos
            </Link>
            <Link
              to={`/insights?channelId=${channelDbId}`}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              <Lightbulb size={13} aria-hidden="true" />
              Open Insights
            </Link>
          </div>
        )}
      </div>

      {/* ── FAILED STATUS BANNER ────────────────────────────────────────── */}
      {isFailed && channelDetail && (
        <div
          role="alert"
          className="rounded-lg border p-4 space-y-0"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-down) 35%, transparent)',
            background: 'color-mix(in srgb, var(--color-down) 6%, var(--color-surface-1))',
            borderLeft: '4px solid var(--color-down)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <AlertTriangle
                size={16}
                className="shrink-0"
                style={{ color: 'var(--color-down)', marginTop: 2 }}
                aria-hidden="true"
              />
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-down)' }}>
                  Last sync failed
                </p>
                {humanErr.isRaw ? (
                  <code
                    className="block text-xs break-all"
                    style={{
                      color: 'var(--color-down)',
                      opacity: 0.85,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {humanErr.message}
                  </code>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-down)', opacity: 0.9 }}>
                    {humanErr.message}
                  </p>
                )}
                {channelDetail.lastSuccessfulRefreshAt && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Last successful sync: {formatDate(channelDetail.lastSuccessfulRefreshAt)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={refreshState.disabled}
              aria-disabled={refreshState.disabled}
              onClick={triggerRefresh}
              className="shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-opacity"
              style={{
                background:
                  refreshState.phase === 'success' ? 'var(--color-up)' : 'var(--color-down)',
                color: '#fff',
                border: 'none',
                opacity: refreshState.disabled ? 0.6 : 1,
                cursor: refreshState.disabled ? 'default' : 'pointer',
              }}
            >
              {isRefreshing ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={13} aria-hidden="true" />
              )}
              {refreshState.phase === 'success'
                ? 'Refreshed'
                : refreshState.phase === 'error'
                  ? 'Failed'
                  : isRefreshing
                    ? 'Retrying…'
                    : 'Retry Sync'}
            </button>
          </div>
        </div>
      )}

      {/* ── STALE DATA WARNING ───────────────────────────────────────────── */}
      {isFailed && staleDays > 0 && channelDetail?.lastSuccessfulRefreshAt && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-warn) 35%, transparent)',
            background: 'color-mix(in srgb, var(--color-warn) 6%, var(--color-surface-1))',
            borderLeft: '4px solid var(--color-warn)',
          }}
        >
          <AlertTriangle
            size={15}
            className="shrink-0"
            style={{ color: 'var(--color-warn)', marginTop: 1 }}
            aria-hidden="true"
          />
          <p className="text-sm" style={{ color: 'var(--color-warn)' }}>
            Data is {staleDays} day{staleDays !== 1 ? 's' : ''} old. Charts and metrics reflect the
            last successful sync on {formatDate(channelDetail.lastSuccessfulRefreshAt)}.
          </p>
        </div>
      )}

      {/* ── SECTION 2: Key Metrics ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Subscribers */}
        <StatCard
          label="Subscribers"
          value={
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCount(subCount)}
            </span>
          }
          description={
            <>
              {subDelta !== null && (
                <span
                  style={{
                    color:
                      subDelta > 0
                        ? 'var(--color-up)'
                        : subDelta < 0
                          ? 'var(--color-down)'
                          : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {subDelta > 0 ? '▲ ' : subDelta < 0 ? '▼ ' : '→ '}
                  {subDelta === 0 ? 'No change' : fmtDelta(subDelta)}
                </span>
              )}
              {snapshotDateLabel && <span>{snapshotDateLabel}</span>}
            </>
          }
          loading={isLoading || isFetching}
        />

        {/* Total Views */}
        <StatCard
          label="Total Views"
          value={
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCount(data?.totalViews)}
            </span>
          }
          icon={<BarChart2 className="h-4 w-4 text-muted-foreground" />}
          description={
            <>
              {viewsDelta !== null && (
                <span
                  style={{
                    color:
                      viewsDelta > 0
                        ? 'var(--color-up)'
                        : viewsDelta < 0
                          ? 'var(--color-down)'
                          : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {viewsDelta > 0 ? '▲ ' : viewsDelta < 0 ? '▼ ' : '→ '}
                  {viewsDelta === 0 ? 'No change' : fmtDelta(viewsDelta)}
                </span>
              )}
              {snapshotDateLabel && <span>{snapshotDateLabel}</span>}
            </>
          }
          loading={isLoading || isFetching}
        />

        {/* Total Videos */}
        <StatCard
          label="Total Videos"
          value={
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCount(data?.videoCount ?? channelDetail?.videoCount)}
            </span>
          }
          icon={<PlaySquare className="h-4 w-4 text-muted-foreground" />}
          description={snapshotDateLabel ? <span>{snapshotDateLabel}</span> : undefined}
          loading={isLoading || isFetching}
        />

        {/* Indexed Videos */}
        <StatCard
          label="Indexed Videos"
          labelExtra={
            <InfoTooltip
              text={
                indexedVideoCount != null && (data?.videoCount ?? channelDetail?.videoCount) != null
                  ? `SocialLens has indexed ${indexedVideoCount} of ${data?.videoCount ?? channelDetail?.videoCount} total videos. Run a sync to index more.`
                  : 'Indexed = videos stored in SocialLens DB with full metadata.'
              }
            />
          }
          value={
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCount(indexedVideoCount)}
            </span>
          }
          icon={<Database className="h-4 w-4 text-muted-foreground" />}
          description={
            (data?.videoCount ?? channelDetail?.videoCount) != null && indexedVideoCount != null ? (
              <span>
                of{' '}
                <span
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCount(data?.videoCount ?? channelDetail?.videoCount)}
                </span>{' '}
                on YouTube
              </span>
            ) : undefined
          }
          loading={isLoading || isFetching}
        />
      </div>

      {/* ── DATA COVERAGE ───────────────────────────────────────────────── */}
      {channelDetail?.snapshotDayCount != null && (
        <div className="rounded-lg border bg-card/60 p-5 shadow-sm">
          <DataCoverageBar
            capturedDays={channelDetail.snapshotDayCount}
            targetDays={30}
            lastUpdated={channelDetail.lastSnapshotAt}
            isFailed={isFailed}
          />
        </div>
      )}

      {/* ── SECTION 3: Performance Chart ────────────────────────────────── */}
      <div style={{ height: 320 }}>
        <ChannelChart data={data} />
      </div>

      {/* ── SECTION 4: Recent Videos Preview ───────────────────────────── */}
      {(recentVideos.length > 0 || isLoading) && (
        <div className="rounded-lg border bg-card/60 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight">Recent Videos</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                5 most recently published
              </p>
            </div>
            {channelDbIdParam && (
              <Link
                to={`/channels/${channelDbId}/videos`}
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                View all videos →
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div
                    className="shrink-0 rounded"
                    style={{ width: 64, height: 36, background: 'var(--color-surface-2)' }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div
                      className="rounded"
                      style={{ height: 13, width: '60%', background: 'var(--color-surface-2)' }}
                    />
                    <div
                      className="rounded"
                      style={{ height: 11, width: '30%', background: 'var(--color-surface-2)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {recentVideos.map((v) => (
                <RecentVideoRow
                  key={v.id}
                  videoId={v.videoId}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl}
                  publishedAt={v.publishedAt}
                  viewCount={v.viewCount}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 5: Technical Details (collapsible) ──────────────────── */}
      {detailsRows.length > 0 && (
        <details className="rounded-lg border bg-card/60 shadow-sm">
          <summary
            className="flex cursor-pointer select-none items-center gap-2 p-5 text-sm font-medium"
            style={{ color: 'var(--color-text-muted)', listStyle: 'none' }}
          >
            <span
              className="text-xs"
              style={{
                display: 'inline-block',
                transition: 'transform 0.15s',
              }}
            >
              ▶
            </span>
            Technical Details
          </summary>
          <div className="px-5 pb-5">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {detailsRows.map((row) => (
                  <tr key={row.label} className="border-t">
                    <th
                      scope="row"
                      className="py-1.5 pr-4 align-top font-medium text-left"
                      style={{ color: 'var(--color-text-muted)', width: '35%' }}
                    >
                      {row.label}
                    </th>
                    <td
                      className="py-1.5 break-all align-top font-mono text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
