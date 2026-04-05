/**
 * Retention Diagnosis UI tests.
 *
 * Tests the InsightsPage using mocked hooks — no real network calls.
 * Covers: not-connected gate, form validation, loading state, error state, success state.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InsightsPage from '@/features/insights/pages/InsightsPage'
import type { RetentionDiagnosisResponse, ChannelItem } from '@/api/types'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/features/channels/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/channels/queries')>()
  return {
    ...actual,
    useChannelsQuery: vi.fn(),
    useChannelQuery: vi.fn(),
    useVideosQuery: vi.fn(),
  }
})

vi.mock('@/features/account/queries', () => ({
  useAccountStatus: vi.fn(),
  useCurrentUser: vi.fn(),
}))

vi.mock('@/features/retention/queries', () => ({
  useRetentionDiagnosis: vi.fn(),
}))

vi.mock('@/features/trends/queries', () => ({
  useTimeSeries: vi.fn(),
}))

import { useChannelsQuery, useChannelQuery, useVideosQuery } from '@/features/channels/queries'
import { useAccountStatus, useCurrentUser } from '@/features/account/queries'
import { useRetentionDiagnosis } from '@/features/retention/queries'
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

function makeResult(
  overrides: Partial<RetentionDiagnosisResponse> = {}
): RetentionDiagnosisResponse {
  return {
    videoId: 'dQw4w9WgXcQ',
    summary: 'Strong hook, significant mid-video drop.',
    dropEvents: [
      { startProgress: 0.4, endProgress: 0.55, dropMagnitude: 0.15, slope: 1.2, severity: 'HIGH' },
    ],
    diagnoses: [
      {
        label: 'PACING_OR_TOPIC_SHIFT',
        severity: 'HIGH',
        evidence: 'Retention fell 15% between 40% → 55% of the video.',
        recommendation: 'Review pacing at the 40–55% mark for abrupt topic changes.',
      },
    ],
    ...overrides,
  }
}

function makeMutation(overrides: {
  mutate?: ReturnType<typeof vi.fn>
  isPending?: boolean
  data?: RetentionDiagnosisResponse
  error?: Error | null
  reset?: ReturnType<typeof vi.fn>
}) {
  return {
    mutate: overrides.mutate ?? vi.fn(),
    isPending: overrides.isPending ?? false,
    data: overrides.data,
    error: overrides.error ?? null,
    reset: overrides.reset ?? vi.fn(),
  }
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderPage(channelDbId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/insights?channelId=${channelDbId}`]}>
      <Routes>
        <Route path="/insights" element={<InsightsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InsightsPage — Retention Diagnosis', () => {
  beforeEach(() => {
    vi.mocked(useChannelsQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useChannelsQuery>)
    vi.mocked(useChannelQuery).mockReturnValue({ data: makeChannel() } as ReturnType<
      typeof useChannelQuery
    >)
    vi.mocked(useVideosQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useVideosQuery>)
    vi.mocked(useTimeSeries).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useTimeSeries>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { id: 1 } } as ReturnType<
      typeof useCurrentUser
    >)
    vi.mocked(useAccountStatus).mockReturnValue({
      data: { userId: 1, platform: 'YOUTUBE', connected: true },
      isLoading: false,
    } as ReturnType<typeof useAccountStatus>)
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({}) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )
  })

  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByText('Retention Diagnosis')).toBeInTheDocument()
  })

  it('shows not-connected gate when account is not connected', () => {
    vi.mocked(useAccountStatus).mockReturnValue({
      data: { userId: 1, platform: 'YOUTUBE', connected: false },
      isLoading: false,
    } as ReturnType<typeof useAccountStatus>)
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({}) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )

    renderPage()
    expect(screen.getByTestId('not-connected')).toBeInTheDocument()
    expect(screen.queryByTestId('diagnosis-form')).not.toBeInTheDocument()
  })

  it('renders the form when connected and channel loaded', () => {
    renderPage()
    expect(screen.getByTestId('diagnosis-form')).toBeInTheDocument()
    expect(screen.getByTestId('video-input')).toBeInTheDocument()
    expect(screen.getByTestId('analyze-button')).toBeInTheDocument()
  })

  it('shows validation error for invalid input', async () => {
    renderPage()
    fireEvent.change(screen.getByTestId('video-input'), { target: { value: 'not-a-video-id' } })
    fireEvent.click(screen.getByTestId('analyze-button'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls mutate with correct args for bare video ID', async () => {
    const mutate = vi.fn()
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ mutate }) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )
    renderPage()
    fireEvent.change(screen.getByTestId('video-input'), { target: { value: 'dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByTestId('analyze-button'))
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        userId: 1,
        channelId: 'UC123',
        videoId: 'dQw4w9WgXcQ',
      })
    })
  })

  it('calls mutate with extracted video ID from full URL', async () => {
    const mutate = vi.fn()
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ mutate }) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )
    renderPage()
    fireEvent.change(screen.getByTestId('video-input'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByTestId('analyze-button'))
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        userId: 1,
        channelId: 'UC123',
        videoId: 'dQw4w9WgXcQ',
      })
    })
  })

  it('shows loading skeleton while isPending', () => {
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ isPending: true }) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )
    renderPage()
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.queryByTestId('diagnosis-results')).not.toBeInTheDocument()
  })

  it('shows error state on API failure', () => {
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ error: new Error('Video not found') }) as unknown as ReturnType<
        typeof useRetentionDiagnosis
      >
    )
    renderPage()
    expect(screen.getByText('Diagnosis failed')).toBeInTheDocument()
    expect(screen.getByText('Video not found')).toBeInTheDocument()
  })

  it('renders diagnosis results on success', () => {
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ data: makeResult() }) as unknown as ReturnType<typeof useRetentionDiagnosis>
    )
    renderPage()
    expect(screen.getByTestId('diagnosis-results')).toBeInTheDocument()
    expect(screen.getByTestId('diagnosis-summary')).toHaveTextContent(
      'Strong hook, significant mid-video drop.'
    )
    expect(screen.getByText('Pacing Or Topic Shift')).toBeInTheDocument()
    expect(
      screen.getByText('Review pacing at the 40–55% mark for abrupt topic changes.')
    ).toBeInTheDocument()
  })

  it('renders empty drop events message when no drops', () => {
    vi.mocked(useRetentionDiagnosis).mockReturnValue(
      makeMutation({ data: makeResult({ dropEvents: [] }) }) as unknown as ReturnType<
        typeof useRetentionDiagnosis
      >
    )
    renderPage()
    expect(screen.getByText('No significant drop events detected.')).toBeInTheDocument()
  })
})

// ─── extractVideoId unit tests ────────────────────────────────────────────────

import { extractVideoId } from '@/features/retention/api'

describe('extractVideoId', () => {
  it('accepts bare 11-char ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from full watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts from shorts URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-video input', () => {
    expect(extractVideoId('tooshort')).toBeNull()
    expect(extractVideoId('this-is-way-too-long-to-be-a-valid-video-id')).toBeNull()
    expect(extractVideoId('')).toBeNull()
    expect(extractVideoId('https://example.com')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(extractVideoId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ')
  })
})
