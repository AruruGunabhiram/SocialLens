import { useAutoAnimate } from '@formkit/auto-animate/react'
import { BarChart2, Database, PlaySquare, Users } from 'lucide-react'

import { InfoTooltip } from '@/components/common/InfoTooltip'
import { StatCard } from '@/components/common/StatCard'
import type { ChannelAnalytics } from '../schemas'

const INDEXED_TOOLTIP =
  'Indexed = videos stored in SocialLens DB. Total = YouTube channel lifetime total.'

type ChannelStatsProps = {
  data?: ChannelAnalytics
  /** Total items from the SocialLens videos DB (page.totalItems from videos API). */
  indexedVideoCount?: number
  loading?: boolean
}

const formatNumber = (value?: number | null) => {
  if (typeof value !== 'number') return ' - '
  return value.toLocaleString()
}

export function ChannelStats({ data, indexedVideoCount, loading }: ChannelStatsProps) {
  const [parent] = useAutoAnimate()

  return (
    <div ref={parent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Subscribers"
        value={formatNumber(data?.subscriberCount)}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
      />
      <StatCard
        label="Total Views"
        value={formatNumber(data?.totalViews)}
        icon={<BarChart2 className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
      />
      <StatCard
        label="Total Videos"
        value={formatNumber(data?.videoCount)}
        icon={<PlaySquare className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
      />
      <StatCard
        label="Indexed Videos"
        labelExtra={<InfoTooltip text={INDEXED_TOOLTIP} />}
        value={formatNumber(indexedVideoCount)}
        icon={<Database className="h-4 w-4 text-muted-foreground" />}
        loading={loading}
      />
    </div>
  )
}
