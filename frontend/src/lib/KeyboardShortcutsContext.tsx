import { createContext, useContext, useState, type ReactNode } from 'react'

interface KeyboardShortcutsContextValue {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  shortcutsHelpOpen: boolean
  setShortcutsHelpOpen: (open: boolean) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null)

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  return (
    <KeyboardShortcutsContext.Provider
      value={{ commandPaletteOpen, setCommandPaletteOpen, shortcutsHelpOpen, setShortcutsHelpOpen }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

export function useKeyboardShortcutsContext() {
  const ctx = useContext(KeyboardShortcutsContext)
  if (!ctx) throw new Error('useKeyboardShortcutsContext must be inside KeyboardShortcutsProvider')
  return ctx
}
