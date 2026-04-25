import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboardShortcutsContext } from '@/lib/KeyboardShortcutsContext'

function isInInput(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { setCommandPaletteOpen, setShortcutsHelpOpen } = useKeyboardShortcutsContext()
  const pendingG = useRef(false)
  const pendingTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // cmd+K / ctrl+K / alt+T → command palette (fires even inside inputs)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === 'T' && e.altKey)) {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      if (isInInput(e.target)) return

      if (e.key === 'Escape') {
        pendingG.current = false
        clearTimeout(pendingTimer.current)
        return
      }

      if (e.key === '?') {
        setShortcutsHelpOpen(true)
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
        searchInput?.focus()
        return
      }

      if (pendingG.current) {
        pendingG.current = false
        clearTimeout(pendingTimer.current)
        switch (e.key) {
          case 'c':
            void navigate('/channels')
            break
          case 'i':
            void navigate('/insights')
            break
          case 'p':
            void navigate('/copilot')
            break
          case 's':
            void navigate('/settings')
            break
        }
        return
      }

      if (e.key === 'g') {
        pendingG.current = true
        pendingTimer.current = setTimeout(() => {
          pendingG.current = false
        }, 1500)
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      clearTimeout(pendingTimer.current)
    }
  }, [navigate, setCommandPaletteOpen, setShortcutsHelpOpen])
}
