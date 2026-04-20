/**
 * DataTable is a pure presentational component  -  it renders whatever data[]
 * it receives. Search and sort are caller responsibilities: callers
 * pre-filter / pre-sort the array before passing it as a prop.
 * These tests verify that user-visible output faithfully reflects the prop.
 */
import { render, screen, within } from '@testing-library/react'
import { DataTable } from './DataTable'

// ── Fixture ────────────────────────────────────────────────────────────────

type Row = { name: string; score: number; category: string }

const columns = [
  { header: 'Name', accessor: (r: Row) => r.name },
  { header: 'Score', accessor: (r: Row) => r.score },
  { header: 'Category', accessor: (r: Row) => r.category },
]

const DATASET: Row[] = [
  { name: 'Alpha', score: 300, category: 'gaming' },
  { name: 'Beta', score: 150, category: 'vlog' },
  { name: 'Gamma', score: 500, category: 'gaming' },
  { name: 'Delta', score: 80, category: 'cooking' },
  { name: 'Epsilon', score: 420, category: 'vlog' },
]

// Helper: collect textContent of a specific column (0-based) for every data row
function getColumnValues(colIndex: number): string[] {
  return screen
    .getAllByRole('row')
    .slice(1) // skip the header row
    .map((row) => within(row).getAllByRole('cell')[colIndex].textContent ?? '')
}

// ── Rendering ──────────────────────────────────────────────────────────────

describe('DataTable – rendering', () => {
  it('renders all column headers', () => {
    render(<DataTable columns={columns} data={DATASET} />)

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Score' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
  })

  it('renders one table row per data entry (plus header row)', () => {
    render(<DataTable columns={columns} data={DATASET} />)
    // getAllByRole('row') includes the <thead> row
    expect(screen.getAllByRole('row')).toHaveLength(DATASET.length + 1)
  })

  it('renders cell values for every row', () => {
    render(<DataTable columns={columns} data={DATASET} />)

    for (const row of DATASET) {
      expect(screen.getByText(row.name)).toBeInTheDocument()
    }
  })

  it('renders optional title when provided', () => {
    render(<DataTable title="Top Channels" columns={columns} data={DATASET} />)
    expect(screen.getByText('Top Channels')).toBeInTheDocument()
  })

  it('omits title element when not provided', () => {
    render(<DataTable columns={columns} data={DATASET} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('renders custom empty message and hides the table when data is empty', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('falls back to default empty message when emptyMessage is omitted', () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})

// ── Search (caller pre-filters data) ──────────────────────────────────────

describe('DataTable – search (caller pre-filters data[])', () => {
  it('shows only rows matching the search category', () => {
    const gamingOnly = DATASET.filter((r) => r.category === 'gaming')
    render(<DataTable columns={columns} data={gamingOnly} />)

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()

    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.queryByText('Delta')).not.toBeInTheDocument()
    expect(screen.queryByText('Epsilon')).not.toBeInTheDocument()
  })

  it('shows exactly one row when a single match is passed', () => {
    const singleMatch = DATASET.filter((r) => r.name === 'Delta')
    render(<DataTable columns={columns} data={singleMatch} />)

    expect(screen.getByText('Delta')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1 data row
  })

  it('shows empty state when no rows survive the filter', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No results found" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

// ── Sort (caller pre-sorts data) ───────────────────────────────────────────

describe('DataTable – sort (caller pre-sorts data[])', () => {
  it('renders rows in ascending score order when data is sorted asc', () => {
    const asc = [...DATASET].sort((a, b) => a.score - b.score)
    render(<DataTable columns={columns} data={asc} />)

    const scores = getColumnValues(1).map(Number)
    expect(scores).toEqual([...scores].sort((a, b) => a - b))
  })

  it('renders rows in descending score order when data is sorted desc', () => {
    const desc = [...DATASET].sort((a, b) => b.score - a.score)
    render(<DataTable columns={columns} data={desc} />)

    const scores = getColumnValues(1).map(Number)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('places the highest-score row first when sorted descending', () => {
    const desc = [...DATASET].sort((a, b) => b.score - a.score)
    render(<DataTable columns={columns} data={desc} />)

    const firstDataRow = screen.getAllByRole('row')[1]
    // Gamma has score 500  -  the highest
    expect(within(firstDataRow).getByText('Gamma')).toBeInTheDocument()
    expect(within(firstDataRow).getByText('500')).toBeInTheDocument()
  })

  it('renders rows in alphabetical name order when sorted a→z', () => {
    const alpha = [...DATASET].sort((a, b) => a.name.localeCompare(b.name))
    render(<DataTable columns={columns} data={alpha} />)

    const names = getColumnValues(0)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('reverses visible order when sort direction is flipped', () => {
    const asc = [...DATASET].sort((a, b) => a.score - b.score)
    const desc = [...DATASET].sort((a, b) => b.score - a.score)

    const { rerender } = render(<DataTable columns={columns} data={asc} />)
    const scoresAsc = getColumnValues(1).map(Number)

    rerender(<DataTable columns={columns} data={desc} />)
    const scoresDesc = getColumnValues(1).map(Number)

    expect(scoresDesc).toEqual([...scoresAsc].reverse())
  })
})
