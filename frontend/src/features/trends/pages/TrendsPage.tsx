import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
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
import type { TrendMetric } from '../api'
import type { TimeSeriesPoint } from '@/api/types'

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

type Range = 7 | 30 | 90
const RANGES: Range[] = [7, 30, 90]

const METRIC_CONFIG: Record<TrendMetric, { label: string; field: string; color: string }> = {
  VIEWS:       { label: 'Views',       field: 'views',       color: '#2563eb' },
  SUBSCRIBERS: { label: 'Subscribers', field: 'subscribers', color: '#f97316' },
  UPLOADS:     { label: 'Uploads',     field: 'uploads',     color: '#16a34a' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function xFmt(date: string): string {
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}

interface Insights {
  avg: number
  peakValue: number
  peakDate: string
  slope: number
  trendLabel: 'Up' | 'Down' | 'Flat'
}

function computeInsights(pts: TimeSeriesPoint[], field: string): Insights {
  const values = pts.map(p => Number((p as Record<string, unknown>)[field] ?? 0))
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const peakIdx = values.indexOf(Math.max(...values))
  const peakValue = values[peakIdx] ?? 0
  const peakDate = pts[peakIdx]?.date ?? ''
  const n = values.length
  const slope = n >= 2 ? (values[n - 1] - values[0]) / (n - 1) : 0
  const trendLabel: 'Up' | 'Down' | 'Flat' = slope > 1 ? 'Up' : slope < -1 ? 'Down' : 'Flat'
  return { avg, peakValue, peakDate, slope, trendLabel }
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

  const channelQuery = useChannelQuery(channelDbId)
  const { data, isLoading, isError, error, refetch } = useTimeSeries(channelDbId, metric, range)

  const points: TimeSeriesPoint[] = data?.points ?? []

  const insights = useMemo<Insights | null>(() => {
    if (points.length < 2) return null
    return computeInsights(points, METRIC_CONFIG[metric].field)
  }, [points, metric])

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
          description={error.message}
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
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <ChartCard
        title={`${config.label} — Last ${range} Days`}
        description={`Daily ${config.label.toLowerCase()} snapshots`}
      >
        {points.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={xFmt}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={fmtNum}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [fmtNum(value), config.label]}
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
                dataKey={config.field}
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            title="Not enough data"
            description="Need at least 2 snapshots. Click Refresh."
            actionLabel="Refresh"
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
            label="Avg / Day"
            value={fmtNum(Math.round(insights.avg))}
            sub={`over last ${range} days`}
          />
          <InsightCard
            icon={<Calendar className="h-4 w-4" />}
            label="Peak Day"
            value={fmtNum(insights.peakValue)}
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
            value={insights.trendLabel}
            sub={`${insights.slope >= 0 ? '+' : ''}${fmtNum(Math.round(Math.abs(insights.slope)))} / day`}
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
