import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartCard } from '@/components/common/ChartCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { ChannelAnalytics } from '../schemas'

type ChannelChartProps = {
  data?: ChannelAnalytics
}

export function ChannelChart({ data }: ChannelChartProps) {
  const points = data?.timeseries ?? []

  return (
    <ChartCard title="Performance" description="Recent trend" className="col-span-2">
      {points.length === 0 ? (
        <EmptyState title="No chart data" description="We could not find time-series data yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 8, right: 16, top: 12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <RechartsTooltip />
            <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="subscribers" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
