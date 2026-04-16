import { useCallback, useRef, useState } from 'react'

type RefreshPhase = 'idle' | 'pending' | 'success' | 'error'

export interface RefreshActionState {
  phase: RefreshPhase
  isPending: boolean
  label: string
  disabled: boolean
}

/**
 * Manages refresh button state: idle → pending → success/error → idle.
 *
 * Usage:
 *   const { state, trigger } = useRefreshAction(() => refetch())
 *   <button disabled={state.disabled} onClick={trigger}>{state.label}</button>
 */
export function useRefreshAction(onRefresh: () => Promise<unknown>) {
  const [phase, setPhase] = useState<RefreshPhase>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const trigger = useCallback(async () => {
    if (phase === 'pending') return
    clearTimeout(timerRef.current)
    setPhase('pending')
    try {
      await onRefresh()
      setPhase('success')
      timerRef.current = setTimeout(() => setPhase('idle'), 2000)
    } catch {
      setPhase('error')
      timerRef.current = setTimeout(() => setPhase('idle'), 3000)
    }
  }, [phase, onRefresh])

  const LABELS: Record<RefreshPhase, string> = {
    idle: 'Refresh',
    pending: 'Refreshing...',
    success: 'Refreshed',
    error: 'Failed',
  }

  const state: RefreshActionState = {
    phase,
    isPending: phase === 'pending',
    label: LABELS[phase],
    disabled: phase === 'pending',
  }

  return { state, trigger }
}
