import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'sociallens.reduceMotion'

function readInitialValue(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // localStorage unavailable (e.g. private browsing restrictions)
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type ReduceMotionContextValue = {
  reduceMotion: boolean
  toggle: () => void
}

const ReduceMotionContext = createContext<ReduceMotionContextValue | null>(null)

export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState<boolean>(readInitialValue)

  // If the user hasn't set an explicit override, follow OS-level preference changes.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    function handleChange(e: MediaQueryListEvent) {
      const hasExplicitOverride = localStorage.getItem(STORAGE_KEY) !== null
      if (!hasExplicitOverride) setReduceMotion(e.matches)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const toggle = useCallback(() => {
    setReduceMotion((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore write failures
      }
      return next
    })
  }, [])

  return (
    <ReduceMotionContext.Provider value={{ reduceMotion, toggle }}>
      {children}
    </ReduceMotionContext.Provider>
  )
}

export function useReduceMotion(): ReduceMotionContextValue {
  const ctx = useContext(ReduceMotionContext)
  if (!ctx) throw new Error('useReduceMotion must be used within <ReduceMotionProvider>')
  return ctx
}
