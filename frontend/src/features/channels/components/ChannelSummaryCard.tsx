import { differenceInDays, isValid, parseISO } from 'date-fns'

import { InfoTooltip } from '@/components/common/InfoTooltip'
import type { ChannelItem } from '@/api/types'
import { fmtCompact, fmtDateShort } from '@/lib/format'
import type { ChannelAnalytics } from '../schemas'

interface Props {
  data: ChannelAnalytics | undefined
  channelDetail: ChannelItem | undefined
  indexedVideoCount: number | undefined
}

type MetricPt = NonNullable<ChannelAnalytics['timeseries']>[number]

function computeCadence(
  timeseries: MetricPt[],
  publishedAt: string | null | undefined,
  videoCount: number | null | undefined,
): string {
  // Prefer uploads delta from timeseries (cumulative daily snapshots)
  const withUploads = [...timeseries]
    .filter((p) => p.uploads != null)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (withUploads.length >= 2) {
    const first = withUploads[0]
    const last = withUploads[withUploads.length - 1]
    const delta = (last.uploads as number) - (first.uploads as number)
    const days = differenceInDays(parseISO(last.date), parseISO(first.date))
    if (days > 0 && delta >= 0) {
      const perWeek = (delta / days) * 7
      if (perWeek >= 1) return `~${perWeek.toFixed(1).replace(/\.0$/, '')}/week`
      const perMonth = (delta / days) * 30.44
      if (perMonth >= 1) return `~${perMonth.toFixed(1).replace(/\.0$/, '')}/month`
      return `${delta} in period`
    }
  }

  // Fall back to lifetime average
  if (!publishedAt || videoCount == null) return '—'
  const created = parseISO(publishedAt)
  if (!isValid(created)) return '—'
  const days = Math.max(1, differenceInDays(new Date(), created))
  const perWeek = videoCount / (days / 7)
  if (perWeek >= 1) return `~${perWeek.toFixed(1).replace(/\.0$/, '')}/week`
  const perMonth = videoCount / (days / 30.44)
  if (perMonth >= 1) return `~${perMonth.toFixed(1).replace(/\.0$/, '')}/month`
  return '—'
}

function computeHealthScore({
  hasData,
  staleDays,
  snapshotDayCount,
  indexedVideoCount,
  subscriberCount,
  timeseriesLength,
}: {
  hasData: boolean
  staleDays: number
  snapshotDayCount: number | null | undefined
  indexedVideoCount: number | undefined
  subscriberCount: number | null | undefined
  timeseriesLength: number
}): number {
  let score = 0
  if (hasData) score += 20
  if (staleDays < 1) score += 20
  if ((snapshotDayCount ?? 0) >= 7) score += 20
  if ((indexedVideoCount ?? 0) > 0) score += 20
  if ((subscriberCount ?? 0) > 0) score += 10
  if (timeseriesLength >= 2) score += 10
  return score
}

function healthLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Full coverage', color: 'var(--color-up)' }
  if (score >= 70) return { label: 'Good coverage', color: 'var(--chart-1)' }
  if (score >= 40) return { label: 'Building baseline', color: 'var(--color-warn)' }
  return { label: 'Limited data', color: 'var(--color-down)' }
}

export function ChannelSummaryCard({ data, channelDetail, indexedVideoCount }: Props) {
  const timeseries = data?.timeseries ?? []
  const sorted = [...timeseries].sort((a, b) => a.date.localeCompare(b.date))

  const subs = data?.subscriberCount ?? channelDetail?.subscriberCount
  const views = data?.totalViews
  const engagementRatio =
    subs != null && views != null && views > 0 ? (subs / views) * 100 : null

  const videoCount = indexedVideoCount ?? data?.videoCount
  const viewsPerVideo =
    views != null && videoCount != null && videoCount > 0 ? views / videoCount : null

  const cadence = computeCadence(
    timeseries,
    channelDetail?.publishedAt,
    channelDetail?.videoCount,
  )

  const firstDate = sorted.length > 0 ? sorted[0].date : null
  const snapshotDayCount = channelDetail?.snapshotDayCount

  const staleDays = (() => {
    if (!channelDetail?.lastSuccessfulRefreshAt) return 999
    const d = parseISO(channelDetail.lastSuccessfulRefreshAt)
    return isValid(d) ? Math.max(0, differenceInDays(new Date(), d)) : 999
  })()

  const score = computeHealthScore({
    hasData: data != null,
    staleDays,
    snapshotDayCount,
    indexedVideoCount,
    subscriberCount: subs,
    timeseriesLength: timeseries.length,
  })
  const { label: scoreLabel, color: scoreColor } = healthLabel(score)

  return (
    <div className="rounded-lg border bg-card/60 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2
          className="text-base font-semibold tracking-tight flex-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Channel Summary
        </h2>
        <InfoTooltip text="Computed from indexed data and daily snapshots — not AI-generated. Data quality score measures tracking completeness, not channel performance." />
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Views / Video
          </p>
          <p
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--foreground)',
            }}
          >
            {viewsPerVideo != null ? fmtCompact(viewsPerVideo) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            avg per video
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Sub-to-View
          </p>
          <p
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--foreground)',
            }}
          >
            {engagementRatio != null ? `${engagementRatio.toFixed(2)}%` : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            typical: 0.5–2%
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Upload Cadence
          </p>
          <p
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--foreground)',
            }}
          >
            {cadence}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            based on history
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--color-surface-2)' }} />

      {/* Data Quality meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Data Quality
          </span>
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              color: scoreColor,
            }}
          >
            {scoreLabel} ({score}/100)
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Data quality score: ${score} out of 100`}
          style={{
            height: 6,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              background: scoreColor,
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {(firstDate != null || snapshotDayCount != null) && (
          <p
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
          >
            {firstDate ? `Tracking since ${fmtDateShort(firstDate)}` : ''}
            {firstDate != null && snapshotDayCount != null ? ' · ' : ''}
            {snapshotDayCount != null ? `${snapshotDayCount} days of data` : ''}
          </p>
        )}
      </div>

      <p
        className="text-xs"
        style={{ color: 'var(--color-text-muted)', opacity: 0.7, fontStyle: 'italic' }}
      >
        Computed from indexed data
      </p>
    </div>
  )
}
