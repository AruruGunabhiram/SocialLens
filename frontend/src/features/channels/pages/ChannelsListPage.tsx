import { Activity, Database, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { ChannelItem } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { toastError } from '@/lib/toast'
import { useChannelsQuery } from '../queries'
import { FreshnessBadge, mapChannelItemToFreshnessProps } from '../components/FreshnessBadge'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

// ---------------------------------------------------------------------------
// Skeleton grid shown while loading
// ---------------------------------------------------------------------------

function ChannelCardSkeleton() {
  return (
    <Card className="p-5">
      <SkeletonBlock lines={3} />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Single channel card
// ---------------------------------------------------------------------------

function ChannelCard({ channel }: { channel: ChannelItem }) {
  return (
    <Link to={`/channels/${channel.id}`} className="group outline-none">
      <Card className="flex h-full flex-col gap-2 p-5 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold leading-tight">
              {channel.title ?? channel.channelId}
            </h3>
            {channel.handle && (
              <p className="mt-0.5 text-sm text-muted-foreground">@{channel.handle}</p>
            )}
          </div>
          <Badge variant={channel.active ? 'secondary' : 'outline'} className="shrink-0 text-xs">
            {channel.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {channel.subscriberCount != null && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden />
              {fmt(channel.subscriberCount)} subs
            </span>
          )}
          {channel.videoCount != null && (
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" aria-hidden />
              {fmt(channel.videoCount)} videos
            </span>
          )}
        </div>

        {/* Freshness — rendered via shared FreshnessBadge, no ad-hoc logic here */}
        <div className="mt-auto pt-2">
          <FreshnessBadge {...mapChannelItemToFreshnessProps(channel)} />
        </div>
      </Card>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChannelsListPage() {
  const { data: channels, isLoading, isError, error, refetch } = useChannelsQuery(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <ErrorState
          title="Failed to load channels"
          description={error.message}
          status={error.status}
          code={error.code}
          onAction={async () => {
            const result = await refetch()
            if (result.isError) toastError(result.error, 'Failed to reload channels')
          }}
        />
      </div>
    )
  }

  if (!channels?.length) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          icon={<LayoutGrid className="h-8 w-8 text-muted-foreground/50" />}
          title="No channels yet"
          description="Load a channel using the top bar to get started."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader count={channels.length} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>
    </div>
  )
}

function PageHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
        <p className="text-sm text-muted-foreground">
          {count != null
            ? `${count} channel${count !== 1 ? 's' : ''} tracked`
            : 'Your tracked YouTube channels'}
        </p>
      </div>
    </div>
  )
}
