import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart2, Calendar, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ChartCard } from '@/components/common/ChartCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useChannelQuery } from '@/features/channels/queries'
import { useTimeSeries } from '../queries'
import {
  normalizeTimeseriesPoints,
  computeDailyDeltas,
  hasSufficientDataForMode,
  computeInsights,
  type Insights,
  type SeriesMode,
} from '../utils'
import type { TrendMetric } from '../api'
import type { TimeSeriesPoint } from '@/api/types'

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

type Range = 7 | 30 | 90
const RANGES: Range[] = [7, 30, 90]
const SERIES_MODES: SeriesMode[] = ['total', 'delta']

const METRIC_CONFIG: Record<TrendMetric, { label: string; color: string }> = {
  VIEWS:       { label: 'Views',       color: '#2563eb' },
  SUBSCRIBERS: { label: 'Subscribers', color: '#f97316' },
  UPLOADS:     { label: 'Uploads',     color: '#16a34a' },
}

const SERIES_MODE_LABELS: Record<SeriesMode, string> = {
  total: 'Total',
  delta: 'Daily Change',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

/** Format a signed delta value, e.g. +1.2K or −500. */
function fmtDelta(n: number): string {
  const abs = Math.abs(n)
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(abs / 1_000).toFixed(0)}K`
        : abs.toLocaleString()
  return `${n >= 0 ? '+' : '−'}${formatted}`
}

function xFmt(date: string): string {
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Unknown error'
  const e = error as Record<string, unknown>
  if (typeof e.message === 'string' && e.message) {
    if (e.status && typeof e.status === 'number') return `${e.message} (${e.status})`
    return e.message
  }
  return 'Unknown error'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  label: (v: T) => string
}) {
  return (
    <div className="flex rounded-lg border bg-muted p-0.5">
      {options.map(opt => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === opt
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label(opt)}
        </button>
      ))}
    </div>
  )
}

function InsightCard({
  icon,
  label,
  value,
  sub,
  valueClassName,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  valueClassName?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-2xl font-semibold tracking-tight', valueClassName)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-[380px] w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TrendsPage() {
  const { channelDbId: pathParam } = useParams<{ channelDbId: string }>()
  const [searchParams] = useSearchParams()
  const rawId = pathParam ?? searchParams.get('channelDbId') ?? undefined
  const channelDbId = rawId ? Number(rawId) : undefined

  const [metric, setMetric] = useState<TrendMetric>('VIEWS')
  const [range, setRange] = useState<Range>(30)
  const [seriesMode, setSeriesMode] = useState<SeriesMode>('total')

  const channelQuery = useChannelQuery(channelDbId)
  const { data, isLoading, isError, error, refetch } = useTimeSeries(channelDbId, metric, range)

  const rawPoints: TimeSeriesPoint[] = data?.points ?? []

  // Debug guard: warn when switching ranges yields identical data
  const prevSigRef = useRef<{ rangeDays: number; length: number; first: string; last: string } | null>(null)
  useEffect(() => {
    if (!data?.points?.length) return
    const pts = data.points
    const curr = {
      rangeDays: data.rangeDays ?? range,
      length: pts.length,
      first: pts[0].date,
      last: pts[pts.length - 1].date,
    }
    const prev = prevSigRef.current
    if (
      prev !== null &&
      prev.rangeDays !== curr.rangeDays &&
      prev.length === curr.length &&
      prev.first === curr.first &&
      prev.last === curr.last
    ) {
      console.warn(
        `[Trends] ⚠️ rangeDays ${prev.rangeDays}d → ${curr.rangeDays}d but response is identical` +
        ` (${curr.length} pts, ${curr.first} → ${curr.last}). Backend may not be filtering by rangeDays.`,
      )
    }
    prevSigRef.current = curr
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedPoints = useMemo(
    () => normalizeTimeseriesPoints(rawPoints),
    [rawPoints],
  )

  const deltaPoints = useMemo(
    () => computeDailyDeltas(normalizedPoints),
    [normalizedPoints],
  )

  const displayPoints = useMemo(
    () => (seriesMode === 'delta' ? deltaPoints : normalizedPoints),
    [seriesMode, deltaPoints, normalizedPoints],
  )

  const sufficient = hasSufficientDataForMode(normalizedPoints, seriesMode)

  const insights = useMemo<Insights | null>(() => {
    if (!sufficient) return null
    return computeInsights(displayPoints, seriesMode)
  }, [displayPoints, sufficient, seriesMode])

  // ── No channel selected ──────────────────────────────────────────────────
  if (!channelDbId) {
    return (
      <div className="p-4">
        <EmptyState
          title="No channel selected"
          description="Open a channel from the Channels list, then navigate to Trends."
        />
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return <TrendsSkeleton />

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-4">
        <ErrorState
          title="Failed to load trends"
          description={normalizeErrorMessage(error)}
          actionLabel="Retry"
          onAction={() => void refetch()}
          status={error.status}
          code={error.code}
        />
      </div>
    )
  }

  const config = METRIC_CONFIG[metric]
  const channelTitle = channelQuery.data?.title

  const chartTitle =
    seriesMode === 'delta'
      ? `Daily Change in ${config.label} — Last ${range} Days`
      : `${config.label} — Last ${range} Days`

  const chartDescription =
    seriesMode === 'delta'
      ? 'Change between consecutive daily snapshots'
      : `Daily ${config.label.toLowerCase()} snapshots`

  const emptyDescription =
    seriesMode === 'delta'
      ? 'Need at least 3 days of snapshots to show daily changes. Run refresh on three different days.'
      : 'Need at least 2 days of snapshots to show a trend. Run refresh on two different days.'

  return (
    <div className="space-y-4 p-4">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/channels" className="hover:text-foreground">
          Channels
        </Link>
        {channelTitle && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/channels/${channelDbId}`} className="hover:text-foreground">
              {channelTitle}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">Trends</span>
      </nav>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup<TrendMetric>
          options={['VIEWS', 'SUBSCRIBERS', 'UPLOADS']}
          value={metric}
          onChange={setMetric}
          label={m => METRIC_CONFIG[m].label}
        />
        <ToggleGroup<Range>
          options={RANGES}
          value={range}
          onChange={setRange}
          label={r => `${r}d`}
        />
        <ToggleGroup<SeriesMode>
          options={SERIES_MODES}
          value={seriesMode}
          onChange={setSeriesMode}
          label={m => SERIES_MODE_LABELS[m]}
        />
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <ChartCard title={chartTitle} description={chartDescription}>
        {sufficient ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayPoints} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
              {seriesMode === 'delta' && (
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey="date"
                tickFormatter={xFmt}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={seriesMode === 'delta' ? fmtDelta : fmtNum}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={56}
              />
              <Tooltip
                formatter={(value: number) =>
                  seriesMode === 'delta'
                    ? [fmtDelta(value), `Δ ${config.label}`]
                    : [fmtNum(value), config.label]
                }
                labelFormatter={(label: string) => {
                  try {
                    return format(parseISO(label), 'MMM d, yyyy')
                  } catch {
                    return label
                  }
                }}
                contentStyle={{ borderRadius: '6px', fontSize: '12px', padding: '8px 12px' }}
                itemStyle={{ padding: 0 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="Not enough daily data yet"
            description={emptyDescription}
            actionLabel="Refresh now"
            onAction={() => void refetch()}
            className="h-full border-0 shadow-none bg-transparent"
          />
        )}
      </ChartCard>

      {/* ── Insights ───────────────────────────────────────────────────── */}
      {insights && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InsightCard
            icon={<BarChart2 className="h-4 w-4" />}
            label={seriesMode === 'delta' ? 'Avg Change / Day' : 'Growth / Day'}
            value={
              seriesMode === 'delta'
                ? fmtDelta(Math.round(insights.avgPerDay))
                : insights.slopeUnavailable
                  ? '—'
                  : `${insights.avgPerDay >= 0 ? '+' : ''}${fmtNum(Math.round(insights.avgPerDay))}`
            }
            sub={`over last ${range} days`}
          />
          <InsightCard
            icon={<Calendar className="h-4 w-4" />}
            label={seriesMode === 'delta' ? 'Best Day' : 'Peak Day'}
            value={
              seriesMode === 'delta'
                ? fmtDelta(Math.round(insights.peakValue))
                : fmtNum(insights.peakValue)
            }
            sub={insights.peakDate ? xFmt(insights.peakDate) : '—'}
          />
          <InsightCard
            icon={
              insights.trendLabel === 'Up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : insights.trendLabel === 'Down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )
            }
            label="Trend"
            value={insights.trendLabel === 'N/A' ? '—' : insights.trendLabel}
            sub={
              insights.slopeUnavailable
                ? 'Not enough date range'
                : seriesMode === 'delta'
                  ? `${fmtDelta(Math.round(insights.slope))} / day avg`
                  : `${insights.slope >= 0 ? '+' : ''}${fmtNum(Math.round(Math.abs(insights.slope)))} / day`
            }
            valueClassName={
              insights.trendLabel === 'Up'
                ? 'text-green-600'
                : insights.trendLabel === 'Down'
                  ? 'text-red-600'
                  : ''
            }
          />
        </div>
      )}
    </div>
  )
}
