import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Topbar } from './Topbar'
import { ModeProvider } from '@/lib/ModeContext'

const mockSyncChannel = vi.fn()

vi.mock('@/features/channels/api', () => ({
  syncChannel: (...args: unknown[]) => mockSyncChannel(...args),
}))

vi.mock('@/features/channels/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/channels/queries')>()
  return {
    ...actual,
  }
})

// useAccountStatus and useCurrentUser hit the network; stub them out.
vi.mock('@/features/account/queries', () => ({
  useCurrentUser: () => ({ data: { id: 1 } }),
  useAccountStatus: () => ({ data: undefined, isLoading: false, isError: false }),
  useAccountDetail: () => ({ data: undefined, isLoading: false, isError: false }),
  useDisconnectMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}))

function renderTopbar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ModeProvider>
          <Topbar />
        </ModeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Topbar search', () => {
  beforeEach(() => {
    mockSyncChannel.mockReset()
    mockSyncChannel.mockResolvedValue({ channelDbId: 1, channelId: 'UC123', title: 'MKBHD' })
  })

  it('renders a real search input', () => {
    renderTopbar()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders a Track Channel button', () => {
    renderTopbar()
    expect(screen.getByRole('button', { name: /track channel/i })).toBeInTheDocument()
  })

  it('accepts typed text', () => {
    renderTopbar()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '@FoodonFarm' } })
    expect(input).toHaveValue('@FoodonFarm')
  })

  it('calls syncChannel with trimmed identifier on form submit', async () => {
    renderTopbar()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '  @mkbhd  ' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(mockSyncChannel).toHaveBeenCalledWith('@mkbhd')
    })
  })

  it('does not call mutate when query is blank', () => {
    renderTopbar()
    fireEvent.submit(screen.getByRole('searchbox').closest('form')!)
    expect(mockSyncChannel).not.toHaveBeenCalled()
  })

  it('clears the value when changed to empty string', () => {
    renderTopbar()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })
})
