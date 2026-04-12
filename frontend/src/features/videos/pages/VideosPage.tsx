import { useQueries } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Play, Search, Video } from 'lucide-react'

import { fetchChannelVideos } from '@/features/channels/api'
import { channelListQueryKeys, useChannelsQuery } from '@/features/channels/queries'
import type { ChannelItem, VideoRow } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCount, formatDate } from '@/utils/formatters'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25
const FETCH_SIZE = 100

type SortOption = 'views_desc' | 'views_asc' | 'published_desc' | 'title_asc'

// ---------------------------------------------------------------------------
// Augmented row type
// ---------------------------------------------------------------------------

type GlobalVideoRow = VideoRow & {
  channelDbId: number
  channelTitle: string
  channelHandle: string | null
  channelThumbnailUrl: string | null
}

// ---------------------------------------------------------------------------
// Channel filter pill
// ---------------------------------------------------------------------------

function ChannelPill({
  channel,
  selected,
  onToggle,
}: {
  channel: ChannelItem
  selected: boolean
  onToggle: (id: number) => void
}) {
  const name = channel.title ?? (channel.handle ? `@${channel.handle}` : `Channel ${channel.id}`)
  return (
    <button
      type="button"
      onClick={() => onToggle(channel.id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '3px var(--space-3)',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--color-border-base)'}`,
        background: selected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
        color: selected ? 'var(--accent)' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 0.15s, background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {channel.thumbnailUrl && (
        <img
          src={channel.thumbnailUrl}
          alt=""
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}
      {name}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Channel avatar + name cell (links to channel overview)
// ---------------------------------------------------------------------------

function ChannelCell({
  dbId,
  title,
  thumbnailUrl,
}: {
  dbId: number
  title: string
  thumbnailUrl: string | null
}) {
  const [imgErr, setImgErr] = useState(false)
  const initial = title.charAt(0).toUpperCase()

  return (
    <Link
      to={`/channels/${dbId}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        textDecoration: 'none',
        color: 'var(--color-text-primary)',
        maxWidth: 140,
        minWidth: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
    >
      {thumbnailUrl && !imgErr ? (
        <img
          src={thumbnailUrl}
          alt=""
          onError={() => setImgErr(true)}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            flexShrink: 0,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
          }}
          aria-hidden
        >
          {initial}
        </div>
      )}
      <span
        style={{
          fontSize: 'var(--text-xs)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// N/A badge for un-enriched metrics
// ---------------------------------------------------------------------------

function NaBadge() {
  return (
    <span
      title="Available after metadata enrichment"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '1px 5px',
        cursor: 'help',
      }}
    >
      N/A
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          <td className="py-2 pl-4 pr-4">
            <Skeleton className="rounded" style={{ width: 48, height: 27 }} />
          </td>
          <td className="py-2 pr-4">
            <div className="flex items-center gap-2">
              <Skeleton className="rounded-full" style={{ width: 20, height: 20, flexShrink: 0 }} />
              <Skeleton className="h-3 w-20" />
            </div>
          </td>
          <td className="py-2 pr-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-3.5 w-12" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-3.5 w-10" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-3.5 w-10" />
          </td>
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Video table row
// ---------------------------------------------------------------------------

const YT_WATCH = 'https://youtube.com/watch?v='

function GlobalVideoRow({ video }: { video: GlobalVideoRow }) {
  const hasTitle = Boolean(video.title?.trim())
  const ytUrl = `${YT_WATCH}${video.videoId}`

  return (
    <tr className="group align-middle transition-colors hover:bg-muted/40">
      {/* Thumbnail */}
      <td className="py-2 pl-4 pr-4">
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            hasTitle ? `Watch "${video.title}" on YouTube` : `Watch ${video.videoId} on YouTube`
          }
          style={{
            display: 'block',
            width: 48,
            height: 27,
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              style={{ width: 48, height: 27, objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 27,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-surface-2)',
              }}
            >
              <Play
                size={12}
                aria-hidden
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              />
            </div>
          )}
        </a>
      </td>

      {/* Channel */}
      <td className="py-2 pr-4">
        <ChannelCell
          dbId={video.channelDbId}
          title={video.channelTitle}
          thumbnailUrl={video.channelThumbnailUrl}
        />
      </td>

      {/* Title */}
      <td className="max-w-xs py-2 pr-4">
        {hasTitle ? (
          <Link
            to={`/channels/${video.channelDbId}/videos`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span
              className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-foreground"
              title={video.title!.length > 60 ? video.title! : undefined}
            >
              {video.title}
            </span>
          </Link>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            {video.videoId}
          </span>
        )}
      </td>

      {/* Published */}
      <td className="whitespace-nowrap py-2 pr-4 text-sm text-muted-foreground">
        {formatDate(video.publishedAt)}
      </td>

      {/* Views */}
      <td
        className="py-2 pr-4 text-sm"
        style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatCount(video.viewCount)}
      </td>

      {/* Likes */}
      <td
        className="py-2 pr-4 text-sm"
        style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {video.likeCount != null ? formatCount(video.likeCount) : <NaBadge />}
      </td>

      {/* Comments */}
      <td
        className="py-2 pr-4 text-sm"
        style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {video.commentCount != null ? formatCount(video.commentCount) : <NaBadge />}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  totalItems,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {totalItems.toLocaleString()} video{totalItems !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Prev
        </Button>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VideosPage() {
  const { data: channels = [], isLoading: channelsLoading } = useChannelsQuery()

  const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set())
  const [sort, setSort] = useState<SortOption>('views_desc')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch videos for all tracked channels in parallel
  const videoQueries = useQueries({
    queries: channels.map((ch) => ({
      queryKey: channelListQueryKeys.videos(ch.id, {
        sort: 'views',
        dir: 'desc',
        page: 0,
        size: FETCH_SIZE,
      }),
      queryFn: () =>
        fetchChannelVideos(ch.id, { sort: 'views', dir: 'desc', page: 0, size: FETCH_SIZE }),
      staleTime: 2 * 60 * 1000,
      enabled: channels.length > 0,
    })),
  })

  const isLoadingVideos = channelsLoading || videoQueries.some((q) => q.isLoading)

  // Merge all videos with their channel metadata
  const allVideos = useMemo<GlobalVideoRow[]>(() => {
    const result: GlobalVideoRow[] = []
    channels.forEach((ch, i) => {
      const items = videoQueries[i]?.data?.items ?? []
      const chTitle = ch.title ?? (ch.handle ? `@${ch.handle}` : `Channel ${ch.id}`)
      for (const v of items) {
        result.push({
          ...v,
          channelDbId: ch.id,
          channelTitle: chTitle,
          channelHandle: ch.handle ?? null,
          channelThumbnailUrl: ch.thumbnailUrl ?? null,
        })
      }
    })
    return result
  }, [channels, videoQueries])

  // Filter + sort
  const filtered = useMemo<GlobalVideoRow[]>(() => {
    let rows = allVideos

    if (selectedChannels.size > 0) {
      rows = rows.filter((v) => selectedChannels.has(v.channelDbId))
    }

    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((v) => (v.title ?? v.videoId).toLowerCase().includes(q))
    }

    const sorted = [...rows]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'views_desc':
          return (b.viewCount ?? 0) - (a.viewCount ?? 0)
        case 'views_asc':
          return (a.viewCount ?? 0) - (b.viewCount ?? 0)
        case 'published_desc': {
          const da = a.publishedAt ?? ''
          const db = b.publishedAt ?? ''
          return db.localeCompare(da)
        }
        case 'title_asc':
          return (a.title ?? a.videoId).localeCompare(b.title ?? b.videoId)
        default:
          return 0
      }
    })
    return sorted
  }, [allVideos, selectedChannels, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Handlers
  function toggleChannel(id: number) {
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setPage(0)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(0)
    }, 300)
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSort(e.target.value as SortOption)
    setPage(0)
  }

  const totalVideoCount = allVideos.length
  const activeChannelCount = channels.length

  // Empty state: no channels tracked at all
  const noChannels = !channelsLoading && channels.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
          }}
        >
          Videos
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          All indexed videos across tracked channels
        </p>
        {!isLoadingVideos && totalVideoCount > 0 && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {totalVideoCount.toLocaleString()}
            </span>{' '}
            total video{totalVideoCount !== 1 ? 's' : ''} across{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {activeChannelCount}
            </span>{' '}
            channel{activeChannelCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Channel pills */}
        {!channelsLoading && channels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                flexShrink: 0,
              }}
            >
              Channel:
            </span>
            {channels.map((ch) => (
              <ChannelPill
                key={ch.id}
                channel={ch}
                selected={selectedChannels.has(ch.id)}
                onToggle={toggleChannel}
              />
            ))}
            {selectedChannels.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChannels(new Set())
                  setPage(0)
                }}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 var(--space-1)',
                  textDecoration: 'underline',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Sort select */}
        <select
          value={sort}
          onChange={handleSortChange}
          aria-label="Sort videos by"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-md)',
            padding: '5px var(--space-3)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <option value="views_desc">Views: High to Low</option>
          <option value="views_asc">Views: Low to High</option>
          <option value="published_desc">Published: Newest</option>
          <option value="title_asc">Title: A-Z</option>
        </select>

        {/* Search */}
        <div className="relative" style={{ width: 220, flexShrink: 0 }}>
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by title..."
            className="pl-8"
            style={{ fontSize: 'var(--text-sm)' }}
            aria-label="Search videos by title"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className={cn('overflow-x-auto')}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <th className="pb-3 pl-4 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Thumb
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Channel
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Published
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Views
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Likes
                  </th>
                  <th className="pb-3 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingVideos ? (
                  <SkeletonRows count={8} />
                ) : noChannels || filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16">
                      <EmptyState
                        icon={<Video className="h-7 w-7 text-muted-foreground/50" />}
                        title={
                          noChannels
                            ? 'No channels tracked'
                            : search
                              ? 'No results'
                              : 'No videos indexed yet'
                        }
                        description={
                          noChannels
                            ? 'No videos indexed yet. Track a channel and run a sync to see videos here.'
                            : search
                              ? `No videos matched "${search}".`
                              : 'Track a channel and run a sync to see videos here.'
                        }
                        className="border-0 shadow-none"
                      />
                    </td>
                  </tr>
                ) : (
                  pageItems.map((video) => (
                    <GlobalVideoRow key={`${video.channelDbId}-${video.id}`} video={video} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoadingVideos && filtered.length > PAGE_SIZE && (
            <div className="border-t px-4 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
