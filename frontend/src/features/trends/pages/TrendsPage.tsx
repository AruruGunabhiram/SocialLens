import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO, subDays } from 'date-fns'
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
import { toastError } from '@/lib/toast'
import { ChartCard, CHART_STYLES } from '@/components/common/ChartCard'
import { RangePills } from '@/components/charts/RangePills'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useChannelQuery } from '@/features/channels/queries'
import {
  FreshnessBadge,
  mapChannelItemToFreshnessProps,
} from '@/features/channels/components/FreshnessBadge'
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
  VIEWS: { label: 'Views', color: 'var(--chart-1)' },
  SUBSCRIBERS: { label: 'Subscribers', color: 'var(--chart-3)' },
  UPLOADS: { label: 'Uploads', color: 'var(--chart-4)' },
}

const RANGE_PILL_OPTIONS = RANGES.map((r) => ({ label: `${r}D`, value: String(r) }))

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
      {options.map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === opt
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
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
  valueStyle,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-5">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight" style={valueStyle}>
            {value}
          </p>
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
  // setSearchParams lets us persist metric/range/mode in the URL, making every
  // toggle change observable in the address bar and the browser network tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawId = pathParam ?? searchParams.get('channelDbId') ?? undefined
  const channelDbId = rawId ? Number(rawId) : undefined

  // ── Controls derived from URL search params ──────────────────────────────
  // Query key = ['timeseries', channelDbId, metric, rangeDays]  (trends/queries.ts)
  // HTTP params  = { channelDbId, metric, rangeDays }            (trends/api.ts)
  // Changing range therefore changes BOTH the cache key (preventing stale hits)
  // AND the outgoing request params, guaranteeing 30d and 90d are always distinct.
  const metricRaw = searchParams.get('metric') as TrendMetric | null
  const metric: TrendMetric =
    metricRaw && (['VIEWS', 'SUBSCRIBERS', 'UPLOADS'] as TrendMetric[]).includes(metricRaw)
      ? metricRaw
      : 'VIEWS'

  const rangeRaw = Number(searchParams.get('range'))
  const range: Range = (RANGES as number[]).includes(rangeRaw) ? (rangeRaw as Range) : 30

  const modeRaw = searchParams.get('mode')
  const seriesMode: SeriesMode =
    modeRaw === 'total' || modeRaw === 'delta' ? modeRaw : 'total'

  function setMetric(m: TrendMetric) {
    setSearchParams(
      (prev) => { const p = new URLSearchParams(prev); p.set('metric', m); return p },
      { replace: true }
    )
  }

  function setRange(r: Range) {
    setSearchParams(
      (prev) => { const p = new URLSearchParams(prev); p.set('range', String(r)); return p },
      { replace: true }
    )
  }

  function setSeriesMode(m: SeriesMode) {
    setSearchParams(
      (prev) => { const p = new URLSearchParams(prev); p.set('mode', m); return p },
      { replace: true }
    )
  }

  const channelQuery = useChannelQuery(channelDbId)
  const { data, isLoading, isError, error, refetch } = useTimeSeries(channelDbId, metric, range)

  const rawPoints: TimeSeriesPoint[] = data?.points ?? []

  // Debug guard: warn when switching ranges yields identical data
  const prevSigRef = useRef<{
    rangeDays: number
    length: number
    first: string
    last: string
  } | null>(null)
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
          ` (${curr.length} pts, ${curr.first} → ${curr.last}). Backend may not be filtering by rangeDays.`
      )
    }
    prevSigRef.current = curr
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedPoints = useMemo(() => normalizeTimeseriesPoints(rawPoints), [rawPoints])

  const deltaPoints = useMemo(() => computeDailyDeltas(normalizedPoints), [normalizedPoints])

  const displayPoints = useMemo(
    () => (seriesMode === 'delta' ? deltaPoints : normalizedPoints),
    [seriesMode, deltaPoints, normalizedPoints]
  )

  const sufficient = hasSufficientDataForMode(normalizedPoints, seriesMode)

  const insights = useMemo<Insights | null>(() => {
    if (!sufficient) return null
    return computeInsights(displayPoints, seriesMode)
  }, [displayPoints, sufficient, seriesMode])

  // ── Data window: prefer real series bounds; fallback to requested range ──
  const dataWindowLabel = useMemo(() => {
    if (normalizedPoints.length >= 1) {
      const first = normalizedPoints[0].date
      const last = normalizedPoints[normalizedPoints.length - 1].date
      return first === last ? first : `${first} → ${last}`
    }
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), range - 1), 'yyyy-MM-dd')
    return `${start} → ${end}`
  }, [normalizedPoints, range])

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
          onAction={async () => {
            const result = await refetch()
            if (result.isError) toastError(result.error, 'Failed to reload trends')
          }}
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

  // Title for the insufficient-data empty state. Delta mode needs one extra point.
  const insufficientTitle =
    seriesMode === 'delta'
      ? 'Need at least 3 snapshots — run refresh'
      : 'Need at least 2 snapshots — run refresh'

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

      {/* ── Data freshness ─────────────────────────────────────────────── */}
      <FreshnessBadge {...mapChannelItemToFreshnessProps(channelQuery.data)} />

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup<TrendMetric>
          options={['VIEWS', 'SUBSCRIBERS', 'UPLOADS']}
          value={metric}
          onChange={setMetric}
          label={(m) => METRIC_CONFIG[m].label}
        />
        <ToggleGroup<SeriesMode>
          options={SERIES_MODES}
          value={seriesMode}
          onChange={setSeriesMode}
          label={(m) => SERIES_MODE_LABELS[m]}
        />
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <ChartCard
        title={chartTitle}
        subtitle={chartDescription}
        controls={
          <RangePills
            options={RANGE_PILL_OPTIONS}
            value={String(range)}
            onChange={(v) => setRange(Number(v) as Range)}
          />
        }
        dataWindow={`Showing data for: ${dataWindowLabel}`}
        footer={
          channelQuery.data ? (
            <FreshnessBadge {...mapChannelItemToFreshnessProps(channelQuery.data)} />
          ) : undefined
        }
      >
        {sufficient ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayPoints} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
              <CartesianGrid {...CHART_STYLES.grid} vertical={false} />
              {seriesMode === 'delta' && (
                <ReferenceLine y={0} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey="date"
                tickFormatter={xFmt}
                tickLine={false}
                axisLine={false}
                tick={CHART_STYLES.axisTick}
              />
              <YAxis
                tickFormatter={seriesMode === 'delta' ? fmtDelta : fmtNum}
                tickLine={false}
                axisLine={false}
                tick={CHART_STYLES.axisTick}
                width={56}
              />
              <Tooltip
                contentStyle={CHART_STYLES.tooltip.contentStyle}
                labelStyle={CHART_STYLES.tooltip.labelStyle}
                cursor={CHART_STYLES.tooltip.cursor}
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
            title={insufficientTitle}
            description="Run the refresh job for this channel, then reload."
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
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-up)' }} aria-hidden />
              ) : insights.trendLabel === 'Down' ? (
                <TrendingDown
                  className="h-4 w-4"
                  style={{ color: 'var(--color-down)' }}
                  aria-hidden
                />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />
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
            valueStyle={
              insights.trendLabel === 'Up'
                ? { color: 'var(--color-up)' }
                : insights.trendLabel === 'Down'
                  ? { color: 'var(--color-down)' }
                  : undefined
            }
          />
        </div>
      )}
    </div>
  )
}
