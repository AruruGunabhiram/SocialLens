import { Link, useParams } from 'react-router-dom'
import { ChevronRight, BarChart2 } from 'lucide-react'

import { useChannelQuery } from '@/features/channels/queries'

export default function InsightsPage() {
  const { channelDbId: channelDbIdStr } = useParams<{ channelDbId: string }>()
  const channelDbId =
    channelDbIdStr != null && /^\d+$/.test(channelDbIdStr) ? Number(channelDbIdStr) : undefined

  const { data: channel } = useChannelQuery(channelDbId)
  const channelName = channel?.title ?? (channel?.handle ? `@${channel.handle}` : undefined)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
      }}
    >
      {/* Breadcrumb */}
      {channelDbId && (
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Link to="/channels" style={{ color: 'inherit', textDecoration: 'none' }}>
            Channels
          </Link>
          {channelName && (
            <>
              <ChevronRight size={12} aria-hidden />
              <Link
                to={`/channels/${channelDbId}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {channelName}
              </Link>
            </>
          )}
          <ChevronRight size={12} aria-hidden />
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Insights</span>
        </nav>
      )}

      {/* Honest placeholder */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-16) var(--space-4)',
          textAlign: 'center',
        }}
      >
        <BarChart2
          size={32}
          aria-hidden
          style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
        />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Insights
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: 360,
            margin: 0,
          }}
        >
          Channel insights are not yet available. Connect your channel in Studio mode to unlock
          owner-only analytics.
        </p>
      </div>
    </div>
  )
}
