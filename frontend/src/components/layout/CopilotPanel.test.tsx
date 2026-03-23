import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CopilotPanel } from './CopilotPanel'

describe('CopilotPanel notes', () => {
  it('renders a real textarea, not a static paragraph', () => {
    render(<CopilotPanel />)
    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument()
  })

  it('accepts typed notes and updates the value', () => {
    render(<CopilotPanel />)
    const textarea = screen.getByRole('textbox', { name: /notes/i })
    fireEvent.change(textarea, { target: { value: 'channel strategy ideas' } })
    expect(textarea).toHaveValue('channel strategy ideas')
  })
})
