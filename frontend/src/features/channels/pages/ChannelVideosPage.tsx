import { formatCount, formatDate } from '@/utils/formatters'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Database,
  ExternalLink,
  Loader2,
  Play,
  PlaySquare,
  RefreshCw,
  Search,
  Video,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'

import type { ChannelItem, VideoRow } from '@/api/types'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { InfoTooltip } from '@/components/common/InfoTooltip'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { useRefreshAction } from '@/hooks/useRefreshAction'
import { type VideoQueryParams } from '../api'
import { useChannelQuery, useChannelRefreshByIdMutation, useVideosQuery } from '../queries'
import { FreshnessBadge, mapChannelItemToFreshnessProps } from '../components/FreshnessBadge'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YT_WATCH = 'https://youtube.com/watch?v='

const VALID_SORT_KEYS = ['publishedAt', 'views', 'likes', 'comments', 'title'] as const
type SortKey = (typeof VALID_SORT_KEYS)[number]

const DEFAULT_SORT: SortKey = 'publishedAt'

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

/**
 * Returns the title to display for a video row.
 * Treats empty/whitespace-only title as absent and falls back to videoId.
 */
function displayTitle(v: VideoRow): string {
  return v.title?.trim() || v.videoId
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

type SortableHeaderProps = {
  label: string
  labelExtra?: ReactNode
  sortKey: SortKey
  currentSort: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (key: SortKey, dir: 'asc' | 'desc') => void
  className?: string
}

function SortableHeader({
  label,
  labelExtra,
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
      className={cn('pb-3 pr-4 text-left text-xs font-medium text-muted-foreground', className)}
      aria-sort={isActive ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 rounded transition-colors hover:text-foreground',
          isActive && 'text-foreground'
        )}
      >
        {/* Visible: compact label + direction icon */}
        <span aria-hidden className="flex items-center gap-1">
          {label}
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </span>
        {/* Screen-reader only: verbose description */}
        <span className="sr-only">
          {isActive ? `Sort by ${label}, currently ${currentDir}ending` : `Sort by ${label}`}
        </span>
      </button>
      {labelExtra}
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
          {/* 48×27 = 16:9 */}
          <td className="py-3 pl-4 pr-4">
            <Skeleton className="rounded" style={{ width: 48, height: 27 }} />
          </td>
          <td className="py-3 pr-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </td>
          <td className="py-3 pr-4">
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className="py-3 pr-4">
            <Skeleton className="h-3.5 w-10" />
          </td>
          <td className="py-3 pr-4">
            <Skeleton className="h-3.5 w-10" />
          </td>
          <td className="py-3 pr-4">
            <Skeleton className="h-3.5 w-10" />
          </td>
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Video row
// ---------------------------------------------------------------------------

// Small pill shown when likes/comments haven't been enriched yet.
// Uses native title= for tooltip — keeps the table cell uncluttered.
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

function VideoTableRow({ video }: { video: VideoRow }) {
  const hasTitle = Boolean(video.title?.trim())
  const ytUrl = `${YT_WATCH}${video.videoId}`

  function handleRowClick(e: React.MouseEvent<HTMLTableRowElement>) {
    // Let inner <a> / <button> elements handle their own navigation
    if ((e.target as HTMLElement).closest('a, button')) return
    window.open(ytUrl, '_blank', 'noopener,noreferrer')
  }

  function handleRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      window.open(ytUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <tr
      className="group align-middle transition-colors hover:bg-muted/40"
      style={{ cursor: 'pointer' }}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      aria-label={
        hasTitle ? `Watch "${video.title}" on YouTube` : `Watch ${video.videoId} on YouTube`
      }
    >
      {/* Thumbnail — 48×27 (16:9), always links to YouTube */}
      <td className="py-3 pl-4 pr-4">
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

      {/* Title — or video ID link + "(title pending)" when not yet enriched */}
      <td className="max-w-xs py-3 pr-4">
        {hasTitle ? (
          <span
            className="line-clamp-2 text-sm font-medium leading-snug"
            title={video.title!.length > 60 ? video.title! : undefined}
          >
            {video.title}
          </span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {video.videoId}
              <ExternalLink size={10} aria-hidden style={{ flexShrink: 0 }} />
            </a>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
              }}
            >
              (title pending)
            </span>
          </span>
        )}
      </td>

      {/* Published date */}
      <td className="whitespace-nowrap py-3 pr-4 text-sm text-muted-foreground">
        {formatDate(video.publishedAt)}
      </td>

      {/* Views — "—" when null (formatCount handles this) */}
      <td className="py-3 pr-4 text-sm tabular-nums">{formatCount(video.viewCount)}</td>

      {/* Likes — N/A badge when not yet enriched */}
      <td className="py-3 pr-4 text-sm tabular-nums">
        {video.likeCount != null ? formatCount(video.likeCount) : <NaBadge />}
      </td>

      {/* Comments — N/A badge when not yet enriched */}
      <td className="py-3 pr-4 text-sm tabular-nums">
        {video.commentCount != null ? formatCount(video.commentCount) : <NaBadge />}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

const PAGE_SIZES = [25, 50, 100] as const

type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  size: number
  onPrev: () => void
  onNext: () => void
  onSizeChange: (n: number) => void
}

function Pagination({
  page,
  totalPages,
  totalItems,
  size,
  onPrev,
  onNext,
  onSizeChange,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages)
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm text-muted-foreground">
      {/* Left: page-size pills */}
      <div className="flex items-center gap-1">
        {PAGE_SIZES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSizeChange(n)}
            style={{
              padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: n === size ? 600 : 400,
              border: '1px solid',
              borderColor: n === size ? 'var(--color-border-strong)' : 'var(--color-border-subtle)',
              background: n === size ? 'var(--color-surface-2)' : 'transparent',
              color: n === size ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              cursor: n === size ? 'default' : 'pointer',
              transition: 'all var(--duration-base)',
            }}
          >
            {n} per page
          </button>
        ))}
      </div>

      {/* Right: navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page === 0}
          className="gap-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Prev
        </Button>
        <span
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          Page{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {page + 1}
          </span>{' '}
          of{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {safeTotal}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {' '}
            ({totalItems.toLocaleString()} video{totalItems !== 1 ? 's' : ''})
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="gap-1"
          aria-label="Next page"
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
  const channelDbId =
    channelDbIdStr != null && /^\d+$/.test(channelDbIdStr) ? Number(channelDbIdStr) : NaN

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

  // Channel metadata (for breadcrumb / title + YouTube total video count)
  const { data: channel, isLoading: isChannelLoading } = useChannelQuery(
    Number.isNaN(channelDbId) ? undefined : channelDbId
  )

  const queryParams: VideoQueryParams = { q: urlQ || undefined, sort, dir, page, size }

  const { data, isLoading, isFetching, isError, error, refetch } = useVideosQuery(
    Number.isNaN(channelDbId) ? 0 : channelDbId,
    queryParams
  )

  const refreshMutation = useChannelRefreshByIdMutation()
  const { state: refreshState, trigger: triggerRefresh } = useRefreshAction(() =>
    refreshMutation.mutateAsync({ channelDbId })
  )

  // Invalid route param — redirect after all hooks have run
  if (Number.isNaN(channelDbId)) return <Navigate to="/channels" replace />

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

  function handleSize(newSize: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('size', String(newSize))
        next.set('page', '0')
        return next
      },
      { replace: true }
    )
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (isError) {
    return (
      <div className="space-y-6">
        <VideosPageHeader channel={channel} channelDbId={channelDbId} />
        <ErrorState
          title="Failed to load videos"
          description={error.message}
          status={error.status}
          code={error.code}
          onAction={async () => {
            const result = await refetch()
            if (result.isError) toastError(result.error, 'Failed to reload videos')
          }}
        />
      </div>
    )
  }

  const items = data?.items ?? []
  const meta = data?.page

  // Client-side filter: normalize both sides (lowercase + trim) so searching
  // by the displayed text (title or videoId fallback) always works.
  const clientQ = urlQ.trim().toLowerCase()
  const filteredItems = clientQ
    ? items.filter((v) => displayTitle(v).toLowerCase().includes(clientQ))
    : items

  // Warning banner: >20% of this page's videos have no title → sync likely incomplete.
  const missingTitleCount = items.filter((v) => !v.title?.trim()).length
  const missingTitleFraction = items.length > 0 ? missingTitleCount / items.length : 0
  const showTitleWarning = !isLoading && items.length > 0 && missingTitleFraction > 0.2
  // Subtle search hint: >50% titles missing — searching won't return useful results yet.
  const showEnrichmentHint = !isLoading && items.length > 0 && missingTitleFraction > 0.5

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <VideosPageHeader channel={channel} channelDbId={channelDbId} />

      {/* Video count stats */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <StatCard
          label="Total Videos"
          value={channel?.videoCount?.toLocaleString() ?? '—'}
          icon={<PlaySquare className="h-4 w-4 text-muted-foreground" />}
          loading={isChannelLoading}
        />
        <StatCard
          label="Indexed Videos"
          labelExtra={
            <InfoTooltip text="Indexed = videos stored in SocialLens DB. Total = YouTube channel lifetime total." />
          }
          value={meta?.totalItems?.toLocaleString() ?? '—'}
          description="Stored in SocialLens DB"
          icon={<Database className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
      </div>

      {/* Missing-title warning banner */}
      {showTitleWarning && (
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--color-warn) 35%, transparent)',
            background: 'var(--color-warn-muted)',
            padding: 'var(--space-2) var(--space-4)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-warn)',
            lineHeight: 'var(--leading-relaxed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
          data-testid="title-warning-banner"
        >
          <span>
            Most videos are missing titles — metadata enrichment may have failed during the last
            sync. Run a refresh to fix this.
          </span>
          <button
            type="button"
            disabled={refreshState.disabled}
            aria-disabled={refreshState.disabled}
            onClick={triggerRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              flexShrink: 0,
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: refreshState.phase === 'success' ? 'var(--color-up)' : 'var(--color-warn)',
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--color-warn) 50%, transparent)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-1) var(--space-3)',
              cursor: refreshState.disabled ? 'not-allowed' : 'pointer',
              opacity: refreshState.disabled ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {refreshState.isPending && (
              <Loader2 size={12} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
            )}
            {refreshState.phase === 'success'
              ? 'Refreshed'
              : refreshState.phase === 'error'
                ? 'Failed'
                : refreshState.label}
          </button>
        </div>
      )}

      {/* Search bar + Refresh Metadata */}
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col gap-1">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by title or video ID…"
              className="pl-9"
              style={{ width: 280 }}
              aria-label="Search videos by title or video ID"
            />
          </div>
          {showEnrichmentHint && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              Titles will be searchable after metadata enrichment
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={refreshState.disabled}
          aria-disabled={refreshState.disabled}
          onClick={triggerRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            flexShrink: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color:
              refreshState.phase === 'success'
                ? 'var(--color-up)'
                : refreshState.phase === 'error'
                  ? 'var(--color-down)'
                  : 'var(--color-text-secondary)',
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            cursor: refreshState.disabled ? 'not-allowed' : 'pointer',
            opacity: refreshState.disabled ? 0.6 : 1,
            whiteSpace: 'nowrap',
            height: 36,
            transition: 'border-color var(--duration-base), color var(--duration-base)',
          }}
          onMouseEnter={(e) => {
            if (!refreshState.disabled) {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-base)'
          }}
        >
          {refreshState.isPending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
          ) : (
            <RefreshCw size={13} aria-hidden style={{ flexShrink: 0 }} />
          )}
          {refreshState.phase === 'success'
            ? 'Refreshed'
            : refreshState.phase === 'error'
              ? 'Failed'
              : 'Refresh Metadata'}
        </button>
      </div>

      {/* Table card */}
      <Card>
        <CardContent className="p-0">
          <div
            className={cn(
              'overflow-x-auto',
              isFetching && !isLoading && 'opacity-70 transition-opacity'
            )}
          >
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th
                    className="pb-3 pl-4 pr-4 pt-4 text-xs font-medium text-muted-foreground"
                    style={{ width: 64 }}
                  >
                    <span className="sr-only">Thumbnail</span>
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
                    labelExtra={<InfoTooltip text="Likes may not be available for all videos" />}
                    sortKey="likes"
                    currentSort={sort}
                    currentDir={dir}
                    onSort={handleSort}
                    className="pt-4"
                  />
                  <SortableHeader
                    label="Comments"
                    labelExtra={<InfoTooltip text="Comment counts available after full sync" />}
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
                  <SkeletonRows count={Math.min(size, 10)} />
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        icon={<Video className="h-7 w-7 text-muted-foreground/50" />}
                        title={urlQ ? 'No results' : 'No videos indexed yet'}
                        description={
                          urlQ
                            ? `No videos matched "${urlQ}".`
                            : 'Run a sync to populate video data.'
                        }
                        className="border-0 shadow-none"
                      />
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((video) => <VideoTableRow key={video.id} video={video} />)
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
                size={size}
                onPrev={() => handlePage(-1)}
                onNext={() => handlePage(1)}
                onSizeChange={handleSize}
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
  channel?: ChannelItem | null
  channelDbId: number
}) {
  const channelName =
    channel?.title ?? (channel?.handle ? `@${channel.handle}` : `Channel ${channelDbId}`)

  return (
    <div className="space-y-2">
      <nav aria-label="Breadcrumb">
        <ol
          className="flex items-center gap-2 text-sm text-muted-foreground"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          <li>
            <Link to="/channels" className="hover:text-foreground transition-colors">
              Channels
            </Link>
          </li>
          <li aria-hidden="true">
            <span>/</span>
          </li>
          <li>
            <Link
              to={`/channels/${channelDbId}`}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {channelName}
            </Link>
          </li>
          <li aria-hidden="true">
            <span>/</span>
          </li>
          <li>
            <span className="text-foreground font-medium" aria-current="page">
              Videos
            </span>
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">Videos</h1>
      {channel && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {channelName}
          </Badge>
        </div>
      )}
      <FreshnessBadge {...mapChannelItemToFreshnessProps(channel)} />
    </div>
  )
}
