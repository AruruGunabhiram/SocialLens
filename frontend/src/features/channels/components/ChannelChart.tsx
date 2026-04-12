import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { fmtDelta, fmtDateShort } from '@/lib/format'
import { formatChartAxis } from '@/utils/formatters'
import { ChartCard, CHART_STYLES } from '@/components/common/ChartCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { ChannelAnalytics } from '../schemas'
import type { ChannelMetricPoint } from '@/api/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveMetric = 'views' | 'subscribers'

const METRIC_CONFIG: Record<ActiveMetric, { label: string; color: string }> = {
  views: { label: 'Views', color: 'var(--chart-1)' },
  subscribers: { label: 'Subscribers', color: 'var(--chart-3)' },
}

// ─── Delta computation ────────────────────────────────────────────────────────

type DeltaPoint = { date: string; value: number }

function computeDeltas(points: ChannelMetricPoint[], metric: ActiveMetric): DeltaPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return []
  return sorted.slice(1).map((pt, i) => {
    const curr = metric === 'views' ? (pt.views ?? 0) : (pt.subscribers ?? 0)
    const prev = metric === 'views' ? (sorted[i].views ?? 0) : (sorted[i].subscribers ?? 0)
    return { date: pt.date.slice(0, 10), value: curr - prev }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

type ChannelChartProps = {
  data?: ChannelAnalytics
}

export function ChannelChart({ data }: ChannelChartProps) {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('views')

  const cumPoints = data?.timeseries ?? []
  const deltaPoints = computeDeltas(cumPoints, activeMetric)
  const config = METRIC_CONFIG[activeMetric]

  // Average delta → reference line so viewers can spot above/below-average days
  const avg =
    deltaPoints.length > 0 ? deltaPoints.reduce((s, p) => s + p.value, 0) / deltaPoints.length : 0

  const isEmpty = deltaPoints.length === 0
  const emptyTitle = cumPoints.length < 2 ? 'Not enough snapshot data' : 'No chart data'
  const emptyDescription =
    cumPoints.length < 2
      ? 'SocialLens needs at least 2 snapshots to compute daily changes. Run a refresh to record more data points.'
      : 'Could not compute daily changes from the available snapshots.'

  return (
    <ChartCard
      title={`Daily ${config.label}`}
      subtitle="New per day between captured snapshots"
      controls={
        <div className="flex rounded-lg border bg-muted p-0.5">
          {(Object.keys(METRIC_CONFIG) as ActiveMetric[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={activeMetric === m}
              onClick={() => setActiveMetric(m)}
              style={activeMetric === m ? { fontWeight: 700, color: 'var(--accent)' } : undefined}
              className={
                activeMetric === m
                  ? 'rounded-md px-3 py-1 text-sm font-medium bg-background text-foreground shadow-sm transition-colors'
                  : 'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      }
    >
      {isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={deltaPoints} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
            <CartesianGrid {...CHART_STYLES.grid} vertical={false} />
            <ReferenceLine y={0} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
            {/* Average reference line */}
            <ReferenceLine
              y={avg}
              stroke="var(--color-text-muted)"
              strokeDasharray="4 2"
              strokeWidth={1}
              label={{
                value: `avg ${formatChartAxis(Math.round(avg))}`,
                position: 'insideTopRight',
                style: {
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fill: 'var(--color-text-muted)',
                },
              }}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtDateShort}
              tick={CHART_STYLES.axisTick}
            />
            <YAxis
              tickFormatter={formatChartAxis}
              tickLine={false}
              axisLine={false}
              tick={CHART_STYLES.axisTick}
              width={56}
            />
            <RechartsTooltip
              contentStyle={CHART_STYLES.tooltip.contentStyle}
              labelStyle={CHART_STYLES.tooltip.labelStyle}
              cursor={{ fill: 'var(--color-surface-2)', opacity: 0.6 }}
              formatter={(value: number) => [fmtDelta(Math.round(value)), `Daily ${config.label}`]}
              labelFormatter={(label: string) => {
                try {
                  return format(parseISO(label), 'MMM d, yyyy')
                } catch {
                  return label
                }
              }}
              itemStyle={{ padding: 0 }}
            />
            <Bar dataKey="value" maxBarSize={28} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {deltaPoints.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    activeMetric === 'subscribers'
                      ? entry.value >= 0
                        ? 'var(--chart-3)'
                        : 'var(--color-down)'
                      : 'var(--chart-1)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
