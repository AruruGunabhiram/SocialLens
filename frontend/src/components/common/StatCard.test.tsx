import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total Views" value="1,234,567" />)

    expect(screen.getByText('Total Views')).toBeInTheDocument()
    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })

  it('renders a ReactNode value (e.g. formatted number element)', () => {
    render(<StatCard label="Subscribers" value={<strong>42K</strong>} />)

    expect(screen.getByText('Subscribers')).toBeInTheDocument()
    expect(screen.getByText('42K')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <StatCard label="Uploads" value="88" description="+3 this week" />,
    )

    expect(screen.getByText('+3 this week')).toBeInTheDocument()
  })

  it('omits description element when not provided', () => {
    render(<StatCard label="Uploads" value="88" />)

    expect(screen.queryByLabelText('Uploads-description')).not.toBeInTheDocument()
  })

  it('shows a skeleton and hides value when loading=true', () => {
    render(<StatCard label="Views" value="999" loading />)

    // Value must not be visible
    expect(screen.queryByText('999')).not.toBeInTheDocument()
    // Label is always visible
    expect(screen.getByText('Views')).toBeInTheDocument()
  })

  it('shows value (not skeleton) when loading=false', () => {
    render(<StatCard label="Views" value="999" loading={false} />)

    expect(screen.getByText('999')).toBeInTheDocument()
  })

  it('handles undefined value gracefully (renders empty CardTitle)', () => {
    // value is ReactNode, so undefined is a valid no-op render
    render(<StatCard label="Revenue" value={undefined} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    // No crash expected
  })

  it('handles null value gracefully', () => {
    render(<StatCard label="Revenue" value={null} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('renders icon alongside label when provided', () => {
    render(
      <StatCard
        label="Likes"
        value="500"
        icon={<svg aria-label="likes-icon" />}
      />,
    )

    expect(screen.getByLabelText('likes-icon')).toBeInTheDocument()
    expect(screen.getByText('Likes')).toBeInTheDocument()
  })
})
