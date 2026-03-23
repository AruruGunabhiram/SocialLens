/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InsightsPage from './InsightsPage'
import type { ChannelItem, VideoRow, VideosPageResponse, TimeSeriesResponse } from '@/api/types'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/features/channels/queries', () => ({
  useChannelQuery: vi.fn(),
  useVideosQuery: vi.fn(),
}))

vi.mock('@/features/trends/queries', () => ({
  useTimeSeries: vi.fn(),
}))

vi.mock('@/features/account/queries', () => ({
  useAccountStatus: vi.fn(),
}))

vi.mock('@/features/retention/queries', () => ({
  useRetentionDiagnosis: vi.fn(),
}))

vi.mock('@/features/channels/components/FreshnessBadge', () => ({
  FreshnessBadge: () => <div data-testid="freshness-badge" />,
  mapChannelItemToFreshnessProps: vi.fn(() => ({
    lastSnapshotAt: null,
    lastRefreshAt: null,
    status: null,
  })),
}))

vi.mock('@/lib/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

// ─── Import mocked modules ────────────────────────────────────────────────────

import { useChannelQuery, useVideosQuery } from '@/features/channels/queries'
import { useTimeSeries } from '@/features/trends/queries'
import { useAccountStatus } from '@/features/account/queries'
import { useRetentionDiagnosis } from '@/features/retention/queries'

// ─── Factories ────────────────────────────────────────────────────────────────

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

function makeTimeSeries(points: Array<{ date: string; value: number }> = []): TimeSeriesResponse {
  return {
    channelDbId: 1,
    channelId: 'UC123',
    metric: 'VIEWS',
    rangeDays: 30,
    points,
  }
}

function makeVideo(overrides: Partial<VideoRow> = {}): VideoRow {
  return {
    id: 1,
    videoId: 'vid-1',
    title: 'Test Video',
    publishedAt: '2024-01-01T00:00:00Z',
    thumbnailUrl: null,
    viewCount: 10000,
    likeCount: 500,
    commentCount: 50,
    ...overrides,
  } as VideoRow
}

function makeVideosResponse(items: VideoRow[] = []): VideosPageResponse {
  return {
    items,
    page: { page: 0, size: 5, totalItems: items.length, totalPages: 1 },
  }
}

// ─── Query state helpers ───────────────────────────────────────────────────────

function idle() {
  return { data: undefined, isLoading: false, isError: false }
}
function loading() {
  return { data: undefined, isLoading: true, isError: false }
}
function success<T>(data: T) {
  return { data, isLoading: false, isError: false }
}
function errored() {
  return { data: undefined, isLoading: false, isError: true }
}

const DEFAULT_MUTATION = {
  mutate: vi.fn(),
  isPending: false,
  data: undefined,
  error: null,
  reset: vi.fn(),
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderPage(channelDbId: string | null = '1') {
  if (channelDbId === null) {
    return render(
      <MemoryRouter initialEntries={['/insights']}>
        <Routes>
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </MemoryRouter>
    )
  }
  return render(
    <MemoryRouter initialEntries={[`/channels/${channelDbId}/insights`]}>
      <Routes>
        <Route path="/channels/:channelDbId/insights" element={<InsightsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.mocked(useChannelQuery).mockReturnValue(idle() as any)
    vi.mocked(useVideosQuery).mockReturnValue(idle() as any)
    vi.mocked(useTimeSeries).mockReturnValue(idle() as any)
    vi.mocked(useAccountStatus).mockReturnValue(idle() as any)
    vi.mocked(useRetentionDiagnosis).mockReturnValue(DEFAULT_MUTATION as any)
  })

  it('shows no-channel message when channelDbId param is absent', () => {
    renderPage(null)
    expect(screen.getByTestId('no-channel')).toBeInTheDocument()
  })

  it('renders all section containers when channel param is present', () => {
    vi.mocked(useChannelQuery).mockReturnValue(loading() as any)
    vi.mocked(useTimeSeries).mockReturnValue(loading() as any)
    vi.mocked(useVideosQuery).mockReturnValue(loading() as any)
    vi.mocked(useAccountStatus).mockReturnValue(loading() as any)

    renderPage()

    expect(screen.getByTestId('coverage-card')).toBeInTheDocument()
    expect(screen.getByTestId('trend-grid')).toBeInTheDocument()
    expect(screen.getByTestId('upload-activity-card')).toBeInTheDocument()
  })

  it('shows loading skeleton inside trend cards while timeseries loads', () => {
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useTimeSeries).mockReturnValue(loading() as any)
    vi.mocked(useVideosQuery).mockReturnValue(loading() as any)
    vi.mocked(useAccountStatus).mockReturnValue(idle() as any)

    renderPage()

    expect(screen.getByTestId('trend-card-loading-views')).toBeInTheDocument()
    expect(screen.getByTestId('trend-card-loading-subscribers')).toBeInTheDocument()
  })

  it('shows not-connected gate and hides diagnosis form when account not linked', () => {
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(
      success({ userId: 1, platform: 'YOUTUBE', connected: false }) as any
    )
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries()) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse()) as any)

    renderPage()

    expect(screen.getByTestId('not-connected')).toBeInTheDocument()
    expect(screen.queryByTestId('diagnosis-form')).not.toBeInTheDocument()
  })

  it('shows diagnosis form and hides gate when account is connected', () => {
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(
      success({ userId: 1, platform: 'YOUTUBE', connected: true }) as any
    )
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries()) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse()) as any)

    renderPage()

    expect(screen.getByTestId('diagnosis-form')).toBeInTheDocument()
    expect(screen.queryByTestId('not-connected')).not.toBeInTheDocument()
  })

  it('renders top videos table with data', () => {
    const videos = [
      makeVideo({ id: 1, title: 'Best Video', viewCount: 99000 }),
      makeVideo({ id: 2, title: 'Second Video', viewCount: 45000 }),
    ]
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(
      success({ userId: 1, platform: 'YOUTUBE', connected: false }) as any
    )
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries()) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse(videos)) as any)

    renderPage()

    expect(screen.getByTestId('top-videos-table')).toBeInTheDocument()
    expect(screen.getByText('Best Video')).toBeInTheDocument()
    expect(screen.getByText('Second Video')).toBeInTheDocument()
  })

  it('shows "no videos" message when videos list is empty', () => {
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(idle() as any)
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries()) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse([])) as any)

    renderPage()

    expect(screen.getByText(/No videos found/i)).toBeInTheDocument()
  })

  it('computes and renders trend direction when timeseries has sufficient points', () => {
    const pts = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-15', value: 1500 },
      { date: '2024-01-30', value: 2000 },
    ]
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(
      success({ userId: 1, platform: 'YOUTUBE', connected: false }) as any
    )
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries(pts)) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse()) as any)

    renderPage()

    // trend card for views shows a direction — slope is positive so expect "Up"
    expect(screen.getByTestId('trend-card-views')).toBeInTheDocument()
    expect(screen.getAllByText('Up').length).toBeGreaterThan(0)
  })

  it('shows snapshot range when views timeseries data is present', () => {
    const pts = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-30', value: 2000 },
    ]
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(idle() as any)
    vi.mocked(useTimeSeries).mockReturnValue(success(makeTimeSeries(pts)) as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse()) as any)

    renderPage()

    expect(screen.getByText(/Snapshot range/i)).toBeInTheDocument()
    expect(screen.getByText(/Days captured/i)).toBeInTheDocument()
  })

  it('shows error state message when views timeseries errors', () => {
    vi.mocked(useChannelQuery).mockReturnValue(success(makeChannel()) as any)
    vi.mocked(useAccountStatus).mockReturnValue(idle() as any)
    vi.mocked(useTimeSeries).mockReturnValue(errored() as any)
    vi.mocked(useVideosQuery).mockReturnValue(success(makeVideosResponse()) as any)

    renderPage()

    expect(screen.getAllByText(/No data available/i).length).toBeGreaterThanOrEqual(1)
  })
})
