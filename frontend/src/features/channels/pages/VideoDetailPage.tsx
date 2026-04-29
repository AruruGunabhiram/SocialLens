import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  Eye,
  Bot,
} from 'lucide-react'
import { parseISO, isValid, formatDistanceToNow } from 'date-fns'

import { useChannelQuery, useVideosQuery } from '../queries'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCount, formatDate } from '@/utils/formatters'
import type { VideoRow, ChannelItem } from '@/api/types'

const YT_WATCH = 'https://youtube.com/watch?v='

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeAge(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = parseISO(dateStr)
  if (!isValid(d)) return ''
  return formatDistanceToNow(d, { addSuffix: true })
}

function computeComparison(video: VideoRow, allVideos: VideoRow[]) {
  const views = allVideos
    .filter((v) => v.viewCount != null)
    .map((v) => v.viewCount as number)
  if (views.length < 2) return null

  const avg = views.reduce((a, b) => a + b, 0) / views.length
  const thisViews = video.viewCount ?? 0
  const sorted = [...views].sort((a, b) => a - b)
  const belowCount = sorted.filter((v) => v < thisViews).length
  const percentile = Math.round((belowCount / sorted.length) * 100)

  return { avg, thisViews, percentile, count: views.length }
}

function relativeLabel(ratio: number): string {
  if (ratio < 0.25) return 'significantly below average'
  if (ratio < 0.75) return 'below average'
  if (ratio < 1.25) return 'near the channel average'
  if (ratio < 2) return 'above average'
  return 'significantly above average'
}

function percentileBand(p: number): string {
  if (p <= 25) return 'Bottom 25% of indexed videos by views'
  if (p <= 50) return 'Below median for this channel'
  if (p <= 75) return 'Above median for this channel'
  return 'Top 25% of indexed videos by views'
}

function engagementRate(video: VideoRow): string | null {
  const views = video.viewCount
  const likes = video.likeCount
  const comments = video.commentCount
  if (!views || views === 0 || likes == null || comments == null) return null
  const rate = ((likes + comments) / views) * 100
  return rate.toFixed(2) + '%'
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        cursor: 'pointer',
        color: copied ? 'var(--accent)' : 'var(--color-text-muted)',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function VideoStatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          color: 'var(--color-text-muted)',
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'var(--text-metric-md)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({
  channel,
  channelDbId,
  videoTitle,
}: {
  channel: ChannelItem | undefined
  channelDbId: number
  videoTitle: string | null | undefined
}) {
  const channelName =
    channel?.title ?? (channel?.handle ? `@${channel.handle}` : `Channel ${channelDbId}`)

  const sep = (
    <span
      aria-hidden
      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}
    >
      /
    </span>
  )

  const crumbStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <li>
          <Link to="/channels" style={crumbStyle}>
            Channels
          </Link>
        </li>
        {sep}
        <li>
          <Link to={`/channels/${channelDbId}`} style={crumbStyle}>
            {channelName}
          </Link>
        </li>
        {sep}
        <li>
          <Link to={`/channels/${channelDbId}/videos`} style={crumbStyle}>
            Videos
          </Link>
        </li>
        {sep}
        <li
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          aria-current="page"
        >
          {videoTitle ?? 'Video'}
        </li>
      </ol>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Skeleton style={{ height: 16, width: 320 }} />
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Skeleton style={{ width: 480, height: 270, borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1, minWidth: 220 }}>
          <Skeleton style={{ height: 28, width: '90%' }} />
          <Skeleton style={{ height: 16, width: 160 }} />
          <Skeleton style={{ height: 14, width: 120 }} />
          <Skeleton style={{ height: 14, width: 100 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 96, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VideoDetailPage() {
  const { channelDbId: channelDbIdStr, videoDbId: videoDbIdStr } = useParams<{
    channelDbId: string
    videoDbId: string
  }>()
  const channelDbId = Number(channelDbIdStr)
  const videoDbId = Number(videoDbIdStr)
  const location = useLocation()
  const navigate = useNavigate()
  // Nav state from table row click (immediate data)
  const navVideo = location.state?.video as VideoRow | undefined

  const { data: channel, isLoading: channelLoading } = useChannelQuery(channelDbId)

  // Fetch up to 100 videos sorted by views for comparison + to find this video
  const { data: videosPage, isLoading: videosLoading } = useVideosQuery(channelDbId, {
    sort: 'views',
    dir: 'desc',
    size: 100,
    page: 0,
  })

  const allVideos = videosPage?.items ?? []
  const videoFromList = allVideos.find((v) => v.id === videoDbId)
  const video = videoFromList ?? navVideo

  const isLoading = channelLoading || (videosLoading && !navVideo)

  if (isLoading) {
    return (
      <div style={{ maxWidth: 900 }}>
        <DetailSkeleton />
      </div>
    )
  }

  if (!video) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          alignItems: 'flex-start',
        }}
      >
        <Breadcrumb channel={channel} channelDbId={channelDbId} videoTitle={null} />
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Video not found. It may not be in the indexed set.
        </p>
        <Button variant="outline" onClick={() => navigate(`/channels/${channelDbId}/videos`)}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} aria-hidden />
          Back to Videos
        </Button>
      </div>
    )
  }

  const ytUrl = `${YT_WATCH}${video.videoId}`
  const thumbSrc =
    video.thumbnailUrl ?? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
  const hasTitle = Boolean(video.title?.trim())
  const displayedTitle = hasTitle ? video.title! : video.videoId
  const publishedDate = video.publishedAt ? formatDate(video.publishedAt) : null
  const publishedAge = relativeAge(video.publishedAt)
  const eng = engagementRate(video)
  const comparison = !videosLoading ? computeComparison(video, allVideos) : null

  const channelName =
    channel?.title ?? (channel?.handle ? `@${channel.handle}` : `Channel ${channelDbId}`)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)',
        maxWidth: 900,
      }}
    >
      {/* Breadcrumb */}
      <Breadcrumb channel={channel} channelDbId={channelDbId} videoTitle={video.title} />

      {/* ── Section 1: Hero ── */}
      <section
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        {/* Thumbnail */}
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch "${displayedTitle}" on YouTube`}
          style={{
            display: 'block',
            flexShrink: 0,
            width: '100%',
            maxWidth: 480,
            aspectRatio: '16 / 9',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--color-surface-2)',
          }}
        >
          <img
            src={thumbSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </a>

        {/* Meta */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            flex: 1,
            minWidth: 220,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {displayedTitle}
          </h1>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Channel:{' '}
              <Link
                to={`/channels/${channelDbId}`}
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {channelName}
              </Link>
            </div>

            {publishedDate && (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Published {publishedDate}
                {publishedAge && (
                  <span style={{ color: 'var(--color-text-muted)' }}> ({publishedAge})</span>
                )}
              </div>
            )}

            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--accent)',
                textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              Watch on YouTube
              <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ── Section 2: Key Metrics ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Key Metrics
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <VideoStatCard
            label="Views"
            value={video.viewCount != null ? formatCount(video.viewCount) : ' - '}
            icon={<Eye size={13} aria-hidden />}
          />
          <VideoStatCard
            label="Likes"
            value={video.likeCount != null ? formatCount(video.likeCount) : 'N/A'}
            sub={video.likeCount == null ? 'Not available for this video' : undefined}
            icon={<ThumbsUp size={13} aria-hidden />}
          />
          <VideoStatCard
            label="Comments"
            value={video.commentCount != null ? formatCount(video.commentCount) : 'N/A'}
            sub={video.commentCount == null ? 'Not available for this video' : undefined}
            icon={<MessageSquare size={13} aria-hidden />}
          />
          {eng && (
            <VideoStatCard
              label="Engagement Rate"
              value={eng}
              sub="(likes + comments) / views"
            />
          )}
        </div>
      </section>

      {/* ── Section 3: Performance Context ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Performance Context
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          How does this video compare to other videos on this channel?
        </p>

        <Card>
          <CardContent style={{ padding: 'var(--space-5)' }}>
            {videosLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Skeleton style={{ height: 14, width: '70%' }} />
                <Skeleton style={{ height: 14, width: '50%' }} />
              </div>
            ) : !comparison ? (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Add more videos to enable comparison.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Views vs avg */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-primary)',
                      margin: 0,
                    }}
                  >
                    This video has{' '}
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                    >
                      {formatCount(comparison.thisViews)}
                    </span>{' '}
                    views. Channel average is{' '}
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                    >
                      {formatCount(Math.round(comparison.avg))}
                    </span>
                    .{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      This video is{' '}
                      {relativeLabel(comparison.avg > 0 ? comparison.thisViews / comparison.avg : 0)}.
                    </span>
                  </p>

                  {/* Bar */}
                  {comparison.avg > 0 && (
                    <div
                      style={{
                        position: 'relative',
                        height: 8,
                        borderRadius: 9999,
                        background: 'var(--color-surface-2)',
                        overflow: 'hidden',
                        maxWidth: 400,
                      }}
                    >
                      {/* avg marker */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: `${Math.min(100, (comparison.avg / Math.max(comparison.avg * 2, comparison.thisViews * 1.2, 1)) * 100)}%`,
                          width: 2,
                          height: '100%',
                          background: 'var(--color-border-strong)',
                        }}
                      />
                      {/* this video */}
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (comparison.thisViews / Math.max(comparison.avg * 2, comparison.thisViews * 1.2, 1)) * 100)}%`,
                          background: 'var(--accent)',
                          borderRadius: 9999,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Percentile */}
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--color-text-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {percentileBand(comparison.percentile)}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                    (based on {comparison.count} indexed videos)
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Section 4: Video Metadata ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Video Metadata
        </h2>
        <Card>
          <CardContent style={{ padding: 'var(--space-5)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(
                  [
                    {
                      label: 'Video ID',
                      value: (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {video.videoId}
                          </span>
                          <CopyButton text={video.videoId} />
                        </span>
                      ),
                    },
                    {
                      label: 'Published',
                      value: publishedDate
                        ? `${publishedDate}${publishedAge ? ` (${publishedAge})` : ''}`
                        : ' - ',
                    },
                    {
                      label: 'Status',
                      value: hasTitle ? 'Indexed' : 'Indexed — metadata pending',
                    },
                  ] as { label: string; value: React.ReactNode }[]
                ).map(({ label, value }, i) => (
                  <tr
                    key={label}
                    style={{
                      borderBottom:
                        i < 2 ? '1px solid var(--color-border-subtle)' : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: 'var(--space-3) var(--space-4) var(--space-3) 0',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                        width: 140,
                        verticalAlign: 'middle',
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: 'var(--space-3) 0',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-primary)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── Section 5: Copilot Shortcut ── */}
      <section>
        <Card
          style={{
            background: 'color-mix(in srgb, var(--accent) 6%, var(--color-surface-1))',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--color-border-base))',
          }}
        >
          <CardContent
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Bot
                size={20}
                aria-hidden
                style={{ color: 'var(--accent)', flexShrink: 0 }}
              />
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  Ask the Copilot about this video
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  Get AI-powered diagnosis, suggestions, and comparisons.
                </p>
              </div>
            </div>
            <Button
              onClick={() =>
                navigate(
                  `/copilot?videoId=${video.id}&channelId=${channelDbId}&videoTitle=${encodeURIComponent(displayedTitle)}`
                )
              }
              style={{ flexShrink: 0 }}
            >
              Open Copilot
              <ExternalLink size={13} style={{ marginLeft: 6 }} aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
