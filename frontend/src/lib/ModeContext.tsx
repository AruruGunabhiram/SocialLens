import { createContext, useContext, useState, type ReactNode } from 'react'

export type AppMode = 'explorer' | 'studio'

interface ModeContextValue {
  mode: AppMode
  setMode: (m: AppMode) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('explorer')
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside ModeProvider')
  return ctx
}
