import { format, isValid, parseISO } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Video,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import type { VideoRow } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { type VideoQueryParams } from '../api'
import { useChannelQuery, useVideosQuery } from '../queries'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SORT_KEYS = ['publishedAt', 'views', 'likes', 'comments', 'title'] as const
type SortKey = (typeof VALID_SORT_KEYS)[number]

const DEFAULT_SORT: SortKey = 'publishedAt'
const DEFAULT_DIR = 'desc'
const DEFAULT_SIZE = 25

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSort(raw: string | null): SortKey {
  return VALID_SORT_KEYS.includes(raw as SortKey) ? (raw as SortKey) : DEFAULT_SORT
}

function parseDir(raw: string | null): 'asc' | 'desc' {
  return raw === 'asc' ? 'asc' : 'desc'
}

function parsePage(raw: string | null): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

function parseSize(raw: string | null): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 && n <= 100 ? Math.floor(n) : DEFAULT_SIZE
}

function fmtCompact(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

type SortableHeaderProps = {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (key: SortKey, dir: 'asc' | 'desc') => void
  className?: string
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey

  function handleClick() {
    if (isActive) {
      onSort(sortKey, currentDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(sortKey, 'desc')
    }
  }

  const Icon = isActive ? (currentDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown

  return (
    <th
      className={cn(
        'pb-3 pr-4 text-left text-xs font-medium text-muted-foreground',
        className
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 rounded transition-colors hover:text-foreground',
          isActive && 'text-foreground'
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </button>
    </th>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          <td className="py-2 pr-4">
            <Skeleton className="h-10 w-16 rounded" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-4 w-48" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="py-2 pr-4">
            <Skeleton className="h-4 w-12" />
          </td>
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Video row
// ---------------------------------------------------------------------------

function VideoTableRow({ video }: { video: VideoRow }) {
  return (
    <tr className="group align-middle hover:bg-muted/40 transition-colors">
      <td className="py-2 pr-4">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-10 w-16 rounded object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-16 items-center justify-center rounded bg-muted">
            <Video className="h-4 w-4 text-muted-foreground/50" aria-hidden />
          </div>
        )}
      </td>
      <td className="max-w-xs py-2 pr-4">
        <span
          className="line-clamp-2 text-sm font-medium leading-snug"
          title={video.title ?? undefined}
        >
          {video.title ?? video.videoId}
        </span>
      </td>
      <td className="py-2 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {fmtDate(video.publishedAt)}
      </td>
      <td className="py-2 pr-4 text-sm tabular-nums">{fmtCompact(video.viewCount)}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{fmtCompact(video.likeCount)}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{fmtCompact(video.commentCount)}</td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  onPrev: () => void
  onNext: () => void
}

function Pagination({ page, totalPages, totalItems, onPrev, onNext }: PaginationProps) {
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
        <span className="tabular-nums">
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

export default function ChannelVideosPage() {
  const { channelDbId: channelDbIdStr } = useParams<{ channelDbId: string }>()
  const channelDbId = Number(channelDbIdStr)
  const [searchParams, setSearchParams] = useSearchParams()

  // Derived URL state (source of truth for query)
  const urlQ = searchParams.get('q') ?? ''
  const sort = parseSort(searchParams.get('sort'))
  const dir = parseDir(searchParams.get('dir'))
  const page = parsePage(searchParams.get('page'))
  const size = parseSize(searchParams.get('size'))

  // Local search input — initialized from URL; debounced before writing back
  const [searchInput, setSearchInput] = useState(urlQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Channel metadata (for breadcrumb / title)
  const { data: channel } = useChannelQuery(channelDbId)

  const queryParams: VideoQueryParams = { q: urlQ || undefined, sort, dir, page, size }

  const { data, isLoading, isFetching, isError, error, refetch } = useVideosQuery(
    channelDbId,
    queryParams
  )

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value.trim()) {
            next.set('q', value.trim())
          } else {
            next.delete('q')
          }
          next.set('page', '0')
          return next
        },
        { replace: true }
      )
    }, 400)
  }

  function handleSort(newSort: SortKey, newDir: 'asc' | 'desc') {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', newSort)
        next.set('dir', newDir)
        next.set('page', '0')
        return next
      },
      { replace: true }
    )
  }

  function handlePage(delta: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(page + delta))
        return next
      },
      { replace: true }
    )
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (isError) {
    const errStatus = error?.status
    const errCode = error?.code
    const errMsg = error?.message ?? 'An unexpected error occurred.'
    return (
      <div className="space-y-6">
        <VideosPageHeader channel={channel} channelDbId={channelDbId} />
        <ErrorState
          title="Failed to load videos"
          description={errMsg}
          status={errStatus}
          code={errCode}
          onAction={() => refetch()}
        />
      </div>
    )
  }

  const items = data?.items ?? []
  const meta = data?.page

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <VideosPageHeader channel={channel} channelDbId={channelDbId} />

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search by title…"
          className="pl-9"
          aria-label="Search videos by title"
        />
      </div>

      {/* Table card */}
      <Card>
        <CardContent className="p-0">
          <div className={cn('overflow-x-auto', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th className="pb-3 pl-4 pr-4 pt-4 text-xs font-medium text-muted-foreground">
                    Thumb
                  </th>
                  <SortableHeader
                    label="Title"
                    sortKey="title"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4"
                  />
                  <SortableHeader
                    label="Published"
                    sortKey="publishedAt"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4 whitespace-nowrap"
                  />
                  <SortableHeader
                    label="Views"
                    sortKey="views"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4"
                  />
                  <SortableHeader
                    label="Likes"
                    sortKey="likes"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4"
                  />
                  <SortableHeader
                    label="Comments"
                    sortKey="comments"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <SkeletonRows count={size} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        icon={<Video className="h-7 w-7 text-muted-foreground/50" />}
                        title={urlQ ? 'No results' : 'No videos yet'}
                        description={
                          urlQ
                            ? `No videos matched "${urlQ}".`
                            : 'Videos will appear here once the channel is synced.'
                        }
                        className="border-0 shadow-none"
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((video) => <VideoTableRow key={video.id} video={video} />)
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 0 && (
            <div className="border-t px-4 py-3">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.totalItems}
                onPrev={() => handlePage(-1)}
                onNext={() => handlePage(1)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page header with breadcrumb
// ---------------------------------------------------------------------------

function VideosPageHeader({
  channel,
  channelDbId,
}: {
  channel?: { title?: string | null; handle?: string | null } | null
  channelDbId: number
}) {
  const channelName = channel?.title ?? (channel?.handle ? `@${channel.handle}` : `Channel ${channelDbId}`)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/channels" className="hover:text-foreground transition-colors">
          Channels
        </Link>
        <span>/</span>
        <Link
          to={`/channels/${channelDbId}`}
          className="hover:text-foreground transition-colors truncate max-w-[200px]"
        >
          {channelName}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Videos</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Videos</h1>
      {channel && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {channelName}
          </Badge>
        </div>
      )}
    </div>
  )
}
