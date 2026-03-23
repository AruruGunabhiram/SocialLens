import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ChevronRight,
  Lock,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { useChannelQuery, useVideosQuery } from '@/features/channels/queries'
import { useTimeSeries } from '@/features/trends/queries'
import { useAccountStatus } from '@/features/account/queries'
import { useRetentionDiagnosis } from '@/features/retention/queries'
import { extractVideoId } from '@/features/retention/api'
import { MVP_USER_ID } from '@/features/account/api'
import {
  computeDailyDeltas,
  computeInsights,
  computeSnapshotCoverage,
  normalizeTimeseriesPoints,
} from '@/features/trends/utils'
import { fmtCompact, fmtDate, fmtDelta } from '@/lib/format'
import { normalizeHttpError } from '@/api/httpError'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { ErrorState } from '@/components/common/ErrorState'
import {
  FreshnessBadge,
  mapChannelItemToFreshnessProps,
} from '@/features/channels/components/FreshnessBadge'
import type { DiagnosisItem, RetentionDiagnosisResponse, RetentionDropEvent, VideoRow } from '@/api/types'

// ─── Shared card style ────────────────────────────────────────────────────────

const CARD = {
  padding: 'var(--space-5)',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
}

// ─── Retention helpers ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: 'var(--color-down)',
  MEDIUM: 'var(--color-warn, var(--color-text-secondary))',
  LOW: 'var(--color-text-muted)',
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

// ─── Retention sub-components (owner section) ─────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: SEVERITY_COLOR[severity] ?? 'var(--color-text-secondary)',
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '1px var(--space-2)',
        letterSpacing: '0.05em',
      }}
    >
      {severity}
    </span>
  )
}

function DropEventsTable({ drops }: { drops: RetentionDropEvent[] }) {
  if (drops.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
        No significant drop events detected.
      </p>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr>
            {['Severity', 'Video position', 'Drop', 'Slope'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-2) var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drops.map((d, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--color-border-subtle, var(--color-border))' }}>
              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                <SeverityBadge severity={d.severity} />
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                {pct(d.startProgress)} → {pct(d.endProgress)}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-down)' }}>
                -{pct(d.dropMagnitude)}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
                {d.slope.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DiagnosesList({ diagnoses }: { diagnoses: DiagnosisItem[] }) {
  if (diagnoses.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
        No diagnoses generated.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} data-testid="diagnoses-list">
      {diagnoses.map((d, i) => (
        <div
          key={i}
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderLeft: `3px solid ${SEVERITY_COLOR[d.severity] ?? 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {d.label.replace(/_/g, ' ')}
            </span>
            <SeverityBadge severity={d.severity} />
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
            {d.evidence}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
            {d.recommendation}
          </p>
        </div>
      ))}
    </div>
  )
}

function DiagnosisResults({ result }: { result: RetentionDiagnosisResponse }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} data-testid="diagnosis-results">
      <div style={{ ...CARD }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }} data-testid="diagnosis-summary">
          {result.summary}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', marginBottom: 0, fontVariantNumeric: 'tabular-nums' }}>
          Video: {result.videoId}
        </p>
      </div>
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
          Drop events
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)', fontWeight: 400 }}>
            ({result.dropEvents.length})
          </span>
        </h3>
        <DropEventsTable drops={result.dropEvents} />
      </section>
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
          Diagnoses
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)', fontWeight: 400 }}>
            ({result.diagnoses.length})
          </span>
        </h3>
        <DiagnosesList diagnoses={result.diagnoses} />
      </section>
    </div>
  )
}

// ─── Shared layout primitives ─────────────────────────────────────────────────

function SectionHeading({ label, badge }: { label: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
        {label}
      </h2>
      {badge}
    </div>
  )
}

function OwnerBadge() {
  return (
    <span
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--accent)',
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
        borderRadius: 'var(--radius-sm)',
        padding: '1px var(--space-2)',
        letterSpacing: '0.05em',
      }}
    >
      Owner only
    </span>
  )
}

// ─── Public: Trend card ───────────────────────────────────────────────────────

function TrendCard({
  label,
  loading,
  hasError,
  trendLabel,
  avgPerDay,
  capturedDays,
  unit,
}: {
  label: string
  loading: boolean
  hasError: boolean
  trendLabel?: string
  avgPerDay?: number
  capturedDays?: number
  unit: string
}) {
  if (loading) {
    return (
      <div style={CARD} data-testid={`trend-card-loading-${label.toLowerCase()}`}>
        <SkeletonBlock lines={3} />
      </div>
    )
  }

  const labelEl = (
    <span style={{
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      color: 'var(--color-text-secondary)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      display: 'block',
      marginBottom: 'var(--space-3)',
    }}>
      {label}
    </span>
  )

  if (hasError || trendLabel == null) {
    return (
      <div style={CARD}>
        {labelEl}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          No data available
        </span>
      </div>
    )
  }

  const isUp = trendLabel === 'Up'
  const isDown = trendLabel === 'Down'
  const trendColor = isUp
    ? 'var(--color-up)'
    : isDown
      ? 'var(--color-down)'
      : 'var(--color-text-secondary)'
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <div style={CARD} data-testid={`trend-card-${label.toLowerCase()}`}>
      {labelEl}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <TrendIcon size={20} style={{ color: trendColor }} aria-hidden />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: trendColor }}>
          {trendLabel}
        </span>
      </div>
      {avgPerDay != null && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
          {fmtDelta(Math.round(avgPerDay))} {unit}/day avg
        </div>
      )}
      {capturedDays != null && capturedDays > 0 && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Based on {capturedDays} day{capturedDays !== 1 ? 's' : ''} of data
        </div>
      )}
    </div>
  )
}

// ─── Public: Top videos ───────────────────────────────────────────────────────

function TopVideosTable({ videos }: { videos: VideoRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}
        data-testid="top-videos-table"
      >
        <thead>
          <tr>
            {['#', 'Title', 'Views', 'Likes', 'Comments'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Title' ? 'left' : h === '#' ? 'center' : 'right',
                  padding: 'var(--space-2) var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {videos.map((v, i) => (
            <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border-subtle, var(--color-border))' }}>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                {i + 1}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-primary)', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.title?.trim() || v.videoId}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)', textAlign: 'right' }}>
                {fmtCompact(v.viewCount)}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                {fmtCompact(v.likeCount)}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                {fmtCompact(v.commentCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { channelDbId: channelDbIdStr } = useParams<{ channelDbId: string }>()
  const channelDbId =
    channelDbIdStr != null && /^\d+$/.test(channelDbIdStr) ? Number(channelDbIdStr) : undefined

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: channel, isLoading: channelLoading } = useChannelQuery(channelDbId)
  const channelName = channel?.title ?? (channel?.handle ? `@${channel.handle}` : undefined)

  const { data: accountStatus, isLoading: accountLoading } = useAccountStatus()
  const isConnected = accountStatus?.connected === true

  const RANGE = 30

  const { data: viewsData, isLoading: viewsLoading, isError: viewsError } =
    useTimeSeries(channelDbId, 'VIEWS', RANGE)
  const { data: subsData, isLoading: subsLoading, isError: subsError } =
    useTimeSeries(channelDbId, 'SUBSCRIBERS', RANGE)
  const { data: uploadsData, isLoading: uploadsLoading, isError: uploadsError } =
    useTimeSeries(channelDbId, 'UPLOADS', RANGE)
  const { data: videosData, isLoading: videosLoading, isError: videosError } =
    useVideosQuery(channelDbId ?? 0, { sort: 'views', dir: 'desc', page: 0, size: 5 })

  // ── Computed ─────────────────────────────────────────────────────────────────
  const viewsPts = viewsData ? normalizeTimeseriesPoints(viewsData.points) : []
  const subsPts = subsData ? normalizeTimeseriesPoints(subsData.points) : []
  const uploadsPts = uploadsData ? normalizeTimeseriesPoints(uploadsData.points) : []

  const viewsCoverage = computeSnapshotCoverage(viewsPts, RANGE)
  const viewsInsights = viewsPts.length >= 2 ? computeInsights(viewsPts, 'total') : null
  const subsInsights = subsPts.length >= 2 ? computeInsights(subsPts, 'total') : null

  // Upload activity: deltas from cumulative totals give new uploads per day
  const uploadDeltas = computeDailyDeltas(uploadsPts)
  const totalNewUploads = uploadDeltas.reduce((s, p) => s + Math.max(0, p.value), 0)
  const uploadsPerWeek =
    uploadsPts.length > 0 ? (totalNewUploads / (uploadsPts.length / 7)).toFixed(1) : null
  const uploadPace =
    uploadsPerWeek == null
      ? 'N/A'
      : Number(uploadsPerWeek) >= 2
        ? 'Active'
        : Number(uploadsPerWeek) >= 0.5
          ? 'Moderate'
          : 'Sparse'

  // ── Retention diagnosis state ─────────────────────────────────────────────
  const [rawInput, setRawInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const { mutate, isPending, data: diagResult, error: diagError, reset } = useRetentionDiagnosis()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInputError(null)
    const videoId = extractVideoId(rawInput)
    if (!videoId) {
      setInputError('Enter a YouTube video ID (11 characters) or a full YouTube URL.')
      return
    }
    if (!channel?.channelId) return
    mutate({ userId: MVP_USER_ID, channelId: channel.channelId, videoId })
  }

  function handleInputChange(val: string) {
    setRawInput(val)
    if (inputError) setInputError(null)
    if (diagResult || diagError) reset()
  }

  const normalizedDiagError = diagError ? normalizeHttpError(diagError) : null

  // ── No channel ───────────────────────────────────────────────────────────────
  if (!channelDbId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-4)', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', ...CARD }} data-testid="no-channel">
          <AlertCircle size={16} aria-hidden style={{ color: 'var(--color-text-muted)', marginTop: 2 }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
            No channel loaded. Navigate to a channel page and open Insights from there.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', padding: 'var(--space-4)', maxWidth: 900 }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
        <Link to="/channels" style={{ color: 'inherit', textDecoration: 'none' }}>Channels</Link>
        {channelName && (
          <>
            <ChevronRight size={12} aria-hidden />
            <Link to={`/channels/${channelDbId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{channelName}</Link>
          </>
        )}
        <ChevronRight size={12} aria-hidden />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Insights</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1)' }}>
          Insights
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
          Performance analysis for {channelName ?? 'this channel'} — last {RANGE} days.
        </p>
      </div>

      {/* ── Section 1: Data Coverage ─────────────────────────────────────── */}
      <section>
        <SectionHeading label="Data Coverage" />
        <div style={CARD} data-testid="coverage-card">
          {channelLoading ? (
            <SkeletonBlock lines={2} />
          ) : channel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FreshnessBadge {...mapChannelItemToFreshnessProps(channel)} />
              {viewsLoading ? (
                <SkeletonBlock lines={1} lastLineWidth="50%" />
              ) : viewsPts.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 'var(--space-1)' }}>
                      Snapshot range
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                      {fmtDate(viewsCoverage.firstDate)} — {fmtDate(viewsCoverage.lastDate)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 'var(--space-1)' }}>
                      Days captured
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      fontVariantNumeric: 'tabular-nums',
                      color: viewsCoverage.isSparse ? 'var(--color-warn, var(--color-text-secondary))' : 'var(--color-text-primary)',
                    }}>
                      {viewsCoverage.capturedDays} of {RANGE}{viewsCoverage.isSparse ? ' — sparse' : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                  No snapshots captured yet. Run a refresh to start collecting data.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Section 2: Trend Snapshot ────────────────────────────────────── */}
      <section>
        <SectionHeading label="Trend Snapshot" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }} data-testid="trend-grid">
          <TrendCard
            label="Views"
            loading={viewsLoading}
            hasError={viewsError}
            trendLabel={viewsInsights?.trendLabel}
            avgPerDay={viewsInsights?.avgPerDay}
            capturedDays={viewsCoverage.capturedDays}
            unit="views"
          />
          <TrendCard
            label="Subscribers"
            loading={subsLoading}
            hasError={subsError}
            trendLabel={subsInsights?.trendLabel}
            avgPerDay={subsInsights?.avgPerDay}
            capturedDays={subsPts.length}
            unit="subs"
          />
        </div>
      </section>

      {/* ── Section 3: Upload Activity ───────────────────────────────────── */}
      <section>
        <SectionHeading label="Upload Activity" />
        <div style={CARD} data-testid="upload-activity-card">
          {uploadsLoading ? (
            <SkeletonBlock lines={2} />
          ) : uploadsError ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              Upload data unavailable.
            </p>
          ) : uploadsPts.length < 2 ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              Not enough snapshot data to compute upload activity.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 'var(--space-1)' }}>
                  New videos ({RANGE}d)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                  {totalNewUploads}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 'var(--space-1)' }}>
                  Avg per week
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                  {uploadsPerWeek ?? '—'}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 'var(--space-1)' }}>
                  Pace
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 700,
                  color: uploadPace === 'Active'
                    ? 'var(--color-up)'
                    : uploadPace === 'Sparse'
                      ? 'var(--color-warn, var(--color-text-secondary))'
                      : 'var(--color-text-primary)',
                }}>
                  {uploadPace}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 4: Top Videos ────────────────────────────────────────── */}
      <section>
        <SectionHeading label="Top Videos by Views" />
        {videosLoading ? (
          <div style={CARD}><SkeletonBlock lines={5} /></div>
        ) : videosError ? (
          <div style={{ ...CARD, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Could not load video data.
          </div>
        ) : !videosData?.items.length ? (
          <div style={{ ...CARD, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            No videos found for this channel.
          </div>
        ) : (
          <TopVideosTable videos={videosData.items} />
        )}
      </section>

      {/* ── Section 5: Owner Insights ────────────────────────────────────── */}
      <section>
        <SectionHeading label="Retention Diagnosis" badge={<OwnerBadge />} />

        {/* Not-connected gate */}
        {!accountLoading && !isConnected && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', ...CARD }} data-testid="not-connected">
            <Lock size={16} aria-hidden style={{ color: 'var(--color-text-muted)', marginTop: 2 }} />
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1)' }}>
                YouTube account not connected
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                Retention data requires OAuth access to YouTube Analytics. Connect your account in Studio mode to unlock this feature.
              </p>
            </div>
          </div>
        )}

        {/* Diagnosis form */}
        {isConnected && channel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <form
              onSubmit={handleSubmit}
              style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
              data-testid="diagnosis-form"
            >
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Video ID or URL
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  value={rawInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=..."
                  aria-label="Video ID or URL"
                  data-testid="video-input"
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-surface)',
                    border: `1px solid ${inputError ? 'var(--color-down)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isPending || !rawInput.trim()}
                  data-testid="analyze-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text-inverse)',
                    background: isPending || !rawInput.trim() ? 'var(--color-border-strong)' : 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-4)',
                    cursor: isPending || !rawInput.trim() ? 'not-allowed' : 'pointer',
                    transition: 'opacity var(--duration-base) var(--ease-standard)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Search size={14} aria-hidden />
                  {isPending ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              {inputError && (
                <p role="alert" style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-down)', margin: 0 }}>
                  {inputError}
                </p>
              )}
            </form>

            {isPending && (
              <div data-testid="loading-state">
                <SkeletonBlock lines={6} />
              </div>
            )}

            {normalizedDiagError && !isPending && (
              <ErrorState
                title="Diagnosis failed"
                description={normalizedDiagError.message}
                actionLabel="Dismiss"
                onAction={reset}
                status={normalizedDiagError.status}
                code={normalizedDiagError.code}
              />
            )}

            {diagResult && !isPending && <DiagnosisResults result={diagResult} />}
          </div>
        )}
      </section>
    </div>
  )
}
