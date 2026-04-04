import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  // ── Label and value display ───────────────────────────────────────────────

  it('renders the label', () => {
    render(<MetricCard label="Total Views" value="2.4M" />)
    expect(screen.getByText('Total Views')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<MetricCard label="Views" value="12,345" />)
    expect(screen.getByText('12,345')).toBeInTheDocument()
  })

  it('renders -- when value is undefined', () => {
    render(<MetricCard label="Views" />)
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  // ── aria-label ────────────────────────────────────────────────────────────

  it('sets aria-label on the article element to the label prop', () => {
    render(<MetricCard label="Subscribers" value="1.2K" />)
    expect(screen.getByRole('article', { name: 'Subscribers' })).toBeInTheDocument()
  })

  // ── Loading state ─────────────────────────────────────────────────────────

  it('does not render label text when loading=true', () => {
    render(<MetricCard label="Views" value="999" loading />)
    expect(screen.queryByText('Views')).not.toBeInTheDocument()
  })

  it('does not render value text when loading=true', () => {
    render(<MetricCard label="Views" value="999" loading />)
    expect(screen.queryByText('999')).not.toBeInTheDocument()
  })

  it('marks article as aria-busy when loading=true', () => {
    render(<MetricCard label="Views" value="999" loading />)
    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders label and value (not skeleton) when loading=false', () => {
    render(<MetricCard label="Views" value="999" loading={false} />)
    expect(screen.getByText('Views')).toBeInTheDocument()
    expect(screen.getByText('999')).toBeInTheDocument()
  })

  // ── Delta badge ───────────────────────────────────────────────────────────

  it('renders positive delta with + prefix', () => {
    render(<MetricCard label="Views" value="1M" delta={0.124} />)
    expect(screen.getByText('+12.4%')).toBeInTheDocument()
  })

  it('renders negative delta without + prefix', () => {
    render(<MetricCard label="Views" value="1M" delta={-0.05} />)
    expect(screen.getByText('-5.0%')).toBeInTheDocument()
  })

  it('renders zero delta as 0.0%', () => {
    render(<MetricCard label="Views" value="1M" delta={0} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('does not render a delta badge when delta is not provided', () => {
    render(<MetricCard label="Views" value="1M" />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders deltaLabel when provided alongside delta', () => {
    render(<MetricCard label="Views" value="1M" delta={0.1} deltaLabel="vs last 30d" />)
    expect(screen.getByText('vs last 30d')).toBeInTheDocument()
  })

  // ── Sublabel ──────────────────────────────────────────────────────────────

  it('renders sublabel text when provided', () => {
    render(<MetricCard label="Views" value="1M" sublabel="last 30 days" />)
    expect(screen.getByText('last 30 days')).toBeInTheDocument()
  })

  it('does not render sublabel when omitted', () => {
    render(<MetricCard label="Views" value="1M" />)
    expect(screen.queryByText('last 30 days')).not.toBeInTheDocument()
  })

  // ── Sparkline ─────────────────────────────────────────────────────────────

  it('renders an svg sparkline when sparklineData has 2+ points', () => {
    render(<MetricCard label="Views" value="1M" sparklineData={[100, 200, 300]} />)
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('does not render sparkline for a single data point', () => {
    render(<MetricCard label="Views" value="1M" sparklineData={[100]} />)
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('does not render sparkline when sparklineData is omitted', () => {
    render(<MetricCard label="Views" value="1M" />)
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  // ── Locked state ──────────────────────────────────────────────────────────

  it('renders "Owner-only metric" text when locked=true', () => {
    render(<MetricCard label="Revenue" value="$9,999" locked />)
    expect(screen.getByText('Owner-only metric')).toBeInTheDocument()
  })

  it('does not render the locked overlay when locked=false', () => {
    render(<MetricCard label="Revenue" value="$9,999" locked={false} />)
    expect(screen.queryByText('Owner-only metric')).not.toBeInTheDocument()
  })
})
