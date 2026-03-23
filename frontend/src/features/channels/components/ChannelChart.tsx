import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { fmtNum, fmtDateShort } from '@/lib/format'
import { ChartCard, CHART_STYLES } from '@/components/common/ChartCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { ChannelAnalytics } from '../schemas'

type ActiveMetric = 'views' | 'subscribers'

const METRIC_CONFIG: Record<ActiveMetric, { label: string; color: string }> = {
  views: { label: 'Views', color: 'var(--chart-1)' },
  subscribers: { label: 'Subscribers', color: 'var(--chart-3)' },
}

type ChannelChartProps = {
  data?: ChannelAnalytics
}

export function ChannelChart({ data }: ChannelChartProps) {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('views')
  const points = data?.timeseries ?? []
  const config = METRIC_CONFIG[activeMetric]

  return (
    <ChartCard
      title="Performance"
      description={`${config.label} over indexed history`}
      className="col-span-2"
      controls={
        <div className="flex rounded-lg border bg-muted p-0.5">
          {(Object.keys(METRIC_CONFIG) as ActiveMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                activeMetric === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      }
    >
      {points.length === 0 ? (
        <EmptyState title="No chart data" description="We could not find time-series data yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
            <CartesianGrid {...CHART_STYLES.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtDateShort}
              tick={CHART_STYLES.axisTick}
            />
            <YAxis
              tickFormatter={(v: number) => fmtNum(v)}
              tickLine={false}
              axisLine={false}
              tick={CHART_STYLES.axisTick}
              width={56}
            />
            <RechartsTooltip
              contentStyle={CHART_STYLES.tooltip.contentStyle}
              labelStyle={CHART_STYLES.tooltip.labelStyle}
              cursor={CHART_STYLES.tooltip.cursor}
              formatter={(value: number | string) => [fmtNum(Number(value)), config.label]}
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
              dataKey={activeMetric}
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
