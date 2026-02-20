import { useAutoAnimate } from '@formkit/auto-animate/react'
import { BarChart2, PlaySquare, ThumbsUp, Users } from 'lucide-react'

import { StatCard } from '@/components/common/StatCard'
import type { ChannelAnalytics } from '../schemas'

type ChannelStatsProps = {
  data?: ChannelAnalytics
  loading?: boolean
}

const formatNumber = (value?: number) => {
  if (typeof value !== 'number') return '—'
  return value.toLocaleString()
}

export function ChannelStats({ data, loading }: ChannelStatsProps) {
  const [parent] = useAutoAnimate()

  const metrics = [
    { label: 'Subscribers', value: formatNumber(data?.subscriberCount), icon: Users },
    { label: 'Total Views', value: formatNumber(data?.totalViews), icon: BarChart2 },
    { label: 'Videos', value: formatNumber(data?.videoCount), icon: PlaySquare },
    { label: 'Likes', value: formatNumber(data?.likeCount), icon: ThumbsUp },
  ]

  return (
    <div ref={parent} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          icon={<metric.icon className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
      ))}
    </div>
  )
}
