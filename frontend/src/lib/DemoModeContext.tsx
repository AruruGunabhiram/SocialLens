import { createContext, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'sl_demo_mode'

interface DemoModeContextValue {
  isDemoMode: boolean
  toggleDemoMode: () => void
  enableDemoMode: () => void
  disableDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  function set(value: boolean) {
    setIsDemoMode(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode: () => set(!isDemoMode),
        enableDemoMode: () => set(true),
        disableDemoMode: () => set(false),
      }}
    >
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext)
  if (!ctx) throw new Error('useDemoMode must be used inside DemoModeProvider')
  return ctx
}
