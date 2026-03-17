import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ReduceMotionContextValue = {
  reduceMotion: boolean
  toggle: () => void
}

const ReduceMotionContext = createContext<ReduceMotionContextValue | null>(null)

export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  // Once the user has explicitly toggled within this session, stop following OS changes.
  const hasUserOverride = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    function handleChange(e: MediaQueryListEvent) {
      if (!hasUserOverride.current) setReduceMotion(e.matches)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const toggle = useCallback(() => {
    hasUserOverride.current = true
    setReduceMotion((prev) => !prev)
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
