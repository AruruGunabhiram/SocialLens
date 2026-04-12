import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  FreshnessBadge,
  mapChannelItemToFreshnessProps,
  humanRefreshStatus,
} from './FreshnessBadge'
import type { FreshnessBadgeProps } from './FreshnessBadge'
import type { ChannelItem } from '@/api/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString()
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString()

function makeProps(overrides: Partial<FreshnessBadgeProps> = {}): FreshnessBadgeProps {
  return {
    lastSnapshotAt: null,
    lastRefreshAt: null,
    status: null,
    lastRefreshError: null,
    snapshotDayCount: null,
    ...overrides,
  }
}

function renderBadge(props: Partial<FreshnessBadgeProps> = {}) {
  return render(<FreshnessBadge {...makeProps(props)} />)
}

// ---------------------------------------------------------------------------
// humanRefreshStatus utility
// ---------------------------------------------------------------------------

describe('humanRefreshStatus', () => {
  it('returns "Never synced" for null', () => {
    expect(humanRefreshStatus(null)).toBe('Never synced')
  })
  it('returns "Never synced" for NEVER_RUN', () => {
    expect(humanRefreshStatus('NEVER_RUN')).toBe('Never synced')
  })
  it('returns "Synced" for SUCCESS', () => {
    expect(humanRefreshStatus('SUCCESS')).toBe('Synced')
  })
  it('returns "Failed" for FAILED', () => {
    expect(humanRefreshStatus('FAILED')).toBe('Failed')
  })
  it('returns "Partial sync" for PARTIAL', () => {
    expect(humanRefreshStatus('PARTIAL')).toBe('Partial sync')
  })
})

// ---------------------------------------------------------------------------
// Status pill label
// ---------------------------------------------------------------------------

describe('FreshnessBadge — status pill label', () => {
  it('shows "Never synced" when status is null', () => {
    renderBadge({ status: null })
    expect(screen.getByTestId('freshness-status')).toHaveTextContent('Never synced')
  })

  it('shows "Never synced" when status is NEVER_RUN', () => {
    renderBadge({ status: 'NEVER_RUN' })
    expect(screen.getByTestId('freshness-status')).toHaveTextContent('Never synced')
  })

  it('shows "Synced" when status is SUCCESS', () => {
    renderBadge({ status: 'SUCCESS', lastRefreshAt: NOW, snapshotDayCount: 5 })
    expect(screen.getByTestId('freshness-status')).toHaveTextContent('Synced')
  })

  it('shows "Failed" when status is FAILED', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: 0 })
    expect(screen.getByTestId('freshness-status')).toHaveTextContent('Failed')
  })

  it('shows "Partial sync" when status is PARTIAL', () => {
    renderBadge({ status: 'PARTIAL' })
    expect(screen.getByTestId('freshness-status')).toHaveTextContent('Partial sync')
  })
})

// ---------------------------------------------------------------------------
// Badge variant (via aria-label / className is not great; test via data-variant
// attribute or rely on role. We test the DOM attribute set by Badge.)
// Since Badge renders a span, we verify the rendered class contains the
// expected variant keyword by checking the element class list indirectly.
// The most reliable way: assert the presence of the danger/warning CSS class
// token that shadcn writes into className.
// ---------------------------------------------------------------------------

// Badge applies variants via inline style (CSS variables), not className.
// FreshnessBadge mirrors the computed variant into data-variant so tests can
// assert it without brittle CSS-variable string matching.
describe('FreshnessBadge — variant logic', () => {
  it('uses danger variant when FAILED with no data', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: 0, lastSnapshotAt: null })
    expect(screen.getByTestId('freshness-status')).toHaveAttribute('data-variant', 'danger')
  })

  it('uses warning variant when FAILED but historical data exists (snapshotDayCount>0)', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: 3, lastSnapshotAt: TWO_DAYS_AGO })
    expect(screen.getByTestId('freshness-status')).toHaveAttribute('data-variant', 'warning')
  })

  it('uses warning variant when FAILED with data inferred from lastSnapshotAt alone', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: null, lastSnapshotAt: TWO_DAYS_AGO })
    expect(screen.getByTestId('freshness-status')).toHaveAttribute('data-variant', 'warning')
  })

  it('uses secondary variant when SUCCESS and fresh (≤24 h)', () => {
    renderBadge({ status: 'SUCCESS', lastRefreshAt: ONE_HOUR_AGO, snapshotDayCount: 1 })
    expect(screen.getByTestId('freshness-status')).toHaveAttribute('data-variant', 'secondary')
  })

  it('uses outline variant when SUCCESS and stale (>24 h)', () => {
    renderBadge({ status: 'SUCCESS', lastRefreshAt: TWO_DAYS_AGO, snapshotDayCount: 2 })
    expect(screen.getByTestId('freshness-status')).toHaveAttribute('data-variant', 'outline')
  })
})

// ---------------------------------------------------------------------------
// Snapshot coverage line
// ---------------------------------------------------------------------------

describe('FreshnessBadge — snapshot coverage', () => {
  it('shows "No snapshots yet" when both lastSnapshotAt and snapshotDayCount are null', () => {
    renderBadge({ lastSnapshotAt: null, snapshotDayCount: null })
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('No snapshots yet')
  })

  it('shows "Snapshot X ago" when snapshotDayCount is null but lastSnapshotAt is set', () => {
    renderBadge({ lastSnapshotAt: ONE_HOUR_AGO, snapshotDayCount: null })
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('Snapshot')
  })

  it('shows "N days of data · updated X ago" when snapshotDayCount>0 and lastSnapshotAt is set', () => {
    renderBadge({ lastSnapshotAt: ONE_HOUR_AGO, snapshotDayCount: 7 })
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('7 days of data')
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('updated')
  })

  it('uses singular "day" when snapshotDayCount is 1', () => {
    renderBadge({ lastSnapshotAt: ONE_HOUR_AGO, snapshotDayCount: 1 })
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('1 day of data')
  })

  it('uses plural "days" when snapshotDayCount is 0 and falls back to timestamp', () => {
    // snapshotDayCount=0 means no snapshots; should fall back gracefully
    renderBadge({ lastSnapshotAt: null, snapshotDayCount: 0 })
    expect(screen.getByTestId('freshness-snapshot')).toHaveTextContent('No snapshots yet')
  })
})

// ---------------------------------------------------------------------------
// Refresh label
// ---------------------------------------------------------------------------

describe('FreshnessBadge — refresh label', () => {
  it('shows "Never synced" when lastRefreshAt is null', () => {
    renderBadge({ lastRefreshAt: null })
    expect(screen.getByTestId('freshness-refresh')).toHaveTextContent('Never synced')
  })

  it('shows "Last success X ago" when status is FAILED and lastRefreshAt is set', () => {
    renderBadge({ status: 'FAILED', lastRefreshAt: TWO_DAYS_AGO, snapshotDayCount: 2 })
    expect(screen.getByTestId('freshness-refresh')).toHaveTextContent('Last success')
  })

  it('shows relative time only when status is SUCCESS', () => {
    renderBadge({ status: 'SUCCESS', lastRefreshAt: ONE_HOUR_AGO, snapshotDayCount: 1 })
    expect(screen.getByTestId('freshness-refresh')).toHaveTextContent('ago')
  })
})

// ---------------------------------------------------------------------------
// View error toggle
// ---------------------------------------------------------------------------

describe('FreshnessBadge — error panel', () => {
  it('does NOT render "View error" when status is SUCCESS', () => {
    renderBadge({ status: 'SUCCESS', lastRefreshAt: NOW, snapshotDayCount: 1 })
    expect(screen.queryByRole('button', { name: /view error/i })).not.toBeInTheDocument()
  })

  it('does NOT render "View error" when status is null', () => {
    renderBadge({ status: null })
    expect(screen.queryByRole('button', { name: /view error/i })).not.toBeInTheDocument()
  })

  it('renders "View error" button when status is FAILED', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: 0 })
    expect(screen.getByRole('button', { name: /view error/i })).toBeInTheDocument()
  })

  it('clicking "View error" expands the error panel', () => {
    renderBadge({
      status: 'FAILED',
      snapshotDayCount: 0,
      lastRefreshError: 'YouTube API quota exceeded',
    })
    expect(screen.queryByText('YouTube API quota exceeded')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view error/i }))
    expect(screen.getByText('YouTube API quota exceeded')).toBeInTheDocument()
  })

  it('clicking again collapses the error panel', () => {
    renderBadge({
      status: 'FAILED',
      snapshotDayCount: 0,
      lastRefreshError: 'some error',
    })
    const btn = screen.getByRole('button', { name: /view error/i })
    fireEvent.click(btn)
    expect(screen.getByText('some error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /hide error/i }))
    expect(screen.queryByText('some error')).not.toBeInTheDocument()
  })

  it('shows fallback text when lastRefreshError is null and panel is expanded', () => {
    renderBadge({ status: 'FAILED', snapshotDayCount: 0, lastRefreshError: null })
    fireEvent.click(screen.getByRole('button', { name: /view error/i }))
    expect(screen.getByText(/no error details available/i)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// mapChannelItemToFreshnessProps mapper
// ---------------------------------------------------------------------------

describe('mapChannelItemToFreshnessProps', () => {
  function makeChannel(overrides: Partial<ChannelItem> = {}): ChannelItem {
    return {
      id: 1,
      channelId: 'UCtest',
      active: true,
      ...overrides,
    } as ChannelItem
  }

  it('maps all freshness fields from a ChannelItem', () => {
    const channel = makeChannel({
      lastSuccessfulRefreshAt: NOW,
      lastRefreshStatus: 'SUCCESS',
      lastRefreshError: null,
      lastSnapshotAt: ONE_HOUR_AGO,
      snapshotDayCount: 10,
    })
    const props = mapChannelItemToFreshnessProps(channel)
    expect(props.lastRefreshAt).toBe(NOW)
    expect(props.status).toBe('SUCCESS')
    expect(props.lastRefreshError).toBeNull()
    expect(props.lastSnapshotAt).toBe(ONE_HOUR_AGO)
    expect(props.snapshotDayCount).toBe(10)
  })

  it('maps null for all fields when channel is null', () => {
    const props = mapChannelItemToFreshnessProps(null)
    expect(props.lastRefreshAt).toBeNull()
    expect(props.status).toBeNull()
    expect(props.lastRefreshError).toBeNull()
    expect(props.lastSnapshotAt).toBeNull()
    expect(props.snapshotDayCount).toBeNull()
  })

  it('maps null for missing optional fields', () => {
    const props = mapChannelItemToFreshnessProps(makeChannel())
    expect(props.lastRefreshAt).toBeNull()
    expect(props.snapshotDayCount).toBeNull()
  })

  it('maps lastRefreshError from channel item', () => {
    const channel = makeChannel({ lastRefreshError: 'quota exceeded', lastRefreshStatus: 'FAILED' })
    const props = mapChannelItemToFreshnessProps(channel)
    expect(props.lastRefreshError).toBe('quota exceeded')
  })
})
