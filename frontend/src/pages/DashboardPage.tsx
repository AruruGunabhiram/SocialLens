import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, Lightbulb, Plus, RefreshCw, Tv2 } from 'lucide-react'

import type { ChannelItem } from '@/api/types'
import { ChannelAvatar } from '@/components/common/ChannelAvatar'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { Card } from '@/components/ui/card'
import { TrackChannelDialog } from '@/features/channels/components/TrackChannelDialog'
import { useChannelRefreshByIdMutation, useChannelsQuery } from '@/features/channels/queries'
import { useRefreshAction } from '@/hooks/useRefreshAction'
import { formatCount, formatRelativeTime } from '@/utils/formatters'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────

function deriveStats(channels: ChannelItem[]) {
  const totalSubscribers = channels.reduce((s, ch) => s + (ch.subscriberCount ?? 0), 0)
  const totalVideos = channels.reduce((s, ch) => s + (ch.videoCount ?? 0), 0)
  const latestSync =
    channels
      .map((ch) => ch.lastSuccessfulRefreshAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
  return { totalSubscribers, totalVideos, latestSync }
}

// ─── Section 1: Welcome header ────────────────────────────────────────────────

function WelcomeHeader({ onTrackClick }: { onTrackClick: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          {getGreeting()}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-1)',
          }}
        >
          Here's what's happening across your tracked channels
        </p>
      </div>

      <button
        type="button"
        onClick={onTrackClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-inverse)',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'opacity var(--duration-base) var(--ease-standard)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={15} aria-hidden style={{ flexShrink: 0 }} />
        Track Channel
      </button>
    </div>
  )
}

// ─── Section 2: Overview stat card ───────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ padding: 'var(--space-5)' }}>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'var(--text-metric-md)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-1)',
          }}
        >
          {sub}
        </p>
      )}
    </Card>
  )
}

function OverviewStats({ channels }: { channels: ChannelItem[] }) {
  const { totalSubscribers, totalVideos, latestSync } = deriveStats(channels)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Channels Tracked" value={String(channels.length)} />
      <StatCard label="Total Subscribers" value={formatCount(totalSubscribers)} />
      <StatCard label="Videos Indexed" value={formatCount(totalVideos)} />
      <StatCard
        label="Latest Sync"
        value={latestSync ? formatRelativeTime(latestSync) : ' - '}
        sub={latestSync ? 'most recent across all channels' : 'no syncs yet'}
      />
    </div>
  )
}

function OverviewStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} style={{ padding: 'var(--space-5)' }}>
          <SkeletonBlock lines={2} />
        </Card>
      ))}
    </div>
  )
}

// ─── Section 3: Channel health row ───────────────────────────────────────────

type RefreshStatus = ChannelItem['lastRefreshStatus']

function syncBadge(status: RefreshStatus): { label: string; color: string; bg: string } {
  if (status === 'FAILED')
    return { label: 'Failed', color: 'var(--color-down)', bg: 'var(--color-down-muted)' }
  if (status === 'PARTIAL')
    return { label: 'Partial', color: 'var(--color-warn)', bg: 'var(--color-warn-muted)' }
  if (status === 'SUCCESS')
    return { label: 'Synced', color: 'var(--color-up)', bg: 'var(--color-up-muted)' }
  return { label: 'Never synced', color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' }
}

function ChannelHealthRow({ channel }: { channel: ChannelItem }) {
  const refreshMutation = useChannelRefreshByIdMutation()
  const { state, trigger } = useRefreshAction(() =>
    refreshMutation.mutateAsync({ channelDbId: channel.id })
  )
  const badge = syncBadge(channel.lastRefreshStatus ?? null)
  const isFailed = channel.lastRefreshStatus === 'FAILED'

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: isFailed
          ? 'color-mix(in srgb, var(--color-down) 4%, var(--color-surface-1))'
          : 'var(--color-surface-1)',
        border: `1px solid ${isFailed ? 'color-mix(in srgb, var(--color-down) 20%, transparent)' : 'var(--color-border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <ChannelAvatar
        size="sm"
        thumbnailUrl={channel.thumbnailUrl}
        channelName={channel.title ?? channel.channelId}
      />

      {/* Name + handle */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {channel.title ?? channel.channelId}
        </span>
        {channel.handle && (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            @{channel.handle}
          </span>
        )}
      </div>

      {/* Subscribers */}
      {channel.subscriberCount != null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          {formatCount(channel.subscriberCount)}
        </span>
      )}

      {/* Sync badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          background: badge.bg,
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: badge.color,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: badge.color,
            flexShrink: 0,
          }}
        />
        {badge.label}
      </span>

      {/* Last updated */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          minWidth: 80,
          textAlign: 'right',
        }}
      >
        {formatRelativeTime(channel.lastSuccessfulRefreshAt)}
      </span>

      {/* Retry button (failed only) */}
      {isFailed && (
        <button
          type="button"
          disabled={state.disabled}
          onClick={trigger}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: '3px var(--space-3)',
            background: 'transparent',
            border: '1px solid color-mix(in srgb, var(--color-down) 40%, transparent)',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-down)',
            cursor: state.disabled ? 'default' : 'pointer',
            opacity: state.disabled ? 0.6 : 1,
            flexShrink: 0,
            transition: 'opacity var(--duration-base) var(--ease-standard)',
          }}
        >
          <RefreshCw size={10} aria-hidden className={state.isPending ? 'animate-spin' : ''} />
          {state.phase === 'success'
            ? 'Refreshed'
            : state.phase === 'error'
              ? 'Failed'
              : state.isPending
                ? 'Retrying...'
                : 'Retry'}
        </button>
      )}

      {/* View link */}
      <Link
        to={`/channels/${channel.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--accent)',
          textDecoration: 'none',
          flexShrink: 0,
          transition: 'opacity var(--duration-base) var(--ease-standard)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        View
        <ArrowRight size={11} aria-hidden />
      </Link>
    </div>
  )
}

function ChannelHealthSection({ channels }: { channels: ChannelItem[] }) {
  if (!channels.length) return null
  return (
    <section>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Channel Health
      </h2>
      <div className="flex flex-col gap-2">
        {channels.map((ch) => (
          <ChannelHealthRow key={ch.id} channel={ch} />
        ))}
      </div>
    </section>
  )
}

// ─── Section 4: Activity feed ─────────────────────────────────────────────────

type ActivityEvent = {
  id: number
  channelName: string
  channelDbId: number
  type: 'synced' | 'partial' | 'failed'
  timestamp: string | null
  videoCount: number | null
}

function buildFeed(channels: ChannelItem[]): ActivityEvent[] {
  return channels
    .filter((ch) => ch.lastSuccessfulRefreshAt || ch.lastRefreshStatus === 'FAILED')
    .map<ActivityEvent>((ch) => ({
      id: ch.id,
      channelName: ch.title ?? ch.channelId,
      channelDbId: ch.id,
      type:
        ch.lastRefreshStatus === 'FAILED'
          ? 'failed'
          : ch.lastRefreshStatus === 'PARTIAL'
            ? 'partial'
            : 'synced',
      timestamp: ch.lastSuccessfulRefreshAt ?? null,
      videoCount: ch.videoCount ?? null,
    }))
    .sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0
      if (!a.timestamp) return 1
      if (!b.timestamp) return -1
      return b.timestamp.localeCompare(a.timestamp)
    })
    .slice(0, 8)
}

function ActivityFeedSection({ channels }: { channels: ChannelItem[] }) {
  const events = buildFeed(channels)
  if (!events.length) return null

  return (
    <section>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Recent Activity
      </h2>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {events.map((ev, idx) => {
          const isLast = idx === events.length - 1
          const iconColor =
            ev.type === 'failed'
              ? 'var(--color-down)'
              : ev.type === 'partial'
                ? 'var(--color-warn)'
                : 'var(--color-up)'
          const symbol = ev.type === 'failed' ? '⚠' : ev.type === 'partial' ? '~' : '↺'

          return (
            <div
              key={ev.id}
              className="flex items-center gap-3"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
              }}
            >
              {/* Icon */}
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  color: iconColor,
                  flexShrink: 0,
                  width: 16,
                  textAlign: 'center',
                }}
              >
                {symbol}
              </span>

              {/* Description */}
              <span
                className="flex-1 truncate"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Link
                  to={`/channels/${ev.channelDbId}`}
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                >
                  {ev.channelName}
                </Link>
                {ev.type === 'failed' && ' sync failed'}
                {ev.type === 'partial' && ' synced with warnings'}
                {ev.type === 'synced' &&
                  (ev.videoCount != null
                    ? ` · ${formatCount(ev.videoCount)} videos indexed`
                    : ' synced')}
              </span>

              {/* Timestamp */}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              >
                {formatRelativeTime(ev.timestamp)}
              </span>
            </div>
          )
        })}
      </Card>
    </section>
  )
}

// ─── Section 5: Quick actions ─────────────────────────────────────────────────

function focusTopbarSearch() {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Track a YouTube channel"]'
  )
  if (input) {
    input.focus()
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  to,
}: {
  icon: React.ElementType
  title: string
  description: string
  onClick?: () => void
  to?: string
}) {
  const inner = (
    <div className="flex flex-col gap-2" style={{ padding: 'var(--space-5)', height: '100%' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: 'color-mix(in srgb, var(--accent) 12%, var(--color-surface-2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} aria-hidden style={{ color: 'var(--accent)' }} />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          lineHeight: 'var(--leading-relaxed)',
          flex: 1,
        }}
      >
        {description}
      </p>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--accent)',
          marginTop: 'var(--space-1)',
        }}
      >
        Open
        <ArrowRight size={11} aria-hidden />
      </span>
    </div>
  )

  const cardStyle: React.CSSProperties = {
    cursor: 'pointer',
    transition: 'opacity var(--duration-base) var(--ease-standard)',
    textDecoration: 'none',
    display: 'block',
  }

  if (to) {
    return (
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Link
          to={to}
          style={cardStyle}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {inner}
        </Link>
      </Card>
    )
  }

  return (
    <Card
      style={{ padding: 0, overflow: 'hidden' }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          ...cardStyle,
          width: '100%',
          background: 'none',
          border: 'none',
          textAlign: 'left',
        }}
      >
        {inner}
      </button>
    </Card>
  )
}

function QuickActions() {
  const navigate = useNavigate()
  return (
    <section>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Quick Actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          icon={Tv2}
          title="Explore a Channel"
          description="Track or search for a YouTube channel to view its analytics."
          onClick={focusTopbarSearch}
        />
        <QuickActionCard
          icon={Lightbulb}
          title="Run Retention Diagnosis"
          description="Analyse drop-off patterns and get AI-powered suggestions."
          to="/insights"
        />
        <QuickActionCard
          icon={Bot}
          title="Ask the Copilot"
          description="Chat with the AI copilot to explore trends and get channel advice."
          onClick={() => navigate('/copilot')}
        />
      </div>
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDashboard({ onTrackClick }: { onTrackClick: () => void }) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ padding: 'var(--space-16) var(--space-8)', maxWidth: 420, margin: '0 auto' }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Tv2 size={32} style={{ color: 'var(--color-text-muted)' }} aria-hidden />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-2)',
        }}
      >
        No channels yet
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-6)',
        }}
      >
        Track your first YouTube channel to see analytics, health status, and recent activity here.
      </p>
      <button
        type="button"
        onClick={onTrackClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-6)',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          fontWeight: 600,
          color: 'var(--color-text-inverse)',
          cursor: 'pointer',
          transition: 'opacity var(--duration-base) var(--ease-standard)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={16} aria-hidden style={{ flexShrink: 0 }} />
        Track Your First Channel
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: channels, isLoading } = useChannelsQuery(false)

  return (
    <div className="space-y-8">
      <WelcomeHeader onTrackClick={() => setDialogOpen(true)} />

      {isLoading ? (
        <OverviewStatsSkeleton />
      ) : channels?.length ? (
        <>
          <OverviewStats channels={channels} />
          <ChannelHealthSection channels={channels} />
          <ActivityFeedSection channels={channels} />
          <QuickActions />
        </>
      ) : (
        <EmptyDashboard onTrackClick={() => setDialogOpen(true)} />
      )}

      <TrackChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
