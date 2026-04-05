/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ChannelVideosPage from './ChannelVideosPage'
import type { ChannelItem, VideoRow, VideosPageResponse } from '@/api/types'

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/features/channels/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/channels/queries')>()
  return {
    ...actual,
    useChannelQuery: vi.fn(),
    useVideosQuery: vi.fn(),
    useChannelRefreshByIdMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
  }
})

vi.mock('@/lib/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

// Import mocked modules so we can control their return values per-test
import {
  useChannelQuery,
  useChannelRefreshByIdMutation,
  useVideosQuery,
} from '@/features/channels/queries'

// ─── Factories ───────────────────────────────────────────────────────────────

function makeChannel(overrides: Partial<ChannelItem> = {}): ChannelItem {
  return {
    id: 1,
    channelId: 'UC123',
    title: 'Test Channel',
    handle: 'testchannel',
    active: true,
    ...overrides,
  } as ChannelItem
}

function makeVideo(overrides: Partial<VideoRow> = {}): VideoRow {
  return {
    id: 1,
    videoId: 'vid-1',
    title: 'Test Video',
    publishedAt: '2024-01-15T00:00:00Z',
    thumbnailUrl: null,
    viewCount: 1000,
    likeCount: 50,
    commentCount: 10,
    ...overrides,
  } as VideoRow
}

function makeVideosResponse(
  videos: VideoRow[],
  pageOverrides: Partial<{
    page: number
    size: number
    totalItems: number
    totalPages: number
  }> = {}
): VideosPageResponse {
  return {
    items: videos,
    page: {
      page: 0,
      size: 25,
      totalItems: videos.length,
      totalPages: Math.max(1, Math.ceil(videos.length / 25)),
      ...pageOverrides,
    },
  }
}

// ─── Query state builders ─────────────────────────────────────────────────────

const idle = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
}

const loading = {
  data: undefined,
  isLoading: true,
  isFetching: true,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
}

function success(data: VideosPageResponse) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }
}

function fetching(data: VideosPageResponse) {
  // keepPreviousData in flight — previous data visible, background fetch running
  return {
    data,
    isLoading: false,
    isFetching: true,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }
}

function failed(message = 'Network error') {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: true,
    error: { message, status: 500 },
    refetch: vi.fn(),
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderPage(channelDbId = '1', qs = '') {
  const path = `/channels/${channelDbId}/videos${qs ? `?${qs}` : ''}`
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/channels" element={<div>Channels List</div>} />
        <Route path="/channels/:channelDbId/videos" element={<ChannelVideosPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ChannelVideosPage', () => {
  beforeEach(() => {
    vi.mocked(useChannelQuery).mockReturnValue({ data: makeChannel(), isLoading: false } as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse([])) as any)
    vi.mocked(useChannelRefreshByIdMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Route guard ─────────────────────────────────────────────────────────────

  describe('invalid channelDbId', () => {
    it('redirects to /channels when the route param is not a number', () => {
      vi.mocked(useChannelQuery).mockReturnValue(idle as any)
      vi.mocked(useVideosQuery).mockReturnValue(idle as any)
      renderPage('not-a-number')
      expect(screen.getByText('Channels List')).toBeInTheDocument()
    })

    it('redirects to /channels for a floating-point param', () => {
      vi.mocked(useChannelQuery).mockReturnValue(idle as any)
      vi.mocked(useVideosQuery).mockReturnValue(idle as any)
      renderPage('1.5')
      expect(screen.getByText('Channels List')).toBeInTheDocument()
    })
  })

  // ── Loading ─────────────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders table headers but no data rows while loading', () => {
      vi.mocked(useVideosQuery).mockReturnValue(loading as any)
      renderPage()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.queryByText('Test Video')).not.toBeInTheDocument()
    })
  })

  // ── Error ───────────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('renders the error heading and message when the query fails', () => {
      vi.mocked(useVideosQuery).mockReturnValue(failed('Service unavailable') as any)
      renderPage()
      expect(screen.getByText('Failed to load videos')).toBeInTheDocument()
      expect(screen.getByText('Service unavailable')).toBeInTheDocument()
    })
  })

  // ── Empty states ────────────────────────────────────────────────────────────

  describe('empty states', () => {
    it('shows "No videos yet" when there are no videos and no active search', () => {
      renderPage()
      expect(screen.getByText('No videos indexed yet')).toBeInTheDocument()
    })

    it('shows "No results" when the URL q param matches no videos', () => {
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse([])) as any)
      renderPage('1', 'q=noresultquery')
      expect(screen.getByText('No results')).toBeInTheDocument()
      expect(screen.getByText(/No videos matched "noresultquery"/)).toBeInTheDocument()
    })
  })

  // ── Video rows ──────────────────────────────────────────────────────────────

  describe('video list', () => {
    it('renders a row for each video in the response', () => {
      const videos = [
        makeVideo({ id: 1, title: 'First Video' }),
        makeVideo({ id: 2, title: 'Second Video', videoId: 'vid-2' }),
      ]
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)
      renderPage()
      expect(screen.getByText('First Video')).toBeInTheDocument()
      expect(screen.getByText('Second Video')).toBeInTheDocument()
    })

    it('falls back to videoId as display text when title is null', () => {
      const videos = [makeVideo({ title: null, videoId: 'abc-xyz-123' })]
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)
      renderPage()
      expect(screen.getByText('abc-xyz-123')).toBeInTheDocument()
    })

    it('falls back to videoId when title is whitespace-only', () => {
      const videos = [makeVideo({ title: '   ', videoId: 'whitespace-vid' })]
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)
      renderPage()
      expect(screen.getByText('whitespace-vid')).toBeInTheDocument()
    })
  })

  // ── Missing title warning ───────────────────────────────────────────────────

  describe('missing title warning', () => {
    function makeMissingTitleState() {
      // 5 out of 6 have no title ≈ 83% → threshold is strictly > 0.8
      const videos = [
        makeVideo({ id: 1, title: null }),
        makeVideo({ id: 2, title: null, videoId: 'v2' }),
        makeVideo({ id: 3, title: null, videoId: 'v3' }),
        makeVideo({ id: 4, title: null, videoId: 'v4' }),
        makeVideo({ id: 5, title: null, videoId: 'v5' }),
        makeVideo({ id: 6, title: 'One with a title', videoId: 'v6' }),
      ]
      return success(makeVideosResponse(videos))
    }

    it('shows the warning banner when >80% of videos have no title', () => {
      vi.mocked(useVideosQuery).mockReturnValue(makeMissingTitleState() as any)
      renderPage()
      expect(screen.getByTestId('title-warning-banner')).toBeInTheDocument()
    })

    it('warning banner contains a refresh button', () => {
      vi.mocked(useVideosQuery).mockReturnValue(makeMissingTitleState() as any)
      renderPage()
      expect(screen.getByRole('button', { name: /refresh now/i })).toBeInTheDocument()
    })

    it('clicking refresh calls the mutation with the current channelDbId', () => {
      const mutate = vi.fn()
      vi.mocked(useChannelRefreshByIdMutation).mockReturnValue({
        mutate,
        isPending: false,
      } as any)
      vi.mocked(useVideosQuery).mockReturnValue(makeMissingTitleState() as any)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /refresh now/i }))
      expect(mutate).toHaveBeenCalledWith({ channelDbId: 1 })
    })

    it('refresh button is disabled while refresh is pending', () => {
      vi.mocked(useChannelRefreshByIdMutation).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any)
      vi.mocked(useVideosQuery).mockReturnValue(makeMissingTitleState() as any)
      renderPage()
      expect(screen.getByRole('button', { name: /refreshing/i })).toBeDisabled()
    })

    it('does not show the warning when the majority of videos have titles', () => {
      const videos = [
        makeVideo({ id: 1, title: 'A' }),
        makeVideo({ id: 2, title: 'B', videoId: 'v2' }),
        makeVideo({ id: 3, title: 'C', videoId: 'v3' }),
        makeVideo({ id: 4, title: 'D', videoId: 'v4' }),
        makeVideo({ id: 5, title: null, videoId: 'v5' }),
      ]
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)
      renderPage()
      expect(screen.queryByTestId('title-warning-banner')).not.toBeInTheDocument()
    })
  })

  // ── Search ──────────────────────────────────────────────────────────────────

  describe('search input', () => {
    it('renders the search input with an accessible label', () => {
      renderPage()
      expect(screen.getByRole('textbox', { name: /search videos/i })).toBeInTheDocument()
    })

    it('initializes the search input from the URL q param', () => {
      renderPage('1', 'q=prefilled')
      expect(screen.getByRole('textbox', { name: /search videos/i })).toHaveValue('prefilled')
    })

    it('applies client-side filter so only matching titles remain visible', () => {
      const videos = [
        makeVideo({ id: 1, title: 'React Tutorial' }),
        makeVideo({ id: 2, title: 'Vue Guide', videoId: 'v2' }),
      ]
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)
      renderPage('1', 'q=react')
      expect(screen.getByText('React Tutorial')).toBeInTheDocument()
      expect(screen.queryByText('Vue Guide')).not.toBeInTheDocument()
    })
  })

  // ── Sortable table headers ──────────────────────────────────────────────────

  describe('sortable table headers', () => {
    it('renders a sort button for every sortable column', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /sort by title/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sort by published/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sort by views/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sort by likes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sort by comments/i })).toBeInTheDocument()
    })

    it('the default active column (publishedAt) has aria-sort="descending"', () => {
      renderPage()
      const sortedHeaders = document.querySelectorAll('th[aria-sort="descending"]')
      expect(sortedHeaders.length).toBe(1)
    })

    it('inactive columns have aria-sort="none"', () => {
      renderPage()
      const noneHeaders = document.querySelectorAll('th[aria-sort="none"]')
      // 5 sortable headers total; 4 inactive
      expect(noneHeaders.length).toBe(4)
    })

    it('clicking an inactive column calls useVideosQuery with that column and dir=desc', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /sort by views/i }))
      const calls = vi.mocked(useVideosQuery).mock.calls
      const lastParams = calls.at(-1)![1]
      expect(lastParams).toMatchObject({ sort: 'views', dir: 'desc', page: 0 })
    })

    it('clicking the active column toggles direction from desc to asc', () => {
      // Default: publishedAt desc
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /sort by published/i }))
      const calls = vi.mocked(useVideosQuery).mock.calls
      const lastParams = calls.at(-1)![1]
      expect(lastParams).toMatchObject({ sort: 'publishedAt', dir: 'asc' })
    })

    it('clicking an inactive column resets the page to 0', () => {
      renderPage('1', 'page=2')
      fireEvent.click(screen.getByRole('button', { name: /sort by likes/i }))
      const calls = vi.mocked(useVideosQuery).mock.calls
      expect(calls.at(-1)![1]).toMatchObject({ page: 0 })
    })
  })

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe('pagination', () => {
    function multiPageVideosState() {
      return success(
        makeVideosResponse([makeVideo()], { page: 0, totalPages: 3, totalItems: 75, size: 25 })
      )
    }

    it('renders Prev and Next buttons when multiple pages exist', () => {
      vi.mocked(useVideosQuery).mockReturnValue(multiPageVideosState() as any)
      renderPage()
      expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('disables the Prev button on the first page', () => {
      vi.mocked(useVideosQuery).mockReturnValue(multiPageVideosState() as any)
      renderPage()
      expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    })

    it('displays the total number of videos', () => {
      vi.mocked(useVideosQuery).mockReturnValue(
        success(makeVideosResponse([makeVideo()], { totalItems: 42, totalPages: 2 })) as any
      )
      renderPage()
      expect(screen.getByText(/42 videos/)).toBeInTheDocument()
    })

    it('clicking Next calls useVideosQuery with page incremented by 1', () => {
      vi.mocked(useVideosQuery).mockReturnValue(multiPageVideosState() as any)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      const calls = vi.mocked(useVideosQuery).mock.calls
      expect(calls.at(-1)![1]).toMatchObject({ page: 1 })
    })
  })

  // ── keepPreviousData visual ─────────────────────────────────────────────────

  describe('keepPreviousData visual transition', () => {
    it('applies opacity-70 to the table container while background-fetching stale data', () => {
      const prevData = makeVideosResponse([makeVideo()])
      vi.mocked(useVideosQuery).mockReturnValue(fetching(prevData) as any)
      renderPage()
      expect(document.querySelector('.opacity-70')).toBeInTheDocument()
    })

    it('does not apply opacity-70 when data is fully loaded', () => {
      vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse([makeVideo()])) as any)
      renderPage()
      expect(document.querySelector('.opacity-70')).not.toBeInTheDocument()
    })
  })
})
