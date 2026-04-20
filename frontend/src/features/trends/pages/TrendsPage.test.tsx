/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TrendsPage  -  empty and error state tests.
 *
 * Recharts is mocked to avoid ResizeObserver / SVG issues in jsdom.
 * The utility logic (normalize, deltas, insights) is thoroughly tested in
 * utils.test.ts; here we test how the page responds to query state.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TrendsPage from './TrendsPage'
import type { ChannelItem, TimeSeriesResponse } from '@/api/types'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <>{children}</>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: any) => <>{children}</>,
  Cell: () => null,
  CartesianGrid: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
}))

vi.mock('@/features/channels/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/channels/queries')>()
  return {
    ...actual,
    useChannelQuery: vi.fn(),
    useChannelRefreshByIdMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  }
})

vi.mock('@/features/trends/queries', () => ({
  useTimeSeries: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

import { useChannelQuery } from '@/features/channels/queries'
import { useTimeSeries } from '@/features/trends/queries'

// ─── Factories ────────────────────────────────────────────────────────────────

function makeChannel(overrides: Partial<ChannelItem> = {}): ChannelItem {
  return {
    id: 1,
    channelId: 'UC123',
    title: 'Test Channel',
    active: true,
    ...overrides,
  } as ChannelItem
}

function makeTimeSeriesResponse(points: { date: string; value: number }[]): TimeSeriesResponse {
  return {
    channelDbId: 1,
    channelId: 'UC123',
    metric: 'VIEWS',
    rangeDays: 30,
    points,
  }
}

// ─── Query state builders ─────────────────────────────────────────────────────

const tsLoading = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
}

function tsSuccess(data: TimeSeriesResponse) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }
}

function tsFailed(message = 'Request failed', status = 500) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: { message, status },
    refetch: vi.fn(),
  }
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderTrendsPage(channelDbId = '1', qs = '') {
  const path = `/channels/${channelDbId}/trends${qs ? `?${qs}` : ''}`
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/channels/:channelDbId/trends" element={<TrendsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('TrendsPage', () => {
  beforeEach(() => {
    vi.mocked(useChannelQuery).mockReturnValue({ data: makeChannel(), isLoading: false } as any)
    vi.mocked(useTimeSeries).mockReturnValue(tsSuccess(makeTimeSeriesResponse([])) as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading ─────────────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders the skeleton and not the chart or insight cards', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsLoading as any)
      renderTrendsPage()
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
      expect(screen.queryByText('Growth / Day')).not.toBeInTheDocument()
    })
  })

  // ── Error ───────────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('renders the "Failed to load trends" heading', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsFailed('Upstream timeout') as any)
      renderTrendsPage()
      expect(screen.getByText('Failed to load trends')).toBeInTheDocument()
    })

    it('renders the raw error message from the query', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsFailed('Upstream timeout') as any)
      renderTrendsPage()
      expect(screen.getByText(/Upstream timeout/)).toBeInTheDocument()
    })

    it('includes the HTTP status code in the error description', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsFailed('Gateway error', 502) as any)
      renderTrendsPage()
      // normalizeErrorMessage appends "(502)" when status is present
      expect(screen.getByText(/Gateway error \(502\)/)).toBeInTheDocument()
    })

    it('renders a Retry action button', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsFailed() as any)
      renderTrendsPage()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  // ── Insufficient data  -  total mode ──────────────────────────────────────────

  describe('insufficient data  -  total mode (default)', () => {
    it('shows "No snapshot history yet" for 0 data points', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsSuccess(makeTimeSeriesResponse([])) as any)
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText('No snapshot history yet')).toBeInTheDocument()
    })

    it('shows "Only 1 snapshot captured" for exactly 1 data point', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse([{ date: '2024-01-01', value: 100 }])) as any
      )
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText(/Only 1 snapshot captured\s*-\s*need at least 2/)).toBeInTheDocument()
    })

    it('does not show the insufficient-data empty state with 2+ distinct points', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(
          makeTimeSeriesResponse([
            { date: '2024-01-01', value: 100 },
            { date: '2024-01-02', value: 200 },
          ])
        ) as any
      )
      renderTrendsPage('1', 'mode=total')
      expect(screen.queryByText('Need at least 2 snapshots  -  run refresh')).not.toBeInTheDocument()
    })
  })

  // ── Insufficient data  -  delta mode ──────────────────────────────────────────

  describe('insufficient data  -  delta mode', () => {
    it('shows "Need at least 3 snapshots" when switching to delta with only 2 points', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(
          makeTimeSeriesResponse([
            { date: '2024-01-01', value: 100 },
            { date: '2024-01-02', value: 200 },
          ])
        ) as any
      )
      renderTrendsPage('1', 'mode=delta')
      expect(screen.getByText(/Need at least 3 snapshots\s*-\s*run refresh/)).toBeInTheDocument()
    })
  })

  // ── Sufficient data ─────────────────────────────────────────────────────────

  describe('sufficient data', () => {
    const threePoints = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-11', value: 2000 },
      { date: '2024-01-21', value: 3000 },
    ]

    beforeEach(() => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse(threePoints)) as any
      )
    })

    it('renders the chart area', () => {
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders all three insight cards', () => {
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText('Growth / Day')).toBeInTheDocument()
      expect(screen.getByText('Peak Day')).toBeInTheDocument()
      expect(screen.getByText('Trend')).toBeInTheDocument()
    })

    it('shows the channel name in the breadcrumb', () => {
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText('Test Channel')).toBeInTheDocument()
    })
  })

  // ── Snapshot coverage banner ─────────────────────────────────────────────

  describe('snapshot coverage banner', () => {
    it('does not render the banner when there are 0 captured days', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsSuccess(makeTimeSeriesResponse([])) as any)
      renderTrendsPage()
      expect(screen.queryByTestId('snapshot-coverage-banner')).not.toBeInTheDocument()
    })

    it('renders the banner with correct count for 1 captured day', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse([{ date: '2024-03-21', value: 100 }])) as any
      )
      renderTrendsPage('1', 'mode=total')
      const banner = screen.getByTestId('snapshot-coverage-banner')
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent('1')
      expect(banner).toHaveTextContent('of 30 days captured')
    })

    it('renders the banner with correct count for 2 captured days', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(
          makeTimeSeriesResponse([
            { date: '2024-03-21', value: 100 },
            { date: '2024-03-22', value: 200 },
          ])
        ) as any
      )
      renderTrendsPage()
      const banner = screen.getByTestId('snapshot-coverage-banner')
      expect(banner).toHaveTextContent('2')
      expect(banner).toHaveTextContent('of 30 days captured')
    })

    it('shows "partial window" notice when captured days are fewer than requested range', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(
          makeTimeSeriesResponse([
            { date: '2024-03-21', value: 100 },
            { date: '2024-03-22', value: 200 },
          ])
        ) as any
      )
      // default range = 30D, only 2 days captured
      renderTrendsPage()
      expect(screen.getByTestId('snapshot-coverage-banner')).toHaveTextContent(
        'trends may not be reliable'
      )
    })

    it('does not show "partial window" when captured days match the requested range', () => {
      const thirtyPoints = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        value: 100 + i,
      }))
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse(thirtyPoints)) as any
      )
      renderTrendsPage('1', 'range=30')
      expect(screen.queryByText(/partial window/)).not.toBeInTheDocument()
    })
  })

  // ── Sparse-history copy ───────────────────────────────────────────────────

  describe('sparse history copy', () => {
    it('shows "No snapshot history yet" for 0 points', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsSuccess(makeTimeSeriesResponse([])) as any)
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText('No snapshot history yet')).toBeInTheDocument()
    })

    it('shows "Only 1 snapshot captured" copy for exactly 1 point (total mode)', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse([{ date: '2024-03-21', value: 100 }])) as any
      )
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText(/Only 1 snapshot captured\s*-\s*need at least 2/)).toBeInTheDocument()
    })

    it('shows correct description for 0 points', () => {
      vi.mocked(useTimeSeries).mockReturnValue(tsSuccess(makeTimeSeriesResponse([])) as any)
      renderTrendsPage('1', 'mode=total')
      expect(
        screen.getByText(/No snapshots have been captured for this channel yet/)
      ).toBeInTheDocument()
    })

    it('shows correct description for 1 point', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(makeTimeSeriesResponse([{ date: '2024-03-21', value: 100 }])) as any
      )
      renderTrendsPage('1', 'mode=total')
      expect(screen.getByText(/Only 1 day of data captured so far/)).toBeInTheDocument()
    })

    it('Growth / Day sub shows captured days count when data is sparse', () => {
      vi.mocked(useTimeSeries).mockReturnValue(
        tsSuccess(
          makeTimeSeriesResponse([
            { date: '2024-03-21', value: 1000 },
            { date: '2024-03-22', value: 2000 },
          ])
        ) as any
      )
      renderTrendsPage('1', 'mode=total')
      // isSparse = true (2 < 30), so sub should say "across 2 captured days"
      expect(screen.getByText(/across 2 captured days/)).toBeInTheDocument()
    })
  })

  // ── Controls ────────────────────────────────────────────────────────────────

  describe('control toggles', () => {
    it('renders metric toggle buttons for Views, Subscribers, Uploads', () => {
      renderTrendsPage()
      expect(screen.getByRole('button', { name: 'Views' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Subscribers' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Uploads' })).toBeInTheDocument()
    })

    it('renders series mode toggle buttons for Total and Daily Change', () => {
      renderTrendsPage()
      expect(screen.getByRole('button', { name: 'Total' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Daily Change' })).toBeInTheDocument()
    })

    it('renders range pill buttons for 7D, 30D, 90D', () => {
      renderTrendsPage()
      expect(screen.getByRole('button', { name: /7D/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /30D/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /90D/i })).toBeInTheDocument()
    })
  })
})
