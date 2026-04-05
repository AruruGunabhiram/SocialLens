import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Topbar } from './Topbar'
import { ModeProvider } from '@/lib/ModeContext'

// useChannelSyncMutation depends on React Query context + network; stub it out.
const mockMutate = vi.fn()
vi.mock('@/features/channels/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/channels/queries')>()
  return {
    ...actual,
    useChannelSyncMutation: () => ({
      mutate: mockMutate,
      isPending: false,
      isError: false,
    }),
  }
})

// useAccountStatus and useCurrentUser hit the network; stub them out.
vi.mock('@/features/account/queries', () => ({
  useCurrentUser: () => ({ data: { id: 1 } }),
  useAccountStatus: () => ({ data: undefined, isLoading: false, isError: false }),
}))

function renderTopbar() {
  return render(
    <MemoryRouter>
      <ModeProvider>
        <Topbar />
      </ModeProvider>
    </MemoryRouter>
  )
}

describe('Topbar search', () => {
  beforeEach(() => {
    mockMutate.mockReset()
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

  it('calls mutate with trimmed identifier on form submit', () => {
    renderTopbar()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '  @mkbhd  ' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockMutate).toHaveBeenCalledWith('@mkbhd', expect.any(Object))
  })

  it('does not call mutate when query is blank', () => {
    renderTopbar()
    fireEvent.submit(screen.getByRole('searchbox').closest('form')!)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('clears the value when changed to empty string', () => {
    renderTopbar()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })
})
